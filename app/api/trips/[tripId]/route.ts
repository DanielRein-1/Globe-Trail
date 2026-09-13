
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getTripById,
  updateTrip,
  deleteTrip,
} from "@/lib/services/trip.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{
    tripId: string;
  }>;
}

export const GET = async (req: NextRequest, { params }: RouteParams) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { tripId } = await params;
    const trip = await getTripById(session.user.id, tripId);
    if (!trip) {
      return createErrorResponse("Trip not found", "NOT_FOUND", 404);
    }

    return createSuccessResponse(trip);
  } catch (error) {
    console.error("Failed to get trip:", error);
    return createErrorResponse("Failed to retrieve trip", "SERVER_ERROR", 500);
  }
};

export const PUT = async (req: NextRequest, { params }: RouteParams) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { tripId } = await params;
    const updatedTrip = await updateTrip(session.user.id, tripId, body);

    return createSuccessResponse(updatedTrip);
  } catch (error: unknown) {
    console.error("Failed to update trip:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("not found")
    ) {
      return createErrorResponse(error.message, "NOT_FOUND", 404);
    }
    return createErrorResponse("Failed to update trip", "SERVER_ERROR", 500);
  }
};

export const DELETE = async (req: NextRequest, { params }: RouteParams) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { tripId } = await params;
    await deleteTrip(session.user.id, tripId);

    return createSuccessResponse({}, 204); // No content
  } catch (error: unknown) {
    console.error("Failed to delete trip:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("not found")
    ) {
      return createErrorResponse(error.message, "NOT_FOUND", 404);
    }
    return createErrorResponse("Failed to delete trip", "SERVER_ERROR", 500);
  }
};
