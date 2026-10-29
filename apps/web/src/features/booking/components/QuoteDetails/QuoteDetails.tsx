import { cx } from "@/utils/cx/cx";
import type { Quote } from "@sitter/domain/booking";
import { formatCents } from "../../utils/booking-labels/booking-labels";
import styles from "./QuoteDetails.module.css";

/** The server's itemised quote: one row per line, then the total. */
export function QuoteDetails({ quote }: { quote: Quote }) {
  return (
    <dl className={styles.quote}>
      {quote.lines.map((line) => (
        <div key={line.label} className={styles.line}>
          <dt>{line.label}</dt>
          <dd>{formatCents(line.amountCents)}</dd>
        </div>
      ))}
      <div className={cx(styles.line, styles.total)}>
        <dt>Total</dt>
        <dd>{formatCents(quote.totalCents)}</dd>
      </div>
    </dl>
  );
}
