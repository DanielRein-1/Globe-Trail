# GlobeTrail AI System Design

## Version

1.0

---

## Status

Draft

---

## Last Updated

2026-07-14

---

# 1. Overview

GlobeTrail uses Google Vertex AI with Gemini 2.5 Pro to generate personalized travel itineraries.

The AI system does not make autonomous decisions.

Instead, it acts as an intelligent recommendation engine operating within strict application-defined rules.

The application always validates AI output before presenting it to the user.

---

# 2. AI Objectives

The AI system is responsible for:

- Generating personalized itineraries
- Recommending attractions
- Balancing budgets
- Suggesting travel schedules
- Producing structured JSON only

The AI is **not responsible** for:

- Database operations
- Authentication
- Business rules
- Cost calculations
- User permissions

---

# 3. AI Workflow

```

User Preferences

↓

Backend Validation

↓

Load Country

↓

Load Cached Attractions

↓

Load User Preferences

↓

Prompt Builder

↓

Vertex AI

↓

JSON Validation

↓

Business Rule Validation

↓

Save Itinerary

↓

Return Response

```

---

# 4. Prompt Engineering Strategy

Prompts are never hardcoded.

All prompts are stored in:

```

backend/prompts/

```

(or)

```

lib/prompts/

```

Each prompt is version controlled.

Example

```

itinerary-v1.md

budget-v1.md

recommendation-v1.md

```

---

# 5. Prompt Components

Every prompt contains:

## System Context

Defines AI behavior.

Example

- Travel planner
- JSON only
- No Markdown
- No explanations

---

## User Context

Contains

- Destination
- Budget
- Travel style
- Duration
- Interests

---

## Application Context

Contains

- Cached attractions
- Country metadata
- Available categories
- Constraints

---

## Output Specification

Explicit JSON schema.

No natural language responses are accepted.

---

# 6. Expected JSON Format

Example

```json
{
  "title": "7 Day Japan Adventure",
  "summary": "...",
  "days": [
    {
      "day": 1,
      "activities": []
    }
  ],
  "estimatedBudget": 1200
}
```

---

# 7. Response Validation

Every AI response passes through:

Layer 1

JSON Parsing

↓

Layer 2

Schema Validation

↓

Layer 3

Business Rule Validation

↓

Layer 4

Database Save

Only fully valid responses are stored.

---

# 8. Retry Strategy

If Vertex AI returns:

- Invalid JSON
- Missing fields
- Incorrect schema

The application retries once.

The retry uses a stricter prompt enforcing JSON-only output.

If validation still fails:

- Store failure log
- Return friendly error
- Do not save invalid data

---

# 9. AI Versioning

Every itinerary records:

- Model
- Prompt version
- Generation timestamp
- Generation duration

This allows future regeneration and comparison.

---

# 10. Prompt Versioning

Prompt files follow semantic versions.

Examples

```

itinerary-v1.md

itinerary-v1.1.md

itinerary-v2.md

```

Old itineraries always reference the prompt version that generated them.

---

# 11. Safety Rules

The AI must never:

- Invent attractions
- Invent hotel prices
- Invent transport costs
- Generate invalid JSON
- Access secrets
- Modify database records directly

---

# 12. Context Management

Only relevant data is sent.

Included

- Selected country
- Cached attractions
- User preferences
- Trip duration

Excluded

- Passwords
- Sessions
- API keys
- Internal IDs

---

# 13. Token Optimization

To reduce Vertex AI costs:

- Cached country data is reused.
- Cached attractions are reused.
- Only necessary fields are included.
- Conversation history is not sent.
- Prompts are concise and structured.

---

# 14. Error Handling

Possible failures

- Timeout
- Rate limit
- Invalid JSON
- Empty response
- API unavailable

Each failure returns a friendly message.

Detailed logs remain server-side.

---

# 15. Logging

Every AI request records:

- Request ID
- Prompt version
- Model
- Tokens (if available)
- Response time
- Success status
- Validation status

Sensitive prompt content is never logged.

---

# 16. AI Service Responsibilities

The AI service:

- Builds prompts
- Calls Vertex AI
- Validates JSON
- Returns structured results

It never:

- Updates Prisma
- Creates users
- Deletes trips

Those remain application responsibilities.

---

# 17. Future AI Features

Reserved for future versions:

- Budget optimization
- Multi-country trips
- Weather-aware itineraries
- Packing recommendations
- Restaurant recommendations
- Local event suggestions
- Regeneration with user feedback

---

# 18. AI Design Principles

The AI system follows:

- Deterministic prompts
- Structured outputs
- Server-side execution
- Validation-first architecture
- Least privilege
- Prompt versioning
- Cost-aware inference

# prompt builder 
System Prompt
        │
        ▼
Country Context
        │
        ▼
User Preferences
        │
        ▼
Attractions
        │
        ▼
JSON Schema
        │
        ▼
Final Prompt