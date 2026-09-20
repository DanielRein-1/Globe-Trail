import { z } from 'zod';
import { boundsSchema, pointSchema, referenceSchema } from '../destinations/contracts';

const text = z.string().trim().min(1).max(400);
const category = z.string().max(200).regex(/^[a-z0-9_.]+(?:;[a-z0-9_.]+)*$/);
const properties = z.object({
  place_id: referenceSchema, name: text.max(200).optional(), formatted: text,
  country_code: z.string().regex(/^[a-zA-Z]{2}$/), county: text.max(120).optional(), state: text.max(120).optional(),
  result_type: z.enum(['unknown', 'amenity', 'building', 'street', 'suburb', 'district', 'postcode', 'city', 'county', 'state', 'country']).optional(),
  category: category.optional(), categories: z.array(category).max(40).optional(),
});
const point = z.object({ type: z.literal('Point'), coordinates: pointSchema });
// Degrees; approximately 11 cm latitude. Not a point-in-polygon check.
const COORDINATE_TOLERANCE = 1e-6;
function longitudeDistance(a: number, b: number) { return Math.abs(((a - b + 540) % 360) - 180); }
function contains(bounds: [number, number, number, number], [lon, lat]: [number, number]) {
  const [west, south, east, north] = bounds;
  const longitudeInside = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east;
  return latitudeInside() && (longitudeInside || longitudeDistance(lon, west) <= COORDINATE_TOLERANCE || longitudeDistance(lon, east) <= COORDINATE_TOLERANCE);
  function latitudeInside() { return lat >= south - COORDINATE_TOLERANCE && lat <= north + COORDINATE_TOLERANCE; }
}
const ring = z.array(pointSchema).min(4).max(20000).refine(points => {
  if (points.length < 4) return false;
  const first = points[0], last = points[points.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return false;
  if (new Set(points.slice(0, -1).map(([x, y]) => `${x},${y}`)).size < 3) return false;
  // Unwrap adjacent longitudes, then translate to the first vertex to reduce cancellation.
  let x = 0, y = 0, area = 0;
  for (let i = 1; i < points.length; i++) {
    const delta = ((points[i][0] - points[i - 1][0] + 540) % 360) - 180;
    const nextX = x + delta, nextY = points[i][1] - first[1];
    area += x * nextY - nextX * y;
    x = nextX; y = nextY;
  }
  return Math.abs(area) > 1e-12;
}, 'Use a closed, non-degenerate ring');
const polygon = z.array(ring).min(1).max(100);
export const searchCollectionSchema = z.object({
  type: z.literal('FeatureCollection'), features: z.array(z.object({
    type: z.literal('Feature'), properties: properties.extend({ result_type: properties.shape.result_type.unwrap() }),
    geometry: point, bbox: boundsSchema.optional(),
  }).refine(feature => !feature.bbox || contains(feature.bbox, feature.geometry.coordinates), 'Reference point contradicts bounds')).max(10),
});
export const detailsCollectionSchema = z.object({
  type: z.literal('FeatureCollection'), features: z.array(z.object({
    type: z.literal('Feature'),
    properties: properties.extend({ feature_type: z.literal('details'), name: text.max(200),
      lat: z.number().min(-90).max(90).optional(), lon: z.number().min(-180).max(180).optional() }),
    geometry: z.discriminatedUnion('type', [point,
      z.object({ type: z.literal('Polygon'), coordinates: polygon }),
      z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1).max(100) }),
    ]), bbox: boundsSchema.optional(),
  }).superRefine((feature, ctx) => {
    const { properties: p, geometry, bbox } = feature;
    if ((p.lon === undefined) !== (p.lat === undefined)) {
      ctx.addIssue({ code: 'custom', message: 'Coordinates must be a complete pair' }); return;
    }
    const coordinate: [number, number] | undefined = p.lon !== undefined && p.lat !== undefined
      ? [p.lon, p.lat] : geometry.type === 'Point' ? geometry.coordinates : undefined;
    if (!coordinate) { ctx.addIssue({ code: 'custom', message: 'Missing representative coordinates' }); return; }
    if (geometry.type === 'Point' && (longitudeDistance(coordinate[0], geometry.coordinates[0]) > COORDINATE_TOLERANCE || Math.abs(coordinate[1] - geometry.coordinates[1]) > COORDINATE_TOLERANCE)) {
      ctx.addIssue({ code: 'custom', message: 'Point contradicts property coordinates' });
    }
    if (bbox && !contains(bbox, coordinate)) ctx.addIssue({ code: 'custom', message: 'Reference point contradicts bounds' });
  })).length(1),
});
export type PlaceProperties = z.infer<typeof properties>;
