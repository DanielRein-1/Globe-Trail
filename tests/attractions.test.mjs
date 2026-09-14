import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { Prisma } from '@prisma/client';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchPlaces, placesSchema } from '../lib/providers/geoapify.ts';
import { AttractionError } from '../lib/attractions/contracts.ts';
import { validateAttractionRequest } from '../lib/validation/attraction.ts';
import { AttractionsView } from '../components/features/countries/CountryAttractions.tsx';

// Synthetic fixtures, not captured provider data.
const feature = (id = 'fixture-place', name = 'Fixture museum') => ({ type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: { place_id: id, name, categories: ['tourism', 'tourism.sights'] } });
const collection = (...features) => ({ type: 'FeatureCollection', features });
const valid = collection(feature());
const fixedTime = new Date('2026-09-14T00:00:00Z');
const decimal = value => new Prisma.Decimal(value);
const identityKey = (id, provider = 'geoapify', countryId = 'country-id') => `${countryId}:${provider}:${id}`;
let country, rows, calls, clock;
function reset() {
  country = { id: 'country-id', isoCode: 'KE', latitude: decimal(0), longitude: decimal(0), attractionsLastFetchedAt: null };
  rows = new Map(); calls = []; clock = new Date(fixedTime);
}
reset();
const store = {
  country: {
    findUnique: async () => { calls.push('country-read'); return country; },
    update: async ({ data }) => { Object.assign(country, data); return country; },
  },
  attractionCache: {
    upsert: async ({ where, create, update }) => {
      const identity = where.countryId_provider_providerPlaceId;
      const key = identityKey(identity.providerPlaceId, identity.provider, identity.countryId);
      const previous = rows.get(key);
      const data = previous ? { ...previous, ...update } : { id: `db-${key}`, ...create };
      const row = { ...data, latitude: decimal(data.latitude), longitude: decimal(data.longitude) };
      rows.set(key, row); return row;
    },
    findMany: async ({ where, take }) => [...rows.values()].filter(row => row.countryId === where.countryId
      && row.provider === where.provider && row.expiresAt > where.expiresAt.gt)
      .sort((a, b) => a.providerPlaceId.localeCompare(b.providerPlaceId)).slice(0, take),
  },
  $transaction: async callback => {
    const previousCountry = { ...country }, previousRows = new Map(rows);
    try { return await callback(store); }
    catch (error) { country = previousCountry; rows = previousRows; throw error; }
  },
};
globalThis.__attractionsTestStore = store;
const hooks = registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('/lib/db/prisma.ts')) return { format: 'module', shortCircuit: true,
    source: 'export const db = globalThis.__attractionsTestStore;' };
  return nextLoad(url, context);
} });
const { getAttractionsByCountry } = await import('../lib/services/attraction.service.ts');
const route = await import('../app/api/countries/[isoCode]/attractions/route.ts');
hooks.deregister();
delete globalThis.__attractionsTestStore;
const get = (provider = async () => valid) => getAttractionsByCountry('ke', store, provider, () => clock);

test('valid GeoJSON preserves stable place_id, categories, zero coordinates and strips unknown data', async () => {
  const payload = collection({ ...feature(), properties: { ...feature().properties, ignored: 'not persisted' } });
  const result = await fetchPlaces(0, 0, async (url, signal) => {
    assert.equal(url.origin + url.pathname, 'https://api.geoapify.com/v2/places');
    assert.equal(url.searchParams.get('categories'), 'tourism');
    assert.equal(url.searchParams.get('filter'), 'circle:0,0,50000');
    assert.equal(url.searchParams.get('bias'), 'proximity:0,0');
    assert.equal(url.searchParams.get('limit'), '20'); assert.equal(url.searchParams.get('lang'), 'en');
    assert.ok(signal instanceof AbortSignal);
    return payload;
  }, 'fixture-key');
  assert.deepEqual(result, valid);
  assert.deepEqual(placesSchema.parse(collection()).features, []);
});

test('malformed payloads and duplicate identities are rejected completely', async () => {
  const malformed = [null, {}, { type: 'FeatureCollection', features: null }, collection({}),
    collection(feature(), feature()), collection(...Array.from({ length: 21 }, (_, i) => feature(String(i)))),
    collection({ ...feature(), geometry: { type: 'Point', coordinates: [181, 0] } }),
    collection({ ...feature(), properties: { place_id: '', categories: ['tourism'] } }),
    collection({ ...feature(), properties: { place_id: 'id', categories: 'tourism' } }),
    collection({ ...feature(), properties: { place_id: 'id', categories: ['contains,comma'] } })];
  for (const payload of malformed) await assert.rejects(fetchPlaces(0, 0, async () => payload, 'fixture-key'),
    { code: 'PROVIDER_UNAVAILABLE', status: 502 });
});

test('missing key, invalid coordinates, timeout and transport failures stay sanitized', async () => {
  const noCall = () => assert.fail('No provider work allowed');
  await assert.rejects(fetchPlaces(0, 0, noCall, '  '), { code: 'ATTRACTIONS_NOT_CONFIGURED', status: 503 });
  await assert.rejects(fetchPlaces(181, 0, noCall, 'fixture-key'), { code: 'COORDINATES_UNAVAILABLE' });
  for (const error of [new Error('HTTP 429 fixture-key'), new Error('HTTP 500 fixture-key'), new DOMException('fixture-key', 'TimeoutError'), new SyntaxError('fixture-key')]) {
    await assert.rejects(fetchPlaces(0, 0, async () => { throw error; }, 'fixture-key'), failure => {
      assert.equal(failure.status, 502); assert.equal(failure.code, 'PROVIDER_UNAVAILABLE');
      assert.equal(String(failure.stack).includes('fixture-key'), false);
      assert.equal(failure.cause, undefined); return true;
    });
  }
});

test('invalid codes and every query parameter fail before database/provider work', async () => {
  reset();
  assert.equal(validateAttractionRequest('ke'), 'KE');
  for (const code of ['KEN', '1A', '../KE', '']) {
    await assert.rejects(getAttractionsByCountry(code, store), { code: 'VALIDATION_ERROR' });
  }
  for (const [code, query] of [['KEN', ''], ['KE', '?radius=50000'], ['KE', '?limit=20'], ['KE', '?category=tourism'], ['KE', '?unknown=1']]) {
    const response = await route.GET(new Request(`http://localhost/api/countries/${code}/attractions${query}`), { params: Promise.resolve({ isoCode: code }) });
    assert.equal(response.status, 400); assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.deepEqual(calls, []);
});

test('fresh cache uses no provider or key, returns only the public DTO, and preserves zero distance', async () => {
  reset();
  const first = await get();
  const second = await get(() => assert.fail('Fresh cache must not call provider'));
  assert.deepEqual(second, first); assert.equal(rows.size, 1);
  assert.deepEqual(first[0], { providerPlaceId: 'fixture-place', name: 'Fixture museum', categories: ['tourism', 'tourism.sights'], latitude: 0, longitude: 0, distanceMeters: 0 });
  assert.equal('rawJson' in first[0], false); assert.equal('id' in first[0], false);
});

test('expired refresh preserves IDs and mocked trip relationships; omitted rows remain but are excluded', async () => {
  reset();
  await get(async () => collection(feature('one'), feature('omitted')));
  const id = rows.get(identityKey('one')).id;
  const tripDestination = { id: 'destination-id', attractionCacheId: id };
  clock = new Date(+clock + 86_400_000);
  const result = await get(async () => collection(feature('one', 'Updated museum')));
  assert.equal(rows.size, 2); assert.equal(rows.get(identityKey('one')).id, id);
  assert.equal(tripDestination.attractionCacheId, rows.get(identityKey('one')).id);
  assert.deepEqual(result.map(row => row.providerPlaceId), ['one']);
  assert.equal(result[0].name, 'Updated museum');
  assert.ok(rows.get(identityKey('omitted')).expiresAt <= clock);
});

test('successful empty responses persist a timestamp and are reused for 24 hours', async () => {
  reset(); let requests = 0;
  const empty = async () => { requests++; return collection(); };
  assert.deepEqual(await get(empty), []); assert.equal(+country.attractionsLastFetchedAt, +clock);
  clock = new Date(+clock + 86_399_999);
  assert.deepEqual(await get(empty), []); assert.equal(requests, 1);
  clock = new Date(+clock + 1);
  assert.deepEqual(await get(empty), []); assert.equal(requests, 2);
});

test('missing countries/coordinates stop provider work and provider failures leave cache untouched', async () => {
  reset(); country = null;
  await assert.rejects(get(() => assert.fail('No provider request')), { code: 'NOT_FOUND' });
  reset(); country.latitude = null;
  await assert.rejects(get(() => assert.fail('No provider request')), { code: 'COORDINATES_UNAVAILABLE' });
  reset();
  await assert.rejects(get(async () => { throw new AttractionError('PROVIDER_UNAVAILABLE', 502, 'Unavailable'); }));
  assert.equal(country.attractionsLastFetchedAt, null); assert.equal(rows.size, 0);
});

test('overlapping countries each cache the place without changing existing IDs or references', async () => {
  reset(); await get();
  const previous = { ...rows.get(identityKey('fixture-place')) };
  country = { ...country, id: 'other-country', attractionsLastFetchedAt: null };
  assert.equal((await get()).length, 1);
  const other = rows.get(identityKey('fixture-place', 'geoapify', 'other-country'));
  assert.equal(other.countryId, 'other-country');
  assert.notEqual(other.id, previous.id);
  assert.equal(rows.size, 2);
  assert.deepEqual(rows.get(identityKey('fixture-place')), previous);
});

test('deterministic results, unnamed placeholder and atomic rollback on persistence failure', async t => {
  reset();
  const result = await get(async () => collection(feature('z', ' '), feature('a')));
  assert.deepEqual(result.map(row => row.providerPlaceId), ['a', 'z']);
  assert.equal(result[1].name, 'Unnamed place');
  clock = new Date(+clock + 86_400_000);
  const timestamp = country.attractionsLastFetchedAt;
  t.mock.method(store.attractionCache, 'upsert', async () => { throw new Error('Database failure'); });
  await assert.rejects(get());
  assert.equal(country.attractionsLastFetchedAt, timestamp); assert.equal(rows.size, 2);
});

test('route preserves success envelope and safely classifies missing/configuration/internal failures', async t => {
  reset(); await get();
  const request = () => route.GET(new Request('http://localhost/api/countries/KE/attractions'), { params: Promise.resolve({ isoCode: 'KE' }) });
  // Fixed fixture date must be fresh relative to the route clock.
  country.attractionsLastFetchedAt = new Date();
  for (const row of rows.values()) { row.lastFetched = country.attractionsLastFetchedAt; row.expiresAt = new Date(Date.now() + 86400000); }
  let response = await request();
  assert.equal(response.status, 200); assert.equal((await response.json()).data.length, 1);
  country = null; assert.equal((await request()).status, 404);
  reset(); country.longitude = null; assert.equal((await request()).status, 422);
  reset();
  const previousKey = process.env.GEOAPIFY_API_KEY;
  t.after(() => { if (previousKey === undefined) delete process.env.GEOAPIFY_API_KEY; else process.env.GEOAPIFY_API_KEY = previousKey; });
  process.env.GEOAPIFY_API_KEY = '';
  response = await request(); assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'ATTRACTIONS_NOT_CONFIGURED');
  t.mock.method(store.country, 'findUnique', async () => { throw new Error('private diagnostic'); });
  response = await request(); assert.equal(response.status, 500);
  assert.equal(JSON.stringify(await response.json()).includes('private diagnostic'), false);
});

test('fixture UI renders loading, empty, coordinate, retry and escaped result states with attribution', () => {
  const markup = state => renderToStaticMarkup(createElement(AttractionsView, { state, retry() {} }));
  assert.match(markup({ kind: 'loading' }), /role="status"/);
  assert.match(markup({ kind: 'ready', places: [] }), /does not mean there are no attractions/);
  assert.match(markup({ kind: 'coordinates' }), /no usable reference coordinates/);
  assert.match(markup({ kind: 'unavailable' }), /<button[^>]*type="button"[^>]*>Retry nearby places/);
  const html = markup({ kind: 'ready', places: [{ providerPlaceId: 'fixture', name: '<script>bad</script>', categories: ['tourism'], latitude: 0, longitude: 0, distanceMeters: 0 }] });
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /0.0 km from reference point/); assert.match(html, /Geoapify/);
  assert.match(html, /OpenStreetMap contributors/); assert.match(html, /may include places across a border/);
});


test('native transport rejects HTTP errors, invalid JSON, oversize bodies and maps malformed data to route 502', async t => {
  const previousKey = process.env.GEOAPIFY_API_KEY;
  process.env.GEOAPIFY_API_KEY = 'fixture-key';
  try {
    for (const [status, body] of [[429, '{}'], [500, '{}'], [302, '{}'], [200, 'invalid JSON'], [200, 'null'], [200, 'x'.repeat(1_048_577)]]) {
      const mocked = t.mock.method(https, 'get', (_url, _options, callback) => {
        const request = new EventEmitter();
        request.destroy = () => {};
        queueMicrotask(() => {
          const response = new EventEmitter();
          response.statusCode = status; response.resume = () => {};
          callback(response);
          response.emit('data', Buffer.from(body)); response.emit('end');
        });
        return request;
      });
      syncBuiltinESMExports();
      try {
        reset();
        const result = await route.GET(new Request('http://localhost/api/countries/KE/attractions'), { params: Promise.resolve({ isoCode: 'KE' }) });
        assert.equal(result.status, 502);
        const payload = await result.json();
        assert.equal(payload.error.code, 'PROVIDER_UNAVAILABLE');
        assert.equal(JSON.stringify(payload).includes('fixture-key'), false);
        assert.equal(country.attractionsLastFetchedAt, null); assert.equal(rows.size, 0);
      } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
    }
  } finally {
    if (previousKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = previousKey;
  }
});


test('legacy provider identities cannot collide with Geoapify IDs or lose trip references', async () => {
  reset();
  const legacy = { id: 'legacy-attraction-id', countryId: country.id, provider: 'opentripmap',
    providerPlaceId: 'fixture-place', openTripMapId: 'fixture-place', name: 'Legacy place' };
  rows.set(identityKey('fixture-place', 'opentripmap'), legacy);
  const destination = { attractionCacheId: legacy.id };
  const result = await get();
  assert.equal(rows.size, 2);
  assert.deepEqual(rows.get(identityKey('fixture-place', 'opentripmap')), legacy);
  assert.equal(destination.attractionCacheId, legacy.id);
  assert.notEqual(rows.get(identityKey('fixture-place')).id, legacy.id);
  assert.equal(result.length, 1); assert.equal(result[0].name, 'Fixture museum');
});

test('fresh cache reads unexpired country rows regardless of lastFetched timestamps', async () => {
  reset(); await get();
  const row = rows.get(identityKey('fixture-place'));
  row.lastFetched = new Date(+clock - 1000);
  const result = await get(() => assert.fail('Fresh cache must not fetch'));
  assert.equal(result.length, 1);
  assert.equal(result[0].providerPlaceId, 'fixture-place');
});

test('a refresh returns only its upserts even when other stored rows remain unexpired', async () => {
  reset(); await get(async () => collection(feature('retained')));
  country.attractionsLastFetchedAt = null;
  const result = await get(async () => collection(feature('new')));
  assert.deepEqual(result.map(row => row.providerPlaceId), ['new']);
  assert.equal(rows.size, 2);
  assert.deepEqual((await get(() => assert.fail('Fresh cache'))).map(row => row.providerPlaceId), ['new', 'retained']);
  country.attractionsLastFetchedAt = null;
  assert.deepEqual(await get(async () => collection()), []);
  assert.equal(rows.size, 2);
});

test('failed refresh rolls back a partial write and preserves the previous timestamp and rows', async t => {
  reset(); await get();
  const previousRows = new Map(rows), previousTimestamp = country.attractionsLastFetchedAt;
  clock = new Date(+clock + 86_400_000);
  const original = store.attractionCache.upsert;
  let writes = 0;
  t.mock.method(store.attractionCache, 'upsert', async args => {
    if (++writes === 2) throw new Error('Persistence failure after first write');
    return original(args);
  });
  await assert.rejects(get(async () => collection(feature('fixture-place', 'Changed'), feature('new'))));
  assert.deepEqual(rows, previousRows);
  assert.equal(country.attractionsLastFetchedAt, previousTimestamp);
  await assert.rejects(get(async () => { throw new AttractionError('PROVIDER_UNAVAILABLE', 502, 'Unavailable'); }));
  assert.deepEqual(rows, previousRows);
  assert.equal(country.attractionsLastFetchedAt, previousTimestamp);
});

test('mocked overlapping refreshes return their own complete rows despite identical timestamps and later commits', async t => {
  const pairs = [
    [collection(feature('same', 'First name')), collection(feature('same', 'Second name'))],
    [collection(feature('first')), collection(feature('second'))],
    [valid, collection()],
    [collection(), valid],
  ];
  for (const [index, payloads] of pairs.entries()) await t.test(`interleaving ${index + 1}`, async t => {
    reset();
    const providersReady = Promise.withResolvers();
    const secondCommitted = Promise.withResolvers();
    let providerCalls = 0, transactions = 0, tail = Promise.resolve();
    const originalTransaction = store.$transaction;
    // Model the PostgreSQL country-row lock. This is not a real lock/FK integration test.
    t.mock.method(store, '$transaction', async (callback, options) => {
      assert.equal(options.isolationLevel, 'ReadCommitted');
      const turn = ++transactions, previous = tail, unlocked = Promise.withResolvers();
      tail = unlocked.promise;
      await previous;
      let result;
      try {
        result = await originalTransaction(async tx => {
          let countryLocked = false;
          return callback({
            country: { update: async args => {
              const updated = await tx.country.update(args); countryLocked = true; return updated;
            } },
            attractionCache: { upsert: async args => {
              assert.ok(countryLocked, 'Country lock must precede every upsert');
              return tx.attractionCache.upsert(args);
            } },
          });
        });
      } finally { unlocked.resolve(); }
      if (turn === 1) await secondCommitted.promise;
      else secondCommitted.resolve();
      return result;
    });
    const provider = async () => {
      const payload = payloads[providerCalls++];
      if (providerCalls === 2) providersReady.resolve();
      await providersReady.promise;
      return payload;
    };
    const results = await Promise.all([get(provider), get(provider)]);
    assert.equal(transactions, 2);
    for (let i = 0; i < 2; i++) {
      assert.deepEqual(results[i].map(row => row.name), payloads[i].features.map(row => row.properties.name));
    }
    const identities = new Set(payloads.flatMap(payload => payload.features.map(row => row.properties.place_id)));
    assert.equal(rows.size, identities.size);
    assert.equal(new Set([...rows.values()].map(row => row.id)).size, rows.size);
  });
});
