import { useSearchParams } from "next/navigation";
import type { DateRange } from "@sitter/domain/calendar";
import { DEFAULT_WEIGHTS, type PartName } from "@sitter/domain/ranking";
import { parseSearchUrl, toSearchUrl, type SearchLocation, type SearchState } from "@sitter/domain/search";
import type { Service } from "@sitter/domain/sitter";

type HistoryMode = "push" | "replace";

/**
 * The search, read from and written to the URL (the single source of truth).
 * Next.js integrates `history.pushState` / `replaceState` with its router, so
 * `useSearchParams` re-renders the page without a reload.
 *
 * - push: service, place, dates and page, so Back returns to the previous search;
 * - replace: weights and the boost, so dragging a slider does not flood history.
 * Any change to what is searched goes back to page 1 (the order changes).
 * Must be used under a <Suspense> boundary (Next.js docs for useSearchParams).
 */
export function useSearchState() {
  const state = parseSearchUrl(useSearchParams());

  function write(next: SearchState, mode: HistoryMode) {
    const url = `?${toSearchUrl(next)}`;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  const changeSearch = (changes: Partial<SearchState>, mode: HistoryMode) =>
    write({ ...state, ...changes, page: 1 }, mode);

  return {
    state,
    setService: (service: Service) => changeSearch({ service }, "push"),
    setLocation: (location: SearchLocation) => changeSearch({ location }, "push"),
    setDates: (dates: DateRange) => changeSearch({ dates }, "push"),
    setPage: (page: number) => write({ ...state, page }, "push"),
    changeWeight: (part: PartName, value: number) =>
      changeSearch({ weights: { ...state.weights, [part]: value } }, "replace"),
    resetWeights: () => changeSearch({ weights: DEFAULT_WEIGHTS }, "replace"),
    setColdStartBoost: (on: boolean) => changeSearch({ coldStartBoost: on }, "replace"),
  };
}

export type SearchStateActions = ReturnType<typeof useSearchState>;
