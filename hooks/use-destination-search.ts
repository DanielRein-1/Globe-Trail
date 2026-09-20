"use client";
import { useEffect, useRef, useState } from 'react';
import { destinationErrorSchema, searchResponseSchema, type DestinationResult } from '@/lib/destinations/contracts';
import { destinationQuerySchema } from '@/lib/validation/destination';

export type SearchState = { kind: 'initial' | 'searching' | 'ready' | 'error'; results: DestinationResult[]; message?: string };
export async function requestDestinationSearch(countryCode: string, query: string, signal: AbortSignal): Promise<SearchState> {
  const parsed = destinationQuerySchema.safeParse({ countryCode, query });
  if (!parsed.success) return { kind: 'error', results: [], message: 'Enter 3–100 characters, including at least three visible characters.' };
  try {
    const response = await fetch(`/api/destinations/search?${new URLSearchParams(parsed.data)}`, { signal, cache: 'no-store' });
    const raw: unknown = await response.json();
    if (!response.ok) {
      const error = destinationErrorSchema.safeParse(raw);
      return { kind: 'error', results: [], message: error.success ? error.data.error.message : 'Destination search is unavailable. Please try again.' };
    }
    const result = searchResponseSchema.safeParse(raw);
    if (result.success && result.data.data.every(place => place.countryCode === parsed.data.countryCode)) return { kind: 'ready', results: result.data.data };
  } catch { /* Never display transport diagnostics or response excerpts. */ }
  return { kind: 'error', results: [], message: 'Destination search is unavailable. Please try again.' };
}
export function useDestinationSearch(countryCode: string) {
  const [state, setState] = useState<SearchState>({ kind: 'initial', results: [] });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  function clear() { active.current?.abort(); active.current = null; setState({ kind: 'initial', results: [] }); }
  async function search(query: string) {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setState({ kind: 'searching', results: [] });
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const result = await requestDestinationSearch(countryCode, query, controller.signal);
      if (active.current === controller) setState(result);
    } finally { clearTimeout(timer); if (active.current === controller) active.current = null; }
  }
  return { state, search, clear };
}
