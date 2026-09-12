import { PrismaClient } from "@prisma/client";
import { importCountries } from "../lib/services/country-import.service";

async function main() {
  const prisma = new PrismaClient();
  try {
    const { count } = await importCountries(prisma);
    console.log(`Imported ${count} countries.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Country import failed. Check provider availability and database configuration; rerunning is safe.");
  process.exitCode = 1;
});
