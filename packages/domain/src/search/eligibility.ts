import { distanceKm } from "../location";
import type { Service, Sitter } from "../sitter";
import type { Location } from "./search-params";

/** Demo policy: short visits stay local; overnight care allows a wider area. */
export const SEARCH_RADIUS_KM: Readonly<Record<Service, number>> = {
  dog_walking: 5,
  drop_in: 5,
  day_care: 10,
  boarding: 20,
  house_sitting: 15,
};

/** Eligibility is independent of ranking weights, including a zero distance weight. */
export function eligibleSitters(candidates: Sitter[], search: Location): Sitter[] {
  return candidates.filter((sitter) =>
    sitter.prices[search.service] !== undefined &&
    distanceKm(search.lat, search.lng, sitter.lat, sitter.lng) <= SEARCH_RADIUS_KM[search.service],
  );
}
