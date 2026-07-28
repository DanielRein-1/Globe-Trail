
import { NextResponse } from 'next/server';
import { syncAllCountries } from '@/lib/services/country.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/response';

export const POST = async () => {
  try {
    const { count } = await syncAllCountries();
    return createSuccessResponse({ count }, 200);
  } catch (error) {
    console.error('Country sync failed:', error);
    return createErrorResponse('Failed to sync countries from external API', 'SYNC_FAILED', 500);
  }
};
