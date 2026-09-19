import type { ItineraryPreview } from "@/lib/itineraries/contracts";

export function ItineraryResult({ preview }: { preview: ItineraryPreview }) {
  return <section aria-labelledby="preview-title" className="mt-8 space-y-6 break-words">
    <h2 id="preview-title" className="text-2xl font-semibold">{preview.title}</h2>
    <p>{preview.destination.name} · {preview.inputs.durationDays} days · {preview.inputs.travellers} travellers</p>
    <p className="text-slate-600">{preview.summary}</p>
    {preview.days.map(day => <article key={day.day} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h3 className="text-xl font-semibold">Day {day.day}{day.date ? ` · ${day.date}` : ""}: {day.theme}</h3>
      <dl className="mt-5 space-y-5">{day.activities.map(activity => <div key={activity.slot}>
        <dt className="font-medium capitalize">{activity.slot}</dt><dd className="mt-1 leading-7 text-slate-600">{activity.description}</dd>
      </div>)}</dl>
    </article>)}
  </section>;
}
