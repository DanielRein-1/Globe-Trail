# GlobeTrail Testing Strategy

## Version

1.0

---

## Status

Draft

---

## Last Updated

2026-07-14

---

# 1. Testing Philosophy

Every feature must be tested before moving to the next development phase.

Testing is performed continuously throughout development rather than waiting until the end of the project.

---

# 2. Testing Pyramid

```
            Manual Acceptance Testing
                     ▲
                     │
             Integration Testing
                     ▲
                     │
               Unit Testing
```

Priority:

1. Unit Tests
2. Integration Tests
3. Manual Testing

---

# 3. Testing Levels

## Unit Testing

Purpose

Verify individual functions work correctly.

Examples

- Budget calculations
- Currency formatting
- Prompt builder
- Validators
- Utility functions

---

## Integration Testing

Purpose

Verify multiple modules work together.

Examples

- User registration
- AI itinerary generation
- Save trip workflow
- Country search

---

## End-to-End Testing

Purpose

Verify complete user journeys.

Examples

Register

↓

Login

↓

Search Country

↓

Generate Trip

↓

Save Trip

↓

View Saved Trips

---

# 4. Manual Testing Checklist

Every feature should be verified manually.

Check:

- UI renders correctly
- Buttons work
- Forms validate correctly
- API responses display correctly
- Responsive layouts function properly
- Error messages are user-friendly

---

# 5. AI Testing

The AI system requires additional validation.

Verify:

- Valid JSON returned
- Schema validation passes
- Business rules enforced
- Retry mechanism functions
- Friendly error on failure

---

# 6. API Testing

Verify every endpoint:

- Success responses
- Validation failures
- Unauthorized access
- Missing resources
- Server errors

---

# 7. Database Testing

Verify:

- Migrations succeed
- Relations are correct
- Cascade behavior works
- Constraints enforced
- Seed data loads correctly

---

# 8. Performance Testing

Monitor:

- Page load time
- AI response time
- Database query performance
- API latency

Target:

- Normal pages < 2 seconds
- AI generation < 15 seconds (target)
- API responses < 500 ms (excluding AI)

---

# 9. Security Testing

Verify:

- Protected routes
- Input validation
- SQL injection protection
- XSS protection
- CSRF protection (where applicable)
- Environment variables remain private

---

# 10. Regression Testing

Before every release:

- Existing features still work
- Database migrations succeed
- No new TypeScript errors
- No linting errors

---

# 11. Bug Tracking

Each bug should record:

- Bug ID
- Description
- Steps to reproduce
- Expected result
- Actual result
- Severity
- Resolution

---

# 12. Definition of Release Ready

The application is considered release-ready only if:

✓ All critical features implemented

✓ No critical bugs

✓ AI generation works reliably

✓ Database migrations succeed

✓ Documentation updated

✓ Production build succeeds

---

# 13. Future Testing

Future improvements:

- Automated unit tests
- Playwright E2E tests
- Load testing
- Lighthouse performance audits
- Accessibility audits

## Country Explorer verification

`npm run test:countries` exercises verified provider fixtures, malformed responses, provider errors, query/code bounds, duplicate parameters, repeatable upserts preserving IDs, and the disabled sync endpoint's response and dependency boundary. Fixture provenance: public countries.dev responses captured 2026-09-12; see ADR-005. The checked-in fixtures are a representative subset, not a production seed.

`npm run test:countries:ui` serves the built UI behind a local fixture proxy. Check desktop and mobile search/filter, pagination, detail/back navigation, loading, empty, missing and retry states. The proxy supplies mock JSON for all API requests, including session requests; it never forwards API calls. It is not loaded by production code.

Before real end-to-end sign-off, separately authorize a development database check: migration state, two consecutive imports retaining IDs, country counts, real search and detail API responses, missing/nullable fields, detail cache-miss persistence, and graceful provider/database failures. Mock success does not establish these conditions.
