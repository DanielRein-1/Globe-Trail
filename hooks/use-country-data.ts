"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";

type Result<T> = { key: string; data?: T; error?: "missing" | "unavailable" };

export function useCountryData<T>(url: string, schema: z.ZodType<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: "" });
  const key = `${url}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (response.status === 404) {
          if (active) setResult({ key, error: "missing" });
          return;
        }
        if (!response.ok) throw new Error("Request failed");
        const data = schema.parse(await response.json());
        if (active) setResult({ key, data });
      } catch {
        if (active) setResult({ key, error: "unavailable" });
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [key, url, schema]);
  return { ...(result.key === key ? result : {}), loading: result.key !== key, retry: () => setAttempt(value => value + 1) };
}
