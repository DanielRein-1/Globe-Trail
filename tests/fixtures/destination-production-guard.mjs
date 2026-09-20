// Production HTTP regression only. No URL, query value or credential is recorded.
import Module, { syncBuiltinESMExports } from 'node:module';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';

const record = kind => process.send?.({ kind });
const block = kind => () => { record(kind); throw new Error('Production verification blocks outbound I/O'); };
for (const transport of [https, http]) {
  transport.get = block('external-request');
  transport.request = block('external-request');
}
globalThis.fetch = block('external-request');
net.Socket.prototype.connect = block('outgoing-socket');
// Prisma's native engine bypasses Node sockets. Stop it before startup/query work.
const load = Module._load;
const clients = new WeakMap();
Module._load = function (id, ...args) {
  const exports = load.call(this, id, ...args);
  if (id.includes('prisma') && exports?.PrismaClient) {
    if (!clients.has(exports.PrismaClient)) {
      clients.set(exports.PrismaClient, class extends exports.PrismaClient {
        constructor(...options) {
          super(...options);
          for (const method of ['start', 'request', 'requestBatch', 'transaction']) {
            this._engine[method] = block('database-attempt');
          }
        }
      });
    }
    return new Proxy(exports, { get(target, key) { return key === 'PrismaClient' ? clients.get(target.PrismaClient) : target[key]; } });
  }
  return exports;
};
syncBuiltinESMExports();
record('guard-ready');
