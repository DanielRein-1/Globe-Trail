import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { inputSchemaAt, addDays } from '../lib/validation/itinerary.ts';
import { ItineraryError, previewSchema, previewResponseSchema, previewErrorResponseSchema } from '../lib/itineraries/contracts.ts';
import { readPreviewBody } from '../lib/itineraries/request.ts';
import { previewItinerary } from '../lib/services/itinerary.service.ts';
import { MockAIProvider } from '../lib/ai/providers/mock.ts';
import { getAIProvider } from '../lib/ai/index.ts';
import { ItineraryResult } from '../components/features/itineraries/ItineraryResult.tsx';
import { requestItineraryPreview } from '../hooks/use-itinerary-preview.ts';
import { ItineraryPlanner } from '../components/features/itineraries/ItineraryPlanner.tsx';
const now = new Date('2028-02-28T23:59:59Z');
const input = { destinationCode: 'KE', durationDays: 3, travellers: 2, interests: ['nature'], budgetPreference: 'balanced' };
const destination = { isoCode: 'KE', name: 'Kenya' };
const deps = { now, findDestination: async () => destination, getProvider: () => new MockAIProvider() };
const expectCode = code => error => error instanceof ItineraryError && error.code === code;

test('strict inputs normalize country codes and enforce numeric, enum, size and uniqueness limits', () => {
  const schema = inputSchemaAt(now);
  assert.equal(schema.parse({ ...input, destinationCode: ' ke ' }).destinationCode, 'KE');
  for (const extra of [{ durationDays: '3' }, { durationDays: 0 }, { durationDays: 15 }, { durationDays: 1.5 }, { travellers: '2' }, { travellers: 0 }, { travellers: 9 }, { interests: [] }, { interests: ['nature', 'nature'] }, { interests: ['unknown'] }, { budgetPreference: 'luxury' }, { destinationCode: 'KEN' }, { extra: true }]) {
    assert.equal(schema.safeParse({ ...input, ...extra }).success, false, JSON.stringify(extra));
  }
  for (const durationDays of [1, 14]) assert.ok(schema.safeParse({ ...input, durationDays, travellers: 8 }).success);
});
test('UTC dates reject impossible/past/far-future dates and derive leap-day/year boundaries', () => {
  const schema = inputSchemaAt(now);
  for (const startDate of ['2028-02-28', '2028-02-29', addDays('2028-02-28', 365)]) assert.ok(schema.safeParse({ ...input, startDate }).success);
  for (const startDate of ['2028-02-27', '2028-02-30', '2027-02-29', '2028-2-29', '2028-02-28T00:00:00Z', addDays('2028-02-28', 366)]) assert.equal(schema.safeParse({ ...input, startDate }).success, false);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29'); assert.equal(addDays('2028-12-31', 1), '2029-01-01');
});
test('invalid inputs and absent countries stop before provider calls; no fallback fetch', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('No external calls'));
  await assert.rejects(previewItinerary({ ...input, durationDays: 0 }, { findDestination: () => assert.fail('No lookup') }), expectCode('VALIDATION_ERROR'));
  await assert.rejects(previewItinerary(input, { findDestination: async () => null, getProvider: () => assert.fail('No provider') }), expectCode('NOT_FOUND'));
});
test('mock output is deterministic, preference-aware, strictly bounded and contains no price or persistence fields', async () => {
  const dated = { ...input, startDate: '2028-02-28' };
  const result = await previewItinerary(dated, deps);
  assert.deepEqual(result, await previewItinerary(dated, deps));
  assert.deepEqual(result.days.map(day => day.date), ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.deepEqual(result.days[0].activities.map(activity => activity.slot), ['morning', 'afternoon', 'evening']);
  assert.equal(result.destination.name, 'Kenya'); assert.equal(result.source, 'mock');
  const different = await previewItinerary({ ...input, interests: ['food'], budgetPreference: 'budget', travellers: 8, durationDays: 14 }, deps);
  assert.equal(different.days.length, 14); assert.ok(different.days.every(day => day.date === null));
  assert.notEqual(result.days[0].activities[0].description, different.days[0].activities[0].description);
  assert.notEqual(result.days[0].activities[1].description, different.days[0].activities[1].description);
  assert.match(different.summary, /8 travellers/);
  assert.doesNotMatch(JSON.stringify(result), /estimatedCost|estimatedBudget|tripId|rawJson|Mock Museum|\$/);
});
test('malformed output, extra keys and inconsistent days fail once without repair or retry', async () => {
  const provider = new MockAIProvider();
  const valid = await provider.generateItinerary({ inputs: input, destination });
  const variants = [null, 'not JSON', [], { ...valid, secret: 'extra' }, { ...valid, title: 'x'.repeat(121) }, { ...valid, days: [] }];
  for (const mutate of [v => v.days.pop(), v => { v.days[0].day = 2; }, v => { v.days[0].date = '2028-02-29'; }, v => { v.days[0].activities.reverse(); }, v => { v.days[0].activities[0].price = 1; }]) {
    const changed = structuredClone(valid); mutate(changed); variants.push(changed);
  }
  for (const value of variants) {
    let calls = 0;
    await assert.rejects(previewItinerary(input, { ...deps, getProvider: () => ({ generateItinerary: async () => { calls++; return value; } }) }), expectCode('AI_INVALID_RESPONSE'));
    assert.equal(calls, 1);
  }
  const result = await previewItinerary(input, deps);
  assert.equal(previewSchema.safeParse({ ...result, destination: { ...destination, isoCode: 'UG' } }).success, false);
});
test('deadline aborts a hanging generation and provider failures are sanitized', async () => {
  let signal;
  await assert.rejects(previewItinerary(input, { ...deps, deadlineMs: 5, getProvider: () => ({ generateItinerary: (_request, value) => { signal = value; return new Promise(() => {}); } }) }), expectCode('AI_TIMEOUT'));
  assert.equal(signal.aborted, true);
  await assert.rejects(previewItinerary(input, { ...deps, getProvider: () => ({ generateItinerary: () => { throw new Error('private raw error'); } }) }), error => expectCode('AI_PROVIDER_UNAVAILABLE')(error) && !error.message.includes('private'));
});
test('provider selection is lazy, mock only, and never exposes configuration values', () => {
  const original = process.env.AI_PROVIDER;
  try {
    process.env.AI_PROVIDER = ' mock '; assert.ok(getAIProvider() instanceof MockAIProvider);
    process.env.AI_PROVIDER = 'private-provider-name';
    assert.throws(getAIProvider, error => expectCode('AI_NOT_CONFIGURED')(error) && !error.message.includes('private-provider-name'));
  } finally { if (original === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = original; }
});
const request = (body, type = 'application/json') => new Request('http://localhost/api/itineraries/preview', { method: 'POST', headers: { 'Content-Type': type }, body });
test('streamed body enforces 8 KiB, validates UTF-8/JSON and media type, including misleading length', async () => {
  assert.deepEqual(await readPreviewBody(request(JSON.stringify(input), 'Application/JSON; charset=utf-8')), input);
  await assert.rejects(readPreviewBody(request('{}', 'text/plain')), expectCode('UNSUPPORTED_MEDIA_TYPE'));
  for (const body of ['', '{', new Uint8Array([0xff])]) await assert.rejects(readPreviewBody(request(body)), expectCode('INVALID_JSON'));
  assert.deepEqual(await readPreviewBody(request('{}' + ' '.repeat(8190))), {});
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4096)); controller.enqueue(new Uint8Array(4097)); }, cancel() { cancelled = true; } });
  const streamed = new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '1' }, body: stream, duplex: 'half' });
  await assert.rejects(readPreviewBody(streamed), expectCode('PAYLOAD_TOO_LARGE')); assert.ok(cancelled);
});
test('public route exercises real service with only a mocked read-only country repository', async t => {
  let country = destination; const calls = [];
  globalThis.__itineraryRepository = { country: { findUnique: async args => { calls.push(args); if (country instanceof Error) throw country; return country; } } };
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (/auth|providers\/countries|country-import|trip\.service/.test(specifier)) assert.fail('Forbidden dependency');
    return nextResolve(specifier, context);
  }, load(url, context, nextLoad) {
    if (url.endsWith('/lib/db/prisma.ts')) return { format: 'module', shortCircuit: true, source: 'export const db = globalThis.__itineraryRepository;' };
    return nextLoad(url, context);
  } });
  const original = process.env.AI_PROVIDER;
  try {
    process.env.AI_PROVIDER = 'mock';
    t.mock.method(globalThis, 'fetch', () => assert.fail('No external calls'));
    t.mock.method(console, 'log', () => assert.fail('No request logging'));
    t.mock.method(console, 'error', () => assert.fail('No raw error logging'));
    const { POST } = await import('../app/api/itineraries/preview/route.ts');
    for (const [req, status, code] of [[request('{'), 400, 'INVALID_JSON'], [request('{}'), 400, 'VALIDATION_ERROR'], [request('{}', 'text/plain'), 415, 'UNSUPPORTED_MEDIA_TYPE'], [request(' '.repeat(8193)), 413, 'PAYLOAD_TOO_LARGE']]) {
      const response = await POST(req); assert.equal(response.status, status); assert.equal((await response.json()).error.code, code);
    }
    assert.equal(calls.length, 0);
    const response = await POST(request(JSON.stringify(input))); const body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.success, true); assert.equal(body.version, 'v1'); assert.ok(body.requestId); assert.ok(body.timestamp);
    assert.deepEqual(calls[0], { where: { isoCode: 'KE' }, select: { isoCode: true, name: true } });
    country = null; assert.equal((await POST(request(JSON.stringify(input)))).status, 404);
    country = destination; process.env.AI_PROVIDER = 'unimplemented'; assert.equal((await POST(request(JSON.stringify(input)))).status, 503);
    process.env.AI_PROVIDER = 'mock';
    for (const [code, status, generate] of [
      ['AI_INVALID_RESPONSE', 502, async () => ({ malformed: true })],
      ['AI_PROVIDER_UNAVAILABLE', 502, async () => { throw new Error('private provider diagnostic'); }],
      ['AI_TIMEOUT', 504, () => new Promise(() => {})],
    ]) {
      await t.test(`actual POST maps ${code} to ${status}`, async t => {
        t.mock.method(MockAIProvider.prototype, 'generateItinerary', generate);
        const nativeTimeout = globalThis.setTimeout;
        t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => nativeTimeout(callback, delay === 10000 ? 1 : delay, ...args));
        const response = await POST(request(JSON.stringify(input)));
        const envelope = await response.json();
        assert.equal(response.status, status); assert.equal(envelope.error.code, code);
        assert.ok(previewErrorResponseSchema.safeParse(envelope).success);
        assert.doesNotMatch(JSON.stringify(envelope), /private provider diagnostic|malformed/);
      });
    }
    country = new Error('private database diagnostic');
    const failed = await POST(request(JSON.stringify(input))); assert.equal(failed.status, 500); assert.doesNotMatch(await failed.text(), /private database/);
  } finally { hooks.deregister(); delete globalThis.__itineraryRepository; if (original === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = original; }
});
test('presentation escapes content and exposes disclosure, labels and announcement region', async () => {
  const result = await previewItinerary(input, deps);
  result.days[0].activities[0].description = '<img src=x onerror=alert(1)>';
  const html = renderToStaticMarkup(createElement(ItineraryResult, { preview: result }));
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img/);
  const form = renderToStaticMarkup(createElement(ItineraryPlanner, { isoCode: 'KE' }));
  assert.match(form, /This itinerary is not saved/); assert.match(form, /role="status"/); assert.match(form, /aria-live="polite"/);
  for (const name of ['durationDays', 'travellers', 'startDate', 'interests', 'budgetPreference']) assert.ok(form.includes(`name="${name}"`));
  assert.doesNotMatch(form, /href="\/(login|register)|Save itinerary|Download|Share itinerary/);
});

test('response safeParse rejects bad-date without calling unsafe date arithmetic', async () => {
  const preview = await previewItinerary(input, deps);
  for (const startDate of ['bad-date', '', '2028-02-30', '2027-02-29', null, 42, {}]) {
    const malformed = { ...preview, inputs: { ...preview.inputs, startDate } };
    assert.doesNotThrow(() => assert.equal(previewSchema.safeParse(malformed).success, false));
  }
});
const envelope = data => ({ success: true, version: 'v1', requestId: 'ed16b8d7-daca-4136-8f56-29189eb830d4', timestamp: '2028-02-28T12:00:00.000Z', data });
const publicError = { success: false, version: 'v1', requestId: 'ed16b8d7-daca-4136-8f56-29189eb830d4', error: { code: 'NOT_FOUND', message: 'Country not found. Return to country discovery.' } };
test('complete success/error envelopes require metadata and reject extra nested data', async () => {
  const success = envelope(await previewItinerary(input, deps));
  assert.ok(previewResponseSchema.safeParse(success).success);
  assert.ok(previewErrorResponseSchema.safeParse(publicError).success);
  for (const [schema, valid] of [[previewResponseSchema, success], [previewErrorResponseSchema, publicError]]) {
    for (const key of Object.keys(valid)) {
      const missing = { ...valid }; delete missing[key];
      assert.equal(schema.safeParse(missing).success, false, `Missing ${key}`);
    }
    for (const extra of [{ success: !valid.success }, { version: 'v2' }, { requestId: 'fixture' }, { debug: 'private diagnostic' }]) {
      assert.equal(schema.safeParse({ ...valid, ...extra }).success, false);
    }
  }
  for (const timestamp of ['bad-date', '2028-02-30T12:00:00Z', '2028-02-28', '2028-02-28T12:00:00']) {
    assert.equal(previewResponseSchema.safeParse({ ...success, timestamp }).success, false);
  }
  for (const change of [v => { v.data.extra = true; }, v => { v.data.inputs.extra = true; }, v => { v.data.destination.extra = true; }, v => { v.data.days[0].extra = true; }, v => { v.data.days[0].activities[0].extra = true; }]) {
    const invalid = structuredClone(success); change(invalid); assert.equal(previewResponseSchema.safeParse(invalid).success, false);
  }
  for (const error of [{ ...publicError.error, extra: true }, { code: '', message: 'Message' }, { code: 'x'.repeat(65), message: 'Message' }, { code: 'CODE', message: '' }, { code: 'CODE', message: 'x'.repeat(601) }]) {
    assert.equal(previewErrorResponseSchema.safeParse({ ...publicError, error }).success, false);
  }
  assert.equal(previewErrorResponseSchema.safeParse({ ...publicError, timestamp: success.timestamp }).success, false);
});
test('client request path sanitizes JSON/schema/network/arbitrary exceptions and validates public errors', async t => {
  const success = envelope(await previewItinerary(input, deps));
  const fallback = 'The sample planner is unavailable. Please try again.';
  const invalid = 'The sample could not be validated. Please try again.';
  for (const [name, respond, expected] of [
    ['malformed JSON', async () => new Response('private response excerpt', { status: 200 }), fallback],
    ['invalid schema', async () => Response.json({ ...success, data: {} }), invalid],
    ['invalid date', async () => Response.json({ ...success, data: { ...success.data, inputs: { ...input, startDate: 'bad-date' } } }), invalid],
    ['missing metadata', async () => Response.json({ success: true, data: success.data }), invalid],
    ['network rejection', async () => { throw new TypeError('private network diagnostic'); }, fallback],
    ['arbitrary Error', async () => { throw new Error('private arbitrary diagnostic'); }, fallback],
    ['JSON reader exception', async () => ({ ok: true, json() { throw new Error('private reader diagnostic'); } }), fallback],
    ['valid public error', async () => Response.json(publicError, { status: 404 }), publicError.error.message],
    ['malformed error JSON', async () => new Response('private response excerpt', { status: 500 }), fallback],
    ['extra error field', async () => Response.json({ ...publicError, error: { ...publicError.error, detail: 'private diagnostic' } }, { status: 500 }), fallback],
    ['extra envelope field', async () => Response.json({ ...publicError, debug: 'private diagnostic' }, { status: 500 }), fallback],
    ['unvalidated public message', async () => Response.json({ success: false, error: { code: 'CODE', message: 'private unvalidated message' } }, { status: 500 }), fallback],
    ['success envelope on error status', async () => Response.json(success, { status: 500 }), fallback],
    ['error envelope on success status', async () => Response.json(publicError), invalid],
  ]) {
    await t.test(name, async t => {
      t.mock.method(globalThis, 'fetch', respond);
      const result = await requestItineraryPreview(input, new AbortController().signal);
      assert.deepEqual(result, { error: expected }); assert.doesNotMatch(result.error, /private/);
    });
  }
  await t.test('valid success', async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(success));
    assert.deepEqual(await requestItineraryPreview(input, new AbortController().signal), { data: success.data });
  });
  await t.test('abort uses controlled timeout message', async t => {
    const controller = new AbortController(); controller.abort();
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('private abort diagnostic'); });
    assert.deepEqual(await requestItineraryPreview(input, controller.signal), { error: 'The request took too long. Please try again.' });
  });
});
test('provider rejection after generation timeout is handled with zero unhandled rejections', async () => {
  const unhandled = [];
  const listener = error => unhandled.push(error);
  process.on('unhandledRejection', listener);
  let rejectLate;
  const late = new Promise((_, reject) => { rejectLate = reject; });
  try {
    await assert.rejects(previewItinerary(input, { ...deps, deadlineMs: 1, getProvider: () => ({ generateItinerary: () => late }) }), expectCode('AI_TIMEOUT'));
    rejectLate(new Error('synthetic late rejection'));
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally { process.off('unhandledRejection', listener); }
});
