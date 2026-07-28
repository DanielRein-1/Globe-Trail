
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CountryData {
  name: {
    common: string;
  };
  cca2: string;
  cca3: string;
  capital: string[];
  region: string;
  population: number;
  flags: {
    svg: string;
  };
  latlng: [number, number];
  currencies: {
    [key: string]: {
        name: string;
        symbol: string;
    }
  }
}

async function main() {
  console.log('Seeding database...');

  const response = await fetch('https://restcountries.com/v3.1/all');
  if (!response.ok) {
    throw new Error('Failed to fetch country data');
  }

  const countries: CountryData[] = await response.json();

  for (const country of countries) {
    const currencyKeys = Object.keys(country.currencies || {});
    const currencyName = currencyKeys.length > 0 ? country.currencies[currencyKeys[0]].name : null;

    await prisma.country.create({
      data: {
        isoCode: country.cca2,
        iso3Code: country.cca3,
        name: country.name.common,
        capital: country.capital?.[0],
        continent: country.region,
        population: country.population,
        flagUrl: country.flags.svg,
        latitude: country.latlng?.[0],
        longitude: country.latlng?.[1],
        currency: currencyName,
      },
    });
  }

  console.log(`Seeding finished. ${countries.length} countries added.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
