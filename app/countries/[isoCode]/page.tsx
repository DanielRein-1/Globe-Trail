import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CountryShell } from "@/components/features/countries/CountryShell";
import { CountryDetail } from "@/components/features/countries/CountryDetail";
import { countryCodeSchema, countryQuerySchema, countryQueryString, type SearchParams } from "@/lib/validation/country";

export const metadata: Metadata = { title: "Country details | GlobeTrail" };
export default async function CountryPage({ params, searchParams }: { params: Promise<{ isoCode: string }>; searchParams: Promise<SearchParams> }) {
  const parsed = countryCodeSchema.safeParse((await params).isoCode);
  if (!parsed.success) notFound();
  const query = countryQuerySchema.safeParse(await searchParams);
  const returnHref = query.success ? `/countries?${countryQueryString(query.data)}` : "/countries";
  return <CountryShell>
    <Link href={returnHref} className="mb-8 inline-flex min-h-11 items-center gap-2 font-medium text-teal-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"><ArrowLeft className="size-4" aria-hidden="true" />Back to results</Link>
    <CountryDetail isoCode={parsed.data} returnHref={returnHref} />
  </CountryShell>;
}
