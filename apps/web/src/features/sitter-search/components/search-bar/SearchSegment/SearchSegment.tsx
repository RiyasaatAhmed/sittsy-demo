import type { Ref } from "react";
import { cx } from "@/utils/cx/cx";
import styles from "./SearchSegment.module.css";

type Props = {
  label: string;
  value: string;
  /** Shown in a muted colour when nothing is chosen yet (e.g. "Add dates"). */
  placeholder?: boolean;
  /** True while this segment's panel is open. */
  active: boolean;
  panelId: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
};

/** One part of the pill search bar: a small label over the current value. Opens its panel. */
export function SearchSegment({ label, value, placeholder = false, active, panelId, onClick, ref }: Props) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(styles.segment, active && styles.active)}
      aria-expanded={active}
      aria-controls={active ? panelId : undefined}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <span className={styles.label}>{label}</span>
      <span className={cx(styles.value, placeholder && styles.placeholder)}>{value}</span>
    </button>
  );
}
