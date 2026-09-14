import type { ReactNode } from 'react';

// Navigation, the main landmark and footer belong to the root site layout.
export function CountryShell({ children }: { children: ReactNode }) {
  return <>
    {children}
    <p className="mt-10 text-sm text-slate-600">Country data from countries.dev.</p>
  </>;
}
