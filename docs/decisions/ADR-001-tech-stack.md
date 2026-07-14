# ADR-001: Technology Stack

## Status

Accepted

---

## Date

2026-07-14

---

## Context

GlobeTrail is an AI-powered travel planning platform developed as a university capstone project.

The system must:

- Generate AI travel itineraries
- Search countries and attractions
- Estimate travel budgets
- Allow users to save and manage trips
- Be deployable on Google Cloud
- Be maintainable and scalable

The selected technologies should maximize developer productivity, provide strong type safety, integrate well with Google Cloud services, and reduce development complexity within the project's six-week implementation timeline.

---

# Decision

The project will use the following technology stack.

| Layer | Technology |
|---------|------------|
| Frontend | Next.js 15 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| ORM | Prisma |
| Database | MySQL |
| Validation | Zod |
| Forms | React Hook Form |
| AI Platform | Google Vertex AI |
| AI Model | Gemini 2.5 Pro |
| Authentication | NextAuth.js (Auth.js) |
| Deployment | Google Cloud Run |
| Version Control | Git + GitHub |

---

# Rationale

## Next.js 15

Chosen because it provides:

- React Server Components
- API Routes
- App Router
- Server Actions
- Production-ready architecture
- Simplified deployment

Using Next.js allows frontend and backend logic to exist within a single project, reducing maintenance complexity.

---

## TypeScript

Chosen to improve:

- Type safety
- Refactoring
- Maintainability
- IDE support
- AI-assisted code generation

Static typing reduces runtime errors and improves developer productivity.

---

## Tailwind CSS

Chosen because it:

- Enables rapid UI development
- Produces small production builds
- Integrates naturally with Next.js
- Avoids maintaining large CSS files

---

## shadcn/ui

Chosen because it:

- Uses accessible Radix UI primitives
- Generates editable components
- Works seamlessly with Tailwind
- Produces modern interfaces without locking the project into a proprietary UI framework

---

## Prisma

Chosen because it provides:

- Type-safe database queries
- Schema-driven development
- Database migrations
- Excellent TypeScript support
- High developer productivity

---

## MySQL

Chosen because:

- Required by project requirements
- Mature relational database
- Excellent Prisma support
- Widely deployed in production

---

## React Hook Form

Chosen for:

- High performance
- Minimal re-renders
- Excellent integration with Zod

---

## Zod

Chosen because it enables:

- Runtime validation
- Shared frontend/backend schemas
- Strong TypeScript inference

---

## Vertex AI

Chosen because:

- Native Google Cloud integration
- Secure authentication through Application Default Credentials (ADC)
- Production-ready infrastructure
- Easy deployment to Google Cloud

---

## Gemini 2.5 Pro

Chosen because it provides:

- Strong reasoning
- Excellent coding performance
- Reliable structured JSON generation
- Stable production behavior

Preview models may be evaluated later but will not be the primary development model.

---

## Cloud Run

Chosen because:

- Fully managed
- Auto-scaling
- Container-based deployment
- Native integration with Vertex AI
- Low operational overhead

---

# Consequences

## Positive

- Single TypeScript codebase
- Strong type safety
- Reduced boilerplate
- Excellent AI tooling compatibility
- Straightforward cloud deployment
- Scalable architecture

## Negative

- Requires learning Prisma
- Requires understanding Next.js App Router
- Increased build complexity compared to plain React

---

# Alternatives Considered

## React + PHP

Rejected because maintaining two programming languages increases development complexity and reduces AI-assisted coding efficiency.

---

## Express.js

Rejected because Next.js API Routes provide equivalent functionality while simplifying deployment.

---

## Supabase

Rejected because the project already targets Google Cloud and MySQL.

---

## Firebase

Rejected because relational data is more appropriate for trip planning and budgeting features.

---

## Gemini Developer API

Rejected because Vertex AI offers better production deployment, authentication, monitoring, and Google Cloud integration.

---

# Decision Owner

Daniel Rein Ondoro

---

# Review Date

End of Phase 0