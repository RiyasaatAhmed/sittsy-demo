import type { ReactNode } from "react";
import { cx } from "@/utils/cx/cx";
import styles from "./Tag.module.css";

type Props = {
  children: ReactNode;
  variant?: "neutral" | "verified" | "warning";
  className?: string;
};

/** Small rounded label, e.g. "fake profile" or "ID verified". */
export function Tag({ children, variant = "neutral", className }: Props) {
  return (
    <span className={cx(styles.tag, variant !== "neutral" && styles[variant], className)}>
      {children}
    </span>
  );
}
