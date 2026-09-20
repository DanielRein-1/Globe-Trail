# ADR-008: Explicit destination selection for mock previews

Status: Accepted for this bounded implementation.

## Decision

Extend the country planning page with two scopes: Anywhere in country (the existing default) and an explicitly selected destination. Search happens only on form submission. No destination page, nearby-search cache, authentication, images, saved trips, prices or persistence is added.

The server queries Geoapify Forward Geocoding using the submitted text, a validated assigned ISO country code, `filter=countrycode:<code>`, `bias=countrycode:none`, English, GeoJSON and limit 10. A small curated alias table also tries Maasai Mara → Masai Mara. No other spelling changes occur. Each submission makes one call, or two for that alias, sequentially. Results merge in original-then-alias order, deduplicating exact search references only. The public response contains at most 20 choices; provider order is not a recommendation. Failed alias requests fail the search rather than silently returning an incomplete set.

Conservative name/category/type checks remove clearly unsuitable roads, buildings, shops, universities, accommodation and similar businesses. Protected areas remain eligible even when typed `amenity`. Unclassified places may remain: filtering does not establish factual relevance. Visitors must inspect labels and explicitly select; no first-result selection occurs.

The preview request includes only country code, optional selected opaque reference and existing planning preferences. With no reference the unchanged country flow reads canonical Country name/code; no provider fallback or write occurs. With a reference the service resolves Place Details before generation, without database access. Browser-supplied facts are rejected as unknown input properties. Details must have a name, identity, matching country and usable reference coordinates. Point, closed-ring Polygon and MultiPolygon geometries are validated; polygon vertices are never substituted for reference coordinates. A returned details ID is stored separately in the public resolved DTO, never substituted for the selected reference or required to equal it.

Country previews remain itinerary.v1 / mock-itinerary-v1. Selected-place previews use itinerary.v2 / mock-itinerary-v2. The service validates scope, selected reference, country/name correspondence, sequential days and ordered slots. The deterministic template labels the selected destination but makes no claims that activities, venues, routes or availability have been verified. Results are escaped text and unsaved. ADR-007's no-provider-call boundary continues for country-wide previews; selected previews add only the details lookup, not paid AI or attraction grounding.

## Provider evidence and limits

The authorized relevance spike found the explicit Masai Mara National Reserve at rank 3 and Amboseli National Park at rank 7, behind gates or unrelated parks/roads. Both selected references resolved to Polygon details with matching names, reference coordinates and bounds. Both details IDs differed from search IDs. Wikidata/Wikipedia references were present; Amboseli had a website; neither inspected media object had an image. These observations are not permanent identity or relevance guarantees. Do not commit live response dumps or credentials. Tests use synthetic fixtures.

Official contracts: https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/ and https://apidocs.geoapify.com/docs/place-details/.

## Safety and operational limits

Provider modules are server-only and use native HTTPS so framework fetch instrumentation cannot record credential-bearing URLs. A 10-second deadline applies to each provider request, with abort and handled late rejection; responses are bounded to 1 MiB and decoded as strict UTF-8/JSON. Redirects and non-200 responses fail safely. Only allowlisted public DTO fields leave the server; raw payloads and caught transport errors are not logged or returned. This is not application-wide log suppression.

No server cache, automatic retries, distributed deduplication or rate limiting is introduced. Repeated searches/generation consume quota. Before unrestricted deployment, configure provider-key restrictions, trusted-client rate limiting and a deployment-wide provider budget. Administrative labels and provider data may change; ambiguous same-name records remain separate. Fixtures verify UI/API contracts, not live provider availability or real-world accuracy. Prisma schema, migrations, country/attraction caches and trip relationships are untouched.
