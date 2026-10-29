// Places the "Where" search can find. The fake sitters all live in and around
// Paris, so the list covers Paris, its 20 arrondissements, some well-known
// neighbourhoods and nearby towns, with approximate centre coordinates.
// Real place names and public map coordinates only; no personal data.

import { parseCoordinateInputs, type Coordinates } from "./coordinates";

export type Place = Coordinates & {
  /** What is searched and shown first, e.g. "Le Marais". */
  name: string;
  /** Second line, e.g. "Paris 3e–4e, France". */
  area: string;
};

const ARRONDISSEMENTS: [number, number, number][] = [
  [1, 48.8625, 2.3364], [2, 48.8683, 2.3428], [3, 48.863, 2.3601], [4, 48.8543, 2.3576],
  [5, 48.8445, 2.3497], [6, 48.8491, 2.3326], [7, 48.8562, 2.3121], [8, 48.8727, 2.3125],
  [9, 48.877, 2.3375], [10, 48.8762, 2.3607], [11, 48.859, 2.38], [12, 48.835, 2.4213],
  [13, 48.8283, 2.3622], [14, 48.8291, 2.3265], [15, 48.8401, 2.2928], [16, 48.8603, 2.262],
  [17, 48.8873, 2.3067], [18, 48.8925, 2.3484], [19, 48.8871, 2.3848], [20, 48.8634, 2.4011],
];

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export const PLACES: Place[] = [
  { name: "Paris", area: "France", lat: 48.8566, lng: 2.3522 },
  ...ARRONDISSEMENTS.map(([n, lat, lng]) => ({
    name: `Paris ${n}${n === 1 ? "er" : "e"}`,
    area: `${ordinal(n)} arrondissement, France`,
    lat,
    lng,
  })),
  { name: "Le Marais", area: "Paris 3e–4e, France", lat: 48.8575, lng: 2.3584 },
  { name: "Montmartre", area: "Paris 18e, France", lat: 48.8867, lng: 2.3431 },
  { name: "Belleville", area: "Paris 19e–20e, France", lat: 48.8721, lng: 2.3768 },
  { name: "Bastille", area: "Paris 11e–12e, France", lat: 48.8532, lng: 2.3691 },
  { name: "Saint-Germain-des-Prés", area: "Paris 6e, France", lat: 48.8539, lng: 2.3338 },
  { name: "Montparnasse", area: "Paris 14e–15e, France", lat: 48.8421, lng: 2.3219 },
  { name: "Batignolles", area: "Paris 17e, France", lat: 48.8848, lng: 2.3197 },
  { name: "Canal Saint-Martin", area: "Paris 10e, France", lat: 48.871, lng: 2.3657 },
  { name: "Bercy", area: "Paris 12e, France", lat: 48.8366, lng: 2.3829 },
  { name: "Boulogne-Billancourt", area: "Hauts-de-Seine, France", lat: 48.8397, lng: 2.2399 },
  { name: "Neuilly-sur-Seine", area: "Hauts-de-Seine, France", lat: 48.8846, lng: 2.2697 },
  { name: "Levallois-Perret", area: "Hauts-de-Seine, France", lat: 48.895, lng: 2.2864 },
  { name: "Issy-les-Moulineaux", area: "Hauts-de-Seine, France", lat: 48.8245, lng: 2.2737 },
  { name: "Vincennes", area: "Val-de-Marne, France", lat: 48.8474, lng: 2.4392 },
  { name: "Ivry-sur-Seine", area: "Val-de-Marne, France", lat: 48.8131, lng: 2.3846 },
  { name: "Montreuil", area: "Seine-Saint-Denis, France", lat: 48.8638, lng: 2.4485 },
  { name: "Saint-Denis", area: "Seine-Saint-Denis, France", lat: 48.9362, lng: 2.3574 },
];

/** Lower case, no accents, hyphens as spaces: "Saint-Germain-des-Prés" → "saint germain des pres". */
function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0 = name starts with the query, 1 = a word of the name does, 2 = the area matches, null = no match. */
function matchRank(place: Place, query: string): number | null {
  const name = normalise(place.name);
  if (name.startsWith(query)) return 0;
  if (name.split(" ").some((word) => word.startsWith(query))) return 1;
  if (normalise(place.area).includes(query)) return 2;
  return null;
}

/**
 * Places matching what the user typed, best first: names that start with the
 * query, then names with a word that does, then matching areas. Ignores case
 * and accents. Empty query → no suggestions.
 */
export function searchPlaces(query: string, limit = 6): Place[] {
  const wanted = normalise(query);
  if (wanted === "") return [];
  return PLACES.map((place, index) => ({ place, index, rank: matchRank(place, wanted) }))
    .filter((match): match is { place: Place; index: number; rank: number } => match.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((match) => match.place);
}

/**
 * Coordinates typed into the search, like "48.86, 2.35" or "48.86 2.35"
 * (the SPEC's lat/lng input), as a place; null if it is not two numbers.
 */
export function coordinatePlace(query: string): Place | null {
  const parts = query.trim().split(/[\s,;]+/);
  if (parts.length !== 2) return null;
  const parsed = parseCoordinateInputs(parts[0] ?? "", parts[1] ?? "");
  if (!parsed.ok) return null;
  const { lat, lng } = parsed.value;
  return { name: `${lat}, ${lng}`, area: "Coordinates", lat, lng };
}
