import { Button } from "@/components/Button/Button";
import type { Stay } from "@sitter/domain/booking";
import styles from "./RequestStayButton.module.css";

type Props = {
  /** The searched stay, or null when no dates are picked. */
  stay: Stay | null;
  onRequest: (stay: Stay) => void;
};

/** A sitter card's booking action: needs dates first. */
export function RequestStayButton({ stay, onRequest }: Props) {
  if (!stay) return <span className={styles.hint}>Add dates to book</span>;
  return (
    <Button variant="secondary" onClick={() => onRequest(stay)}>
      Request to book
    </Button>
  );
}
