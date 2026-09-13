"use client";

import Link from "next/link";
import { countriesResponseSchema } from "@/lib/countries/contracts";
import { countryQueryString, type CountryQuery } from "@/lib/validation/country";
import { useCountryData } from "@/hooks/use-country-data";
import { CountryCard } from "./CountryCard";
import { CountryEmpty, CountryError, CountryLoading } from "./CountryStates";

export function CountryExplorer({ query }: { query: CountryQuery }) {
  const params = countryQueryString(query);
  const result = useCountryData(`/api/countries?${params}`, countriesResponseSchema);
  if (result.loading) return <CountryLoading />;
  if (result.error || !result.data) return <CountryError retry={result.retry} />;
  const { data: countries, meta } = result.data.data;
  if (!countries.length) return <CountryEmpty
    title={meta.total > 0 ? "No countries on this page" : query.search || query.continent ? "No matching countries" : "No countries available yet"}
    description={meta.total > 0 ? "Return to the first page to keep exploring." : query.search || query.continent ? "Try a different country name or choose another region." : "Our country collection isn’t available yet. Please check back soon."}
    href={meta.total > 0 ? `/countries?${countryQueryString({ ...query, page: 1 })}` : "/countries"}
    action={meta.total > 0 ? "Go to first page" : query.search || query.continent ? "Clear filters" : "Browse again"}
  />;
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><p role="status">{meta.total} {meta.total === 1 ? "country" : "countries"} to discover</p><p>Page {meta.page} of {meta.totalPages}</p></div>
    <ul aria-label="Countries" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{countries.map(country => <CountryCard key={country.isoCode} country={country} query={params} />)}</ul>
    <CountryPagination query={query} totalPages={meta.totalPages} />
  </>;
}

function CountryPagination({ query, totalPages }: { query: CountryQuery; totalPages: number }) {
  const style = "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 py-2 font-medium text-teal-900 hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4";
  const disabledStyle = "inline-flex min-h-11 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 font-medium text-slate-400";
  return <nav aria-label="Country pagination" className="mt-9 flex items-center justify-between gap-3">
    {query.page > 1 ? <Link className={style} href={`/countries?${countryQueryString({ ...query, page: query.page - 1 })}`}>Previous</Link> : <button type="button" disabled className={disabledStyle}>Previous</button>}
    {query.page < Math.min(totalPages, 10000) ? <Link className={style} href={`/countries?${countryQueryString({ ...query, page: query.page + 1 })}`}>Next</Link> : <button type="button" disabled className={disabledStyle}>Next</button>}
  </nav>;
}
