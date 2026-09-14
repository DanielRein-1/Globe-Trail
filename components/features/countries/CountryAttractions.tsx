"use client";

import { useAttractions, type AttractionsState } from '@/hooks/use-attractions';

export function AttractionsView({ state, retry }: { state: AttractionsState; retry: () => void }) {
  return <section aria-labelledby="attractions-heading" className="mt-12 border-t border-slate-200 pt-8">
    <h2 id="attractions-heading" className="text-2xl font-semibold tracking-tight">Nearby places</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Nearby places within 50 km of the country reference point. This is a limited local sample and may include places across a border.</p>
    <div className="mt-5" aria-live="polite" aria-busy={state.kind === 'loading'}>
      {state.kind === 'loading' && <p role="status" className="rounded-2xl bg-slate-100 p-6 text-slate-600">Loading nearby places…</p>}
      {state.kind === 'coordinates' && <p className="rounded-2xl bg-slate-100 p-6 text-slate-600">Nearby places are unavailable because this country has no usable reference coordinates.</p>}
      {state.kind === 'unavailable' && <div className="rounded-2xl bg-slate-100 p-6"><p>Nearby places are temporarily unavailable.</p><button type="button" onClick={retry} className="mt-4 rounded-lg bg-teal-950 px-4 py-2 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">Retry nearby places</button></div>}
      {state.kind === 'ready' && (state.places.length === 0
        ? <p className="rounded-2xl bg-slate-100 p-6 text-slate-600">No nearby places were found in this sample. This does not mean there are no attractions in the country.</p>
        : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{state.places.map(place => <li key={place.providerPlaceId} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="break-words text-lg font-semibold">{place.name}</h3>
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">{place.categories.map(category => category.replaceAll('.', ' · ').replaceAll('_', ' ')).join(', ') || 'Category unavailable'}</p>
          <p className="mt-3 text-sm text-slate-600">{(place.distanceMeters / 1000).toFixed(1)} km from reference point</p>
        </li>)}</ul>)}
    </div>
    <p className="mt-5 text-sm text-slate-600">Places data by <a href="https://www.geoapify.com/" className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Geoapify</a>, © <a href="https://www.openstreetmap.org/copyright" className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">OpenStreetMap contributors</a>.</p>
  </section>;
}

export function CountryAttractions({ isoCode }: { isoCode: string }) {
  return <AttractionsView {...useAttractions(isoCode)} />;
}
