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
  async generateItinerary(request: ItineraryGenerationRequest): Promise<ItineraryResponse> {
    console.log("MockAIProvider: generateItinerary called with:", request);
    return {
      title: `Mock Itinerary for ${request.destination}`,
      summary: `A mock ${request.durationDays}-day trip for someone who likes ${request.interests.join(", ")}.`,
      days: Array.from({ length: request.durationDays }, (_, i) => ({
        day: i + 1,
        theme: "Exploring the mock city",
        activities: [
          {
            time: "09:00",
            description: "Visit the Mock Museum",
            estimatedCost: 20,
          },
          {
            time: "13:00",
            description: "Lunch at a mock cafe",
            estimatedCost: 30,
          },
          {
            time: "15:00",
            description: "Walk in the Mock Park",
            estimatedCost: 0,
          },
        ],
      })),
    };
  }

  async improveItinerary(currentItinerary: ItineraryResponse, feedback: string): Promise<ItineraryResponse> {
    console.log("MockAIProvider: improveItinerary called with feedback:", feedback);
    // Simply append the feedback to the summary for mock purposes.
    const improvedSummary = `${currentItinerary.summary} (Improved with feedback: ${feedback})`;
    return { ...currentItinerary, summary: improvedSummary };
  }

  async estimateBudget(request: BudgetEstimateRequest): Promise<BudgetEstimateResponse> {
    console.log("MockAIProvider: estimateBudget called with:", request);
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
    console.log("MockAIProvider: chat called with:", request);
    return {
      message: `This is a mock response to your message: "${request.message}"`,
    };
  }
}
