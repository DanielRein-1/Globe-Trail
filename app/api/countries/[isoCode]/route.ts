
import { NextRequest } from 'next/server';
import { getCountryByIsoCode } from '@/lib/services/country.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/response';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ isoCode: string }> }) => {
  try {
    const { isoCode } = await params;

    if (!isoCode) {
      return createErrorResponse('ISO code is required', 'VALIDATION_ERROR', 400);
    }

    const country = await getCountryByIsoCode(isoCode.toUpperCase());

    if (!country) {
      return createErrorResponse('Country not found', 'NOT_FOUND', 404);
    }

    return createSuccessResponse(country);
  } catch (error) {
    const resolvedParams = await params;
    console.error(`Failed to get country ${resolvedParams.isoCode}:`, error);
    return createErrorResponse("Failed to retrieve country", "SERVER_ERROR", 500);
  }
};
