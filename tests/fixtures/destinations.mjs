// Synthetic data only: not captured provider payloads or claims about real places.
export const fixtureDestination = {
  reference: 'fixture-reserve-search', name: 'Fixture Protected Reserve', formatted: 'Fixture Protected Reserve, Fixture County, Kenya',
  countryCode: 'KE', county: 'Fixture County', state: 'Fixture Region', categoryLabels: ['Protected area'],
  latitude: -1, longitude: 35, bounds: [34, -2, 36, 0],
};
export const fixtureResolved = { ...fixtureDestination, detailsId: 'fixture-reserve-details' };
export function searchFeature(reference = fixtureDestination.reference, overrides = {}) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [35, -1] }, bbox: [34, -2, 36, 0],
    properties: { place_id: reference, name: fixtureDestination.name, formatted: fixtureDestination.formatted,
      country_code: 'ke', county: 'Fixture County', state: 'Fixture Region', result_type: 'amenity',
      category: 'leisure.park.nature_reserve;natural.protected_area', ...overrides } };
}
export const collection = (...features) => ({ type: 'FeatureCollection', features });
export function detailsFeature(geometry = { type: 'Polygon', coordinates: [[[34, -2], [36, -2], [36, 0], [34, -2]]] }) {
  return { ...searchFeature('fixture-reserve-details'), geometry, properties: {
    place_id: 'fixture-reserve-details', name: fixtureDestination.name, formatted: fixtureDestination.formatted,
    country_code: 'ke', county: 'Fixture County', state: 'Fixture Region', feature_type: 'details',
    categories: ['leisure', 'leisure.park', 'leisure.park.nature_reserve'], lon: 35, lat: -1,
  } };
}
