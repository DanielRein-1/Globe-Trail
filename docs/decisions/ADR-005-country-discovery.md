# ADR-005: Public Country Explorer

Status: Accepted for the MVP implementation (2026-09-12).

## Decision

Use countries.dev as the sole country-data provider for cache misses and local imports. Reuse `lib/providers/countries.ts` for runtime validation and mapping, and `lib/services/country-import.service.ts` for ID-preserving upserts. Country services keep Prisma calls on the server. The existing database and migrations use PostgreSQL/CUIDs; this feature does not change the schema.

The public UI is `/countries` and `/countries/[isoCode]`. It requests the existing public JSON APIs after navigation. No database reads occur during static rendering/builds. The list reads the local Country table; a detail cache miss can fetch and persist that one country. All-country import is an explicit maintenance command, never a browser action. `POST /api/countries/sync` returns 403/SYNC_DISABLED without loading services or accessing providers/database.

## Provider evidence

Checked official documentation and public samples on 2026-09-12:

- https://countries.dev/docs/api/alpha
- https://countries.dev/docs/api/countries
- https://countries.dev/docs/response-format
- `GET https://countries.dev/alpha/KE`: one object, `alpha2Code`, `alpha3Code`, `name`, `capital`, `region`, `currencies`, `population`, `latlng`, `flags`.
- `GET /countries?fields=name,alpha2Code,alpha3Code,region,capital,latlng,population,flags,currencies`: array of 250 records; no pagination limit by default.

The quick-start's `flag` URL example differs from the live emoji `flag`. Map verified `flags.svg`/`flags.png` instead. UI flags are derived ISO emoji, so rendering does not require remote flag-image requests. Provider data is reference data, not a guarantee of current travel information.

Observed regions: Africa, Americas, Antarctic, Antarctic Ocean, Asia, Europe, Oceania, Polar. Preserve these values rather than relabeling the data. The API retains the existing `continent` parameter/database column; the UI calls it Region.

## Boundaries and failure handling

Validate all required identifiers and known optional fields before persistence. Reject malformed provider responses; do not silently import partial invalid datasets. Timeout provider requests after 10 seconds. A partial database write failure stops import; rerunning safely upserts already written rows. Imports never delete countries or specify replacement IDs, and explicitly update lastSynced.

Country query validation is shared by UI and APIs. Search is trimmed, case-insensitive and at most 100 characters; region must be listed; page is 1–10000 and limit 1–100. Duplicate known API query parameters are invalid. Country codes are exactly two ASCII letters, normalized to uppercase.

The browser keeps search, continent, page and limit in the URL. Detail/back/pagination links rebuild only validated query values, never arbitrary return URLs. Unknown country data produces API 404 and a client-rendered not-found state; a malformed page code also uses Next.js notFound. A syntactically valid detail page shell may return HTTP 200 before its data request returns 404.

Attractions, login changes, account linking, credentials, itineraries and budgets are outside this slice. The deferred credentials stash remains untouched.

## Verification limits

Focused tests use captured public fixtures and mock persistence; UI fixtures run behind a localhost-only proxy that never forwards API requests to Next.js. These tests do not establish database connectivity, migration status, real import success, persistence constraints or live end-to-end integration. Those checks require separately authorized development database access.
