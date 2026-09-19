import { z } from "zod";
import { countryCodeSchema } from "./country";

export const INTERESTS = ["nature", "culture", "history", "food", "relaxation"] as const;
export function utcDate(date: Date) { return date.toISOString().slice(0, 10); }
export function addDays(date: string, days: number) {
  return utcDate(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000));
}
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && utcDate(parsed) === value;
}, "Use a real calendar date");
export const itineraryInputSchema = z.strictObject({
  destinationCode: countryCodeSchema,
  durationDays: z.number().int().min(1).max(14),
  startDate: calendarDate.optional(),
  travellers: z.number().int().min(1).max(8),
  interests: z.array(z.enum(INTERESTS)).min(1).max(5).refine(values => new Set(values).size === values.length, "Choose distinct interests"),
  budgetPreference: z.enum(["budget", "balanced", "comfortable"]),
});
export function inputSchemaAt(now = new Date()) {
  const today = utcDate(now);
  return itineraryInputSchema.refine(input => !input.startDate || (input.startDate >= today && input.startDate <= addDays(today, 365)), {
    path: ["startDate"], message: "Choose today through 365 days ahead (UTC)",
  });
}
export type ItineraryInput = z.infer<typeof itineraryInputSchema>;
