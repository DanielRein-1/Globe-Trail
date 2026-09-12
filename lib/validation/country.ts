import { z } from "zod";

export const REGIONS = ["Africa", "Americas", "Antarctic", "Antarctic Ocean", "Asia", "Europe", "Oceania", "Polar"] as const;
const integer = (maximum: number) => z.union([
  z.number(), z.string().regex(/^[1-9]\d*$/, "Use a positive whole number").transform(Number),
]).pipe(z.number().int().min(1).max(maximum));

export const countryCodeSchema = z.string().trim().regex(/^[a-zA-Z]{2}$/, "Use a two-letter country code").transform(value => value.toUpperCase());
export const countryQuerySchema = z.object({
  search: z.string().trim().max(100, "Search must be 100 characters or fewer").default(""),
  continent: z.union([z.enum(REGIONS), z.literal("")]).default(""),
  page: integer(10000).default(1),
  limit: integer(100).default(20),
});
export type CountryQuery = z.infer<typeof countryQuerySchema>;
export type SearchParams = Record<string, string | string[] | undefined>;

export function readCountryQuery(params: URLSearchParams) {
  const values = Object.fromEntries(["search", "continent", "page", "limit"].map(key => {
    const all = params.getAll(key);
    return [key, all.length > 1 ? all : all[0]];
  }));
  return countryQuerySchema.safeParse(values);
}

export function countryQueryString(query: CountryQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.continent) params.set("continent", query.continent);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  return params.toString();
}
