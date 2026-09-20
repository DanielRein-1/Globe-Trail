import { NextResponse, type NextRequest } from 'next/server';
import { createErrorResponse } from '@/lib/api/response';
import { readDestinationQuery } from '@/lib/validation/destination';

// App-route preparation rebuilds query objects and can drop __proto__.
// skipProxyUrlNormalize gives this earlier boundary the original request URL.
export function proxy(request: NextRequest) {
  if (request.method === 'GET' && !readDestinationQuery(new URL(request.url).searchParams).success) {
    return createErrorResponse('Enter a valid country and at least three visible search characters.', 'VALIDATION_ERROR', 400);
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/destinations/search' };
