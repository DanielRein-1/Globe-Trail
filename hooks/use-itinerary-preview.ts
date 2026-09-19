"use client";
import { useEffect, useRef, useState } from "react";
import { previewErrorResponseSchema, previewResponseSchema, type ItineraryPreview } from "@/lib/itineraries/contracts";
import type { ItineraryInput } from "@/lib/validation/itinerary";

type PreviewResult = { data?: ItineraryPreview; error?: string };
export async function requestItineraryPreview(inputs: ItineraryInput, signal: AbortSignal): Promise<PreviewResult> {
  try {
    const response = await fetch("/api/itineraries/preview", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inputs), signal, cache: "no-store",
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const parsed = previewErrorResponseSchema.safeParse(body);
      return { error: parsed.success ? parsed.data.error.message : "The sample planner is unavailable. Please try again." };
    }
    const parsed = previewResponseSchema.safeParse(body);
    return parsed.success ? { data: parsed.data.data } : { error: "The sample could not be validated. Please try again." };
  } catch {
    return { error: signal.aborted ? "The request took too long. Please try again." : "The sample planner is unavailable. Please try again." };
  }
}
export function useItineraryPreview() {
  const active = useRef<AbortController | null>(null);
  const [state, setState] = useState<PreviewResult & { loading: boolean }>({ loading: false });
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  async function submit(inputs: ItineraryInput) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setState({ loading: true });
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await requestItineraryPreview(inputs, controller.signal);
      if (active.current === controller) setState({ loading: false, ...result });
    } finally {
      clearTimeout(timer);
      if (active.current === controller) active.current = null;
    }
  }
  return { ...state, submit };
}
