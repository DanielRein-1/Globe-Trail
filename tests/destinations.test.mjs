import { test } from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { destinationQuerySchema, readDestinationQuery } from '../lib/validation/destination.ts';
import { DestinationError, searchResponseSchema, destinationErrorSchema } from '../lib/destinations/contracts.ts';
import { searchDestinations, resolveDestination } from '../lib/providers/geoapify-destinations.ts';
import { destinationRequest, readDestinationJSON } from '../lib/providers/geoapify-destination-transport.ts';
import { GET } from '../app/api/destinations/search/route.ts';
import { POST } from '../app/api/itineraries/preview/route.ts';
import { previewItinerary } from '../lib/services/itinerary.service.ts';
import { previewResponseSchema } from '../lib/itineraries/contracts.ts';
import { requestDestinationSearch } from '../hooks/use-destination-search.ts';
import { DestinationChoices, DestinationSearch } from '../components/features/destinations/DestinationSearch.tsx';
import { fixtureDestination, fixtureResolved, collection, searchFeature, detailsFeature } from './fixtures/destinations.mjs';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (/db\/prisma|providers\/countries|country-import|lib\/auth/.test(specifier)) assert.fail('Forbidden database/auth/country-provider dependency');
  return nextResolve(specifier, context);
} });

const query = { countryCode: 'KE', query: 'Maasai Mara' };
const options = { key: 'synthetic-test-key' };
const planning = { destinationCode: 'KE', destinationReference: fixtureDestination.reference, durationDays: 3, travellers: 2, interests: ['nature'], budgetPreference: 'balanced' };
const envelope = data => ({ success: true, version: 'v1', requestId: 'ed16b8d7-daca-4136-8f56-29189eb830d4', timestamp: '2026-09-14T00:00:00.000Z', data });
const code = expected => error => error instanceof DestinationError && error.code === expected;
function wire(t, respond) {
  t.mock.method(https, 'get', (url, _options, callback) => {
    const request = new EventEmitter(); request.destroy = () => {};
    queueMicrotask(() => {
      const response = new EventEmitter(); response.statusCode = 200; response.resume = () => {}; response.destroy = () => { response.emit('close'); };
      callback(response); respond(url, response, request);
    });
    return request;
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
}
const send = (response, data) => { response.emit('data', Buffer.from(JSON.stringify(data))); response.emit('end'); };

test('search validates ISO country, visible query, duplicates and unknown params before I/O', async () => {
  for (const value of [{ ...query, countryCode: 'ZZ' }, { ...query, countryCode: 'KEN' }, { ...query, query: ' a b ' },
    { ...query, query: 'a\u200bb' }, { ...query, query: 'x'.repeat(101) }, { ...query, latitude: 1 }]) {
    assert.equal(destinationQuerySchema.safeParse(value).success, false);
    await assert.rejects(searchDestinations(value, { transport: () => assert.fail('No provider work') }), code('VALIDATION_ERROR'));
  }
  assert.deepEqual(destinationQuerySchema.parse({ countryCode: ' ke ', query: '  Nairobi  ' }), { countryCode: 'KE', query: 'Nairobi' });
  for (const params of ['countryCode=KE&query=Nairobi&query=Mara', 'countryCode=KE&query=Nairobi&limit=100']) assert.equal(readDestinationQuery(new URLSearchParams(params)).success, false);
});
test('original and only curated alias are queried; exact refs deduplicate, equal names do not', async () => {
  const calls = [];
  const results = await searchDestinations(query, { ...options, transport: async url => {
    calls.push(Object.fromEntries([...url.searchParams].filter(([k]) => k !== 'apiKey')));
    return calls.length === 1 ? collection(searchFeature('one')) : collection(searchFeature('one'), searchFeature('two'));
  } });
  assert.deepEqual(calls.map(c => c.text), ['Maasai Mara', 'Masai Mara']);
  assert.ok(calls.every(c => c.filter === 'countrycode:ke' && c.bias === 'countrycode:none' && c.limit === '10' && c.lang === 'en'));
  assert.deepEqual(results.map(p => p.reference), ['one', 'two']);
  assert.equal(results[0].name, results[1].name);
  calls.length = 0;
  await searchDestinations({ ...query, query: 'Maasai village' }, { ...options, transport: async url => { calls.push(url); return collection(); } });
  assert.equal(calls.length, 1);
});
test('protected amenities survive poor ranking; unsuitable facilities excluded', async () => {
  const rejected = [
    { name: 'Reserve Gate', category: 'building' }, { name: 'Reserve University', category: 'education.university' },
    { name: 'Park Road', result_type: 'street' }, { name: 'Reserve Shop', category: 'commercial' },
    { name: 'Reserve Lodge', category: 'accommodation' }, { name: 'Reserve sewerage', category: 'natural.water' },
  ].map((p, i) => searchFeature(`bad-${i}`, p));
  const results = await searchDestinations({ ...query, query: 'Reserve' }, { ...options, transport: async () => collection(...rejected, searchFeature()) });
  assert.deepEqual(results, [fixtureDestination]);
  const html = renderToStaticMarkup(createElement(DestinationChoices, { state: { kind: 'ready', results }, selected: null, onSelect() {} }));
  assert.doesNotMatch(html, /checked=""/); assert.match(html, /result order is not a recommendation/);
});
test('malformed provider responses and country contradictions are rejected, not partially returned', async () => {
  for (const raw of [null, {}, collection({ ...searchFeature(), geometry: { type: 'Point', coordinates: [181, 0] } }),
    collection(searchFeature('wrong', { country_code: 'ug' })), collection(...Array.from({ length: 11 }, (_, i) => searchFeature(String(i))))]) {
    await assert.rejects(searchDestinations({ ...query, query: 'Reserve' }, { ...options, transport: async () => raw }), code('DESTINATION_INVALID_RESPONSE'));
  }
});
test('Point, Polygon and MultiPolygon details resolve different IDs using canonical provider facts, including zero coordinates', async () => {
  const polygon = { type: 'Polygon', coordinates: [[[-1, -1], [1, -1], [0, 1], [-1, -1]]] };
  for (const geometry of [{ type: 'Point', coordinates: [0, 0] }, polygon, { type: 'MultiPolygon', coordinates: [polygon.coordinates] }]) {
    const feature = detailsFeature(geometry); feature.properties.lon = 0; feature.properties.lat = 0; feature.bbox = [-1, -1, 1, 1];
    const result = await resolveDestination({ countryCode: 'KE', reference: 'search-ref' }, { ...options, transport: async url => {
      assert.equal(url.searchParams.get('id'), 'search-ref'); assert.equal(url.pathname, '/v2/place-details'); return collection(feature);
    } });
    assert.equal(result.reference, 'search-ref'); assert.equal(result.detailsId, 'fixture-reserve-details');
    assert.equal(result.latitude, 0); assert.equal(result.longitude, 0);
  }
});
test('resolution rejects contradictions, missing coordinates, invalid rings, multiple features and browser facts', async () => {
  const wrongCountry = detailsFeature(); wrongCountry.properties.country_code = 'ug';
  const missingCoordinates = detailsFeature(); delete missingCoordinates.properties.lat;
  const badRing = detailsFeature({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [3, 3]]] });
  const noIdentity = detailsFeature(); delete noIdentity.properties.place_id;
  const noName = detailsFeature(); delete noName.properties.name;
  for (const raw of [collection(wrongCountry), collection(missingCoordinates), collection(badRing), collection(noIdentity), collection(noName), collection(), collection(detailsFeature(), detailsFeature())]) {
    await assert.rejects(resolveDestination({ countryCode: 'KE', reference: 'ref' }, { ...options, transport: async () => raw }), code('DESTINATION_INVALID_RESPONSE'));
  }
  for (const extra of [{ reference: 'x'.repeat(2049) }, { reference: 'https://other-host' }, { name: 'Forged name' }, { latitude: 0 }]) {
    await assert.rejects(resolveDestination({ countryCode: 'KE', reference: 'ref', ...extra }, { transport: () => assert.fail('No I/O') }), code('VALIDATION_ERROR'));
  }
});
test('configuration, timeout and arbitrary failures use controlled messages', async () => {
  await assert.rejects(searchDestinations(query, { key: '', transport: () => assert.fail('No I/O') }), code('DESTINATIONS_NOT_CONFIGURED'));
  await assert.rejects(searchDestinations(query, { ...options, timeoutMs: 1, transport: () => new Promise(() => {}) }), code('DESTINATION_TIMEOUT'));
  await assert.rejects(searchDestinations(query, { ...options, transport: () => { throw new Error('private credential diagnostic'); } }), error => code('DESTINATION_PROVIDER_UNAVAILABLE')(error) && !error.message.includes('private'));
});
test('native transport rejects oversized, malformed UTF-8/JSON, redirects and HTTP errors', async t => {
  for (const scenario of ['oversized', 'json', 'utf8', 'http', 'redirect']) await t.test(scenario, async t => {
    wire(t, (_url, response) => {
      if (scenario === 'oversized') response.emit('data', Buffer.alloc(1048577));
      else if (scenario === 'utf8') response.emit('data', Buffer.from([255]));
      else response.emit('data', Buffer.from('{'));
      response.emit('end');
    });
    if (scenario === 'http' || scenario === 'redirect') {
      t.mock.method(https, 'get', (_url, _opts, callback) => { const req = new EventEmitter(); req.destroy = () => {}; queueMicrotask(() => { const res = new EventEmitter(); res.statusCode = scenario === 'http' ? 503 : 302; res.destroy = () => {}; callback(res); }); return req; }); syncBuiltinESMExports();
    }
    await assert.rejects(readDestinationJSON(new URL('https://fixture.invalid'), new AbortController().signal), error => error instanceof DestinationError);
  });
});
test('actual routes validate before I/O, sanitize failures and return complete envelopes without database imports', async t => {
  const previous = process.env.GEOAPIFY_API_KEY; process.env.GEOAPIFY_API_KEY = options.key;
  t.after(() => { if (previous === undefined) delete process.env.GEOAPIFY_API_KEY; else process.env.GEOAPIFY_API_KEY = previous; });
  let calls = 0;
  wire(t, (url, res) => { calls++; send(res, url.pathname.includes('place-details') ? collection(detailsFeature()) : collection(searchFeature())); });
  const invalid = await GET(new Request('http://localhost/api/destinations/search?countryCode=ZZ&query=Park'));
  assert.equal(invalid.status, 400); assert.ok(destinationErrorSchema.safeParse(await invalid.json()).success); assert.equal(calls, 0);
  const searched = await GET(new Request('http://localhost/api/destinations/search?countryCode=KE&query=Reserve'));
  const body = await searched.json(); assert.ok(searchResponseSchema.safeParse(body).success); assert.doesNotMatch(JSON.stringify(body), /synthetic-test-key|rawJson|apiKey/);
  const request = values => new Request('http://localhost/api/itineraries/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
  const before = calls;
  const forged = await POST(request({ ...planning, name: 'Forged', latitude: 0 })); assert.equal(forged.status, 400); assert.equal(calls, before);
  const result = await POST(request(planning)); assert.equal(result.status, 200); const preview = await result.json(); assert.ok(previewResponseSchema.safeParse(preview).success);
  assert.equal(preview.data.destination.name, fixtureDestination.name); assert.equal(preview.data.destination.place.reference, planning.destinationReference);
  assert.equal(calls, before + 1);
  wire(t, (_url, res) => send(res, collection({ ...detailsFeature(), properties: { ...detailsFeature().properties, country_code: 'ug' } })));
  const failed = await POST(request(planning)); assert.equal(failed.status, 502); assert.ok(destinationErrorSchema.safeParse(await failed.json()).success);
});
test('mock is deterministic, explicitly destination-specific; country planning stays v1 and never resolves a place', async () => {
  const deps = { resolvePlace: async () => fixtureResolved, findDestination: () => assert.fail('No DB for selected place') };
  const first = await previewItinerary(planning, deps);
  assert.deepEqual(first, await previewItinerary(planning, deps)); assert.equal(first.schemaVersion, 'itinerary.v2');
  assert.ok(first.title.includes(fixtureDestination.name)); assert.ok(first.days.every(d => d.activities.every(a => a.description.includes(fixtureDestination.name))));
  const { destinationReference, ...countryInput } = planning; assert.ok(destinationReference);
  const country = await previewItinerary(countryInput, { findDestination: async () => ({ isoCode: 'KE', name: 'Kenya' }), resolvePlace: () => assert.fail('No details') });
  assert.equal(country.schemaVersion, 'itinerary.v1'); assert.equal(country.destination.place, undefined);
});
test('complete search envelopes and client failures are validated and sanitized', async t => {
  const success = envelope([fixtureDestination]);
  for (const key of Object.keys(success)) { const missing = { ...success }; delete missing[key]; assert.equal(searchResponseSchema.safeParse(missing).success, false); }
  assert.equal(searchResponseSchema.safeParse({ ...success, raw: true }).success, false);
  for (const response of [() => new Response('{'), () => Response.json({ ...success, data: [{ ...fixtureDestination, rawJson: {} }] }), () => { throw new Error('private diagnostic'); }]) {
    t.mock.method(globalThis, 'fetch', response);
    const state = await requestDestinationSearch('KE', 'Reserve', new AbortController().signal);
    assert.equal(state.kind, 'error'); assert.doesNotMatch(state.message, /private|rawJson/);
  }
  t.mock.method(globalThis, 'fetch', () => assert.fail('No request on invalid input'));
  assert.equal((await requestDestinationSearch('KE', 'ab', new AbortController().signal)).kind, 'error');
});
test('presentation escapes labels, retains same-name choices, empty state and explicit country option', () => {
  const results = [fixtureDestination, { ...fixtureDestination, reference: 'another', name: '<script>bad</script>' }];
  const html = renderToStaticMarkup(createElement(DestinationChoices, { state: { kind: 'ready', results }, selected: null, onSelect() {} }));
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>|checked=""/);
  assert.match(renderToStaticMarkup(createElement(DestinationChoices, { state: { kind: 'ready', results: [] }, selected: null, onSelect() {} })), /No suitable destinations/);
  const initial = renderToStaticMarkup(createElement(DestinationSearch, { isoCode: 'KE', countryName: 'Kenya', mode: 'place', selected: null, disabled: false, onMode() {}, onSelect() {} }));
  assert.match(initial, /Anywhere in Kenya/); assert.match(initial, /Enter a destination name/); assert.match(initial, /role="status"/);
});

test('unexpected query keys including prototype names and duplicate allowed keys fail closed', () => {
  for (const suffix of ['__proto__=x', '**proto**=x', 'constructor=x', 'prototype=x', 'unknown=x', 'query=second', 'countryCode=UG']) {
    assert.equal(readDestinationQuery(new URLSearchParams(`countryCode=KE&query=Nairobi&${suffix}`)).success, false, suffix);
  }
});

test('protected-area context preserves Hell’s Gate but not entrances or park-named facilities', async () => {
  const results = await searchDestinations({ ...query, query: 'Gate' }, { ...options, transport: async () => collection(
    searchFeature('protected', { name: 'Hell’s Gate National Park' }),
    searchFeature('gate', { name: 'Talek Gate' }),
    searchFeature('entrance', { name: 'National Park Entrance' }),
    searchFeature('shop', { name: 'National Park Shop', category: 'commercial' }),
    searchFeature('university', { name: 'National Park University', category: 'education.university' }),
    searchFeature('hotel', { name: 'National Park Hotel', category: 'accommodation.hotel' }),
    searchFeature('road', { name: 'National Park Road', result_type: 'street' }),
    searchFeature('building', { name: 'National Park Office', result_type: 'building' }),
    searchFeature('unclassified-gate', { name: 'Park Gate', category: 'leisure.park' }),
  ) });
  assert.deepEqual(results.map(p => p.reference), ['protected']);
});

test('details reject incomplete pairs, contradictory points, outside bounds and degenerate rings', async () => {
  const incomplete = detailsFeature({ type: 'Point', coordinates: [35, -1] }); delete incomplete.properties.lat;
  const contradictory = detailsFeature({ type: 'Point', coordinates: [35, -1] }); contradictory.properties.lon = 0; contradictory.properties.lat = 0;
  const outside = detailsFeature(); outside.properties.lon = 0;
  const identical = detailsFeature({ type: 'Polygon', coordinates: [[[35, -1], [35, -1], [35, -1], [35, -1]]] });
  const collinear = detailsFeature({ type: 'Polygon', coordinates: [[[34, -1], [35, -1], [36, -1], [34, -1]]] });
  for (const feature of [incomplete, contradictory, outside, identical, collinear]) {
    await assert.rejects(resolveDestination({ countryCode: 'KE', reference: 'fixture' }, { ...options, transport: async () => collection(feature) }), code('DESTINATION_INVALID_RESPONSE'));
  }
});

test('minimal rings, MultiPolygon and antimeridian containment are accepted without vertex matching', async () => {
  const coordinates = [[[179, -1], [-179, -1], [180, 1], [179, -1]]];
  for (const geometry of [{ type: 'Polygon', coordinates }, { type: 'MultiPolygon', coordinates: [coordinates] }]) {
    const feature = detailsFeature(geometry); feature.bbox = [178, -2, -178, 2];
    feature.properties.lon = -179.5; feature.properties.lat = 0;
    const result = await resolveDestination({ countryCode: 'KE', reference: 'fixture' }, { ...options, transport: async () => collection(feature) });
    assert.equal(result.longitude, -179.5);
    feature.properties.lon = 0;
    await assert.rejects(resolveDestination({ countryCode: 'KE', reference: 'fixture' }, { ...options, transport: async () => collection(feature) }), code('DESTINATION_INVALID_RESPONSE'));
  }
  const close = detailsFeature({ type: 'Point', coordinates: [35 + 5e-7, -1] });
  assert.ok(await resolveDestination({ countryCode: 'KE', reference: 'fixture' }, { ...options, transport: async () => collection(close) }));
});

test('transport terminates errors and removes owned listeners after close', async t => {
  for (const scenario of ['non-2xx', 'redirect', 'oversized', 'timeout', 'parsing']) await t.test(scenario, async t => {
    let request, response;
    t.mock.method(https, 'get', (_url, _options, callback) => {
      request = new EventEmitter(); request.destroyed = false;
      response = new EventEmitter(); response.destroyed = false;
      for (const stream of [request, response]) stream.destroy = () => {
        stream.destroyed = true;
        queueMicrotask(() => { stream.emit('error', new Error('synthetic late transport error')); stream.emit('close'); });
      };
      queueMicrotask(() => {
        response.statusCode = scenario === 'non-2xx' ? 503 : scenario === 'redirect' ? 302 : 200;
        callback(response);
        if (scenario === 'oversized') response.emit('data', Buffer.alloc(1048577));
        if (scenario === 'parsing') { response.emit('data', Buffer.from('{')); response.emit('end'); }
      });
      return request;
    });
    syncBuiltinESMExports();
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
    await assert.rejects(destinationRequest('/v1/geocode/search', {}, { ...options, timeoutMs: 5 }), code(scenario === 'timeout' ? 'DESTINATION_TIMEOUT' : ['oversized', 'parsing'].includes(scenario) ? 'DESTINATION_INVALID_RESPONSE' : 'DESTINATION_PROVIDER_UNAVAILABLE'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(request.destroyed, true); assert.equal(response.destroyed, true);
    assert.deepEqual(request.eventNames(), []); assert.deepEqual(response.eventNames(), []);
  });
});

test('provider rejection after timeout has no unhandled rejection', async () => {
  const unhandled = [];
  const listener = error => unhandled.push(error);
  process.on('unhandledRejection', listener);
  try {
    await assert.rejects(destinationRequest('/v1/geocode/search', {}, { ...options, timeoutMs: 1,
      transport: () => new Promise((_, reject) => setTimeout(() => reject(new Error('synthetic late failure')), 10)),
    }), code('DESTINATION_TIMEOUT'));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.deepEqual(unhandled, []);
  } finally { process.off('unhandledRejection', listener); }
});

test('early proxy validates original URL keys; direct calls do not prove adapter behavior', async () => {
  const { proxy } = await import('../proxy.ts');
  const { NextRequest } = await import('next/server.js');
  for (const suffix of ['__proto__=x', '%5F%5Fproto%5F%5F=x', '**proto**=x', 'constructor=x', 'prototype=x', 'unknown=x', 'countryCode=UG', 'query=second']) {
    const response = proxy(new NextRequest(`http://localhost/api/destinations/search?countryCode=KE&query=Nairobi&${suffix}`));
    assert.equal(response.status, 400, suffix);
    assert.ok(destinationErrorSchema.safeParse(await response.json()).success);
  }
  assert.equal(proxy(new NextRequest('http://localhost/api/destinations/search?countryCode=KE&query=Nairobi')).headers.get('x-middleware-next'), '1');
});
