import Link from 'next/link';
import { ArrowUpRight, Compass, Search, Globe2 } from 'lucide-react';

export default function Home() {
  return <>
    <section aria-labelledby="home-heading" className="rounded-3xl bg-teal-950 px-7 py-12 text-white sm:px-12 sm:py-20">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Welcome to GlobeTrail</p>
      <h1 id="home-heading" className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">A little curiosity can take you somewhere new.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-teal-100">Discover countries, get to know the essentials, and explore a small sample of nearby places. Start with somewhere you’ve always wondered about.</p>
      <Link href="/countries" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-6 py-3 font-semibold text-teal-950 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Explore countries<ArrowUpRight className="size-5 shrink-0" aria-hidden="true" /></Link>
    </section>
    <section aria-labelledby="discovery-heading" className="mt-12 sm:mt-16">
      <h2 id="discovery-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">Find a place. Get a little closer.</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {[
          { Icon: Search, title: 'Follow your curiosity', text: 'Search by country name or browse a region. Move through the results at your own pace.' },
          { Icon: Globe2, title: 'Get to know a country', text: 'See its capital, currency, population and other useful country facts in one place.' },
          { Icon: Compass, title: 'Discover nearby places', text: 'Explore a limited sample within 50 km of the country reference point. Results may include places across a border.' },
        ].map(({ Icon, title, text }) => <div key={title} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6">
          <Icon className="mb-5 size-7 text-teal-800" aria-hidden="true" /><h3 className="text-xl font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
        </div>)}
      </div>
    </section>
  </>;
}
