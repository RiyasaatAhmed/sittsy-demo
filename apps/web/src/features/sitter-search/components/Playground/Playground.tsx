"use client";

import { flushSync } from "react-dom";
import { useState, type ReactNode } from "react";
import { roundCoordinates } from "@sitter/domain/location";
import { useRankedSitters } from "../../hooks/useRankedSitters/useRankedSitters";
import { useSearchState } from "../../hooks/useSearchState/useSearchState";
import { useSitterHighlight } from "../../hooks/useSitterHighlight/useSitterHighlight";
import { FilterBar } from "../FilterBar/FilterBar";
import { MapPanel } from "../MapPanel/MapPanel";
import { ResultsPanel } from "../ResultsPanel/ResultsPanel";
import type { RenderSitterAction } from "../SitterList/SitterList";
import { SearchBar } from "../search-bar/SearchBar/SearchBar";
import { TopBar } from "@/components/TopBar/TopBar";
import styles from "./Playground.module.css";

type Props = {
  /** Shown above the results: the page puts other features here (e.g. booking requests). */
  resultsHeader?: ReactNode;
  /** An extra action on each sitter card, from another feature (e.g. "Request to book"). */
  renderSitterAction?: RenderSitterAction;
};

/**
 * The whole search page: the search lives in the URL (useSearchState), the
 * ranked results come from the API (useRankedSitters), and the list and map
 * highlight each other (useSitterHighlight). Other features plug in through
 * the two slots, so this feature never imports them.
 */
export function Playground({ resultsHeader, renderSitterAction }: Props = {}) {
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const search = useSearchState();
  const { state } = search;
  const ranked = useRankedSitters(state, search.setPage);
  const highlight = useSitterHighlight();
  const ranking = ranked.query.data;

  return (
    <div>
      <TopBar>
        <SearchBar
          state={state}
          onServiceChange={search.setService}
          onLocationChange={search.setLocation}
          onDatesChange={search.setDates}
        />
      </TopBar>

      <FilterBar
        weights={state.weights}
        coldStartBoost={state.coldStartBoost}
        totalCandidates={ranking?.totalCandidates ?? 0}
        onWeightChange={search.changeWeight}
        onResetWeights={search.resetWeights}
        onColdStartBoostChange={search.setColdStartBoost}
      />

      <div className={styles.viewControls} role="group" aria-label="Search result view">
        <button type="button" aria-pressed={mobileView === "list"} aria-controls="sitter-results" onClick={() => setMobileView("list")}>List</button>
        <button type="button" aria-pressed={mobileView === "map"} aria-controls="sitter-map" onClick={() => setMobileView("map")}>Map</button>
      </div>
      <div className={styles.split} data-view={mobileView}>
        <div id="sitter-results" className={styles.listPane}>
          <ResultsPanel
            ranked={ranked}
            service={state.service}
            selectedId={highlight.selectedId}
            onHover={highlight.setHoveredId}
            header={resultsHeader}
            renderSitterAction={renderSitterAction}
          />
        </div>
        <div id="sitter-map" className={styles.mapPane}>
          <MapPanel
            location={state.location}
            results={ranking?.results ?? []}
            selectedId={highlight.selectedId}
            hoveredId={highlight.hoveredId}
            onPick={(point) => search.setLocation({ ...roundCoordinates(point), label: "Pinned on the map" })}
            onSelectSitter={(id) => {
              // Reveal the list before its selected card is scrolled into view.
              flushSync(() => setMobileView("list"));
              highlight.selectSitter(id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
