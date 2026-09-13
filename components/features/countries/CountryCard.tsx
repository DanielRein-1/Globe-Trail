import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CountryView } from "@/lib/countries/contracts";
import { countryFlag } from "@/lib/countries/presentation";

export function CountryCard({ country, query }: { country: CountryView; query: string }) {
  return <li>
    <Link href={`/countries/${country.isoCode}?${query}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-teal-600 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800 motion-reduce:transform-none">
      <div className="mb-8 flex items-start justify-between"><span aria-hidden="true" className="text-5xl leading-none">{countryFlag(country.isoCode)}</span><span className="rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-medium text-teal-900">{country.continent || "Region unavailable"}</span></div>
      <h2 className="break-words text-2xl font-semibold tracking-tight">{country.name}</h2>
      <p className="mt-2 text-sm text-slate-600">Capital · {country.capital || "Not available"}</p>
      <div className="mt-auto flex items-center justify-between pt-7 text-sm font-medium text-teal-800">Explore country<ArrowUpRight className="size-5 transition group-hover:translate-x-0.5" aria-hidden="true" /></div>
    </Link>
  </li>;
}
