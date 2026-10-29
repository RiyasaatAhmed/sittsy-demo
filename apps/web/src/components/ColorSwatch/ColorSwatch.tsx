import styles from "./ColorSwatch.module.css";

/** Small coloured square, the legend for a score part. */
export function ColorSwatch({ color }: { color: string }) {
  return <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />;
}
