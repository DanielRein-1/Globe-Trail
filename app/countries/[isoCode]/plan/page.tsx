import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryShell } from "@/components/features/countries/CountryShell";
import { ItineraryPlanner } from "@/components/features/itineraries/ItineraryPlanner";
import { countryCodeSchema, countryQuerySchema, countryQueryString, type SearchParams } from "@/lib/validation/country";

export const metadata: Metadata = { title: "Sample itinerary preview | GlobeTrail", description: "Create a public, unsaved mock planning outline with generic travel suggestions." };
export default async function PlanPage({ params, searchParams }: { params: Promise<{ isoCode: string }>; searchParams: Promise<SearchParams> }) {
  const code = countryCodeSchema.safeParse((await params).isoCode);
  if (!code.success) notFound();
  const query = countryQuerySchema.safeParse(await searchParams);
  const suffix = query.success ? `?${countryQueryString(query.data)}` : "";
  return <CountryShell>
    <Link href={`/countries/${code.data}${suffix}`} className="mb-8 inline-flex min-h-11 items-center text-teal-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Back to country details</Link>
    <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-5xl">Sample itinerary for {code.data}</h1>
    <ItineraryPlanner key={code.data} isoCode={code.data} />
  </CountryShell>;
}
