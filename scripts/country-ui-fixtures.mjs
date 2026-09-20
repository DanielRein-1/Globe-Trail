// Explicit localhost-only test harness. It never forwards API requests to Next.js.
// Run after npm run build. No database client or importer is loaded here.
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mockOutline } from '../lib/ai/templates/mock-itinerary-v1.ts';
import { inputSchemaAt } from '../lib/validation/itinerary.ts';
import { previewSchema, previewResponseSchema, previewErrorResponseSchema } from '../lib/itineraries/contracts.ts';
import { readPreviewBody } from '../lib/itineraries/request.ts';
import { fixtureDestination, fixtureResolved } from '../tests/fixtures/destinations.mjs';
import { searchResponseSchema } from '../lib/destinations/contracts.ts';
import fixtures from '../tests/fixtures/countries.json' with { type: 'json' };

const countries = fixtures.map(country => ({
  isoCode: country.alpha2Code, iso3Code: country.alpha3Code, name: country.name,
  capital: country.capital || null, continent: country.region || null,
  currency: country.currencies?.[0]?.name || null,
  population: country.population == null ? null : String(country.population),
  latitude: country.latlng?.[0] == null ? null : String(country.latlng[0]),
  longitude: country.latlng?.[1] == null ? null : String(country.latlng[1]),
})).sort((a, b) => a.name.localeCompare(b.name));
const probe = net.createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const upstreamPort = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(upstreamPort)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', data => process.stdout.write(data));
child.stderr.on('data', data => process.stderr.write(data));
let scenario = 'normal';
const choices = ['normal', 'empty', 'error', 'missing', 'slow', 'sparse', 'attractions-empty', 'attractions-error', 'attractions-coordinates', 'attractions-slow', 'itinerary-error', 'itinerary-timeout', 'itinerary-slow', 'itinerary-malformed', 'destinations-empty', 'destinations-error', 'destinations-slow', 'destination-resolution-error'];
const reply = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
function fixtureAPI(req, res, url) {
  console.log(`FIXTURE ${req.method} ${url.pathname} [${scenario}]`);
  if (url.pathname === '/api/auth/session') return reply(res, 200, {});
  if (req.method === 'POST' && url.pathname === '/api/itineraries/preview') return void itineraryFixture(req, res);
  if (req.method === 'GET' && url.pathname === '/api/destinations/search') return destinationFixture(res);
  if (req.method !== 'GET') return reply(res, 403, { error: { code: 'FIXTURE_ONLY' } });
  if (/^\/api\/countries\/[A-Z]{2}\/attractions$/.test(url.pathname)) return attractionFixture(res);
  if (!/^\/api\/countries(?:\/[A-Z]{2})?$/.test(url.pathname)) return reply(res, 404, {});
  if (scenario === 'error') return reply(res, 500, { success: false, error: { code: 'SERVER_ERROR' } });
  if (scenario === 'missing') return reply(res, 404, { success: false, error: { code: 'NOT_FOUND' } });
  let data;
  if (url.pathname !== '/api/countries') {
    data = countries.find(country => country.isoCode === url.pathname.split('/').pop());
    if (!data) return reply(res, 404, { success: false });
    if (scenario === 'sparse') data = { ...data, capital: null, continent: null, currency: null, population: null, latitude: null, longitude: null };
  } else {
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const region = url.searchParams.get('continent') || '';
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 20);
    const rows = scenario === 'empty' ? [] : countries.filter(country => country.name.toLowerCase().includes(search) && (!region || country.continent === region));
    data = { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
  }
  const send = () => reply(res, 200, { success: true, version: 'v1', requestId: 'fixture', timestamp: new Date().toISOString(), data });
  if (scenario === 'slow') setTimeout(send, 5000); else send();
}
function attractionFixture(res) {
  if (scenario === 'attractions-error') return reply(res, 502, { success: false, error: { code: 'PROVIDER_UNAVAILABLE' } });
  if (scenario === 'attractions-coordinates' || scenario === 'sparse') return reply(res, 422, { success: false, error: { code: 'COORDINATES_UNAVAILABLE' } });
  // Deliberately synthetic places: these are not claims about real Kenya attractions.
  const data = scenario === 'attractions-empty' ? [] : [
    { providerPlaceId: 'fixture-museum', name: 'Fixture museum', categories: ['tourism', 'tourism.sights'], latitude: 1, longitude: 38, distanceMeters: 0 },
    { providerPlaceId: 'fixture-monument', name: 'A long fixture monument name for responsive layout verification', categories: ['tourism.sights.monument'], latitude: 1.01, longitude: 38.01, distanceMeters: 1572 },
  ];
  const send = () => reply(res, 200, { success: true, data });
  if (scenario === 'attractions-slow') setTimeout(send, 5000); else send();
}
const itineraryRequestId = 'ed16b8d7-daca-4136-8f56-29189eb830d4';
const itineraryTimestamp = '2026-09-14T00:00:00.000Z';
function itineraryError(res, status, code, message) {
  return reply(res, status, previewErrorResponseSchema.parse({
    success: false, version: 'v1', requestId: itineraryRequestId, error: { code, message },
  }));
}
function destinationFixture(res) {
  if (scenario === 'destinations-error') return itineraryError(res, 502, 'DESTINATION_PROVIDER_UNAVAILABLE', 'Destination search is unavailable. Please try again.');
  const data = scenario === 'destinations-empty' ? [] : [fixtureDestination,
    { ...fixtureDestination, reference: 'fixture-other-search', name: 'Another Fixture Protected Reserve', formatted: 'Another Fixture Protected Reserve, Second County, Kenya', county: 'Second County' }];
  const body = searchResponseSchema.parse({ success: true, version: 'v1', requestId: itineraryRequestId, timestamp: itineraryTimestamp, data });
  const send = () => reply(res, 200, body);
  if (scenario === 'destinations-slow') setTimeout(send, 5000); else send();
}
async function itineraryFixture(req, res) {
  try {
    const request = new Request('http://localhost/api/itineraries/preview', {
      method: 'POST', headers: { 'content-type': req.headers['content-type'] || '' }, body: req, duplex: 'half',
    });
    const inputs = inputSchemaAt().parse(await readPreviewBody(request));
    const country = countries.find(item => item.isoCode === inputs.destinationCode);
    if (!country || scenario === 'missing') return itineraryError(res, 404, 'NOT_FOUND', 'Country not found. Return to country discovery.');
    if (scenario === 'itinerary-error') return itineraryError(res, 502, 'AI_PROVIDER_UNAVAILABLE', 'The sample planner is unavailable. Please try again.');
    if (scenario === 'itinerary-timeout') return itineraryError(res, 504, 'AI_TIMEOUT', 'The sample took too long. Please try again.');
    // Deliberate transport corruption for client sanitization checks, not a success/error envelope.
    if (scenario === 'itinerary-malformed') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end('{');
    }
    if (inputs.destinationReference && scenario === 'destination-resolution-error') return itineraryError(res, 502, 'DESTINATION_INVALID_RESPONSE', 'The destination could not be validated. Please try another search.');
    const selected = inputs.destinationReference === fixtureResolved.reference ? fixtureResolved
      : inputs.destinationReference === 'fixture-other-search' ? { ...fixtureResolved, reference: 'fixture-other-search', name: 'Another Fixture Protected Reserve', county: 'Second County' } : null;
    if (inputs.destinationReference && !selected) return itineraryError(res, 400, 'VALIDATION_ERROR', 'Choose a fixture destination.');
    const destination = selected ? { isoCode: country.isoCode, name: selected.name, place: selected } : { isoCode: country.isoCode, name: country.name };
    const data = previewSchema.parse({ ...mockOutline({ inputs, destination }), inputs, destination,
      schemaVersion: selected ? 'itinerary.v2' : 'itinerary.v1', source: 'mock', templateVersion: selected ? 'mock-itinerary-v2' : 'mock-itinerary-v1' });
    const body = previewResponseSchema.parse({ success: true, version: 'v1', requestId: itineraryRequestId, timestamp: itineraryTimestamp, data });
    const send = () => reply(res, 200, body);
    if (scenario === 'itinerary-slow') setTimeout(send, 5000); else send();
  } catch { itineraryError(res, 400, 'VALIDATION_ERROR', 'Check your planning inputs.'); }
}
const proxy = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/__fixtures') {
    if (choices.includes(url.searchParams.get('scenario'))) scenario = url.searchParams.get('scenario');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(`<h1>Country UI fixtures: ${scenario}</h1><p>Mock data only. API requests never reach the app or database.</p>${choices.map(choice => `<p><a href="/__fixtures?scenario=${choice}">${choice}</a></p>`).join('')}<p><a href="/countries?limit=6">Explore fixture countries</a></p><p><a href="/countries/KE">Explore fixture Kenya</a></p><p><a href="/countries/KE/plan?search=Kenya&continent=Africa&page=2&limit=6">Plan fixture Kenya</a></p>`);
  }
  if (url.pathname.startsWith('/api/')) return fixtureAPI(req, res, url);
  if (req.method !== 'GET' || !(url.pathname === '/' || url.pathname === '/icon.svg' || url.pathname.startsWith('/countries') || url.pathname.startsWith('/_next/'))) {
    res.writeHead(404); return res.end();
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, method: 'GET', path: req.url, headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}` } }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.on('error', () => { res.writeHead(503); res.end('Fixture upstream is starting. Please retry.'); });
  upstream.end();
});
proxy.listen(0, '127.0.0.1');
await once(proxy, 'listening');
console.log(`FIXTURE URL: http://127.0.0.1:${proxy.address().port}/__fixtures`);
function shutdown() { proxy.closeAllConnections(); proxy.close(); child.kill('SIGTERM'); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
child.on('exit', () => { proxy.closeAllConnections(); proxy.close(); });
