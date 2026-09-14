import { NextRequest } from 'next/server';
import { getAttractionsByCountry } from '@/lib/services/attraction.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/response';
import { AttractionError } from '@/lib/attractions/contracts';
import { validateAttractionRequest } from '@/lib/validation/attraction';

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ isoCode: string }> }) => {
  try {
    const { isoCode } = await params;
    const code = validateAttractionRequest(isoCode, new URL(req.url).searchParams);
    return createSuccessResponse(await getAttractionsByCountry(code));
  } catch (error: unknown) {
    if (error instanceof AttractionError) return createErrorResponse(error.message, error.code, error.status);
    // Do not log raw errors: provider diagnostics may contain credential-bearing URLs.
    return createErrorResponse('Failed to retrieve attractions. Please try again.', 'SERVER_ERROR', 500);
  }
};
