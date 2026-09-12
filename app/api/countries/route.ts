import { NextRequest } from "next/server";
import { getCountries } from "@/lib/services/country.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/response";
import { readCountryQuery } from "@/lib/validation/country";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const parsed = readCountryQuery(new URL(req.url).searchParams);
  if (!parsed.success) return createErrorResponse("Invalid country search or pagination parameters.", "VALIDATION_ERROR", 400);
  try {
    const { page, limit } = parsed.data;
    const { data, total } = await getCountries(parsed.data);
    return createSuccessResponse({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch {
    console.error("Country list request failed.");
    return createErrorResponse("Failed to retrieve countries", "SERVER_ERROR", 500);
  }
}
