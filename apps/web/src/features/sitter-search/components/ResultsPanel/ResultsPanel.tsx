"use client";

import { useRef, type ReactNode } from "react";
import { PanelErrorBoundary } from "@/components/PanelErrorBoundary/PanelErrorBoundary";
import type { Service } from "@sitter/domain/sitter";
import type { RankedSitters } from "../../hooks/useRankedSitters/useRankedSitters";
import { SERVICE_LABELS } from "../../utils/labels/labels";
import { resultsAnnouncement } from "../../utils/results-announcement/results-announcement";
import { ResultsBody } from "../ResultsBody/ResultsBody";
import type { RenderSitterAction } from "../SitterList/SitterList";
import styles from "./ResultsPanel.module.css";

type Props = {
  ranked: RankedSitters;
  service: Service;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  /** Shown above the results (e.g. the owner's booking requests). */
  header?: ReactNode;
  renderSitterAction?: RenderSitterAction;
};

/** Left column: the results (in every state) and their pagination. */
export function ResultsPanel({ ranked, service, selectedId, onHover, header, renderSitterAction }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { query, page, setPage } = ranked;

  function goToPage(next: number) {
    setPage(next);
    // Back to the first result of the new page, like a new page would.
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className={styles.results} aria-label="Ranked sitters" ref={sectionRef}>
      <h2 className="visually-hidden">Sitters for {SERVICE_LABELS[service].toLowerCase()}</h2>
      {/* One polite live region for loading progress and page changes. */}
      <p className="visually-hidden" role="status">
        {resultsAnnouncement({
          ranking: query.data,
          isPending: query.isPending,
          failureCount: query.failureCount,
          page,
        })}
      </p>
      {header}
      <PanelErrorBoundary title="The results could not be shown">
        <ResultsBody
          ranked={ranked}
          selectedId={selectedId}
          onHover={onHover}
          onPageChange={goToPage}
          renderSitterAction={renderSitterAction}
        />
      </PanelErrorBoundary>
    </section>
  );
}
