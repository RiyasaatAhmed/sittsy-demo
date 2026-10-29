"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClockIcon, CrosshairIcon, PinIcon } from "@/components/icons/icons";
import { useDebouncedValue } from "@/hooks/useDebouncedValue/useDebouncedValue";
import {
  coordinatePlace,
  MIN_ADDRESS_QUERY_LENGTH,
  roundCoordinates,
  searchPlaces,
  type Place,
} from "@sitter/domain/location";
import type { SearchLocation } from "@sitter/domain/search";
import { placeQueries } from "../../../api/queries/place-queries";
import { readRecentPlaces, rememberPlace } from "../../../utils/recent-places/recent-places";
import styles from "./WherePicker.module.css";

type Props = {
  onChange: (location: SearchLocation) => void;
};

type PositionStatus = "idle" | "locating" | "failed";

const toLocation = (place: Place): SearchLocation => ({ lat: place.lat, lng: place.lng, label: place.name });

/** Wait for a pause in typing before asking the address service. */
const ADDRESS_DEBOUNCE_MS = 300;

/** Built-in Paris places first (instant), then addresses not already listed. */
function mergePlaces(local: Place[], addresses: Place[]): Place[] {
  const localNames = new Set(local.map((place) => place.name.toLowerCase()));
  return [...local, ...addresses.filter((place) => !localNames.has(place.name.toLowerCase()))];
}

/**
 * Place search: any address or place in the world (looked up online), the
 * built-in Paris places, or coordinates typed as "lat, lng".
 * With an empty field: "Use my current position" and the recent places.
 * Enter picks the first suggestion, waiting for the address lookup if needed.
 */
export function WherePicker({ onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // Read once when the panel opens; it only opens in the browser.
  const [recent] = useState(readRecentPlaces);
  const [position, setPosition] = useState<PositionStatus>("idle");
  const queryClient = useQueryClient();

  // Focus the field when the panel opens, so the user can type straight away.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();
  const typedCoordinates = coordinatePlace(query);
  const wantsAddresses = !typedCoordinates && trimmed.length >= MIN_ADDRESS_QUERY_LENGTH;
  const debouncedQuery = useDebouncedValue(trimmed, ADDRESS_DEBOUNCE_MS);
  const addresses = useQuery({
    ...placeQueries.addresses(debouncedQuery),
    enabled: wantsAddresses && debouncedQuery === trimmed,
  });
  // Only show addresses for what is typed now, not for an earlier query.
  const currentAddresses = wantsAddresses && debouncedQuery === trimmed ? (addresses.data ?? []) : [];
  const searching = wantsAddresses && (debouncedQuery !== trimmed || addresses.isFetching);
  const suggestions = typedCoordinates ? [typedCoordinates] : mergePlaces(searchPlaces(query), currentAddresses);

  function choose(location: SearchLocation) {
    rememberPlace(location);
    onChange(location);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const first = suggestions[0];
    if (first) {
      choose(toLocation(first));
      return;
    }
    if (!wantsAddresses) return;
    // Enter pressed before the lookup finished: look up now and take the best match.
    try {
      const [best] = await queryClient.fetchQuery(placeQueries.addresses(trimmed));
      if (best) choose(toLocation(best));
    } catch {
      // Nothing to choose; the list below shows the failure once its own lookup settles.
    }
  }

  function useCurrentPosition() {
    if (!("geolocation" in navigator)) {
      setPosition("failed");
      return;
    }
    setPosition("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        onChange({ ...roundCoordinates({ lat: coords.latitude, lng: coords.longitude }), label: "Current position" }),
      () => setPosition("failed"),
      { timeout: 10_000 },
    );
  }

  return (
    <form className={styles.picker} onSubmit={(event) => void submit(event)} role="search">
      <label className={styles.field}>
        <PinIcon />
        <span className="visually-hidden">Search for a place</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Any address, or 48.86, 2.35"
          autoComplete="off"
        />
      </label>

      {trimmed === "" ? (
        <>
          <ul className={styles.list}>
            <li>
              <button
                type="button"
                className={styles.row}
                onClick={useCurrentPosition}
                disabled={position === "locating"}
              >
                <CrosshairIcon />
                {position === "locating" ? "Finding your position…" : "Use my current position"}
              </button>
            </li>
          </ul>
          {position === "failed" && (
            <p className={styles.note} role="alert">
              Couldn&apos;t get your position. Allow location access, or search for a place.
            </p>
          )}
          {recent.length > 0 && (
            <>
              <hr className={styles.divider} />
              <h3 className={styles.heading}>Recent</h3>
              <ul className={styles.list}>
                {recent.map((place) => (
                  <li key={place.label}>
                    <button type="button" className={styles.row} onClick={() => choose(place)}>
                      <ClockIcon />
                      {place.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : suggestions.length > 0 ? (
        <ul className={styles.list} aria-label="Suggestions">
          {suggestions.map((place) => (
            <li key={`${place.name}|${place.area}`}>
              <button type="button" className={styles.row} onClick={() => choose(toLocation(place))}>
                <span className={styles.place}>
                  <span className={styles.name}>{place.name}</span>
                  <span className={styles.area}>{place.area}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : searching ? (
        <p className={styles.note} role="status">
          Searching addresses…
        </p>
      ) : addresses.isError ? (
        <p className={styles.note} role="alert">
          Couldn&apos;t reach the address search. Try a Paris neighbourhood, or coordinates like 48.86, 2.35.
        </p>
      ) : (
        <p className={styles.note}>
          No matching place. Check the address, or type coordinates like 48.86, 2.35.
        </p>
      )}
    </form>
  );
}
