import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import fixtures from './fixtures/countries.json' with { type: 'json' };
import * as provider from '../lib/providers/countries.ts';
import * as validation from '../lib/validation/country.ts';
import { importCountries, upsertCountry } from '../lib/services/country-import.service.ts';
const kenya = fixtures.find(country => country.alpha2Code === 'KE');
const response = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test('real provider fixtures validate and map without losing zero, dates, or population precision', () => {
  for (const fixture of fixtures) provider.providerCountrySchema.parse(fixture);
  const date = new Date('2026-09-12T00:00:00Z');
  const mapped = provider.mapCountry(provider.providerCountrySchema.parse(kenya), date);
  assert.equal(mapped.isoCode, 'KE');
  assert.equal(mapped.population, 53771300n);
  assert.equal(mapped.currency, 'Kenyan shilling');
  assert.equal(mapped.flagUrl, 'https://flagcdn.com/ke.svg');
  assert.equal(mapped.lastSynced, date);
  const minimal = provider.providerCountrySchema.parse({ name: 'Test', alpha2Code: 'ZZ', alpha3Code: 'ZZZ', latlng: [0, 0], population: 0 });
  assert.deepEqual(Object.fromEntries(Object.entries(provider.mapCountry(minimal)).filter(([key]) => ['capital', 'currency', 'flagUrl', 'continent'].includes(key))), { capital: null, continent: null, currency: null, flagUrl: null });
  assert.equal(provider.mapCountry(minimal).latitude, 0);
  assert.equal(provider.mapCountry(minimal).population, 0n);
});

test('provider rejects malformed shapes, unsafe numbers, and out-of-range coordinates', () => {
  for (const mutation of [{ name: '' }, { alpha2Code: 'KEN' }, { population: -1 }, { population: Number.MAX_SAFE_INTEGER + 1 }, { latlng: [91, 0] }, { flags: { svg: 'javascript:alert(1)' } }]) {
    assert.equal(provider.providerCountrySchema.safeParse({ ...kenya, ...mutation }).success, false);
  }
});

test('provider handles 404, HTTP errors, invalid JSON, mismatched codes, and network failures', async () => {
  assert.equal(await provider.fetchCountry('zz', response({}, 404)), null);
  for (const fetcher of [response({}, 429), response({}, 500), response([]), response({ ...kenya, alpha2Code: 'JP' }), async () => { throw new Error('private diagnostic'); }, async () => new Response('invalid')]) {
    await assert.rejects(provider.fetchCountry('KE', fetcher), { message: 'Country information is temporarily unavailable.' });
  }
  await provider.fetchCountry('ke', async (url, options) => {
    assert.equal(url, 'https://countries.dev/alpha/KE');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify(kenya));
  });
});

test('provider distinguishes HTTP 404 from malformed HTTP 200 JSON null', async () => {
  assert.equal(await provider.fetchCountry('KE', response(null, 404)), null);
  await assert.rejects(provider.fetchCountry('KE', response(null, 200)), provider.CountryProviderError);
});

test('provider validates every import row and rejects duplicates and empty imports', async () => {
  for (const data of [[], {}, [kenya, { name: 'bad' }], [kenya, kenya]]) {
    await assert.rejects(provider.fetchAllCountries(response(data)), provider.CountryProviderError);
  }
});

test('pagination is bounded and does not accept partial integers or repeated parameters', () => {
  assert.deepEqual(validation.countryQuerySchema.parse({}), { search: '', continent: '', page: 1, limit: 20 });
  assert.equal(validation.readCountryQuery(new URLSearchParams('search= Kenya &continent=Africa&page=2&limit=12')).data.search, 'Kenya');
  for (const query of ['page=0', 'page=-1', 'page=2junk', 'page=1.5', 'page=10001', 'limit=101', 'limit=0', 'page=1&page=2', 'search=a&search=b', 'continent=World', `search=${'x'.repeat(101)}`]) {
    assert.equal(validation.readCountryQuery(new URLSearchParams(query)).success, false, query);
  }
  for (const region of validation.REGIONS) assert.ok(validation.countryQuerySchema.safeParse({ continent: region }).success);
});

test('country codes normalize and return navigation only uses validated query fields', () => {
  assert.equal(validation.countryCodeSchema.parse(' ke '), 'KE');
  for (const code of ['KEN', '../KE', '', '1A', 'K']) assert.equal(validation.countryCodeSchema.safeParse(code).success, false);
  const query = validation.countryQuerySchema.parse({ search: 'A & B', continent: 'Africa', page: '2', limit: '12', returnTo: 'https://example.com' });
  const params = validation.countryQueryString(query);
  assert.equal(new URLSearchParams(params).get('search'), 'A & B');
  assert.equal(new URLSearchParams(params).get('page'), '2');
  assert.equal(params.includes('example.com'), false);
});

test('repeatable imports preserve IDs and references and refresh mapped data', async () => {
  const rows = new Map([['KE', { id: 'existing-country-id', name: 'Old name', referencedBy: 'existing-trip' }]]);
  const store = { country: { upsert: async ({ where, create, update }) => {
    assert.equal('id' in create, false); assert.equal('id' in update, false);
    const row = rows.has(where.isoCode) ? { ...rows.get(where.isoCode), ...update } : { id: `new-${where.isoCode}`, ...create };
    rows.set(where.isoCode, row); return row;
  } } };
  await importCountries(store, response([kenya]));
  await importCountries(store, response([kenya]));
  assert.equal(rows.size, 1);
  assert.equal(rows.get('KE').id, 'existing-country-id');
  assert.equal(rows.get('KE').referencedBy, 'existing-trip');
  assert.equal(rows.get('KE').name, 'Kenya');
  assert.ok(rows.get('KE').lastSynced instanceof Date);
  await assert.rejects(importCountries({ country: { upsert: () => assert.fail('No writes before complete validation') } }, response([kenya, {}])));
  await assert.rejects(upsertCountry({ country: { upsert: async () => { throw new Error('write failure'); } } }, kenya), /write failure/);
});

test('disabled sync returns the existing error envelope without loading services or a database client', async () => {
  const hooks = registerHooks({ resolve(request, context, nextResolve) {
    if (/country\.service|country-import|providers\/countries|db\/prisma/.test(request)) assert.fail(`Forbidden dependency: ${request}`);
    return nextResolve(request, context);
  } });
  try {
    const { POST } = await import('../app/api/countries/sync/route.ts');
    const res = await POST();
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false); assert.equal(body.version, 'v1');
    assert.equal(body.error.code, 'SYNC_DISABLED');
    assert.match(body.requestId, /^[a-f0-9-]{36}$/);
    assert.match(body.error.message, /local country import command/);
  } finally { hooks.deregister(); }
});

test('country API validation rejects bad inputs before data access; valid list preserves its envelope', async t => {
  const hooks = registerHooks({ load(url, context, nextLoad) {
    if (url.endsWith('/lib/db/prisma.ts')) return {
      format: 'module', shortCircuit: true,
      source: `export const calls = [];
        export const db = { country: {
          count: async args => { calls.push(['count', args]); return 1; },
          findMany: async args => { calls.push(['findMany', args]); return [{ isoCode: 'KE', name: 'Kenya', population: 53771300n }]; },
          findUnique: async () => { calls.push(['findUnique']); return null; }
        } };`,
    };
    return nextLoad(url, context);
  } });
  try {
    const list = await import('../app/api/countries/route.ts');
    const detail = await import('../app/api/countries/[isoCode]/route.ts');
    const { calls } = await import('../lib/db/prisma.ts');
    for (const query of ['page=0', 'limit=101', 'continent=World', 'search=a&search=b']) {
      const res = await list.GET(new Request(`http://localhost/api/countries?${query}`));
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
    }
    assert.equal((await detail.GET(new Request('http://localhost/api/countries/KEN'), { params: Promise.resolve({ isoCode: 'KEN' }) })).status, 400);
    assert.equal(calls.length, 0);
    const res = await list.GET(new Request('http://localhost/api/countries?search=Kenya&continent=Africa&page=2&limit=6'));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.data[0].population, '53771300');
    assert.deepEqual(body.data.meta, { page: 2, limit: 6, total: 1, totalPages: 1 });
    assert.equal(calls[1][1].skip, 6);
    assert.equal(calls[1][1].where.name.mode, 'insensitive');
    for (const [providerStatus, expectedStatus, code] of [[404, 404, 'NOT_FOUND'], [200, 502, 'PROVIDER_UNAVAILABLE']]) {
      await t.test(`detail maps provider HTTP ${providerStatus} with JSON null to HTTP ${expectedStatus}`, async t => {
        t.mock.method(globalThis, 'fetch', response(null, providerStatus));
        const res = await detail.GET(new Request('http://localhost/api/countries/KE'), { params: Promise.resolve({ isoCode: 'KE' }) });
        assert.equal(res.status, expectedStatus);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, code);
      });
    }
  } finally { hooks.deregister(); }
});
