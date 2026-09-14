import { countryCodeSchema } from './country';
import { AttractionError } from '@/lib/attractions/contracts';

export function validateAttractionRequest(code: string, query = new URLSearchParams()) {
  const parsed = countryCodeSchema.safeParse(code);
  if (!parsed.success || query.size !== 0) {
    throw new AttractionError('VALIDATION_ERROR', 400,
      'Use a two-letter country code without query parameters. Attractions use a fixed 50 km search.');
  }
  return parsed.data;
}
