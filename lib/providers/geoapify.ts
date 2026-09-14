import { get } from 'node:https';
import { z } from 'zod';
import { AttractionError } from '@/lib/attractions/contracts';

const point = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const placesSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(z.object({
    type: z.literal('Feature'),
    geometry: z.object({ type: z.literal('Point'), coordinates: point }),
    properties: z.object({
      place_id: z.string().trim().min(1),
      name: z.string().nullish(),
      categories: z.array(z.string().regex(/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/)).min(1),
    }),
  })).max(20),
}).refine(data => new Set(data.features.map(f => f.properties.place_id)).size === data.features.length);
export type Places = z.infer<typeof placesSchema>;
export type PlacesTransport = (url: URL, signal: AbortSignal) => Promise<unknown>;
const unavailable = () => new AttractionError('PROVIDER_UNAVAILABLE', 502, 'Nearby places are temporarily unavailable. Please try again.');

// Native HTTPS avoids Next.js fetch instrumentation recording a URL containing a key.
// Never propagate response bodies, URLs or transport errors to callers or logs.
const readPlaces: PlacesTransport = (url, signal) => new Promise((resolve, reject) => {
  const request = get(url, { signal }, response => {
    response.on('error', () => reject(unavailable()));
    response.on('aborted', () => reject(unavailable()));
    if (response.statusCode !== 200) {
      response.resume();
      reject(unavailable());
      return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    response.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 1_048_576) { request.destroy(); reject(unavailable()); }
      else chunks.push(chunk);
    });
    response.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(unavailable()); }
    });
  });
  request.on('error', () => reject(unavailable()));
});

export async function fetchPlaces(longitude: number, latitude: number,
  transport: PlacesTransport = readPlaces, key = process.env.GEOAPIFY_API_KEY): Promise<Places> {
  if (!point.safeParse([longitude, latitude]).success) {
    throw new AttractionError('COORDINATES_UNAVAILABLE', 422, 'This country has no usable reference coordinates.');
  }
  if (!key?.trim()) throw new AttractionError('ATTRACTIONS_NOT_CONFIGURED', 503, 'Nearby places are not configured. Please try again later.');
  const url = new URL('https://api.geoapify.com/v2/places');
  url.search = new URLSearchParams({ categories: 'tourism',
    filter: `circle:${longitude},${latitude},50000`, bias: `proximity:${longitude},${latitude}`,
    limit: '20', lang: 'en', apiKey: key }).toString();
  try {
    return placesSchema.parse(await transport(url, AbortSignal.timeout(10_000)));
  } catch { throw unavailable(); }
}
