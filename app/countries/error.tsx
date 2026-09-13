"use client";
import { CountryShell } from "@/components/features/countries/CountryShell";
import { CountryError } from "@/components/features/countries/CountryStates";

export default function ErrorPage({ reset }: { reset: () => void }) { return <CountryShell><CountryError headingLevel="h1" retry={reset} /></CountryShell>; }
