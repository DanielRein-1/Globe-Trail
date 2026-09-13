
import { db as prisma } from '@/lib/db/prisma';
import { getCountryByIsoCode } from '@/lib/services/country.service';
import { logApiRequest } from '@/lib/api/logging';
import { ApiProvider } from '@prisma/client';

const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;

// This is a known limitation. For large countries, a single centroid search
// will miss many attractions. A future improvement would be to search by city.
const SEARCH_RADIUS_METERS = 50000;
const ATTRACTION_CACHE_TTL_HOURS = 24;

export const getAttractionsByCountry = async (isoCode: string) => {
  const country = await getCountryByIsoCode(isoCode);
  if (!country) {
    throw new Error(`Country with ISO code ${isoCode} not found.`);
  }

  const cachedAttractions = await prisma.attractionCache.findMany({
    where: {
      countryId: country.id,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (cachedAttractions.length > 0) {
    return cachedAttractions;
  }

  // If cache is stale or empty, fetch from OpenTripMap
  const { latitude, longitude } = country;
  if (!latitude || !longitude) {
    throw new Error(`Country ${isoCode} is missing coordinate data.`);
  }

  const endpoint = `https://api.opentripmap.com/0.1/en/places/radius?radius=${SEARCH_RADIUS_METERS}&lon=${longitude}&lat=${latitude}&apikey=${OPENTRIPMAP_API_KEY}`;
  const startTime = Date.now();
  let response: Response | undefined;
  let responseTimeMs: number | undefined;
  let success = false;
  let errorMessage: string | undefined;

  try {
    response = await fetch(endpoint);
    responseTimeMs = Date.now() - startTime;
    success = response.ok;

    if (!response.ok) {
      errorMessage = `API Error: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const attractions = await response.json();

    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + ATTRACTION_CACHE_TTL_HOURS);

    // Use a transaction to delete old attractions and insert new ones
    await prisma.$transaction(async (tx) => {
      await tx.attractionCache.deleteMany({ where: { countryId: country.id } });

      for (const attraction of attractions.features) {
        await tx.attractionCache.create({
          data: {
            countryId: country.id,
            openTripMapId: attraction.id,
            name: attraction.properties.name,
            category: attraction.properties.kinds,
            latitude: attraction.geometry.coordinates[1],
            longitude: attraction.geometry.coordinates[0],
            rawJson: attraction, // Store the full object
            expiresAt: newExpiry,
          },
        });
      }
    });

  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      errorMessage = error.message;
    }
    throw error; // Re-throw to be caught by the route handler
  } finally {
    if (response) {
      await logApiRequest(
        ApiProvider.OPENTRIPMAP,
        endpoint.split("?")[0], // Log endpoint without query string
        'GET',
        response.status || 500,
        responseTimeMs || 0,
        success,
        errorMessage
      );
    }
  }

  // Return the newly cached attractions
  return prisma.attractionCache.findMany({ where: { countryId: country.id } });
};

