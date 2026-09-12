import { Search } from "lucide-react";
import { REGIONS, type CountryQuery } from "@/lib/validation/country";

const control = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-teal-700";
export function CountrySearch({ query }: { query: CountryQuery }) {
  return <form action="/countries" method="get" role="search" aria-label="Country search" className="mb-8 grid items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_13rem_auto] sm:p-6">
    <div><label htmlFor="country-search" className="text-sm font-semibold">Country name</label><input key={query.search} id="country-search" name="search" type="search" maxLength={100} defaultValue={query.search} placeholder="Where are you curious about?" className={control} /></div>
    <div><label htmlFor="country-region" className="text-sm font-semibold">Region</label><select key={query.continent} id="country-region" name="continent" defaultValue={query.continent} className={control}><option value="">All regions</option>{REGIONS.map(region => <option key={region}>{region}</option>)}</select></div>
    <input type="hidden" name="limit" value={query.limit} />
    <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-900 px-6 py-3 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"><Search className="size-4" aria-hidden="true" />Search</button>
  </form>;
}
