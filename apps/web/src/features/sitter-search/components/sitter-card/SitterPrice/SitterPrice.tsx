import type { Service } from "@sitter/domain/sitter";
import { SERVICE_UNITS } from "../../../utils/labels/labels";
import styles from "./SitterPrice.module.css";

type Props = { priceEur: number | null; service: Service };

export function SitterPrice({ priceEur, service }: Props) {
  return (
    <div className={styles.price}>
      <span className={styles.amount}>{priceEur === null ? "–" : `€${priceEur}`}</span>
      <span className={styles.unit}>{SERVICE_UNITS[service]}</span>
    </div>
  );
}
