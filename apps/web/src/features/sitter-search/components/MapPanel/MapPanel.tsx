"use client";

import dynamic from "next/dynamic";
import { PanelErrorBoundary } from "@/components/PanelErrorBoundary/PanelErrorBoundary";
import type { SitterResult } from "@sitter/domain/contract";
import type { Coordinates } from "@sitter/domain/location";
import { MapPlaceholder } from "../MapPlaceholder/MapPlaceholder";
import styles from "./MapPanel.module.css";

// Leaflet only runs in the browser and is large, so it is code-split and not
// server-rendered; a placeholder shows while it downloads.
const SitterMap = dynamic(() => import("../SitterMap/SitterMap").then((module) => module.SitterMap), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

type Props = {
  location: Coordinates;
  results: SitterResult[];
  selectedId: number | null;
  hoveredId: number | null;
  onPick: (location: Coordinates) => void;
  onSelectSitter: (id: number) => void;
};

/** Right column: the sticky map with its usage hint. A map crash stays inside this column. */
export function MapPanel({ location, results, selectedId, hoveredId, onPick, onSelectSitter }: Props) {
  return (
    <div className={styles.column}>
      <PanelErrorBoundary title="The map could not be shown">
        <SitterMap
          lat={location.lat}
          lng={location.lng}
          results={results}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onPick={(lat, lng) => onPick({ lat, lng })}
          onSelectSitter={onSelectSitter}
        />
      </PanelErrorBoundary>
      <p className={styles.hint}>Click a pin to see a sitter · click the map to search there</p>
    </div>
  );
}
