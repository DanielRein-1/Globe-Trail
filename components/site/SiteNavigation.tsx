"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe2 } from 'lucide-react';

export function SiteNavigationLinks({ pathname }: { pathname: string }) {
  const exploring = pathname === '/countries' || pathname.startsWith('/countries/');
  return <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2">
    {[{ href: '/', label: 'Home', active: pathname === '/' }, { href: '/countries', label: 'Explore countries', active: exploring }].map(link =>
      <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : link.active ? 'location' : undefined}
        className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${link.active ? 'bg-teal-50 text-teal-950 underline' : 'text-slate-600'}`}>
        {link.label}
      </Link>)}
  </nav>;
}

export function SiteNavigation() {
  const pathname = usePathname();
  return <header className="border-b border-slate-200 bg-white/80">
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <Link href="/" aria-label="GlobeTrail home" className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"><Globe2 className="size-7 text-teal-800" aria-hidden="true" />GLOBETRAIL</Link>
      <SiteNavigationLinks pathname={pathname} />
    </div>
  </header>;
}
