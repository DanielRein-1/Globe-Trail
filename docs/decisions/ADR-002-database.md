# ADR-002: Database Design Decisions

## Status

Accepted

---

## Date

2026-07-14

---

## Context

GlobeTrail stores user accounts, travel itineraries, country information references, travel preferences, budgets, and AI-generated recommendations.

The database must support:

- User authentication
- Trip planning
- AI itinerary storage
- Budget estimation
- Future extensibility
- Efficient querying
- Data integrity

The design should balance normalization, simplicity, and scalability while remaining appropriate for a university capstone project.

---

# Decision

The application will use a relational database implemented with MySQL and accessed exclusively through Prisma ORM.

Database migrations will be managed using Prisma Migrate.

---

# Primary Keys

Every table will use UUIDs as primary keys.

Example:

id = String @id @default(uuid())

---

# Why UUID?

Advantages

- Globally unique identifiers
- Safe for distributed systems
- Difficult to guess
- Better suited for future scaling

Tradeoff

- Larger indexes than integers

The benefits outweigh the small performance cost for this project.

---

# Naming Convention

Tables (Prisma Models)

PascalCase

Example

User

Trip

TripDestination

Preference

Budget

Database Columns

camelCase

Examples

createdAt

updatedAt

estimatedCost

countryCode

---

# Timestamp Strategy

Every table will contain

createdAt

updatedAt

using Prisma defaults.

This provides:

- audit history
- easier debugging
- future analytics

---

# Soft Deletes

Not implemented.

Records will be permanently deleted.

Reason:

Project scope does not require recovery of deleted data.

Future versions may introduce:

deletedAt

---
# Country Reference Data

GlobeTrail will maintain a dedicated `Country` table as the authoritative source of country information used throughout the application.

Country information changes infrequently, making it suitable for local persistence rather than repeated external API requests.

The application will synchronize country data from the REST Countries API during the initial setup and periodically when updates are required.

---

## Country Table

Each country record stores:

- ISO 3166-1 Alpha-2 Code (Unique)
- ISO 3166-1 Alpha-3 Code (Unique)
- Official Name
- Common Name
- Capital City
- Continent / Region
- Subregion
- Currency Code
- Currency Name
- Flag Image URL
- Population
- Latitude
- Longitude
- Time Zones
- Last Synced Timestamp

---

## Purpose

The Country table serves as shared reference data for the entire application.

It provides:

- Country search
- Country details
- Destination selection
- Attraction lookups
- AI itinerary generation
- Budget calculations

No user owns Country records.

---

## Synchronization Strategy

The application follows a cache-first approach.

1. Load country information from the local database.
2. If synchronization is required, retrieve updated data from the REST Countries API.
3. Update existing records or insert new countries.
4. Record the synchronization timestamp.

Country data is expected to change rarely, so frequent synchronization is unnecessary.

---

## Relationships

One Country

↓

Many AttractionCache records

A Country may also be referenced by multiple Trips and AI-generated itineraries through its ISO country code.

---

## Benefits

Maintaining local country data provides several advantages:

- Reduces unnecessary external API requests
- Improves application performance
- Reduces dependency on REST Countries API availability
- Simplifies joins and filtering
- Enables offline access to country metadata
- Supports future analytics and reporting

---

## Alternatives Considered

### Fetch Countries from the API on Every Search

Rejected because:

- unnecessary network requests
- slower response times
- increased dependency on an external service
- no resilience during API outages

Persisting country data locally provides a more reliable and scalable architecture.

# Relationships

The database separates **shared reference data** from **user-owned data**.

### User-Owned Data

One User

↓

Many Trips

One User

↓

One Preference

One Trip

↓

One Budget

One Trip

↓

One AIItinerary

One Trip

↓

Many TripDestinations

---

### Shared Reference Data

Country

↓

Many AttractionCache records

TripDestination

↓

References one AttractionCache record

---

# Shared Attraction Cache

GlobeTrail integrates with the OpenTripMap API.

To reduce API usage, improve response times, and mitigate external rate limits, attraction data will be cached in a dedicated table.

The cache is global and is not owned by any individual user or trip.

Each cache entry stores:

- OpenTripMap attraction ID
- Country code
- Name
- Coordinates
- Category
- Image URL (if available)
- Raw API response (optional)
- Last fetched timestamp
- Expiration timestamp (TTL)

When a user searches a country:

1. Check cache.
2. If cache is valid, reuse cached data.
3. Otherwise fetch from OpenTripMap.
4. Refresh the cache.

This design follows the application's risk mitigation strategy by reducing unnecessary external API calls.

# ERD target

User
 │
 ├──────────────┐
 │              │
Preference    Trip
                 │
      ┌──────────┼───────────┐
      │          │           │
TripDestination  Budget   AIItinerary

# Normalization

Database will be normalized to Third Normal Form (3NF).

Reasons

- eliminate redundancy
- maintain consistency
- simplify updates

Some calculated values (such as total trip cost) may be cached if performance becomes necessary.

---

# AI Itinerary Storage

AI-generated itineraries will be stored in a dedicated AIItinerary table.

Each itinerary belongs to one Trip.

The table stores:

- raw JSON response
- parsed itinerary
- prompt version
- generation timestamp
- model used
- generation status

Keeping AI output separate from the Trip entity improves maintainability, allows future itinerary regeneration, and preserves the original model response for debugging.

---

# Budget Storage

Budget categories stored separately.

Examples

Accommodation

Food

Transport

Activities

Miscellaneous

Total cost calculated by application logic.

---

# Constraints

Required foreign keys

NOT NULL where appropriate

Unique email addresses

Unique usernames (optional)

Indexes on

email

tripId

userId

countryCode

---

# Cascade Rules

Deleting a User deletes:

- Trips
- Preferences

Deleting a Trip deletes:

- Budget
- AIItinerary
- TripDestinations

Deleting a Trip does NOT delete AttractionCache records.

Shared cached data must remain available for other users.

---

# Transactions

Multi-step database operations must use Prisma Transactions.

Example

Create Trip

Insert TripDestination

Insert Budget

Insert AI Result

Commit

---

# Cache Refresh Strategy

Attraction cache entries include an expiration timestamp.

When cached data expires:

- the application fetches fresh data from OpenTripMap
- the cache entry is updated
- future users receive the refreshed data

This minimizes API requests while ensuring attraction information remains reasonably current.

# Migrations

All schema changes must use

Prisma Migrate

Manual SQL schema changes are prohibited.

---

# Seed Data

Development database may include

sample users

sample trips

sample TripDestination

No production seed data.

---

# Consequences

Positive

- Strong data integrity
- Easy maintenance
- Type-safe queries
- Predictable relationships
- Simple migrations

Negative

- UUID indexes are larger
- More joins than a denormalized design
- Prisma introduces an abstraction layer over SQL

---

# Alternatives Considered

## Auto Increment IDs

Rejected because UUIDs provide better uniqueness and future scalability.

---

## MongoDB

Rejected because relational data better models users, trips, TripDestination, and budgets.

---

## Firebase Firestore

Rejected because complex relational queries and joins are easier to express in MySQL.

---

## Raw SQL

Rejected because Prisma improves maintainability and provides compile-time type safety.

---

## Embedding Attractions Inside Trips

Rejected because:

- duplicates identical attraction data
- increases storage
- prevents shared caching
- defeats API rate-limit mitigation

# Final ERD
                 User
                  │
       ┌──────────┴──────────┐
       │                     │
 Preference                Trip
                              │
          ┌──────────┬────────┴─────────┐
          │          │                  │
       Budget   AIItinerary     TripDestination
                                      │
                                      ▼
                               AttractionCache
                                      │
                                      ▼
                                   Country

# Decision Owner

Daniel Rein Ondoro

---

# Review Date

End of Phase 0

