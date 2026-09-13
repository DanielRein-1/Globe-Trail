
import { db as prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const createTrip = async (
  userId: string,
  data: Prisma.TripUncheckedCreateWithoutUserInput
) => {
  return prisma.trip.create({
    data: {
      ...data,
      userId,
    },
  });
};

export const getTripsByUser = async (userId: string) => {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const getTripById = async (userId: string, tripId: string) => {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
  });
};

export const updateTrip = async (
  userId: string,
  tripId: string,
  data: Prisma.TripUpdateInput
) => {
  // First, verify the trip belongs to the user
  const trip = await getTripById(userId, tripId);
  if (!trip) {
    throw new Error("Trip not found or user does not have permission");
  }

  return prisma.trip.update({
    where: { id: tripId },
    data,
  });
};

export const deleteTrip = async (userId: string, tripId: string) => {
  // First, verify the trip belongs to the user
  const trip = await getTripById(userId, tripId);
  if (!trip) {
    throw new Error("Trip not found or user does not have permission");
  }

  // The schema is configured to cascade deletes to related models,
  // so we just need to delete the trip itself.
  return prisma.trip.delete({ where: { id: tripId } });
};
