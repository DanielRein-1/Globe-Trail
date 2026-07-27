# ADR-004: AI Provider Abstraction Layer

## Status

Accepted

---

## Date

2026-07-27

---

## Context

[ADR-003](./ADR-003-ai-provider.md) established Google Vertex AI as the sole AI provider, primarily for its tight integration with the Google Cloud ecosystem. While this simplifies initial setup, it creates vendor lock-in, making it difficult to switch to other providers (e.g., OpenAI, Anthropic) or use local models (e.g., Ollama) for development and testing. This lock-in was identified as a negative consequence in ADR-003 and limits future flexibility.

To build a more resilient and adaptable system, the AI implementation should not be tightly coupled to a single vendor.

---

## Decision

We will introduce an **AI Provider Abstraction Layer**. This involves:

1.  An `AIProvider` interface that defines a common contract for all AI-related capabilities (e.g., `generateItinerary`, `estimateBudget`).
2.  Concrete provider implementations (e.g., `VertexAIProvider`, `MockAIProvider`) that implement this interface.
3.  A factory that instantiates the desired provider based on an environment variable (`AI_PROVIDER`).

Business logic (services) will only depend on the `AIProvider` interface, never on a concrete implementation. This decouples the application from the specific AI vendor.

---

## Consequences

### Positive

*   **Vendor Neutrality**: The application is no longer tied to a specific AI provider. We can switch providers by creating a new implementation and changing an environment variable, with zero changes to business logic.
*   **Improved Testability**: A `MockAIProvider` can be used for local development and in automated tests, removing reliance on network calls and credentials. This makes testing faster, more reliable, and free of cost.
*   **Flexibility**: We can easily experiment with and adopt new models or providers as they become available.
*   **Reduced Complexity in Business Logic**: Services become simpler as they no longer contain provider-specific code.

### Negative

*   **Increased Upfront Complexity**: Introduces a slightly more complex initial setup with an interface, factory, and multiple provider files.
*   **Interface Maintenance**: The `AIProvider` interface may need to be updated if we want to use a unique feature of a specific provider that doesn't fit the common contract.

---

## Decision Owner

Daniel Rein Ondoro

---

## Review Date

2026-10-27
