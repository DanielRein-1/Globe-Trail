# ADR-006: Minimal Geoapify Attractions Explorer

Status: Accepted for MVP implementation (2026-09-14).

## Decision and evidence

Replace the OpenTripMap refresh implementation with Geoapify Places. Official contract: https://apidocs.geoapify.com/docs/places/. One authorized sanitized request on 2026-09-14 returned HTTP 200 and a valid GeoJSON FeatureCollection with 18 Point features, unique `properties.place_id` strings and `properties.categories` arrays. The configured key and live response body are not committed; automated fixtures are synthetic.

Use English tourism results within 50,000 metres of the stored country reference point, proximity bias and limit 20. This is a limited local sample, may include places across a border, and is not nationwide coverage. Display that limitation and Geoapify/OpenStreetMap attribution beside the results.

## Boundaries

The route validates the two-letter country code and rejects all query parameters before I/O. The service reads an existing local country, checks coordinates (zero is valid), manages the 24-hour cache, and returns a public DTO. It does not fetch missing countries. The server-only provider uses native HTTPS (avoiding framework fetch URL instrumentation), a 10-second timeout, a 1 MiB response limit, strict status handling and Zod validation of every result. Redirects are rejected. Unknown fields are stripped; malformed/duplicate identities fail the entire response. Credentials are read lazily only for cache misses. Raw transport diagnostics and response bodies are never logged or returned.

A successful refresh transaction updates Country.attractionsLastFetchedAt and upserts by (countryId, provider, providerPlaceId). Existing rows are backfilled as opentripmap; their IDs and references remain intact. The legacy openTripMapId stays nullable for an additive transition. No refresh deletes a row or changes its ID. Fresh-cache reads return that country’s unexpired Geoapify rows, sorted by providerPlaceId and bounded to 20. Refresh responses return exactly the successfully upserted rows captured inside their transaction, without querying by lastFetched afterward. An empty provider response commits the timestamp and returns []. Expired records are never returned; omitted records remain stored and, if still unexpired from another recent refresh, can appear on subsequent fresh-cache reads. The country timestamp suppresses provider calls for 24 hours, including after empty results; it is not a snapshot identity.

Provider identity is scoped to countryId. Overlapping country searches can each store the same provider place under separate stable AttractionCache IDs. Existing records and TripDestination references are never reassigned. No country association is inferred from provider address metadata.

Each refresh first updates its Country row inside a ReadCommitted transaction. PostgreSQL holds that row lock until commit, serializing same-country upserts before any attraction write. The country-scoped unique index means different countries do not contend for the same identity. Returning transaction-local rows avoids timestamp collisions and post-commit reads of a different refresh. All refresh writers must follow this lock order; this is not a guarantee for unrelated direct database writers.

The client section fetches independently so country details stay visible on attraction failures. It provides loading, empty, missing-coordinate, unavailable and retry states. No maps, filters, images, attraction details, trip-writing or authentication changes are included.

## Verification and limits

Provider contract checked live once; automated provider, service, route and UI checks use fixtures/mocks. These do not prove migration/backfill execution, PostgreSQL lock/uniqueness behavior under concurrent writes or real TripDestination foreign-key preservation. Mocked interleavings cover equal timestamps, overlapping IDs, empty responses and a later transaction committing before the earlier response returns. Migration application and database access were explicitly excluded from implementation verification.

No distributed request deduplication, rate limiting, stale fallback or multi-country association table is introduced. Concurrent cache misses may issue duplicate provider requests; the unique identity prevents duplicate persisted identities, while failures retain the last successful cache timestamp. Before public deployment, assess provider quota/abuse protection separately. The fixed search and provider are intentionally not configurable through the public API.
