import { NextRequest } from "next/server";
import { getCountryByIsoCode } from "@/lib/services/country.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/response";
import { countryCodeSchema } from "@/lib/validation/country";
import { CountryProviderError } from "@/lib/providers/countries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ isoCode: string }> }) {
  const parsed = countryCodeSchema.safeParse((await params).isoCode);
  if (!parsed.success) return createErrorResponse("Use a two-letter country code.", "VALIDATION_ERROR", 400);
  try {
    const country = await getCountryByIsoCode(parsed.data);
    if (!country) return createErrorResponse("Country not found", "NOT_FOUND", 404);
    return createSuccessResponse(country);
  } catch (error) {
    if (error instanceof CountryProviderError) return createErrorResponse(error.message, "PROVIDER_UNAVAILABLE", 502);
    console.error("Country detail request failed.");
    return createErrorResponse("Failed to retrieve country", "SERVER_ERROR", 500);
  }
}
