# GlobeTrail Development Roadmap

## Project

GlobeTrail

AI-Powered Personalized Travel Planner

---

## Version

1.1

---

## Status

Planning Complete

---

## Last Updated

2026-07-14

---

# 1. Project Vision

GlobeTrail is an AI-powered travel planning platform that helps users discover destinations, estimate travel costs, and generate personalized travel itineraries using Google Vertex AI.

The project emphasizes intelligent recommendations, modern software engineering practices, and scalable cloud-native architecture.

---

# 2. Objectives

The project aims to:

- Discover countries and attractions
- Generate AI-powered itineraries
- Estimate travel budgets
- Save personalized trips
- Provide an intuitive user experience
- Demonstrate modern full-stack engineering practices

---

# 3. Technology Stack

Frontend

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- Next.js Route Handlers
- Server Actions

Database

- MySQL
- Prisma ORM

AI

- Google Vertex AI
- Gemini 2.5 Pro

Validation

- Zod
- React Hook Form

Deployment

- Google Cloud Run
- Cloud SQL
- Secret Manager

---

# 4. Development Strategy

Development follows an incremental approach.

Every phase must:

- Produce a working feature
- Be independently testable
- End with a Git commit
- Preserve application stability

No new phase begins until the current phase is complete.

---

# 5. Phase Overview

| Phase | Title | Deliverable |
|--------|-------|-------------|
| Phase 0 | System Design | Complete engineering documentation |
| Phase 1 | Project Foundation | Running Next.js application |
| Phase 2 | Database & Data Layer | Prisma schema, database, and seeded dev user |
| Phase 3 | Country Explorer | REST Countries integration |
| Phase 4 | Attractions Explorer | OpenTripMap integration |
| Phase 5 | AI Itinerary Generation | Vertex AI integration |
| Phase 6 | Budget Planner | Travel cost estimation |
| Phase 7 | Authentication & Profiles | Secure user accounts |
| Phase 8 | Trip Management | Save, edit and delete trips |
| Phase 9 | UI Polish & Optimization | Responsive UX improvements |
| Phase 10 | Testing & Deployment | Production-ready application |

---

# 6. Detailed Phase Plan

## Phase 0 — System Design

Deliverables

- Roadmap
- Architecture
- Database Design
- API Contracts
- AI Design
- UI Design
- Development Guide
- Testing Strategy
- Deployment Guide
- ADRs

Completion Criteria

- All documentation reviewed
- Architecture approved
- Ready for implementation

---

## Phase 1 — Project Foundation

Deliverables

- Initialize Next.js
- Configure TypeScript
- Configure Tailwind CSS
- Configure ESLint
- Configure Prettier
- Configure Prisma
- Configure environment variables
- Create folder structure
- Initial Git repository

Git Commit

```
feat: initialize GlobeTrail project
```

---

## Phase 2 — Database & Data Layer

Deliverables

- Prisma schema
- Initial migration
- Seed data
- Country cache
- Attraction cache
- User models
- Trip models
- Seed a fixed development user (UUID constant) to own trips created during
  Phases 3–6, prior to real authentication in Phase 7. This user exists only
  in development/local seed data and is never created in production.

Completion Criteria

- Migrations run successfully
- Seed script creates the fixed development user, sample countries, and
  sample attractions
- Schema matches docs/02-database.md exactly, including hard-delete-only
  cascade rules (no `deletedAt` columns)

Git Commit

```
feat: implement database schema
```

---

## Phase 3 — Country Explorer

Deliverables

- REST Countries integration
- Search countries
- Country details
- Country caching

Git Commit

```
feat: implement country explorer
```

---

## Phase 4 — Attractions Explorer

Deliverables

- OpenTripMap integration
- Attraction caching
- Categories
- Search nearby attractions

Git Commit

```
feat: implement attractions explorer
```

---

## Phase 5 — AI Itinerary Generation

Deliverables

- Vertex AI integration
- Prompt Builder
- JSON validation
- Retry mechanism
- AI logging

Trips generated during this phase are owned by the seeded development user
(see Phase 2).

Git Commit

```
feat: implement AI itinerary generation
```

---

## Phase 6 — Budget Planner

Deliverables

- Budget calculations
- Accommodation estimates
- Transport estimates
- Food estimates
- Activity estimates

Git Commit

```
feat: implement budget planner
```

---

## Phase 7 — Authentication & Profiles

Deliverables

- NextAuth.js
- Login
- Registration
- Sessions
- Protected routes
- User preferences
- Replace the seeded development user with real session-based user
  resolution across all existing endpoints (Trip, AIItinerary, Budget,
  Preference). No schema change is required for this transition.

Git Commit

```
feat: implement authentication
```

---

## Phase 8 — Trip Management

Deliverables

- Save itinerary
- Edit itinerary
- Delete itinerary
- Favorites
- Trip history

Git Commit

```
feat: implement trip management
```

---

## Phase 9 — UI Polish & Optimization

Deliverables

- Responsive design
- Loading states
- Skeleton screens
- Accessibility
- Performance optimization

Git Commit

```
feat: polish user experience
```

---

## Phase 10 — Testing & Deployment

Deliverables

- Final testing
- Production deployment
- Monitoring
- Documentation review

Git Commit

```
feat: production deployment
```

---

# 7. Milestones

Milestone 1

Foundation Complete

Phases 0–2

---

Milestone 2

Core Travel Features

Phases 3–6

---

Milestone 3

User Features

Phases 7–8

---

Milestone 4

Production Ready

Phases 9–10

---

# 8. Definition of Success

The project is considered complete when:

✓ Users can browse countries

✓ Users can explore attractions

✓ AI generates personalized itineraries

✓ Budgets are calculated accurately

✓ Trips can be saved

✓ Application is deployed on Google Cloud

✓ Documentation is complete

✓ Testing is completed

---

# 9. Risks

Potential risks include:

- AI response inconsistencies
- External API rate limits
- Cloud service quotas
- Deployment failures
- Development phases (2–6) building against the seeded development user
  instead of real auth, if not clearly documented, could create confusion
  about ownership when Phase 7 introduces real sessions

Mitigation strategies are documented in the ADRs and architecture documents.

---

# 10. References

Supporting documentation:

- 01-architecture.md
- 02-database.md
- 03-api-contracts.md
- 04-ai-design.md
- 05-ui-wireframes.md
- 06-development-guide.md
- 07-testing-strategy.md
- 08-deployment.md
- docs/decisions/