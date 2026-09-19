# ADR-007: Public unsaved mock itinerary preview

Status: Accepted

## Decision

The first planner is a public sample outline at `/countries/[isoCode]/plan`, submitted to `POST /api/itineraries/preview`. It requires no session. Results remain in browser component state and can be lost on refresh or navigation. No itinerary, trip, preference or budget is persisted. The service reads only the canonical Country code/name; an absent country returns 404 without fetching or importing it.

Only the existing deterministic mock is supported. `AI_PROVIDER` is optional and defaults to `mock`; any other configured value returns a sanitized 503 at request time. Selection is lazy. No AI key, paid provider, prompt, network request or JSON repair/retry is needed. This supersedes the general AI retry/persistence workflow for this slice only, while retaining ADR-004's provider-neutral service boundary.

The provider returns unknown structured data. Strict Zod and cross-field checks are mandatory before returning a versioned result. Generation has a 10-second deadline and receives an abort signal. The synchronous mock is bounded to 14 days; a timer cannot interrupt arbitrary synchronous JavaScript. No automatic retry occurs.

The UI prominently says: “Mock itinerary preview. Generic suggestions, not a verified travel schedule. This itinerary is not saved.” Generic suggestions reflect interests and qualitative budget preferences; no named venues, prices, opening hours, availability, transport times or routing claims are generated. Nearby attractions are not grounding for a nationwide plan. No save, edit, share, download or login controls are added.

## Contracts and boundaries

See the public preview section in [API contracts](../03-api-contracts.md). Route: bounded body parsing and envelopes. Validation/contracts: strict input and output schemas. Service: read-only destination resolution, generation deadline and business validation. Provider: deterministic content only. UI: escaped plain text, independent request lifecycle and safe return navigation.

Trip, AIItinerary and Budget remain authenticated persistence concerns outside this release. No schema or migration change is required. This is an explicit exception to older documentation describing every AI request as authenticated and saved, or resolving a seeded development user.

## Verification and deferred work

`npm run test:itineraries` uses the real route/service with a mocked read-only repository, plus injected provider failures and timeouts. It does not prove database connectivity. Browser scenarios use the local fixture proxy and never forward API requests to the application. Existing country/attraction/site tests remain required.

Real model providers, verified attraction grounding, monetary estimates, persistence and public-scale abuse controls require separate decisions. Runtime schema validation establishes structure, not factual accuracy; deterministic generic templates and explicit disclosure bound this release's claims.
