import { getAIProvider } from "../ai/index";
import type { AIProvider, ItineraryGenerationRequest } from "../ai/provider";
import { destinationSchema, ItineraryError, outlineSchema, previewSchema, type Destination } from "../itineraries/contracts";
import { inputSchemaAt } from "../validation/itinerary";

async function findDestination(isoCode: string) {
  const { db } = await import("../db/prisma");
  return db.country.findUnique({ where: { isoCode }, select: { isoCode: true, name: true } });
}
type Dependencies = {
  findDestination?: (code: string) => Promise<Destination | null>;
  getProvider?: () => Pick<AIProvider, "generateItinerary">;
  now?: Date;
  deadlineMs?: number;
};
async function generate(provider: Pick<AIProvider, "generateItinerary">, request: ItineraryGenerationRequest, deadlineMs: number) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ItineraryError("AI_TIMEOUT", 504, "The sample took too long. Please try again."));
      controller.abort();
    }, deadlineMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => provider.generateItinerary(request, controller.signal)), timeout]); }
  catch (error) {
    if (error instanceof ItineraryError && error.code === "AI_TIMEOUT") throw error;
    throw new ItineraryError("AI_PROVIDER_UNAVAILABLE", 502, "The sample planner is unavailable. Please try again.");
  } finally { clearTimeout(timer); }
}
export async function previewItinerary(raw: unknown, dependencies: Dependencies = {}) {
  const parsed = inputSchemaAt(dependencies.now).safeParse(raw);
  if (!parsed.success) throw new ItineraryError("VALIDATION_ERROR", 400, "Check your planning inputs.");
  const inputs = parsed.data;
  const country = await (dependencies.findDestination ?? findDestination)(inputs.destinationCode);
  if (!country) throw new ItineraryError("NOT_FOUND", 404, "Country not found. Return to country discovery.");
  const destination = destinationSchema.parse(country);
  const provider = (dependencies.getProvider ?? getAIProvider)();
  const rawOutline = await generate(provider, { inputs, destination }, dependencies.deadlineMs ?? 10000);
  const outline = outlineSchema.safeParse(rawOutline);
  if (!outline.success) throw new ItineraryError("AI_INVALID_RESPONSE", 502, "The sample could not be validated. Please try again.");
  const result = previewSchema.safeParse({ ...outline.data, schemaVersion: "itinerary.v1", source: "mock", templateVersion: "mock-itinerary-v1", destination, inputs });
  if (!result.success) throw new ItineraryError("AI_INVALID_RESPONSE", 502, "The sample could not be validated. Please try again.");
  return result.data;
}
