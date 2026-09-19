# GlobeTrail API Contracts

## Version

1.1

---

## Status

Draft

---

## Last Updated

2026-07-14

---

# 1. Overview

The GlobeTrail backend exposes a RESTful JSON API.

All endpoints:

- Accept JSON requests unless stated otherwise
- Return JSON responses
- Use HTTPS in production
- Require authentication where appropriate
- Follow consistent response structures

Base URL (Development)

```
http://localhost:3000/api
```

Base URL (Production)

```
https://your-domain.com/api
```

---

# 2. API Design Principles

The API follows these principles:

- RESTful resource naming
- Stateless requests
- Predictable status codes
- Consistent error responses
- Server-side validation
- Authentication before authorization
- Version-ready architecture

---

# 3. Standard Success Response

```json
{
  "success": true,
   "version": "v1",
  "requestId": "7f2d6e8a-b41b-4a77-a96f-3d4eaf8e2f1c",
  "timestamp": "2026-07-14T10:15:32Z",
  "data": {}
}
```

---

# 4. Standard Error Response

```json
{
  "success": false,
   "version": "v1",
  "requestId": "7f2d6e8a-b41b-4a77-a96f-3d4eaf8e2f1c",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Country code is required."
  }
}
```

---

# 5. HTTP Status Codes

| Code | Meaning |
|------|---------|
|200|Success|
|201|Created|
|204|No Content|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|429|Rate Limited|
|500|Internal Server Error|

---

# 6. Authentication Endpoints

## POST /auth/register

Creates a new user.

Request

```json
{
  "name":"Daniel",
  "email":"user@example.com",
  "password":"********"
}
```

Response

```json
{
  "success":true,
  "data":{
    "userId":"uuid"
  }
}
```

---

## POST /auth/login

Authenticates a user.

---

## POST /auth/logout

Terminates the current session.

---

## GET /auth/session

Returns current authenticated user.

---

# 7. Country Endpoints

## GET /countries

Returns a page of locally stored countries. No provider call populates an empty list.

Supports:

- Search
- Pagination
- Continent filtering

Query Parameters

```
?page=1

&limit=20

&search=Kenya

&continent=Africa
```

---

List success payload inside the standard envelope:

```json
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }
```

`search`: trimmed, maximum 100 characters; case-insensitive country-name matching.
`continent`: exact provider region (Africa, Americas, Antarctic, Antarctic Ocean, Asia, Europe, Oceania, Polar), or empty for all.
`page`: positive integer 1–10000, default 1. `limit`: 1–100, default 20.
Malformed, out-of-range and duplicate known query parameters return 400/VALIDATION_ERROR. Unknown parameters are ignored. Out-of-range result pages return an empty array with accurate metadata.

## GET /countries/:isoCode

Returns a stored country, or validates and persists a countries.dev result on a cache miss. Codes must be two ASCII letters, normalized to uppercase. Invalid code: 400/VALIDATION_ERROR. Missing country: 404/NOT_FOUND. Provider timeout/invalid data: 502/PROVIDER_UNAVAILABLE. Database/internal failure: 500/SERVER_ERROR.

Country fields remain as defined by Prisma. Population and decimal coordinates serialize as strings (or null); missing optional text is null. Dates serialize as ISO strings. Both country read endpoints are public.

Example

```
GET /countries/KE
```

---

## POST /countries/sync

Disabled for all callers. Returns HTTP 403 with code `SYNC_DISABLED` and message `Public country synchronization is disabled. Use the local country import command.` No provider or database calls occur. Use `npm run import:countries` only as an explicit local maintenance operation.

---

# 8. Attraction Endpoints

## GET /countries/:isoCode/attractions

Public endpoint; the country must already exist locally. Accepts a two-letter code, normalized to uppercase. No query parameters are supported: category, radius, limit and unknown parameters all return 400 before database/provider work.

Fixed Geoapify Places search: `categories=tourism`, `filter=circle:<longitude>,<latitude>,50000`, `bias=proximity:<longitude>,<latitude>`, `limit=20`, `lang=en`. This is a limited local sample around the country reference point, not nationwide coverage; results may cross borders.

The standard success envelope contains an array (possibly empty), with only:

- `providerPlaceId`: Geoapify stable place ID
- `name`: provider name or `Unnamed place`
- `categories`: category strings
- `latitude`, `longitude`: numeric point coordinates
- `distanceMeters`: rounded great-circle distance from the country reference point

No database IDs, raw JSON or persistence metadata are exposed. Results are ordered by provider place ID and bounded to 20. Reads are request-time only. A successful refresh, including an empty response, suppresses provider calls for 24 hours. Expired rows are excluded. A refresh response contains exactly its successfully upserted rows; subsequent fresh-cache reads return the country’s unexpired Geoapify rows, including rows from another recent refresh until they expire. Refresh never deletes existing attractions or changes their database IDs or country association. The same provider place can have a separate row in each country’s overlapping sample.

Errors through the standard envelope:

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | VALIDATION_ERROR | Invalid code or any query parameter |
| 404 | NOT_FOUND | Country absent from the local database |
| 422 | COORDINATES_UNAVAILABLE | Missing or unusable reference coordinates |
| 503 | ATTRACTIONS_NOT_CONFIGURED | Missing server key on cache miss |
| 502 | PROVIDER_UNAVAILABLE | Timeout, network/HTTP failure or invalid GeoJSON |
| 500 | SERVER_ERROR | Database or unexpected internal failure |

There is no separate attractions refresh endpoint. Failures do not advance the cache timestamp. No stale fallback is returned. See ADR-006 for cache and verification limits.

---

# 9. Trip Endpoints

## GET /trips

Returns authenticated user's trips.

During Phases 2–6 (prior to authentication), returns trips owned by the seeded
development user.

---

## GET /trips/:tripId

Returns one trip.

---

## POST /trips

Creates a trip.

During Phases 2–6, the trip is created under the seeded development user.
From Phase 7 onward, the trip is created under the authenticated session user.

Request

```json
{
"title":"Japan Adventure",
"country":"JP",
"startDate":"2026-10-01",
"endDate":"2026-10-10"
}
```

---

## PUT /trips/:tripId

Updates trip.

---

## DELETE /trips/:tripId

Permanently deletes the trip and cascades the delete to its associated
TripDestination, Budget, and AIItinerary records. This is a hard delete —
GlobeTrail does not implement soft deletes (see ADR-002). Country and
AttractionCache records are never affected by this operation.

---

# 10. Trip Destination Endpoints

## POST /trips/:tripId/destinations

Adds attraction.

---

## DELETE /trips/:tripId/destinations/:destinationId

Removes attraction.

---

## PUT /trips/:tripId/destinations/:destinationId

Updates visit order.

---

# 11. AI Endpoints

## POST /ai/itinerary

Generates itinerary.

Request

```json
{
"tripId":"uuid"
}
```

Processing

```
Load Trip

↓

Load Destinations

↓

Load Preferences

↓

Build Prompt

↓

Vertex AI

↓

Validate JSON

↓

Save Itinerary

↓

Return Result
```

---

Response

```json
{
"success":true,
"data":{
"itinerary":{}
}
}
```

---

## POST /ai/itinerary/regenerate

Creates a new itinerary version.

Previous versions remain stored.

---

# 12. Budget Endpoints

## POST /budget/calculate

Calculates estimated trip budget.

Request

```json
{
"tripId":"uuid"
}
```

Response

```json
{
"hotel":500,
"food":220,
"transport":180,
"activities":140,
"miscellaneous":75,
"total":1115,
"currency":"USD"
}
```

---

# 13. User Preferences

## GET /preferences

Returns preferences.

---

## PUT /preferences

Updates preferences.

Example

```json
{
"travelStyle":"Adventure",
"budgetRange":"Medium",
"interests":["Nature","Food","Culture"]
}
```

---

# 14. Health Endpoint

## GET /health

Returns API health.

```json
{
"status":"healthy",
"database":"connected",
"vertex":"available",
"timestamp":"..."
}
```

---

# 15. Validation Rules

Every endpoint validates:

- Required fields
- UUID format
- Dates
- Country codes
- Numeric ranges
- Authentication

Validation occurs before business logic.

---

# 16. Authentication Rules

Protected endpoints require:

Authenticated user

AND

Valid session

Public endpoints:

- Login
- Register
- Countries
- Country Details
- Country Attractions

Everything else requires authentication once Phase 7 is complete. During
Phases 2–6, endpoints that would otherwise require authentication instead
resolve to the seeded development user (see docs/02-database.md, Database
Seeding).

---

# 17. Rate Limiting

The API applies rate limiting to:

- AI generation
- Login attempts
- Synchronization endpoints

This protects external service quotas.

---

# 18. Versioning Strategy

Current Version

```
v1
```

Future versions may use:

```
/api/v2
```

without breaking existing clients.

---

# 19. Logging

The following logging fields describe the intended general logging contract. The Geoapify client deliberately does not persist provider request logs or raw diagnostics, to avoid credential-bearing URLs.

Logged requests record:

- Request ID
- Endpoint
- Response Time
- Status Code
- External API Calls

Sensitive information is never logged.

---

# 20. Future Endpoints

Reserved for future development:

- Flight Search
- Hotel Search
- Weather Forecast
- Notifications
- Trip Sharing
- Reviews
- Recommendation Engine

## Public unsaved mock itinerary preview

Implemented separately from the future saved `/ai/itinerary` flow above: `POST /api/itineraries/preview` is public, requires `Content-Type: application/json`, and uses the existing v1 success/error envelope. No authentication, seeded user or persistence occurs. It does not currently provide distributed rate limiting.

The body is limited to 8192 bytes while streaming. Its strict fields are:

- `destinationCode`: trimmed, uppercase two-letter code; an existing Country is required.
- `durationDays`: JSON integer 1–14.
- `startDate`: optional real `YYYY-MM-DD`, today through 365 days ahead, inclusive, using UTC dates.
- `travellers`: JSON integer 1–8.
- `interests`: 1–5 unique values from `nature`, `culture`, `history`, `food`, `relaxation`.
- `budgetPreference`: `budget`, `balanced`, `comfortable`; not a monetary estimate.

Unknown fields and numeric strings are rejected. Example:

```json
{"destinationCode":"KE","durationDays":3,"travellers":2,"interests":["nature","culture"],"budgetPreference":"balanced"}
```

HTTP 200 `data` contains `schemaVersion: "itinerary.v1"`, `source: "mock"`, `templateVersion: "mock-itinerary-v1"`, canonical `destination: {isoCode,name}`, normalized `inputs`, a title (1–120 characters), summary (1–600), and exactly `durationDays` sequential `days`. Each day has `day`, derived UTC `date` or null, `theme` (1–100), and exactly three `activities` in morning/afternoon/evening order. Each activity has `slot`, `kind: "suggestion"`, and `description` (1–300). Nested objects are strict. There are no prices, persistence IDs or raw provider payloads.

Errors: 400 `INVALID_JSON` / `VALIDATION_ERROR`; 404 `NOT_FOUND`; 413 `PAYLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; 503 `AI_NOT_CONFIGURED`; 504 `AI_TIMEOUT`; 502 `AI_INVALID_RESPONSE` / `AI_PROVIDER_UNAVAILABLE`; 500 `SERVER_ERROR`. Error messages are sanitized. The 10-second generation deadline does not include the reference-country lookup. No automatic retry occurs.
