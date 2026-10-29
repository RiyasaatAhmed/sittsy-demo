import { addressSearchUrl, parseAddressResults, type Place } from "@sitter/domain/location";
import { getJson } from "@/lib/http-client/http-client";

/** Addresses and places anywhere in the world matching `query` (OpenStreetMap data, via Photon). */
export async function fetchAddresses(query: string, signal?: AbortSignal): Promise<Place[]> {
  return parseAddressResults(await getJson<unknown>(addressSearchUrl(query), signal));
}
