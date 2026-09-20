import type { ItineraryGenerationRequest } from "../provider";
import { addDays } from "../../validation/itinerary";

const suggestions = {
  nature: "Consider an outdoor activity after checking local conditions.",
  culture: "Explore ideas for learning about local cultural traditions.",
  history: "Research local history and choose a topic to explore.",
  food: "Look into local food traditions and your dietary needs.",
  relaxation: "Leave flexible space for rest and personal interests.",
};
const preferences = {
  budget: "Prioritize simple options and check any costs independently.",
  balanced: "Balance planned activities with flexible time.",
  comfortable: "Prioritize personal comfort when researching options.",
};
export function mockOutline({ inputs, destination }: ItineraryGenerationRequest) {
  const selected = destination.place ? destination.name : null;
  const scoped = (suggestion: string) => selected ? `${selected}: ${suggestion}` : suggestion;
  return {
    title: selected ? `Sample outline: ${selected.slice(0, 100)}` : "Your sample planning outline",
    summary: `A generic ${inputs.durationDays}-day outline for ${inputs.travellers} traveller${inputs.travellers === 1 ? "" : "s"}. ${preferences[inputs.budgetPreference]}`,
    days: Array.from({ length: inputs.durationDays }, (_, index) => {
      const interest = inputs.interests[index % inputs.interests.length];
      return {
        day: index + 1, date: inputs.startDate ? addDays(inputs.startDate, index) : null, theme: `Ideas for ${interest}`,
        activities: [
          { slot: "morning", kind: "suggestion", description: scoped(suggestions[interest]) },
          { slot: "afternoon", kind: "suggestion", description: scoped(preferences[inputs.budgetPreference]) },
          { slot: "evening", kind: "suggestion", description: scoped("Discuss everyone’s preferences and leave room to rest.") },
        ],
      };
    }),
  };
}
