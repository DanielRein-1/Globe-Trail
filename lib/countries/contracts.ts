import { z } from "zod";

export const countryViewSchema = z.object({
  isoCode: z.string(), iso3Code: z.string(), name: z.string(),
  capital: z.string().nullable(), continent: z.string().nullable(),
  currency: z.string().nullable(), population: z.string().nullable(),
  latitude: z.string().nullable(), longitude: z.string().nullable(),
});
export type CountryView = z.infer<typeof countryViewSchema>;
export const countryResponseSchema = z.object({ success: z.literal(true), data: countryViewSchema });
export const countriesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ data: z.array(countryViewSchema), meta: z.object({
    page: z.number().int().positive(), limit: z.number().int().positive(),
    total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
  }) }),
});
