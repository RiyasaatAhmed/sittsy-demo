"use client";

import { useRef, useState } from "react";
import { SearchIcon } from "@/components/icons/icons";
import { cx } from "@/utils/cx/cx";
import { useDismiss } from "@/hooks/useDismiss/useDismiss";
import { formatRange, type DateRange } from "@sitter/domain/calendar";
import type { SearchLocation, SearchState } from "@sitter/domain/search";
import type { Service } from "@sitter/domain/sitter";
import { SERVICE_LABELS } from "../../../utils/labels/labels";
import { DateRangePicker } from "../DateRangePicker/DateRangePicker";
import { SearchSegment } from "../SearchSegment/SearchSegment";
import { ServicePicker } from "../ServicePicker/ServicePicker";
import { WherePicker } from "../WherePicker/WherePicker";
import styles from "./SearchBar.module.css";

type Panel = "service" | "where" | "when";

const PANEL_IDS: Record<Panel, string> = {
  service: "search-service-panel",
  where: "search-where-panel",
  when: "search-when-panel",
};

type Props = {
  state: SearchState;
  onServiceChange: (service: Service) => void;
  onLocationChange: (location: SearchLocation) => void;
  onDatesChange: (dates: DateRange) => void;
};

/**
 * Pill search bar: Service, Where and When. Each segment opens a panel under
 * the bar; choosing a value applies it at once (to the URL) and closes the
 * panel. Escape or a click outside closes it too; Escape returns focus to the
 * segment.
 */
export function SearchBar({ state, onServiceChange, onLocationChange, onDatesChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLButtonElement>(null);
  const whereRef = useRef<HTMLButtonElement>(null);
  const whenRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<Panel | null>(null);

  function close(focusSegment: boolean) {
    if (focusSegment && open) {
      const segment = { service: serviceRef, where: whereRef, when: whenRef }[open];
      segment.current?.focus();
    }
    setOpen(null);
  }

  useDismiss(rootRef, open !== null, (reason) => close(reason === "escape"));

  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));
  const dates = formatRange(state.dates);

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={cx(styles.bar, open !== null && styles.open)}>
        <SearchSegment
          ref={serviceRef}
          label="Service"
          value={SERVICE_LABELS[state.service]}
          active={open === "service"}
          panelId={PANEL_IDS.service}
          onClick={() => toggle("service")}
        />
        <SearchSegment
          ref={whereRef}
          label="Where"
          value={state.location.label}
          active={open === "where"}
          panelId={PANEL_IDS.where}
          onClick={() => toggle("where")}
        />
        <SearchSegment
          ref={whenRef}
          label="When"
          value={dates ?? "Add dates"}
          placeholder={dates === null}
          active={open === "when"}
          panelId={PANEL_IDS.when}
          onClick={() => toggle("when")}
        />
        <button
          type="button"
          className={styles.searchButton}
          aria-label="Search a place"
          onClick={() => setOpen((current) => (current === "where" ? null : "where"))}
        >
          <SearchIcon />
        </button>
      </div>

      {open === "service" && (
        <div id={PANEL_IDS.service} className={cx(styles.panel, styles.servicePanel)} role="dialog" aria-label="Choose a service">
          <ServicePicker
            value={state.service}
            onChange={(service) => {
              onServiceChange(service);
              close(true);
            }}
          />
        </div>
      )}
      {open === "where" && (
        <div id={PANEL_IDS.where} className={cx(styles.panel, styles.wherePanel)} role="dialog" aria-label="Choose a place">
          <WherePicker
            onChange={(location) => {
              onLocationChange(location);
              close(true);
            }}
          />
        </div>
      )}
      {open === "when" && (
        <div id={PANEL_IDS.when} className={cx(styles.panel, styles.whenPanel)} role="dialog" aria-label="Choose dates">
          <DateRangePicker
            value={state.dates}
            onChange={(range) => {
              onDatesChange(range);
              close(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
