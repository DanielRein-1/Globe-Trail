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

Returns every country.

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

## GET /countries/:isoCode

Returns detailed information about a country.

Example

```
GET /countries/KE
```

---

## POST /countries/sync

Synchronizes REST Countries data.

Admin/Internal only.

---

# 8. Attraction Endpoints

## GET /countries/:isoCode/attractions

Returns cached attractions.

If cache expired:

↓

Refresh OpenTripMap

↓

Update cache

↓

Return results

Query Parameters

```
category

limit

radius
```

---

## POST /attractions/refresh

Refreshes cached attractions.

Internal endpoint.

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

Every API request records:

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