import type { AIProvider } from "@/lib/ai/provider";
import { MockAIProvider } from "@/lib/ai/providers/mock";

const getAIProvider = (): AIProvider => {
  const providerName = process.env.AI_PROVIDER?.toLowerCase() || "mock";

  switch (providerName) {
    case "mock":
      console.log("Using Mock AI Provider");
      return new MockAIProvider();
    case "vertex":
    case "openai":
    case "anthropic":
      // These are not implemented yet. Throw an error to prevent accidental use.
      throw new Error(
        `AI Provider "${providerName}" is not yet implemented. Configure the provider or set AI_PROVIDER="mock".`
      );
    default:
      throw new Error(`Unknown AI Provider: "${providerName}".`);
  }
};

/**
 * A singleton instance of the configured AI Provider.
 * All application code should use this instance to interact with the AI.
 */
export const aiProvider: AIProvider = getAIProvider();
