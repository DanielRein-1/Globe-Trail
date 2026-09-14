# GlobeTrail System Architecture

## Version

1.0

---

## Status

Draft

---

## Last Updated

2026-07-27

---

# 1. Overview

GlobeTrail is an AI-powered travel planning platform that helps users discover countries, explore tourist attractions, generate personalized travel itineraries, estimate travel budgets, and manage trips.

The system combines traditional web technologies with Artificial Intelligence and external travel APIs to provide an intelligent travel planning experience.

The application follows a modern full-stack architecture using Next.js, Prisma ORM, MySQL, and a provider-neutral AI abstraction layer.

---

# 2. System Goals

The architecture is designed to achieve the following objectives:

- Maintain a clean separation of concerns
- Secure all sensitive operations on the server
- Minimize external API requests through caching
- Provide scalable and maintainable code
- Support future feature expansion
- Enable straightforward deployment to Google Cloud

---

# 3. High-Level Architecture

```text
                    User
                      │
                      ▼
              Next.js Frontend
                      │
                      ▼
             API Route Handlers
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
 Authentication   Travel Services   AI Services
      │               │                │
      └───────────────┼────────────────┘
                      ▼
              Business Logic Layer
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
   Prisma ORM     AI Provider    External APIs
      │               │                │
      ▼               │                ▼
     MySQL            │         countries.dev
                      │
                      ▼
                Geoapify Places
```

---

# 4. Core Components

## Frontend

Responsibilities

- User interface
- Forms
- Dashboard
- Trip management
- API communication
- Responsive design

Technologies

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod

---

## API Layer

Responsibilities

- Receive client requests
- Validate input
- Authenticate users
- Call business services
- Return JSON responses

No business logic should exist directly inside API routes.

---

## Business Logic Layer

Responsibilities

- Trip management
- Budget calculations
- Country lookup
- Attraction retrieval
- AI itinerary generation
- Validation
- Error handling

This layer contains the application's core business rules.

---

## Database Layer

Responsibilities

- Persist application data
- Maintain relationships
- Enforce constraints
- Execute transactions

Technology

- Prisma ORM
- MySQL

---

## AI Layer

Responsibilities

- Generate itineraries
- Interpret user travel preferences
- Produce structured JSON
- Validate responses

Technology

- Pluggable AI provider architecture (see ADR-004)
- Default: Mock provider for local development

---

# 5. External Services

## countries.dev API

Purpose

- Country metadata
- Flags
- Currency
- Population
- Geography

---

## Geoapify Places API

Purpose

- Tourist attractions
- Coordinates
- Categories
- Places of interest

Responses are validated as GeoJSON and cached locally for 24 hours, including empty results. The fixed tourism search covers only 50 km around a country reference point. Provider-neutral upserts preserve attraction IDs and existing trip references. See ADR-006.

---

## AI Provider

Purpose

- AI itinerary generation
- Travel recommendations
- Budget suggestions

---

# 6. Folder Structure

```

app/
components/
lib/
ai/
services/
validation/
utils/
prisma/
hooks/
types/
public/
docs/

```

---

# 7. Data Flow

Typical request lifecycle

User

↓

Frontend Form

↓

API Route

↓

Validation

↓

Business Service

↓

Database / External API / AI Provider

↓

Response

↓

Frontend UI

---

# 8. Authentication Flow

User Login

↓

Auth.js

↓

Session Created

↓

Protected Route Access

↓

Business Logic

↓

Database

Authentication is enforced on all user-specific resources.

---

# 9. AI Request Flow

User submits travel preferences

↓

Input Validation

↓

Prompt Builder

↓

AI Provider

↓

JSON Validation

↓

Store Result

↓

Return Itinerary

Only validated JSON responses are accepted.

---

# 10. Database Strategy

The database separates shared reference data from user-owned data.

Shared Data

- Country
- AttractionCache

User Data

- User
- Preference
- Trip
- Budget
- TripDestination
- AIItinerary

This separation improves performance and minimizes redundant API requests.

---

# 11. Caching Strategy

Country data is synchronized periodically.

Geoapify Places responses are cached using TTL.

AI-generated itineraries are stored for reuse.

The application always checks cached data before calling external APIs.

---

# 12. Error Handling

The system follows graceful failure principles.

If an external API fails

↓

Attempt recovery

↓

Return user-friendly message

↓

Log the error

↓

Continue operating whenever possible

---

# 13. Security Principles

The application follows these security practices:

- Server-side API keys only
- Application Default Credentials (ADC)
- Input validation using Zod
- Parameterized database queries via Prisma
- Authentication with Auth.js
- HTTPS in production
- Environment variables for secrets

---

# 14. Scalability Considerations

The architecture supports future enhancements including:

- Multiple AI models
- Cloud Storage for images
- User collaboration
- Offline support
- Mobile application
- Recommendation engine

---

# 15. Design Principles

The project follows:

- Separation of Concerns
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- RESTful API Design
- Type Safety
- Secure-by-Default Development

---

# 16. Architectural Decisions

The following ADRs define this architecture:

- ADR-001 — Technology Stack
- ADR-002 — Database Design
- ADR-003 — AI Provider (Superseded)
- ADR-004 — AI Abstraction Layer

All implementation decisions should conform to these architectural records.

## Country Explorer implementation

Country discovery follows [ADR-005](decisions/ADR-005-country-discovery.md): validated countries.dev client, shared import mapper, public read APIs, disabled public synchronization and client-fetched country UI. The implemented database is PostgreSQL; older MySQL deployment/design references do not describe the current schema.
