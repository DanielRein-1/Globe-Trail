import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";
import { ItineraryError } from "@/lib/itineraries/contracts";
import { previewItinerary } from "@/lib/services/itinerary.service";

import { readPreviewBody } from "@/lib/itineraries/request";

export async function POST(request: Request) {
  try { return createSuccessResponse(await previewItinerary(await readPreviewBody(request))); }
  catch (error) {
    if (error instanceof ItineraryError) return createErrorResponse(error.message, error.code, error.status);
    return createErrorResponse("The sample planner is unavailable. Please try again.", "SERVER_ERROR", 500);
  }
}
