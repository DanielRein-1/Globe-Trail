import { z } from 'zod';

export const attractionSchema = z.object({
  providerPlaceId: z.string().min(1),
  name: z.string().min(1),
  categories: z.array(z.string()),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceMeters: z.number().nonnegative(),
});
export const attractionsResponseSchema = z.object({
  success: z.literal(true), data: z.array(attractionSchema).max(20),
});
export type Attraction = z.infer<typeof attractionSchema>;

export class AttractionError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
    this.name = 'AttractionError';
  }
}
