import { PART_NAMES, type Breakdown } from "@sitter/domain/ranking";
import { PART_COLORS, PART_LABELS } from "../../../utils/labels/labels";
import styles from "./ScoreBar.module.css";

type Props = {
  score: number;
  breakdown: Breakdown;
  /** Sum of all weights: the highest score anyone could get. */
  maxScore: number;
};

/** Stacked bar: one coloured segment per part, as a share of the best possible score. */
export function ScoreBar({ score, breakdown, maxScore }: Props) {
  return (
    <div className={styles.row}>
      <div
        className={styles.bar}
        role="img"
        aria-label={`Score ${score.toFixed(3)} out of ${maxScore.toFixed(2)}`}
      >
        {PART_NAMES.map((part) => {
          const share = maxScore > 0 ? breakdown[part].contribution / maxScore : 0;
          return (
            <span
              key={part}
              style={{ width: `${share * 100}%`, background: PART_COLORS[part] }}
              title={`${PART_LABELS[part]}: ${breakdown[part].contribution.toFixed(3)}`}
            />
          );
        })}
      </div>
      <span className={styles.score}>{score.toFixed(3)}</span>
    </div>
  );
}
