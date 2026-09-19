import type { ItineraryInput } from "../validation/itinerary";
import type { Destination } from "../itineraries/contracts";

export interface ItineraryGenerationRequest {
  inputs: ItineraryInput;
  destination: Destination;
}

export interface ItineraryResponse {
  title: string;
  summary: string;
  days: {
    day: number;
    theme: string;
    activities: {
      time: string;
      description: string;
      estimatedCost?: number;
    }[];
  }[];
}

export interface BudgetEstimateRequest {
  destination: string;
  durationDays: number;
  travelStyle: string;
}

export interface BudgetEstimateResponse {
  total: number;
  currency: string;
  breakdown: {
    accommodation: number;
    food: number;
    transport: number;
    activities: number;
    other: number;
  };
}

export interface ChatRequest {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatResponse {
  message: string;
}

/**
 * Defines the contract for an AI provider in the GlobeTrail application.
 * Each provider must implement these methods to be swappable.
 */
export interface AIProvider {
  generateItinerary(request: ItineraryGenerationRequest, signal?: AbortSignal): Promise<unknown>;
  improveItinerary(currentItinerary: ItineraryResponse, feedback: string): Promise<ItineraryResponse>;
  estimateBudget(request: BudgetEstimateRequest): Promise<BudgetEstimateResponse>;
  chat(request: ChatRequest): Promise<ChatResponse>;
}
