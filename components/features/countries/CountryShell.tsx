import Link from "next/link";
import { Globe2, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function CountryShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f2] text-slate-900 selection:bg-teal-200">
      <a href="#country-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
      <header className="border-b border-slate-200 bg-white/80">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"><Globe2 className="size-7 text-teal-800" aria-hidden="true" />GLOBETRAIL</Link>
          <Link href="/countries" className="flex items-center gap-1 text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">Explore countries<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </nav>
      </header>
      <main id="country-content" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
      <footer className="mx-auto max-w-6xl border-t border-slate-200 px-5 py-7 text-sm text-slate-600 sm:px-8">A little curiosity. A world to discover. <span className="mt-2 block sm:float-right sm:mt-0">Country data from countries.dev</span></footer>
    </div>
  );
}
