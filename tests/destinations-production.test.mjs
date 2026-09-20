// Run after npm run build. Exercises Next's actual HTTP adapter, not a route import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { resolve } from 'node:path';
import { destinationErrorSchema } from '../lib/destinations/contracts.ts';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function isOpen(port) {
  return new Promise(resolve => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}
test('production HTTP rejects original query keys and forged previews before all outbound I/O', async t => {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const events = [];
  const child = spawn(process.execPath, [
    '--import', resolve('tests/fixtures/destination-production-guard.mjs'),
    resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], { env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', AI_PROVIDER: 'mock',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:9/verification_blocked', GEOAPIFY_API_KEY: 'synthetic-blocked-key',
  }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  // Never forward application diagnostics containing possible internal values.
  child.stdout.on('data', () => {}); child.stderr.on('data', () => {});
  child.on('message', event => events.push(event.kind));
  try {
    for (let i = 0; i < 100 && !await isOpen(port); i++) {
      assert.equal(child.exitCode, null, 'Production server exited during startup'); await pause(100);
    }
    assert.ok(await isOpen(port), 'Production server ready');
    assert.ok(events.includes('guard-ready'));
    const base = `http://127.0.0.1:${port}`;
    async function rejected(path, options, label) {
      const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 400, label);
      const body = destinationErrorSchema.parse(await response.json());
      assert.equal(body.error.code, 'VALIDATION_ERROR', label);
      t.diagnostic(`${label}: HTTP 400 VALIDATION_ERROR`);
    }
    for (const suffix of ['__proto__=x', '%5F%5Fproto%5F%5F=x', '**proto**=x', 'constructor=x', 'prototype=x', 'unknown=x', 'countryCode=UG', 'query=second']) {
      await rejected('/api/destinations/search?countryCode=KE&query=Nairobi&' + suffix, {}, `Search ${suffix}`);
    }
    for (const query of ['countryCode=ZZ&query=Nairobi', 'countryCode=KE&query=ab']) {
      await rejected('/api/destinations/search?' + query, {}, 'Invalid country/query');
    }
    const input = { destinationCode: 'KE', destinationReference: 'synthetic-reference', durationDays: 3, travellers: 2, interests: ['nature'], budgetPreference: 'balanced' };
    for (const [label, extra] of [
      ['forged name', { name: 'Browser supplied name' }],
      ['forged coordinates', { latitude: 0, longitude: 0 }],
      ['forged categories', { categories: ['natural.protected_area'] }],
      ['forged bounds', { bounds: [0, 0, 1, 1] }],
      ['invalid reference syntax', { destinationReference: 'https://invalid.example/' }],
      ['oversized reference', { destinationReference: 'x'.repeat(2049) }],
    ]) {
      await rejected('/api/itineraries/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, ...extra }) }, label);
    }
    await pause(50);
    for (const kind of ['external-request', 'outgoing-socket', 'database-attempt']) {
      const count = events.filter(event => event === kind).length;
      assert.equal(count, 0, kind); t.diagnostic(`${kind}: ${count}`);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
      try { await stopped; } finally { clearTimeout(timeout); }
    }
    assert.equal(await isOpen(port), false, 'Test port closed');
    t.diagnostic('Production server stopped; port closed.');
  }
});
