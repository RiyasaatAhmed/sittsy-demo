import type { Service } from "@sitter/domain/sitter";
import { SEARCH_RADIUS_KM } from "@sitter/domain/search";
import { SERVICE_LABELS } from "../../utils/labels/labels";
import styles from "./EmptyResults.module.css";

type Props = {
  service: Service;
  /** Nearby sitters left out because they are away or booked on the dates. */
  unavailableCount: number;
  page: number;
  onBackToFirstPage: () => void;
};

/** Shown when a search succeeds but has nobody to show. */
export function EmptyResults({ service, unavailableCount, page, onBackToFirstPage }: Props) {
  if (page > 1) {
    return (
      <div className={styles.empty}>
        <p className={styles.title}>No sitters on this page</p>
        <button type="button" className={styles.action} onClick={onBackToFirstPage}>
          Back to page 1
        </button>
      </div>
    );
  }
  if (unavailableCount > 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.title}>No sitters free on these dates</p>
        <p>
          {unavailableCount === 1 ? "The 1 sitter" : `All ${unavailableCount} sitters`} nearby offering{" "}
          {SERVICE_LABELS[service].toLowerCase()} {unavailableCount === 1 ? "is" : "are"} away or already
          booked. Try other dates.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <p className={styles.title}>No sitters found</p>
      <p>
        No fake sitters offer {SERVICE_LABELS[service].toLowerCase()} within {SEARCH_RADIUS_KM[service]} km
        of this location. Try another service or search around Paris, where the demo sitters live.
      </p>
    </div>
  );
}
