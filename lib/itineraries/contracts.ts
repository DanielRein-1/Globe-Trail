import { z } from "zod";
import { resolvedDestinationSchema } from "../destinations/contracts";
import { addDays, calendarDate, itineraryInputSchema } from "../validation/itinerary";

const text = (max: number) => z.string().trim().min(1).max(max);
const suggestion = (slot: "morning" | "afternoon" | "evening") => z.strictObject({
  slot: z.literal(slot), kind: z.literal("suggestion"), description: text(300),
});
export const destinationSchema = z.strictObject({ isoCode: z.string().regex(/^[A-Z]{2}$/), name: text(200), place: resolvedDestinationSchema.optional() });
export const outlineSchema = z.strictObject({
  title: text(120), summary: text(600),
  days: z.array(z.strictObject({
    day: z.number().int().min(1).max(14), date: calendarDate.nullable(), theme: text(100),
    activities: z.tuple([suggestion("morning"), suggestion("afternoon"), suggestion("evening")]),
  })).min(1).max(14),
});
const countryPreviewSchema = outlineSchema.extend({
  schemaVersion: z.literal("itinerary.v1"), source: z.literal("mock"), templateVersion: z.literal("mock-itinerary-v1"),
  destination: destinationSchema.omit({ place: true }),
  inputs: itineraryInputSchema.safeExtend({ destinationReference: z.never().optional() }),
});
const placePreviewSchema = outlineSchema.extend({
  schemaVersion: z.literal("itinerary.v2"), source: z.literal("mock"), templateVersion: z.literal("mock-itinerary-v2"),
  destination: destinationSchema.extend({ place: resolvedDestinationSchema }),
  inputs: itineraryInputSchema.safeExtend({ destinationReference: resolvedDestinationSchema.shape.reference }),
});
export const previewSchema = z.discriminatedUnion("schemaVersion", [countryPreviewSchema, placePreviewSchema]).superRefine((value, ctx) => {
  if (value.inputs.startDate !== undefined && !calendarDate.safeParse(value.inputs.startDate).success) return;
  const place = value.schemaVersion === "itinerary.v2" ? value.destination.place : undefined;
  const scoped = value.inputs.destinationReference !== undefined;
  if (Boolean(place) !== scoped || (place && (place.reference !== value.inputs.destinationReference || place.countryCode !== value.destination.isoCode || place.name !== value.destination.name)) ||
    value.schemaVersion !== (scoped ? "itinerary.v2" : "itinerary.v1") || value.templateVersion !== (scoped ? "mock-itinerary-v2" : "mock-itinerary-v1")) {
    ctx.addIssue({ code: "custom", message: "Destination identity does not match the selected reference" });
  }
  if (value.destination.isoCode !== value.inputs.destinationCode || value.days.length !== value.inputs.durationDays ||
    value.days.some((day, index) => day.day !== index + 1 || day.date !== (value.inputs.startDate ? addDays(value.inputs.startDate, index) : null))) {
    ctx.addIssue({ code: "custom", message: "Itinerary does not match the requested destination or days" });
  }
});
const envelopeFields = { version: z.literal("v1"), requestId: z.uuid() };
export const previewResponseSchema = z.strictObject({
  ...envelopeFields, success: z.literal(true), timestamp: z.iso.datetime(), data: previewSchema,
});
export const previewErrorResponseSchema = z.strictObject({
  ...envelopeFields, success: z.literal(false),
  error: z.strictObject({ code: text(64), message: text(600) }),
});
export type ItineraryPreview = z.infer<typeof previewSchema>;
export type Destination = z.infer<typeof destinationSchema>;
export const DISCLOSURE = "Mock itinerary preview. Generic suggestions, not a verified travel schedule. This itinerary is not saved.";
export class ItineraryError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
