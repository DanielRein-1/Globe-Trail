const labels: Record<string, string> = {
  tourism: 'Places of interest',
  'tourism.attraction': 'Attraction',
  'tourism.sights': 'Sights',
  'tourism.information': 'Visitor information',
  'tourism.sights.place_of_worship': 'Place of worship',
};

export function attractionCategoryLabels(categories: readonly string[]): string[] {
  const valid = [...new Set(categories.filter(category => /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(category)))];
  const specific = valid.filter(category => !valid.some(other => other.startsWith(`${category}.`)));
  const result = specific.map(category => {
    if (Object.hasOwn(labels, category)) return labels[category];
    const leaf = category.split('.').at(-1)?.replaceAll('_', ' ');
    return leaf ? leaf.charAt(0).toUpperCase() + leaf.slice(1) : 'Category unavailable';
  });
  return result.length ? [...new Set(result)] : ['Category unavailable'];
}
