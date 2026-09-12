import { Prisma } from "@prisma/client";
import { db } from "../db/prisma";
import { fetchCountry } from "../providers/countries";
import { upsertCountry } from "./country-import.service";
import { countryCodeSchema, countryQuerySchema } from "../validation/country";

export async function getCountryByIsoCode(code: string) {
  const isoCode = countryCodeSchema.parse(code);
  const cached = await db.country.findUnique({ where: { isoCode } });
  if (cached) return cached;
  const country = await fetchCountry(isoCode);
  return country ? upsertCountry(db, country) : null;
}

export async function getCountries(params: unknown) {
  const { search, continent, page, limit } = countryQuerySchema.parse(params);
  const where: Prisma.CountryWhereInput = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (continent) where.continent = continent;
  const [total, data] = await Promise.all([
    db.country.count({ where }),
    db.country.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
  ]);
  return { data, total };
}
