import { createErrorResponse, createSuccessResponse } from '@/lib/api/response';
import { DestinationError } from '@/lib/destinations/contracts';
import { readDestinationQuery } from '@/lib/validation/destination';
import { searchDestinations } from '@/lib/providers/geoapify-destinations';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const parsed = readDestinationQuery(new URL(request.url).searchParams);
  if (!parsed.success) return createErrorResponse('Enter a valid country and at least three visible search characters.', 'VALIDATION_ERROR', 400);
  try { return createSuccessResponse(await searchDestinations(parsed.data)); }
  catch (error) {
    if (error instanceof DestinationError) return createErrorResponse(error.message, error.code, error.status);
    return createErrorResponse('Destination search is unavailable. Please try again.', 'SERVER_ERROR', 500);
  }
}
