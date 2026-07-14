# GlobeTrail Development Guide

## Version

1.0

---

## Status

Draft

---

## Last Updated

2026-07-14

---

# 1. Development Philosophy

GlobeTrail is developed incrementally.

Every task must:

- Solve one problem
- Be independently testable
- Keep the application runnable
- Preserve existing functionality

No large "mega commits."

---

# 2. Development Workflow

For every feature:

Understand Task

↓

Create Plan

↓

Implement

↓

Test

↓

Review

↓

Commit

↓

Move to Next Task

---

# 3. Git Workflow

Branch Strategy

main

↓

feature/<feature-name>

↓

Pull Request

↓

Merge

Commit Style

Examples

```
feat: add country explorer

feat: integrate OpenTripMap

feat: implement AI itinerary generation

fix: correct budget calculation

docs: update API contracts

refactor: simplify itinerary service
```

---

# 4. Coding Standards

## TypeScript

- Strict mode enabled
- No `any`
- Prefer interfaces for API responses
- Prefer type inference where appropriate
- Use async/await
- Avoid nested callbacks

---

## React

Only functional components.

Use hooks.

No class components.

Prefer Server Components where appropriate.

Use Client Components only when required.

---

## Next.js

Use App Router.

Use Server Actions where appropriate.

Prefer server-side data fetching.

Avoid unnecessary client-side requests.

---

## Prisma

Never write raw SQL unless absolutely necessary.

Always use Prisma Client.

Keep migrations small.

Never edit generated migration history.

---

## Styling

Tailwind CSS only.

Reusable UI components live inside:

```
components/ui/
```

Feature-specific components:

```
components/features/
```

---

# 5. Folder Organization

```
app/
components/
lib/
prisma/
public/
types/
hooks/
services/
```

Every new file must belong to an existing feature.

Avoid miscellaneous folders.

## Standard Project Structure

```
app/
components/
  ui/
  features/
lib/
  services/
  prompts/
prisma/
public/
types/
hooks/
docs/
```

New directories should only be introduced when there is a clear architectural need.
---

# 6. Error Handling

Never silently ignore errors.

Always:

- Catch
- Log
- Return friendly messages

Never expose stack traces.

---

# 7. Logging
Log:

- API request failures
- AI request IDs and validation failures
- Database errors
- Authentication failures
- External API timeouts

Never log:

- Passwords
- API keys
- Tokens
- Secrets
- Personally identifiable user data

# 8. Environment Variables

All secrets belong in:

```
.env.local
```

Never commit:

- API keys
- Database passwords
- Vertex credentials

---

# 9. Testing Strategy

Every feature requires:

Developer Testing

↓

Integration Testing

↓

Manual UI Verification

↓

Regression Check

---
# 9 b . Dependency Management

Before introducing a new dependency:

- Confirm it solves a real problem.
- Prefer existing framework capabilities.
- Request approval before installation.
- Document major dependencies in ADR-001 if they affect architecture.

Avoid adding libraries for functionality already provided by Next.js, React, or Prisma.

# 10. Performance Guidelines

Use:

- Lazy loading
- Dynamic imports
- Image optimization
- Pagination
- Caching

Avoid:

- Duplicate requests
- Over-fetching
- Large client bundles

---

# 11. Security Guidelines

Validate all inputs.

Sanitize user input.

Protect API routes.

Never trust frontend validation.

Always validate on the server.

---

# 12. AI Development Rules

AI-generated code must:

Compile successfully.

Pass linting.

Match project conventions.

Be reviewed before merging.

AI suggestions are never accepted blindly.

---

# 12 . Database Rules

- All schema changes must be implemented through Prisma migrations.
- Never edit generated migrations manually.
- Seed data belongs in `prisma/seed.ts`.
- During development (Phases 2–6), use the seeded development user as the owner of created trips.
- Shared tables (`Country`, `AttractionCache`) must never be deleted by cascading user or trip operations.

# 13. AI Agent Workflow

The project's AI agent behavior is defined in the repository root:

```
.clinerules
```

This file is the canonical source for all AI-assisted development rules.

Any changes to AI workflow, implementation procedures, approval requirements, or coding constraints must be made in `.clinerules` rather than duplicated elsewhere.

The development guide intentionally does not repeat those rules to maintain a single source of truth.
---

# 14. Definition of Done

A task is complete only if:

✓ Code compiles

✓ TypeScript passes

✓ ESLint passes

✓ Feature manually tested

✓ No console errors

✓ API contract respected

✓ Documentation updated (if applicable)

✓ Database migrations created (if applicable)

✓ Suggested commit message prepared
---

# 15. Pull Request Checklist

Before merging:

- Feature complete
- Tests pass
- No console errors
- No unused code
- No TODOs without issue references
- Documentation updated

---

# 16. Documentation Rules

Whenever architecture changes:

Update:

- Architecture document
- ADRs
- Database design
- API contracts

Documentation is treated as code.

---

# 17. Continuous Improvement

Refactoring is encouraged when:

- Complexity decreases
- Readability improves
- Behavior remains unchanged

Avoid unnecessary rewrites.

---

# 18. Development Principles

The project follows:

- KISS
- DRY
- SOLID
- YAGNI
- Progressive Enhancement
- Convention over Configuration

# 19. Project Conventions

## Naming

Components:
PascalCase

Example:
CountryCard.tsx

Hooks:
camelCase prefixed with "use"

Example:
useCountries.ts

Utilities:
camelCase

Example:
formatCurrency.ts

API Routes:
kebab-case

Example:
/api/generate-itinerary

Database Tables:
PascalCase (Prisma models)

Database Fields:
camelCase

Environment Variables:
UPPER_SNAKE_CASE

Constants:
UPPER_SNAKE_CASE

Enums:
PascalCase

Interfaces:
PascalCase

Types:
PascalCase

## Performance Targets

Aim for:

- Fast initial page load
- Minimal client-side JavaScript
- Server Components by default
- Cached external API responses
- Optimized images using Next.js Image