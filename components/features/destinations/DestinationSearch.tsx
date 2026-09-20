"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDestinationSearch, type SearchState } from '@/hooks/use-destination-search';
import type { DestinationResult } from '@/lib/destinations/contracts';

const button = 'min-h-11 rounded-lg bg-teal-900 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed';
export function DestinationChoices({ state, selected, onSelect }: {
  state: SearchState; selected: DestinationResult | null; onSelect: (place: DestinationResult) => void;
}) {
  if (state.kind !== 'ready') return null;
  if (!state.results.length) return <p>No suitable destinations found. Try a more specific name or choose anywhere in the country.</p>;
  return <fieldset className="space-y-3"><legend className="mb-3 font-medium">Choose the intended destination — result order is not a recommendation</legend>
    {state.results.map(place => <label key={place.reference} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white p-4">
      <input type="radio" name="destination-choice" value={place.reference} checked={selected?.reference === place.reference} onChange={() => onSelect(place)} className="mt-1 size-5 shrink-0 accent-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4" />
      <span className="min-w-0 break-words"><strong>{place.name}</strong><span className="block text-sm">{place.formatted}</span>
        <span className="block text-sm text-slate-600">{[place.county, place.state, place.countryCode].filter(Boolean).join(' · ')} · {place.categoryLabels.join(', ')}</span>
        <span className="block text-sm text-slate-600">Reference point: {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</span>
      </span>
    </label>)}
  </fieldset>;
}
export function DestinationSearch({ isoCode, countryName, mode, selected, disabled, onMode, onSelect }: {
  isoCode: string; countryName: string; mode: 'country' | 'place'; selected: DestinationResult | null; disabled: boolean;
  onMode: (mode: 'country' | 'place') => void; onSelect: (place: DestinationResult | null) => void;
}) {
  const { state, search, clear } = useDestinationSearch(isoCode);
  const [query, setQuery] = useState('');
  const status = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.kind === 'ready' || state.kind === 'error') status.current?.focus(); }, [state]);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSelect(null); void search(query); }
  function changeMode(value: 'country' | 'place') { clear(); onSelect(null); onMode(value); }
  return <section aria-labelledby="destination-heading" className="mt-8 rounded-2xl border border-slate-200 p-5 sm:p-7">
    <h2 id="destination-heading" className="text-xl font-semibold">Where would you like to plan?</h2>
    <fieldset disabled={disabled} className="mt-4 min-w-0 space-y-4 disabled:opacity-60"><legend className="sr-only">Planning destination</legend>
      <label className="flex min-h-11 items-center gap-3"><input type="radio" name="planning-scope" checked={mode === 'country'} onChange={() => changeMode('country')} className="size-5 accent-teal-800" />Anywhere in {countryName}</label>
      <label className="flex min-h-11 items-center gap-3"><input type="radio" name="planning-scope" checked={mode === 'place'} onChange={() => changeMode('place')} className="size-5 accent-teal-800" />Choose a destination in {countryName}</label>
      {mode === 'place' && <>
        <form onSubmit={submit} className="space-y-3" role="search" aria-label="Destination search">
          <label className="block" htmlFor="destination-query">Destination name (3–100 characters)</label>
          <input ref={input} id="destination-query" type="search" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); clear(); onSelect(null); }} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-400 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2" />
          <button className={button} disabled={state.kind === 'searching'}>{state.kind === 'searching' ? 'Searching…' : state.kind === 'error' ? 'Retry destination search' : 'Search destinations'}</button>
        </form>
        <p className="text-sm text-slate-600">Search runs only when submitted. Names can match unrelated places. Check the location and choose explicitly. Maasai Mara searches also try the spelling Masai Mara.</p>
        <div ref={status} tabIndex={-1} role={state.kind === 'error' ? 'alert' : 'status'} aria-live={state.kind === 'error' ? 'assertive' : 'polite'} className="break-words focus-visible:outline-2 focus-visible:outline-offset-4">
          {state.kind === 'initial' && 'Enter a destination name to search.'}
          {state.kind === 'searching' && 'Searching destinations…'}
          {state.kind === 'error' && state.message}
          {state.kind === 'ready' && `${state.results.length} destination choices found. Nothing is selected automatically.`}
        </div>
        <DestinationChoices state={state} selected={selected} onSelect={onSelect} />
        {selected && <div className="rounded-lg bg-teal-50 p-4"><p role="status">Selected: {selected.name}</p><button type="button" className="mt-2 min-h-11 underline focus-visible:outline-2" onClick={() => { onSelect(null); input.current?.focus(); }}>Change or remove selection</button></div>}
        <p className="text-sm text-slate-600">Destination data by <a href="https://www.geoapify.com/" className="underline">Geoapify</a>, © <a href="https://www.openstreetmap.org/copyright" className="underline">OpenStreetMap contributors</a>. Nearby attractions are a separate country-details feature.</p>
      </>}
    </fieldset>
  </section>;
}
