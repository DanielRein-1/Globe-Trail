import { z } from 'zod';

const label = (max: number) => z.string().trim().min(1).max(max);
export const referenceSchema = z.string().min(1).max(2048).regex(/^[a-zA-Z0-9_-]+$/);
export const pointSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const boundsSchema = z.tuple([
  z.number().min(-180).max(180), z.number().min(-90).max(90),
  z.number().min(-180).max(180), z.number().min(-90).max(90),
]).refine(bounds => bounds[1] <= bounds[3]);
export const categoryLabels = ['Protected area', 'Park', 'City', 'Suburb', 'District', 'County', 'Region', 'Country', 'Place'] as const;
export const destinationResultSchema = z.strictObject({
  reference: referenceSchema, name: label(200), formatted: label(400),
  countryCode: z.string().regex(/^[A-Z]{2}$/), county: label(120).nullable(), state: label(120).nullable(),
  categoryLabels: z.array(z.enum(categoryLabels)).min(1).max(3),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), bounds: boundsSchema.nullable(),
});
export const resolvedDestinationSchema = destinationResultSchema.extend({ detailsId: referenceSchema });
export const searchResponseSchema = z.strictObject({
  success: z.literal(true), version: z.literal('v1'), requestId: z.uuid(), timestamp: z.iso.datetime(),
  data: z.array(destinationResultSchema).max(20),
});
export const destinationErrorSchema = z.strictObject({
  success: z.literal(false), version: z.literal('v1'), requestId: z.uuid(),
  error: z.strictObject({ code: label(64), message: label(600) }),
});
export type DestinationResult = z.infer<typeof destinationResultSchema>;
export type ResolvedDestination = z.infer<typeof resolvedDestinationSchema>;
export class DestinationError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
