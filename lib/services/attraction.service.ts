import { db } from '@/lib/db/prisma';
import type { AttractionCache, PrismaClient, Prisma } from '@prisma/client';
import { fetchPlaces, type Places } from '@/lib/providers/geoapify';
import { AttractionError, type Attraction } from '@/lib/attractions/contracts';
import { validateAttractionRequest } from '@/lib/validation/attraction';

const TTL = 24 * 60 * 60 * 1000;
type Store = Pick<PrismaClient, 'country' | 'attractionCache' | '$transaction'>;

function coordinates(latitude: Prisma.Decimal | null, longitude: Prisma.Decimal | null) {
  const lat = latitude?.toNumber(), lon = longitude?.toNumber();
  if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)
    || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new AttractionError('COORDINATES_UNAVAILABLE', 422, 'This country has no usable reference coordinates.');
  }
  return { lat, lon };
}

function publicAttraction(row: AttractionCache, lat: number, lon: number): Attraction {
  const latitude = row.latitude.toNumber(), longitude = row.longitude.toNumber();
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(latitude - lat) / 2) ** 2
    + Math.cos(radians(lat)) * Math.cos(radians(latitude)) * Math.sin(radians(longitude - lon) / 2) ** 2;
  return { providerPlaceId: row.providerPlaceId, name: row.name,
    categories: row.category.split(',').filter(Boolean), latitude, longitude,
    distanceMeters: Math.round(6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))) };
}

async function refresh(store: Store, countryId: string, places: Places, fetchedAt: Date) {
  return store.$transaction(async tx => {
    // PostgreSQL holds this country row lock until commit. Every refresh takes it
    // before upserting, serializing writers of the same country-scoped identity.
    // Timestamp and attraction writes roll back together on any failure.
    await tx.country.update({ where: { id: countryId }, data: { attractionsLastFetchedAt: fetchedAt } });
    const rows: AttractionCache[] = [];
    for (const feature of places.features) {
      const identity = { countryId, provider: 'geoapify', providerPlaceId: feature.properties.place_id };
      const where = { countryId_provider_providerPlaceId: identity };
      const data = { name: feature.properties.name?.trim() || 'Unnamed place',
        category: feature.properties.categories.join(','),
        longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1],
        rawJson: feature, lastFetched: fetchedAt, expiresAt: new Date(fetchedAt.getTime() + TTL) };
      rows.push(await tx.attractionCache.upsert({ where,
        create: { ...identity, ...data }, update: data }));
    }
    return rows.sort((a, b) => a.providerPlaceId.localeCompare(b.providerPlaceId));
  }, { isolationLevel: 'ReadCommitted' });
}

export async function getAttractionsByCountry(isoCode: string, store: Store = db,
  provider = fetchPlaces, now: () => Date = () => new Date()): Promise<Attraction[]> {
  const code = validateAttractionRequest(isoCode);
  const country = await store.country.findUnique({ where: { isoCode: code } });
  if (!country) throw new AttractionError('NOT_FOUND', 404, 'Country not found.');
  const { lat, lon } = coordinates(country.latitude, country.longitude);
  const fetchedAt = country.attractionsLastFetchedAt;
  const current = now();
  if (!fetchedAt || fetchedAt.getTime() + TTL <= current.getTime() || fetchedAt > current) {
    const places = await provider(lon, lat);
    const rows = await refresh(store, country.id, places, now());
    return rows.map(row => publicAttraction(row, lat, lon));
  }
  const rows = await store.attractionCache.findMany({ where: {
    countryId: country.id, provider: 'geoapify', expiresAt: { gt: now() },
  }, orderBy: { providerPlaceId: 'asc' }, take: 20 });
  return rows.map(row => publicAttraction(row, lat, lon));
}
