export function countryFlag(isoCode: string) {
  return /^[A-Z]{2}$/.test(isoCode)
    ? String.fromCodePoint(...[...isoCode].map(letter => letter.charCodeAt(0) + 127397)) : "🌐";
}

export function populationLabel(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) return "Not available";
  return new Intl.NumberFormat("en").format(BigInt(value));
}
