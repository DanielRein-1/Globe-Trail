import Link from "next/link";
import { Compass } from "lucide-react";

export function CountryLoading({ detail = false }: { detail?: boolean }) {
  return <div role="status" aria-live="polite" className="py-6">
    <p className="mb-5 text-sm text-slate-600">{detail ? "Loading country details…" : "Loading countries…"}</p>
    <div aria-hidden="true" className={detail ? "h-80 rounded-3xl bg-slate-200 motion-safe:animate-pulse" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
      {!detail && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-56 rounded-2xl bg-slate-200 motion-safe:animate-pulse" />)}
    </div>
  </div>;
}

export function CountryError({ retry, headingLevel = "h2" }: { retry: () => void; headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return <div role="alert" className="my-6 rounded-2xl border border-amber-200 bg-amber-50 p-8">
    <Heading className="text-xl font-semibold">We couldn’t load this information</Heading>
    <p className="mt-2 text-slate-700">Please try again in a moment.</p>
    <button onClick={retry} className="mt-5 min-h-11 rounded-lg bg-teal-900 px-5 py-2 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800">Try again</button>
  </div>;
}

export function CountryEmpty({ title, description, href = "/countries", action = "Clear filters", headingLevel = "h2" }: { title: string; description: string; href?: string; action?: string; headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return <div className="my-6 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
    <Compass className="mx-auto mb-4 size-9 text-teal-700" aria-hidden="true" />
    <Heading className="text-2xl font-semibold">{title}</Heading><p className="mx-auto mt-3 max-w-md text-slate-600">{description}</p>
    <Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-teal-800 px-5 py-2 font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-4">{action}</Link>
  </div>;
}
