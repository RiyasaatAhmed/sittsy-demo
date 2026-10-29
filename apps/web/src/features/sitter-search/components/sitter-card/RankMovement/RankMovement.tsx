import { cx } from "@/utils/cx/cx";
import styles from "./RankMovement.module.css";

type Props = {
  /** Positive = moved up since the previous list, negative = moved down, null = entered the list. */
  movement: number | null;
};

/** ▲/▼ marker next to the rank after a re-rank. Nothing when the rank did not change. */
export function RankMovement({ movement }: Props) {
  if (movement === null) {
    return (
      <span className={cx(styles.move, styles.up)} title="Entered the top list">
        ↑in
      </span>
    );
  }
  if (movement > 0) return <span className={cx(styles.move, styles.up)}>▲{movement}</span>;
  if (movement < 0) return <span className={cx(styles.move, styles.down)}>▼{-movement}</span>;
  return null;
}
