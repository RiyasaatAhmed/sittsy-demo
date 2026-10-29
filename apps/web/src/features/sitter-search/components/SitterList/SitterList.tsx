import type { ReactNode } from "react";
import type { Stay } from "@sitter/domain/booking";
import type { SitterResult, SittersResponse } from "@sitter/domain/contract";
import type { Service } from "@sitter/domain/sitter";
import { previousRanks, rankMovement, totalWeight } from "@sitter/domain/ranking";
import { SitterCard } from "../sitter-card/SitterCard/SitterCard";
import styles from "./SitterList.module.css";

/**
 * An extra action on each card, supplied by the page (e.g. booking), with the
 * service and stay this list was searched for.
 */
export type RenderSitterAction = (sitter: SitterResult, search: { service: Service; stay: Stay | null }) => ReactNode;

type Props = {
  ranking: SittersResponse;
  /** The ranking shown before this one, to show ▲/▼ movement. */
  previous: SittersResponse | undefined;
  /** True while a newer ranking or page loads behind this one. */
  busy: boolean;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  renderAction?: RenderSitterAction;
};

/** The ranked rows of one page. */
export function SitterList({ ranking, previous, busy, selectedId, onHover, renderAction }: Props) {
  const ranks = previousRanks(previous, ranking);
  // The weights the server ranked with, which match the list shown.
  const maxScore = totalWeight(ranking.weights);

  return (
    <ol className={styles.list} aria-busy={busy}>
      {ranking.results.map((sitter) => (
        <SitterCard
          key={sitter.id}
          sitter={sitter}
          movement={rankMovement(ranks, sitter.id, sitter.rank)}
          service={ranking.service}
          maxScore={maxScore}
          selected={sitter.id === selectedId}
          onHover={onHover}
          action={!busy && renderAction?.(sitter, { service: ranking.service, stay: ranking.stay })}
        />
      ))}
    </ol>
  );
}
