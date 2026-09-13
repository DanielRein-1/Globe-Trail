
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTrip, getTripsByUser } from "@/lib/services/trip.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/response";

export const GET = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const trips = await getTripsByUser(session.user.id);
    return createSuccessResponse(trips);
  } catch (error) {
    console.error("Failed to get trips:", error);
    return createErrorResponse("Failed to retrieve trips", "SERVER_ERROR", 500);
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();

    // Basic validation
    if (!body.title || !body.countryId) {
      return createErrorResponse(
        "Title and countryId are required",
        "VALIDATION_ERROR",
        400
      );
    }

    const newTrip = await createTrip(session.user.id, body);
    return createSuccessResponse(newTrip, 201);
  } catch (error) {
    console.error("Failed to create trip:", error);
    return createErrorResponse("Failed to create trip", "SERVER_ERROR", 500);
  }
};

