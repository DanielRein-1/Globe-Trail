
import { Prisma } from '@prisma/client';
import { db as prisma } from '@/lib/db/prisma';

// NOTE: This is a placeholder until we have a proper API client
// that can handle this more gracefully.
interface CountriesDevCountry {
  name: string;
  alpha2Code: string;
  alpha3Code: string;
  capital: string;
  region: string;
  population: number;
  latlng: [number, number];
  currencies: {
    code: string;
    name: string;
    symbol: string;
  }[];
}

const transformCountryData = (country: CountriesDevCountry): Prisma.CountryCreateInput => {
  return {
    isoCode: country.alpha2Code,
    iso3Code: country.alpha3Code,
    name: country.name,
    capital: country.capital,
    continent: country.region,
    population: BigInt(country.population),
    flagUrl: `https://flagcdn.com/${country.alpha2Code.toLowerCase()}.svg`,
    latitude: country.latlng?.[0],
    longitude: country.latlng?.[1],
    currency: country.currencies?.[0]?.name,
  };
};

export const getCountryByIsoCode = async (isoCode: string) => {
  const country = await prisma.country.findUnique({
    where: { isoCode },
  });

  if (country) {
    return country;
  }

  const response = await fetch(`https://countries.dev/alpha/${isoCode}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch country data from external API");
  }

  const countryData: CountriesDevCountry = await response.json();
  const transformed = transformCountryData(countryData);

  const newCountry = await prisma.country.upsert({
    where: { isoCode },
    create: transformed,
    update: transformed,
  });

  return newCountry;
};

export const getCountries = async (params: {
  search?: string;
  continent?: string;
  page?: number;
  limit?: number;
}) => {
  const { search, continent, page = 1, limit = 20 } = params;

  const where: Prisma.CountryWhereInput = {};

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (continent) {
    where.continent = continent;
  }

  try {
    const total = await prisma.country.count({ where });
    const data = await prisma.country.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    return { data, total };
  } catch (error) {
    console.error("Error in getCountries:", error);
    throw error;
  }
};

export const syncAllCountries = async () => {
  const response = await fetch("https://countries.dev/countries");

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`countries.dev API returned ${response.status}: ${errorBody}`);
  }

  const countries: CountriesDevCountry[] = await response.json();

  console.log("countries.dev response status:", response.status);
  console.log("countries.dev response body:", JSON.stringify(countries).slice(0, 500));

  if (!Array.isArray(countries)) {
    throw new Error("countries.dev API did not return an array as expected.");
  }

  let count = 0;
  for (const country of countries) {
    try {
      const transformed = transformCountryData(country);
      await prisma.country.upsert({
        where: { isoCode: country.alpha2Code },
        create: transformed,
        update: transformed,
      });
      count++;
    } catch (error) {
      console.error(`Failed to process country ${country.name}:`, error);
    }
  }

  return { count };
};
