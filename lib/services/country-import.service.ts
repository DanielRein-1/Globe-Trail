import type { PrismaClient } from "@prisma/client";
import { fetchAllCountries, mapCountry, type ProviderCountry } from "../providers/countries";

type CountryWriter = Pick<PrismaClient, "country">;

// Never supply an ID: an update preserves the existing row and its references.
export function upsertCountry(store: CountryWriter, country: ProviderCountry) {
  const data = mapCountry(country);
  return store.country.upsert({ where: { isoCode: data.isoCode }, create: data, update: data });
}

export async function importCountries(store: CountryWriter, fetcher: typeof fetch = fetch) {
  // Validate the entire provider response before writing any rows.
  const countries = await fetchAllCountries(fetcher);
  let count = 0;
  for (const country of countries) {
    await upsertCountry(store, country);
    count++;
  }
  return { count };
}
