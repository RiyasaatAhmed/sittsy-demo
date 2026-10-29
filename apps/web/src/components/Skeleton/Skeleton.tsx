import { cx } from "@/utils/cx/cx";
import styles from "./Skeleton.module.css";

type Props = {
  width: number | string;
  height: number | string;
  round?: boolean;
};

/** Placeholder shape. Hidden from screen readers: the loading message is announced separately. */
export function Skeleton({ width, height, round = false }: Props) {
  return (
    <span
      className={cx(styles.skeleton, round && styles.round)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
