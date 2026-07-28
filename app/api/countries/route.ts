
import { NextRequest } from 'next/server';
import { getCountries } from '@/lib/services/country.service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/response';

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const continent = searchParams.get('continent') || undefined;
    const page = searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    if (isNaN(page) || isNaN(limit)) {
      return createErrorResponse('Invalid pagination parameters', 'VALIDATION_ERROR', 400);
    }

    const { data, total } = await getCountries({ search, continent, page, limit });

    const responseData = {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return createSuccessResponse(responseData);
  } catch (error) {
    console.error("Failed to get countries:", error);
    return createErrorResponse("Failed to retrieve countries", "SERVER_ERROR", 500);
  }
};
