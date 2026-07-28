
import { NextRequest } from 'next/server';
import { getAttractionsByCountry } from '@/lib/services/attraction.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/response';

interface RouteParams {
  params: {
    isoCode: string;
  };
}

export const GET = async (req: NextRequest, { params }: RouteParams) => {
  try {
    const { isoCode } = params;

    if (!isoCode) {
      return createErrorResponse('ISO code is required', 'VALIDATION_ERROR', 400);
    }

    const attractions = await getAttractionsByCountry(isoCode.toUpperCase());

    return createSuccessResponse(attractions);
  } catch (error: any) {
    console.error(`Failed to get attractions for ${params.isoCode}:`, error);
    if (error.message.includes('not found')) {
      return createErrorResponse(error.message, 'NOT_FOUND', 404);
    }
    return createErrorResponse('Failed to retrieve attractions', 'SERVER_ERROR', 500);
  }
};
