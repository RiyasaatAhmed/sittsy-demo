"use client";

// Browser-only: MapPanel loads this file with next/dynamic and `ssr: false`,
// because Leaflet reads `window` as soon as it is imported.
import "leaflet/dist/leaflet.css";
import L, { type LayerGroup } from "leaflet";
import { useEffect, useEffectEvent, useRef } from "react";
import { cx } from "@/utils/cx/cx";
import type { SitterResult } from "@sitter/domain/contract";
import styles from "./SitterMap.module.css";

const INITIAL_ZOOM = 12;

type Props = {
  lat: number;
  lng: number;
  results: SitterResult[];
  /** Sitter whose pin was clicked: drawn in the accent colour. */
  selectedId: number | null;
  /** Sitter whose row the mouse is over: drawn larger. */
  hoveredId: number | null;
  onPick: (lat: number, lng: number) => void;
  onSelectSitter: (id: number) => void;
};

/**
 * OpenStreetMap via Leaflet. Click anywhere to move the search location, or
 * click a numbered pin to jump to that sitter in the list.
 */
export function SitterMap({ lat, lng, results, selectedId, hoveredId, onPick, onSelectSitter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const initialLocation = useEffectEvent((): [number, number] => [lat, lng]);
  const layerRef = useRef<LayerGroup | null>(null);
  // Leaflet handlers always call the latest props without re-creating the map.
  const pick = useEffectEvent((clickLat: number, clickLng: number) => onPick(clickLat, clickLng));
  const selectSitter = useEffectEvent((id: number) => onSelectSitter(id));

  // Create the map once (Leaflet is an external system React does not manage).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = L.map(container).setView(initialLocation(), INITIAL_ZOOM);
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(container);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: styles.softTiles,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", (event) => pick(event.latlng.lat, event.latlng.lng));
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      resize.disconnect();
      mapRef.current = null;
      layerRef.current = null;
      map.remove();
    };
  }, []);

  // Explicit search-location changes recenter without undoing the user’s zoom.
  useEffect(() => { mapRef.current?.panTo([lat, lng], { animate: false }); }, [lat, lng]);

  // Redraw markers whenever the location, the results or the highlighted pin change.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.clearLayers();
    // Draw from last to first so the top-ranked pins end up on top.
    [...results].reverse().forEach((sitter) => {
      const selected = sitter.id === selectedId;
      const hovered = sitter.id === hoveredId;
      const pinClass = cx(styles.pin, selected && styles.pinSelected, hovered && styles.pinHovered);
      const icon = L.divIcon({
        className: styles.pinIcon,
        html: `<span class="${pinClass}"><span>${sitter.rank}</span></span>`,
        iconSize: [28, 28],
        // Teardrop pin: the point at the bottom marks the sitter's position.
        iconAnchor: [14, 34],
      });
      // Marker clicks do not reach the map's click handler, so clicking a pin
      // selects the sitter without moving the search location.
      const marker = L.marker([sitter.lat, sitter.lng], {
        icon,
        // Keep the highlighted pin above its neighbours.
        zIndexOffset: selected || hovered ? 1000 : 0,
      })
        .bindTooltip(`${sitter.rank}. ${sitter.name} (fake)`)
        .on("click", () => selectSitter(sitter.id))
        .addTo(layer);
      const element = marker.getElement();
      element?.setAttribute("aria-label", `Rank ${sitter.rank}: ${sitter.name} (fake)`);
      // Leaflet's div icons are focusable but do not activate like native buttons.
      element?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        selectSitter(sitter.id);
      });
    });
    // Colour comes from CSS (--accent), so the palette has one source.
    L.circleMarker([lat, lng], { radius: 9, weight: 4, className: styles.searchMarker })
      .bindTooltip("Search location")
      .addTo(layer);
  }, [lat, lng, results, selectedId, hoveredId]);

  return (
    <div
      ref={containerRef}
      className={styles.map}
      role="application"
      aria-label="Sitter map: click to set the search location"
    />
  );
}
