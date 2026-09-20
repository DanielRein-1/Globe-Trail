# GlobeTrail Documentation

## Planning
- 00-roadmap.md

## Architecture
- 01-architecture.md

## Database
- 02-database.md

## APIs
- 03-api-contracts.md

## AI
- 04-ai-design.md

## UI
- 05-ui-wireframes.md

## Development
- 06-development-guide.md

## Testing
- 07-testing-strategy.md

## Deployment
- 08-deployment.md

## Architecture Decision Records (ADRs)
- ADR-001-tech-stack.md
- ADR-002-database.md
- ADR-003-ai-provider.md


## Country Explorer

Public entry point: `/countries`. Search, region filtering, pagination and detail/back navigation are URL-based. See [ADR-005](docs/decisions/ADR-005-country-discovery.md) for the verified provider contract and implementation boundaries, and [the development guide](docs/06-development-guide.md#country-explorer-local-maintenance-and-tests) for import and fixture commands.

## Mock itinerary preview

From country details, choose **Create a sample itinerary**. The public planner returns a deterministic, unsaved sample outline, not a verified travel schedule. It needs an existing country record but performs no imports or itinerary writes. See [ADR-007](docs/decisions/ADR-007-public-itinerary-preview.md), the [API contract](docs/03-api-contracts.md#public-unsaved-mock-itinerary-preview), and `npm run test:itineraries`. No paid AI provider is supported.

## Destination selection

On a country's sample-planning page, keep **Anywhere in country** or search and explicitly select a destination. Geoapify resolves the selected reference on the server before producing a generic, unsaved mock outline. Search ranking can be poor; inspect location labels. Only the curated Maasai Mara → Masai Mara alias is added. No images, bookings, prices or saved trips are supplied. See [ADR-008](docs/decisions/ADR-008-destination-selection.md) and `npm run test:destinations`. The existing server-only `GEOAPIFY_API_KEY` is needed for searches/selected previews, not country-wide mock generation.
