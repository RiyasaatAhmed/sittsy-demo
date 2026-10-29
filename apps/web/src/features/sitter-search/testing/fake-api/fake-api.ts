// A fake of the sitter search API for UI tests, backed by a mocked `fetch`.

import { vi } from "vitest";
import type { SitterResult, SittersResponse } from "@sitter/domain/contract";
import { ADDRESS_SEARCH_ORIGIN } from "@sitter/domain/location";
import { DEFAULT_WEIGHTS, type Weights } from "@sitter/domain/ranking";
import { isService } from "@sitter/domain/sitter";

export function sitterResult(
  id: number,
  name: string,
  score: number,
  weights: Weights,
  rank = 0,
): SitterResult {
  const part = (value: number, weight: number) => ({
    value,
    weight,
    contribution: value * weight,
    detail: "",
  });
  return {
    rank,
    id,
    name,
    lat: 48.85,
    lng: 2.35,
    priceEur: 15,
    ratingAverage: 4.8,
    ratingCount: 10,
    medianResponseMinutes: 20,
    bookingsLast30d: 3,
    identityVerified: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    ageDays: 500,
    distanceKm: 1,
    score,
    breakdown: {
      quality: part(score / weights.quality, weights.quality),
      responsiveness: part(0, weights.responsiveness),
      activity: part(0, weights.activity),
      distance: part(0, weights.distance),
      coldStart: part(0, weights.coldStart),
    },
  };
}

/** Like the real API, echo the search the results are for. */
export function sittersResponse(
  params: URLSearchParams,
  weights: Weights,
  results: SitterResult[],
  totals: { totalCandidates: number; totalPages: number },
): SittersResponse {
  const service = params.get("service") ?? "";
  const from = params.get("from");
  const to = params.get("to");
  return {
    service: isService(service) ? service : "dog_walking",
    lat: Number(params.get("lat")),
    lng: Number(params.get("lng")),
    weights,
    coldStartBoost: true,
    stay: from && to ? { checkIn: from, checkOut: to } : null,
    unavailableCount: 0,
    page: Number(params.get("page")),
    pageSize: Number(params.get("limit")),
    ...totals,
    results,
  };
}

export function errorResponse(status: number, error: string, details?: string[]): Response {
  return Response.json(details ? { error, details } : { error }, { status });
}

const paramsOf = (url: string) => new URL(url, "http://localhost").searchParams;

const weightsOf = (params: URLSearchParams): Weights => ({
  ...DEFAULT_WEIGHTS,
  distance: Number(params.get("w_distance")),
});

/**
 * Three sitters. With the default distance weight Anna is first; once the
 * distance weight is raised to 1, Bruno (who lives closer) overtakes her.
 * Latitude above 90 is a 400, like the real API.
 */
export function threeSittersApi(url: string): Response {
  const params = paramsOf(url);
  if (Math.abs(Number(params.get("lat"))) > 90) {
    return errorResponse(400, "Invalid query parameters", ["lat must be between -90 and 90"]);
  }
  const weights = weightsOf(params);
  const results =
    weights.distance === 1
      ? [sitterResult(2, "Bruno Fake", 0.9, weights), sitterResult(1, "Anna Fake", 0.6, weights), sitterResult(3, "Chloe Fake", 0.5, weights)]
      : [sitterResult(1, "Anna Fake", 0.8, weights), sitterResult(3, "Chloe Fake", 0.7, weights), sitterResult(2, "Bruno Fake", 0.4, weights)];
  // A different service returns a different order, so stale ▲/▼ markers would show.
  if (params.get("service") === "boarding") results.reverse();
  return Response.json(
    sittersResponse(
      params,
      weights,
      results.map((r, index) => ({ ...r, rank: index + 1 })),
      { totalCandidates: 3, totalPages: 1 },
    ),
  );
}

/** 45 sitters ("Sitter 1 Fake" is #1), so 3 pages of 20. */
export function pagedApi(url: string): Response {
  const params = paramsOf(url);
  const weights = weightsOf(params);
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("limit"));
  const first = (page - 1) * pageSize + 1;
  const ranks = Array.from({ length: pageSize }, (_, index) => first + index).filter((n) => n <= 45);
  const results = ranks.map((rank) => sitterResult(rank, `Sitter ${rank} Fake`, 1 - rank / 100, weights, rank));
  return Response.json(sittersResponse(params, weights, results, { totalCandidates: 45, totalPages: 3 }));
}

export const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>();

/** A place the fake address search (Photon) can return. */
export type FakeAddress = { name: string; city?: string; country: string; lat: number; lng: number };

let addressHandler: (url: string) => Response | Promise<Response> = () => addressResponse([]);

/** A Photon (GeoJSON) answer listing `addresses`. */
export function addressResponse(addresses: FakeAddress[]): Response {
  return Response.json({
    type: "FeatureCollection",
    features: addresses.map(({ lat, lng, ...properties }) => ({
      type: "Feature",
      properties,
      geometry: { type: "Point", coordinates: [lng, lat] },
    })),
  });
}

/** Makes the fake address search answer with `handler` (by default: nothing found). */
export function serveAddresses(handler: (url: string) => Response | Promise<Response> = () => addressResponse([])) {
  addressHandler = handler;
}

/** Makes the fake API answer with `handler` until changed. Address lookups go to the fake address search. */
export function serveApi(handler: (url: string) => Response | Promise<Response>) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    return url.startsWith(ADDRESS_SEARCH_ORIGIN) ? addressHandler(url) : handler(url);
  });
}

/** The `q` of every address lookup so far. */
export function addressQueries(): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.startsWith(ADDRESS_SEARCH_ORIGIN))
    .map((url) => new URL(url).searchParams.get("q") ?? "");
}

/** URLs of every /api/sitters request so far. */
export function sittersCalls(): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.startsWith("/api/sitters"));
}
