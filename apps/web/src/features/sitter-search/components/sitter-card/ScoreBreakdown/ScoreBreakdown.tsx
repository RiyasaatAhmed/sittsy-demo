import { SparkIcon } from "@/components/icons/icons";
import { PART_NAMES, type Breakdown } from "@sitter/domain/ranking";
import { PART_COLORS, PART_LABELS } from "../../../utils/labels/labels";
import { ColorSwatch } from "@/components/ColorSwatch/ColorSwatch";
import styles from "./ScoreBreakdown.module.css";

type Props = { score: number; breakdown: Breakdown };

/** "Why this score?": value × weight = points for every part, adding up to the score. */
export function ScoreBreakdown({ score, breakdown }: Props) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        <SparkIcon tone="accent" />
        Why this score?
      </summary>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Part</th>
            <th>Value (0–1)</th>
            <th>× Weight</th>
            <th>= Points</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {PART_NAMES.map((part) => {
            const p = breakdown[part];
            return (
              <tr key={part}>
                <td>
                  <ColorSwatch color={PART_COLORS[part]} />
                  {PART_LABELS[part]}
                </td>
                <td>{p.value.toFixed(3)}</td>
                <td>{p.weight.toFixed(2)}</td>
                <td>{p.contribution.toFixed(3)}</td>
                <td className={styles.reason}>{p.detail}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total score</td>
            <td>{score.toFixed(3)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </details>
  );
}
