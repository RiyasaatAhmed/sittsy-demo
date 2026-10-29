import type { ReactNode } from "react";
import styles from "./TopBar.module.css";

const DISCLAIMER = "Unofficial concept · not affiliated";

type Props = {
  /** The middle of the header, e.g. the search form. */
  children?: ReactNode;
};

/**
 * Header: brand on the left, the page's own controls in the middle, the
 * disclaimer on the right. The disclaimer must always be visible, so on
 * narrower screens a compact copy under the brand name replaces the
 * pill; CSS shows exactly one of the two, so screen readers hear it once.
 */
export function TopBar({ children }: Props) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          SR
        </span>
        <span className={styles.brandText}>
          Sitter Ranking
          <span className={styles.compactNote}>{DISCLAIMER}</span>
        </span>
      </div>
      {children ?? <span />}
      <div className={styles.right}>
        <span className={styles.unofficial}>{DISCLAIMER}</span>
      </div>
    </header>
  );
}
