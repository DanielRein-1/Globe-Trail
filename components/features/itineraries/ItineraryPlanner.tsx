"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DISCLOSURE } from "@/lib/itineraries/contracts";
import { addDays, inputSchemaAt, INTERESTS, utcDate } from "@/lib/validation/itinerary";
import { useItineraryPreview } from "@/hooks/use-itinerary-preview";
import { DestinationSearch } from "../destinations/DestinationSearch";
import type { DestinationResult } from "@/lib/destinations/contracts";
import { ItineraryResult } from "./ItineraryResult";

const control = "mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-slate-400 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800";
export function ItineraryPlanner({ isoCode }: { isoCode: string }) {
  const preview = useItineraryPreview();
  const [mode, setMode] = useState<'country' | 'place'>('country');
  const [selected, setSelected] = useState<DestinationResult | null>(null);
  const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(isoCode) || isoCode;
  function select(place: DestinationResult | null) { setSelected(place); setValidation(undefined); preview.reset(); }
  const [validation, setValidation] = useState<string>();
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => { if (validation || preview.error || preview.data) status.current?.focus(); }, [validation, preview.error, preview.data]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview.loading) return;
    if (mode === 'place' && !selected) { setValidation('Select a destination, or choose anywhere in the country.'); return; }
    const values = new FormData(event.currentTarget);
    const parsed = inputSchemaAt().safeParse({
      ...(mode === 'place' && selected ? { destinationReference: selected.reference } : {}),
      destinationCode: isoCode, durationDays: Number(values.get("durationDays")), travellers: Number(values.get("travellers")),
      ...(values.get("startDate") ? { startDate: values.get("startDate") } : {}),
      interests: values.getAll("interests"), budgetPreference: values.get("budgetPreference"),
    });
    setValidation(parsed.success ? undefined : parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(". "));
    if (parsed.success) void preview.submit(parsed.data);
  }
  const today = utcDate(new Date());
  return <>
    <p className="mt-5 rounded-xl bg-teal-50 p-5 font-medium leading-7 text-teal-950">{DISCLOSURE}</p>
    <p className="mt-3 text-sm text-slate-600">Refreshing or leaving this page may discard your result. Dates are optional and use the UTC calendar.</p>
    <DestinationSearch isoCode={isoCode} countryName={countryName} mode={mode} selected={selected} disabled={preview.loading}
      onMode={value => { setMode(value); preview.reset(); }} onSelect={select} />
    <form onSubmit={submit} noValidate className="mt-8" aria-describedby="planner-status">
      <fieldset disabled={preview.loading} className="min-w-0 space-y-6 disabled:opacity-60">
        <legend className="mb-5 text-xl font-semibold">Your planning preferences</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <label>Duration in days (1–14)<input className={control} name="durationDays" type="number" min="1" max="14" step="1" defaultValue="3" required /></label>
          <label>Travellers (1–8)<input className={control} name="travellers" type="number" min="1" max="8" step="1" defaultValue="1" required /></label>
          <label>Start date (optional)<input className={control} name="startDate" type="date" min={today} max={addDays(today, 365)} /></label>
        </div>
        <fieldset><legend className="font-medium">Interests — choose at least one</legend>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">{INTERESTS.map(interest => <label key={interest} className="flex min-h-11 items-center gap-3 capitalize">
            <input type="checkbox" name="interests" value={interest} defaultChecked={interest === "nature"} className="size-5 accent-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4" />{interest}
          </label>)}</div>
        </fieldset>
        <label className="block sm:max-w-sm">Budget preference (no price estimate)<select name="budgetPreference" defaultValue="balanced" className={control}>
          <option value="budget">Budget</option><option value="balanced">Balanced</option><option value="comfortable">Comfortable</option>
        </select></label>
        <button type="submit" className="min-h-11 rounded-lg bg-teal-900 px-6 py-3 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">{preview.loading ? "Creating sample…" : preview.error ? "Try again" : "Create sample itinerary"}</button>
      </fieldset>
    </form>
    <div id="planner-status" ref={status} tabIndex={-1} role={validation || preview.error ? "alert" : "status"} aria-live={validation || preview.error ? "assertive" : "polite"} className="mt-6 break-words rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
      {validation || preview.error || (preview.loading ? "Creating your sample outline…" : preview.data ? "Your sample outline is ready below." : "")}
    </div>
    {preview.data && <ItineraryResult preview={preview.data} />}
  </>;
}
