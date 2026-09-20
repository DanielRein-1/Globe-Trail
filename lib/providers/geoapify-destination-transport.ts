import 'server-only';
import { get } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { DestinationError } from '../destinations/contracts';

export type DestinationTransport = (url: URL, signal: AbortSignal) => Promise<unknown>;
export const providerFailure = () => new DestinationError('DESTINATION_PROVIDER_UNAVAILABLE', 502, 'Destination search is unavailable. Please try again.');
export const invalidResponse = () => new DestinationError('DESTINATION_INVALID_RESPONSE', 502, 'The destination could not be validated. Please try another search.');

// Do not use framework fetch: its URL instrumentation can record query credentials.
export const readDestinationJSON: DestinationTransport = (url, signal) => new Promise((resolve, reject) => {
  let response: IncomingMessage | undefined;
  let settled = false;
  const chunks: Buffer[] = [];
  let bytes = 0;
  // Keep error guards until close: destroy can emit a final asynchronous error.
  function cleanup() {
    signal.removeEventListener('abort', abort);
    response?.removeListener('data', data);
    response?.removeListener('end', end);
    response?.removeListener('aborted', failed);
    chunks.length = 0;
  }
  function fail(error: DestinationError) {
    if (settled) return;
    settled = true;
    cleanup();
    response?.destroy();
    request.destroy();
    reject(error);
  }
  function failed() { fail(providerFailure()); }
  function abort() { failed(); }
  function data(chunk: Buffer) {
    if (settled) return;
    bytes += chunk.length;
    if (bytes > 1_048_576) fail(invalidResponse());
    else chunks.push(chunk);
  }
  function end() {
    if (settled) return;
    let value: unknown;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { fail(invalidResponse()); return; }
    settled = true;
    cleanup();
    resolve(value);
  }
  const request = get(url, {}, incoming => {
    response = incoming;
    incoming.on('error', failed);
    incoming.once('close', () => incoming.removeListener('error', failed));
    if (settled) { incoming.destroy(); return; }
    incoming.on('aborted', failed);
    if (incoming.statusCode !== 200) { failed(); return; }
    incoming.on('data', data);
    incoming.on('end', end);
  });
  request.on('error', failed);
  request.once('close', () => request.removeListener('error', failed));
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
});
export type ProviderOptions = { transport?: DestinationTransport; key?: string; timeoutMs?: number };
export async function destinationRequest(path: string, params: Record<string, string>, options: ProviderOptions) {
  const key = options.key ?? process.env.GEOAPIFY_API_KEY;
  if (!key?.trim()) throw new DestinationError('DESTINATIONS_NOT_CONFIGURED', 503, 'Destination search is not configured. You can still plan anywhere in this country.');
  const url = new URL(path, 'https://api.geoapify.com');
  url.search = new URLSearchParams({ ...params, apiKey: key }).toString();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new DestinationError('DESTINATION_TIMEOUT', 504, 'The destination request took too long. Please try again.'));
      controller.abort();
    }, options.timeoutMs ?? 10000);
  });
  try { return await Promise.race([Promise.resolve().then(() => (options.transport ?? readDestinationJSON)(url, controller.signal)), timeout]); }
  catch (error) { if (error instanceof DestinationError) throw error; throw providerFailure(); }
  finally { clearTimeout(timer); }
}
