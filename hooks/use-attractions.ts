"use client";

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { attractionsResponseSchema, type Attraction } from '@/lib/attractions/contracts';

export type AttractionsState =
  | { kind: 'loading' | 'coordinates' | 'unavailable' }
  | { kind: 'ready'; places: Attraction[] };
const errorSchema = z.object({ success: z.literal(false), error: z.object({ code: z.string() }) });

export function useAttractions(isoCode: string) {
  const [result, setResult] = useState<{ code: string; attempt: number; state: AttractionsState }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const update = (state: AttractionsState) => {
      if (!controller.signal.aborted) setResult({ code: isoCode, attempt, state });
    };
    void (async () => {
      try {
        const response = await fetch(`/api/countries/${encodeURIComponent(isoCode)}/attractions`, {
          cache: 'no-store', signal: controller.signal,
        });
        const body: unknown = await response.json();
        const parsed = attractionsResponseSchema.safeParse(body);
        if (response.ok && parsed.success) update({ kind: 'ready', places: parsed.data.data });
        else {
          const error = errorSchema.safeParse(body);
          update({ kind: error.success && error.data.error.code === 'COORDINATES_UNAVAILABLE' ? 'coordinates' : 'unavailable' });
        }
      } catch { update({ kind: 'unavailable' }); }
    })();
    return () => controller.abort();
  }, [isoCode, attempt]);
  const state: AttractionsState = result?.code === isoCode && result.attempt === attempt ? result.state : { kind: 'loading' };
  return { state, retry: () => setAttempt(value => value + 1) };
}
