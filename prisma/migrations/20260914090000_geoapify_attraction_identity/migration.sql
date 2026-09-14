-- Preserve all existing attraction IDs and TripDestination foreign keys.
BEGIN;
ALTER TABLE "AttractionCache"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerPlaceId" TEXT;

UPDATE "AttractionCache"
SET "provider" = 'opentripmap', "providerPlaceId" = "openTripMapId";

ALTER TABLE "AttractionCache"
  ALTER COLUMN "provider" SET NOT NULL,
  ALTER COLUMN "providerPlaceId" SET NOT NULL,
  ALTER COLUMN "openTripMapId" DROP NOT NULL;

CREATE UNIQUE INDEX "AttractionCache_countryId_provider_providerPlaceId_key"
  ON "AttractionCache"("countryId", "provider", "providerPlaceId");

ALTER TABLE "Country" ADD COLUMN "attractionsLastFetchedAt" TIMESTAMP(3);
COMMIT;
