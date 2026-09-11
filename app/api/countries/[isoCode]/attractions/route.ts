
import { NextRequest } from 'next/server';
import { getAttractionsByCountry } from '@/lib/services/attraction.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/response';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ isoCode: string }> }) => {
  try {
    const { isoCode } = await params;

    if (!isoCode) {
      return createErrorResponse('ISO code is required', 'VALIDATION_ERROR', 400);
    }

    const attractions = await getAttractionsByCountry(isoCode.toUpperCase());

    return createSuccessResponse(attractions);
  } catch (error: any) {
    const resolvedParams = await params;
    console.error(`Failed to get attractions for ${resolvedParams.isoCode}:`, error);
    if (error.message.includes("not found")) {
      return createErrorResponse(error.message, "NOT_FOUND", 404);
    }
    return createErrorResponse('Failed to retrieve attractions', 'SERVER_ERROR', 500);
  }
};
