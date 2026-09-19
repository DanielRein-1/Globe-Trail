import { mockOutline } from "../templates/mock-itinerary-v1";
import type {
  AIProvider,
  BudgetEstimateRequest,
  BudgetEstimateResponse,
  ChatRequest,
  ChatResponse,
  ItineraryGenerationRequest,
  ItineraryResponse,
} from "@/lib/ai/provider";

/**
 * A mock AI provider for local development and testing.
 * It returns deterministic, hardcoded responses and does not make any network calls.
 */
export class MockAIProvider implements AIProvider {
  async generateItinerary(request: ItineraryGenerationRequest): Promise<unknown> {
    return mockOutline(request);
  }

  async improveItinerary(currentItinerary: ItineraryResponse, feedback: string): Promise<ItineraryResponse> {
    // Simply append the feedback to the summary for mock purposes.
    const improvedSummary = `${currentItinerary.summary} (Improved with feedback: ${feedback})`;
    return { ...currentItinerary, summary: improvedSummary };
  }

  async estimateBudget(request: BudgetEstimateRequest): Promise<BudgetEstimateResponse> {
    const total = 150 * request.durationDays;
    return {
      total,
      currency: "USD",
      breakdown: {
        accommodation: total * 0.4,
        food: total * 0.3,
        transport: total * 0.1,
        activities: total * 0.15,
        other: total * 0.05,
      },
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return {
      message: `This is a mock response to your message: "${request.message}"`,
    };
  }
}
