import 'server-only';
import { DestinationError, destinationResultSchema, resolvedDestinationSchema, type DestinationResult } from '../destinations/contracts';
import { destinationQuerySchema, destinationSelectionSchema } from '../validation/destination';
import { detailsCollectionSchema, searchCollectionSchema, type PlaceProperties } from './geoapify-destination-schema';
import { destinationRequest, invalidResponse, type ProviderOptions } from './geoapify-destination-transport';

// Curated evidence from the relevance spike. Never globally rewrite Maasai names.
const aliases = [{ pattern: /\bMaasai Mara\b/gi, replacement: 'Masai Mara' }];
export function searchVariants(query: string) {
  const variant = aliases.reduce((text, alias) => text.replace(alias.pattern, alias.replacement), query);
  return variant === query ? [query] : [query, variant];
}
export function destinationLabels(p: PlaceProperties): DestinationResult['categoryLabels'] | null {
  const categories = [...(p.categories ?? []), ...(p.category?.split(';') ?? [])];
  const name = p.name ?? p.formatted;
  if (['street', 'building', 'postcode', 'unknown'].includes(p.result_type ?? '')) return null;
  if (categories.some(c => /^(building|commercial|education|accommodation|catering|office|service|camping|sport|airport|highway)(\.|$)/.test(c))) return null;
  const protectedArea = categories.some(c => /(?:^|[.;])(nature_reserve|protected_area|national_park)(?:[.;]|$)/.test(c));
  const protectedName = /\b(national park|national reserve|nature reserve|protected area)\b/i.test(name);
  if (/\b(university|school|butchery|sewerage|airport|hotel|lodge|campus|shop|road)\b/i.test(name)) return null;
  if (/\b(entrance|gate)\b/i.test(name) && !(protectedArea && protectedName && !/\b(entrance|gate)\s*$/i.test(name))) return null;
  if (protectedArea) return ['Protected area'];
  if (categories.includes('leisure.park')) return ['Park'];
  switch (p.result_type) {
    case 'city': return ['City']; case 'suburb': return ['Suburb']; case 'district': return ['District'];
    case 'county': return ['County']; case 'state': return ['Region']; case 'country': return ['Country'];
    default: return ['Place'];
  }
}
function publicPlace(p: PlaceProperties, coordinates: [number, number], bounds: DestinationResult['bounds'], reference = p.place_id) {
  const categoryLabels = destinationLabels(p);
  if (!categoryLabels) return null;
  const parsed = destinationResultSchema.safeParse({ reference, name: p.name ?? p.formatted, formatted: p.formatted,
    countryCode: p.country_code.toUpperCase(), county: p.county ?? null, state: p.state ?? null,
    categoryLabels, longitude: coordinates[0], latitude: coordinates[1], bounds });
  if (!parsed.success) throw invalidResponse();
  return parsed.data;
}
export async function searchDestinations(raw: unknown, options: ProviderOptions = {}) {
  const parsed = destinationQuerySchema.safeParse(raw);
  if (!parsed.success) throw new DestinationError('VALIDATION_ERROR', 400, 'Enter a valid country and at least three visible search characters.');
  const results = new Map<string, DestinationResult>();
  for (const query of searchVariants(parsed.data.query)) {
    const raw = await destinationRequest('/v1/geocode/search', { text: query, lang: 'en', limit: '10',
      format: 'geojson', filter: `countrycode:${parsed.data.countryCode.toLowerCase()}`, bias: 'countrycode:none' }, options);
    const response = searchCollectionSchema.safeParse(raw);
    if (!response.success) throw invalidResponse();
    for (const feature of response.data.features) {
      if (feature.properties.country_code.toUpperCase() !== parsed.data.countryCode) throw invalidResponse();
      const place = publicPlace(feature.properties, feature.geometry.coordinates, feature.bbox ?? null);
      if (place && !results.has(place.reference)) results.set(place.reference, place);
    }
  }
  return [...results.values()];
}
export async function resolveDestination(raw: unknown, options: ProviderOptions = {}) {
  const parsed = destinationSelectionSchema.safeParse(raw);
  if (!parsed.success) throw new DestinationError('VALIDATION_ERROR', 400, 'Choose a valid destination from the search results.');
  const rawDetails = await destinationRequest('/v2/place-details', { id: parsed.data.reference, features: 'details', lang: 'en' }, options);
  const response = detailsCollectionSchema.safeParse(rawDetails);
  if (!response.success) throw invalidResponse();
  const { properties: p, geometry, bbox } = response.data.features[0];
  if (p.country_code.toUpperCase() !== parsed.data.countryCode) throw invalidResponse();
  const coordinates: [number, number] | null = p.lon !== undefined && p.lat !== undefined
    ? [p.lon, p.lat] : geometry.type === 'Point' ? geometry.coordinates : null;
  if (!coordinates) throw invalidResponse();
  const place = publicPlace(p, coordinates, bbox ?? null, parsed.data.reference);
  if (!place) throw invalidResponse();
  return resolvedDestinationSchema.parse({ ...place, detailsId: p.place_id });
}
