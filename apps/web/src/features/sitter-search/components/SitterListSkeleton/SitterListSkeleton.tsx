import { Skeleton } from "@/components/Skeleton/Skeleton";
import styles from "./SitterListSkeleton.module.css";

const ROWS = 3;

type Props = {
  /** True once a request has failed and automatic retries are running. */
  slow: boolean;
};

/** Placeholder rows shaped like sitter rows, shown before the first ranking arrives. */
export function SitterListSkeleton({ slow }: Props) {
  return (
    <div data-testid="results-skeleton">
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton width={94} height={94} round />
          <div className={styles.lines}>
            <Skeleton width="45%" height={18} />
            <Skeleton width="65%" height={14} />
            <Skeleton width="55%" height={14} />
          </div>
          <Skeleton width={48} height={28} />
        </div>
      ))}
      {slow && <p className={styles.slow}>Still trying to reach the server…</p>}
    </div>
  );
}
