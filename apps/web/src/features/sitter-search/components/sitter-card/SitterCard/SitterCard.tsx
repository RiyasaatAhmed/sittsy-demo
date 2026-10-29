import type { ReactNode } from "react";
import type { SitterResult } from "@sitter/domain/contract";
import { sitterOverview, type Service } from "@sitter/domain/sitter";
import { RankMovement } from "../RankMovement/RankMovement";
import { ScoreBar } from "../ScoreBar/ScoreBar";
import { ScoreBreakdown } from "../ScoreBreakdown/ScoreBreakdown";
import { SitterAvatar } from "../SitterAvatar/SitterAvatar";
import { SitterFacts } from "../SitterFacts/SitterFacts";
import { SitterOverview } from "../SitterOverview/SitterOverview";
import { SitterPrice } from "../SitterPrice/SitterPrice";
import { sitterRowId } from "../../../utils/sitter-row-id/sitter-row-id";
import { cx } from "@/utils/cx/cx";
import styles from "./SitterCard.module.css";

type Props = {
  sitter: SitterResult;
  /** Positive = moved up since the previous list, negative = moved down, null = entered the list. */
  movement: number | null;
  service: Service;
  /** Sum of all weights: the highest score anyone could get. */
  maxScore: number;
  /** True when this sitter's pin was clicked on the map. */
  selected: boolean;
  /** Called with the sitter id when the mouse enters the row, null when it leaves. */
  onHover: (id: number | null) => void;
  /** Optional action under the price (e.g. "Request to book"). */
  action?: ReactNode;
};

/** One row of the ranked list. Composes the parts; holds no logic of its own. */
export function SitterCard({ sitter, movement, service, maxScore, selected, onHover, action }: Props) {
  return (
    <li
      tabIndex={-1}
      id={sitterRowId(sitter.id)}
      className={cx(styles.row, selected && styles.selected)}
      aria-current={selected ? "true" : undefined}
      data-testid="sitter-card"
      onMouseEnter={() => onHover(sitter.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={styles.main}>
        <SitterAvatar id={sitter.id} name={sitter.name} identityVerified={sitter.identityVerified} />
        <div className={styles.info}>
          <div className={styles.title}>
            <span className={styles.rank}>{sitter.rank}.</span>
            <h3 className={styles.name}>{sitter.name}</h3>
            <RankMovement movement={movement} />
          </div>
          <SitterFacts sitter={sitter} />
        </div>
        <div className={styles.side}>
          <SitterPrice priceEur={sitter.priceEur} service={service} />
          {action}
        </div>
      </div>

      <SitterOverview text={sitterOverview(sitter)} />
      <ScoreBar score={sitter.score} breakdown={sitter.breakdown} maxScore={maxScore} />
      <ScoreBreakdown score={sitter.score} breakdown={sitter.breakdown} />
    </li>
  );
}
