> **Status: Superseded by [ADR-004](./ADR-004-ai-abstraction.md)**
> 
> This document is retained for historical context. The decisions herein were revised to support a provider-neutral architecture.

# ADR-003: AI Provider & Integration Strategy

## Status

Superseded

---

## Date

2026-07-14

---

## Context

GlobeTrail uses Generative AI to create personalized travel itineraries based on user preferences.

The AI component is a core feature of the project and must be:

- Reliable
- Secure
- Cost-effective
- Maintainable
- Easy to extend

The application will be deployed on Google Cloud, making native integration with Google AI services the preferred approach.

---

# Decision

GlobeTrail will use Google Vertex AI as its AI platform with Gemini 2.5 Pro as the primary model.

All AI requests will be made from the server only.

The frontend will never communicate directly with Vertex AI.

---

# AI Provider

Google Vertex AI

Reason:

- Native Google Cloud integration
- Enterprise authentication
- Secure API access
- Monitoring and logging
- Production-ready deployment

---

# AI Model

Primary

Gemini 2.5 Pro

Reason

- Excellent reasoning
- Strong coding capabilities
- Reliable JSON generation
- Stable production model

Future models may be evaluated but are outside the scope of this project.

---

# Authentication

Authentication will use:

Application Default Credentials (ADC)

No API keys will be exposed to the frontend.

Credentials will be managed by Google Cloud.

---

# Prompt Management

Prompts must never be hardcoded.

Prompt files will be stored separately.

Example

backend/prompts/

or

lib/prompts/

Example files

generate-itinerary.md

budget-estimation.md

travel-tips.md

Separating prompts allows version control and easier prompt iteration.

---

# Response Format

The AI must always return structured JSON.

Natural language responses are not acceptable.

The application will validate every response before processing it.

Example

{
  "tripTitle": "...",
  "summary": "...",
  "days": [],
  "estimatedBudget": {}
}

---

# Validation

Every AI response will be validated before being stored.

Validation layers

1. Zod schema
2. Business rules
3. Database constraints

Invalid responses will be rejected.

---

# Error Handling

If AI generation fails

Retry once

↓

Return friendly error message

↓

Log failure

The application must never crash because of an AI response.

---

# Logging

The following information may be logged

- Request timestamp
- Processing duration
- Success or failure
- Token usage (if available)
- Error messages

Prompt contents and personal user information should not be logged in production.

---

# Cost Control

The application should minimize AI usage.

Strategies

- Generate only when requested
- Avoid duplicate requests
- Cache generated itineraries
- Store previous results
- Reuse existing itinerary when appropriate

---

# Security

The frontend must never expose

- Vertex credentials
- Project IDs
- Service account credentials
- Access tokens

All AI communication occurs through secure server-side API routes.

---

# Future Extensions

Possible future improvements

- Streaming responses
- Multi-language itinerary generation
- Image generation
- Voice itinerary assistant
- AI chat assistant
- Recommendation engine

These features are outside the current project scope.

---

# Alternatives Considered

## Gemini Developer API

Rejected because Vertex AI provides better production deployment, authentication, monitoring, and integration with Google Cloud.

---

## OpenAI API

Rejected because the project is deployed on Google Cloud and Vertex AI provides tighter ecosystem integration.

---

## Anthropic Claude API

Rejected because introducing another AI provider increases operational complexity without providing sufficient benefit for this project.

---

# Consequences

## Positive

- Secure authentication
- No frontend secrets
- Easy deployment
- Maintainable prompt management
- Strong JSON validation
- Lower operational risk

## Negative

- Requires Google Cloud configuration
- Slightly more setup than using a direct API key
- Tied to Google Cloud ecosystem

---

# Decision Owner

Daniel Rein Ondoro

---

# Review Date

End of Phase 0