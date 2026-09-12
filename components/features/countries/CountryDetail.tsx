"use client";

import { countryResponseSchema } from "@/lib/countries/contracts";
import { countryFlag, populationLabel } from "@/lib/countries/presentation";
import { useCountryData } from "@/hooks/use-country-data";
import { CountryEmpty, CountryError, CountryLoading } from "./CountryStates";

export function CountryDetail({ isoCode, returnHref }: { isoCode: string; returnHref: string }) {
  const result = useCountryData(`/api/countries/${isoCode}`, countryResponseSchema);
  if (result.loading) return <CountryLoading detail />;
  if (result.error === "missing") return <CountryEmpty headingLevel="h1" title="Country not found" description="We couldn’t find that country. Return to your results and choose another destination." href={returnHref} action="Back to results" />;
  if (result.error || !result.data) return <CountryError headingLevel="h1" retry={result.retry} />;
  const country = result.data.data;
  const facts = [
    ["Capital", country.capital || "Not available"], ["Region", country.continent || "Not available"],
    ["Currency", country.currency || "Not available"], ["Population", populationLabel(country.population)],
    ["Country codes", `${country.isoCode} / ${country.iso3Code}`],
    ["Coordinates", country.latitude !== null && country.longitude !== null ? `${country.latitude}, ${country.longitude}` : "Not available"],
  ];
  return <article>
    <div className="mb-8 rounded-3xl bg-teal-950 px-7 py-10 text-white sm:flex sm:items-end sm:justify-between sm:gap-8 sm:px-10 sm:py-14">
      <div><p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">A closer look</p><h1 className="break-words text-4xl font-semibold tracking-tight sm:text-6xl">{country.name}</h1><p className="mt-5 text-lg text-teal-100">{country.continent || "Explore the world, one country at a time."}</p></div>
      <span aria-hidden="true" className="mt-8 block text-7xl leading-none sm:mt-0 sm:text-8xl">{countryFlag(country.isoCode)}</span>
    </div>
    <h2 className="mb-5 text-2xl font-semibold tracking-tight">At a glance</h2>
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{facts.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-3 break-words text-xl font-medium">{value}</dd></div>)}</dl>
    <p className="mt-8 text-sm leading-6 text-slate-600">A starting point for your next discovery. Country information is provided by countries.dev; figures may change over time.</p>
  </article>;
}
