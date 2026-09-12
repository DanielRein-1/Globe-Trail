# GlobeTrail Database Design

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

GlobeTrail uses a relational database built on MySQL and managed through Prisma ORM.

The database is designed to:

- Normalize shared data
- Minimize duplicate API requests
- Maintain referential integrity
- Support AI-generated itineraries
- Support future scalability

The design separates shared reference data from user-owned data.

---

# 2. Database Design Principles

The database follows these principles:

- UUID primary keys
- Third Normal Form (3NF)
- Foreign key constraints
- Cascading deletes only for user-owned data
- Shared reference tables are never cascade deleted
- Server-generated timestamps
- Hard deletes only (see ADR-002 — soft deletes are explicitly out of scope for this project)
- Minimize duplicated information

---

# 3. Entity Relationship Diagram

```

User
│
├──────────────┐
│              │
▼              ▼
Preference    Trip
                 │
        ┌────────┴────────┐
        ▼                 ▼
TripDestination      AIItinerary
        │                 │
        ▼                 ▼
AttractionCache      Budget
        │
        ▼
Country

```

---

# 4. Tables

---

# User

## Purpose

Stores authenticated users.

## Fields

| Field | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | UUID | PK | User identifier |
| name | String | NOT NULL | Full name |
| email | String | UNIQUE | Email |
| passwordHash | String | NOT NULL | Hashed password |
| createdAt | DateTime | NOT NULL | Creation timestamp |
| updatedAt | DateTime | NOT NULL | Last update |

## Notes

During Phases 2–6 (prior to authentication being implemented in Phase 7), a single fixed
development user is seeded with a constant UUID. All `Trip` records created during this
period reference that seeded user. Phase 7 replaces this with real session-based user
resolution — no schema change is required to support this transition.

---

# Preference

## Purpose

Stores travel preferences.

Each user owns one preference profile.

Examples:

- Preferred budget
- Preferred travel style
- Interests
- Preferred transport

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| userId | UUID |
| travelStyle | String |
| budgetRange | String |
| interests | JSON |
| preferredTransport | String |
| createdAt | DateTime |
| updatedAt | DateTime |

---

# Country

## Purpose

Stores country metadata synchronized from REST Countries.

This table acts as a shared reference for all users.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| isoCode | String |
| iso3Code | String |
| name | String |
| capital | String |
| currency | String |
| continent | String |
| population | BigInt |
| flagUrl | String |
| latitude | Decimal |
| longitude | Decimal |
| lastSynced | DateTime |

## Notes

This table is refreshed periodically.

It is never deleted when a user removes a trip.

---

# AttractionCache

## Purpose

Caches OpenTripMap attractions.

Shared between every user.

Reduces API usage.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| countryId | UUID |
| openTripMapId | String |
| name | String |
| category | String |
| latitude | Decimal |
| longitude | Decimal |
| imageUrl | String |
| rawJson | JSON |
| lastFetched | DateTime |
| expiresAt | DateTime |

## Notes

Records expire after the configured cache TTL.

Expired records are refreshed automatically.

This table is never cascade-deleted by any user or trip deletion — it is shared
reference data, independent of any single trip's lifecycle.

---

# Trip

## Purpose

Represents a user's travel plan.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| userId | UUID |
| countryId | UUID |
| title | String |
| description | String |
| startDate | Date |
| endDate | Date |
| status | Enum |
| createdAt | DateTime |
| updatedAt | DateTime |

---

# TripDestination

## Purpose

Represents attractions selected for a trip.

Does not duplicate attraction information.

References AttractionCache.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| tripId | UUID |
| attractionCacheId | UUID |
| dayNumber | Integer |
| visitOrder | Integer |
| notes | Text |

---

# AIItinerary

## Purpose

Stores AI-generated itineraries.

Supports regeneration history.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| tripId | UUID |
| model | String |
| promptVersion | String |
| itinerary | JSON |
| generatedAt | DateTime |
| status | Enum |

## Notes

Multiple itinerary versions may exist for one trip.

---

# Budget

## Purpose

Stores estimated travel costs.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| tripId | UUID |
| hotel | Decimal |
| transport | Decimal |
| food | Decimal |
| activities | Decimal |
| miscellaneous | Decimal |
| total | Decimal |
| currency | String |
| calculatedAt | DateTime |

---

# 5. Relationships

User

1 → 1 Preference

User

1 → N Trip

Country

1 → N AttractionCache

Country

1 → N Trip

Trip

1 → N TripDestination

Trip

1 → 1 Budget

Trip

1 → N AIItinerary

TripDestination

N → 1 AttractionCache

---

# 6. Index Strategy

## Unique Indexes

- User.email
- Country.isoCode
- Country.iso3Code
- AttractionCache.openTripMapId

## Standard Indexes

- Trip.userId
- Trip.countryId
- AttractionCache.countryId
- AttractionCache.expiresAt
- TripDestination.tripId
- AIItinerary.tripId

---

# 7. Cascade Rules

All deletes in this system are permanent (hard deletes). Soft deletes are not
implemented — see ADR-002 for rationale.

Delete User

↓

Delete Preference

↓

Delete Trips

↓

Delete Budgets

↓

Delete AI Itineraries

↓

Delete Trip Destinations

Shared tables remain untouched regardless of any user or trip deletion:

- Country
- AttractionCache

---

# 8. Transaction Strategy

The following operations execute within database transactions:

- Create trip
- Delete trip (and cascading children)
- Regenerate itinerary
- Save generated itinerary
- Budget recalculation

This ensures consistency.

---

# 9. Synchronization Strategy

## Country

Source:

countries.dev API

Frequency:

Explicit local import with ID-preserving upserts; scheduled refresh is not implemented.

---

## Attraction Cache

Source:

OpenTripMap API

Refresh:

On cache expiration

---

## AI Itinerary

Source:

Vertex AI

Generated on demand.

Never automatically regenerated.

---

# 10. Future Expansion

The schema supports future additions such as:

- Reviews
- Ratings
- Hotel bookings
- Flight integration
- Weather forecasts
- Collaborative trips
- Notifications
- Mobile synchronization
- Soft deletes (deletedAt), if a future requirement for trip recovery emerges

---

# 11. Database Conventions

The project follows these conventions:

- UUID primary keys
- snake_case database tables
- camelCase Prisma fields
- UTC timestamps
- Foreign key constraints
- JSON columns only where flexibility is required
- Prisma Migrations as the single migration mechanism
- Hard deletes only (no deletedAt column on any table at this time)

---

# ApiRequestLog

## Purpose

Stores logs for external API requests made by the application.

This table is intended for debugging, monitoring, performance analysis, and quota tracking.

It is **not** used for analytics or user activity tracking.

## Fields

| Field | Type |
|--------|------|
| id | UUID |
| provider | Enum |
| endpoint | String |
| method | String |
| statusCode | Integer |
| responseTimeMs | Integer |
| success | Boolean |
| errorMessage | String (Nullable) |
| createdAt | DateTime |

## Provider Enum

- REST_COUNTRIES
- OPENTRIPMAP
- VERTEX_AI

## Notes

This table assists in:

- Debugging API failures
- Measuring response times
- Monitoring quota usage
- Identifying repeated failures
- Supporting future observability dashboards

# Enumerations

## TripStatus

- DRAFT
- PLANNED
- ACTIVE
- COMPLETED
- CANCELLED

---

## AIItineraryStatus

- PENDING
- GENERATED
- FAILED
- REGENERATED

---

## BudgetStatus

- ESTIMATED
- UPDATED

# Database Seeding

The project includes a repeatable seed process for development.

Initial seed data includes:

- Countries from countries.dev API
- Sample attractions for testing
- A fixed development user (constant UUID), used as the owner of all Trip records
  created during Phases 2–6, before authentication exists
- Demo trips

Production databases are never seeded with test users, and the fixed development
user is never created outside of local/development environments.

## Country Explorer data setup

The current Prisma schema and migration history target PostgreSQL and use CUIDs, despite the older design text above. This slice introduces no schema changes. Country records are shared data and require no seeded user. The importer validates the complete provider response, upserts by isoCode without replacing IDs, updates lastSynced, and never deletes rows. It imports countries only; the sample users, attractions and trips described above are not implemented by this importer. See ADR-005 and the development guide.
