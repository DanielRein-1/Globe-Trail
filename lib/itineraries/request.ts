import { ItineraryError } from "./contracts";

export async function readPreviewBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ItineraryError("UNSUPPORTED_MEDIA_TYPE", 415, "Use application/json.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ItineraryError("INVALID_JSON", 400, "Provide a JSON request.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        throw new ItineraryError("PAYLOAD_TOO_LARGE", 413, "Request must be 8 KiB or smaller.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ItineraryError("INVALID_JSON", 400, "Provide valid JSON."); }
}
