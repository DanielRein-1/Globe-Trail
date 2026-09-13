import { CountryShell } from "@/components/features/countries/CountryShell";
import { CountryEmpty } from "@/components/features/countries/CountryStates";

export default function NotFound() { return <CountryShell><h1 className="text-3xl font-semibold">Country not found</h1><CountryEmpty title="Choose another destination" description="Country links use two-letter country codes." action="Explore countries" /></CountryShell>; }
