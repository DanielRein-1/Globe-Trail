import type { Metadata } from "next";
import { CountryShell } from "@/components/features/countries/CountryShell";
import { CountrySearch } from "@/components/features/countries/CountrySearch";
import { CountryExplorer } from "@/components/features/countries/CountryExplorer";
import { CountryEmpty } from "@/components/features/countries/CountryStates";
import { countryQuerySchema, type SearchParams } from "@/lib/validation/country";

export const metadata: Metadata = { title: "Explore countries | GlobeTrail", description: "Find a country, follow your curiosity, and discover the essentials." };
export default async function CountriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const parsed = countryQuerySchema.safeParse(await searchParams);
  return <CountryShell>
    <div className="mb-9 max-w-2xl"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">The world is closer than you think</p><h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Follow your curiosity.</h1><p className="mt-5 text-lg leading-8 text-slate-600">From familiar places to somewhere completely new. Find a country and get to know it a little better.</p></div>
    <CountrySearch query={parsed.success ? parsed.data : countryQuerySchema.parse({})} />
    {parsed.success ? <CountryExplorer query={parsed.data} /> : <CountryEmpty title="Check your search" description="Use a search of up to 100 characters, a listed region, and positive page numbers. Results per page must be between 1 and 100." action="Reset search" />}
  </CountryShell>;
}
