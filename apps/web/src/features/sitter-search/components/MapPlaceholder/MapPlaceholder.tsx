import styles from "./MapPlaceholder.module.css";

/** Shown while the map code (Leaflet) downloads. */
export function MapPlaceholder() {
  return (
    <div className={styles.placeholder} role="status">
      Loading map…
    </div>
  );
}
