import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { countryCodeSchema } from "../validation/country";

const optionalText = z.string().trim().nullish();
const imageUrl = z.url().refine(value => new URL(value).protocol === "https:").nullish();
export const providerCountrySchema = z.object({
  name: z.string().trim().min(1),
  alpha2Code: countryCodeSchema,
  alpha3Code: z.string().regex(/^[A-Z]{3}$/),
  capital: optionalText,
  region: optionalText,
  population: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish(),
  latlng: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]).nullish(),
  currencies: z.array(z.object({ name: optionalText })).nullish(),
  flags: z.object({ svg: imageUrl, png: imageUrl }).nullish(),
});
export type ProviderCountry = z.infer<typeof providerCountrySchema>;
export class CountryProviderError extends Error {
  constructor() { super("Country information is temporarily unavailable."); }
}

export function mapCountry(country: ProviderCountry, syncedAt = new Date()): Prisma.CountryCreateInput {
  return {
    isoCode: country.alpha2Code, iso3Code: country.alpha3Code, name: country.name,
    capital: country.capital || null, continent: country.region || null,
    currency: country.currencies?.find(currency => currency.name)?.name || null,
    population: country.population == null ? null : BigInt(country.population),
    latitude: country.latlng?.[0] ?? null, longitude: country.latlng?.[1] ?? null,
    flagUrl: country.flags?.svg || country.flags?.png || null, lastSynced: syncedAt,
  };
}

const countryNotFound = Symbol("countryNotFound");

async function requestCountryData(path: string, fetcher: typeof fetch): Promise<unknown> {
  try {
    const response = await fetcher(`https://countries.dev${path}`, {
      headers: { Accept: "application/json", "User-Agent": "GlobeTrail/0.1 (country discovery)" },
      signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error",
    });
    if (response.status === 404 && path.startsWith("/alpha/")) return countryNotFound;
    if (!response.ok) throw new CountryProviderError();
    return await response.json();
  } catch { throw new CountryProviderError(); }
}

export async function fetchCountry(code: string, fetcher: typeof fetch = fetch) {
  const isoCode = countryCodeSchema.parse(code);
  const data = await requestCountryData(`/alpha/${isoCode}`, fetcher);
  if (data === countryNotFound) return null;
  const parsed = providerCountrySchema.safeParse(data);
  if (!parsed.success || parsed.data.alpha2Code !== isoCode) throw new CountryProviderError();
  return parsed.data;
}

export async function fetchAllCountries(fetcher: typeof fetch = fetch) {
  const fields = "name,alpha2Code,alpha3Code,capital,region,population,latlng,currencies,flags";
  const data = await requestCountryData(`/countries?fields=${fields}`, fetcher);
  const parsed = z.array(providerCountrySchema).min(1).max(1000).safeParse(data);
  if (!parsed.success) throw new CountryProviderError();
  const codes = new Set(parsed.data.map(country => country.alpha2Code));
  const codes3 = new Set(parsed.data.map(country => country.alpha3Code));
  if (codes.size !== parsed.data.length || codes3.size !== parsed.data.length) throw new CountryProviderError();
  return parsed.data;
}
