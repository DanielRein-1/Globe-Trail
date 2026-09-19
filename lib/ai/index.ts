import type { AIProvider } from "./provider";
import { MockAIProvider } from "./providers/mock";
import { ItineraryError } from "../itineraries/contracts";

export function getAIProvider(): AIProvider {
  const name = process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";
  if (name !== "mock") throw new ItineraryError("AI_NOT_CONFIGURED", 503, "The sample planner is not configured.");
  return new MockAIProvider();
}
