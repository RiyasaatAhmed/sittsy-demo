import { ClockIcon, PinIcon, ShieldIcon, SparkIcon, StarIcon } from "@/components/icons/icons";
import { cx } from "@/utils/cx/cx";
import { Tag } from "@/components/Tag/Tag";
import type { SitterResult } from "@sitter/domain/contract";
import { RANKING_CONSTANTS } from "@sitter/domain/ranking";
import styles from "./SitterFacts.module.css";

type Props = { sitter: SitterResult };

/** Rating (or "New"), distance and reply time, and the profile tags. */
export function SitterFacts({ sitter }: Props) {
  const isNew = sitter.ageDays < RANKING_CONSTANTS.COLD_START_DAYS;

  return (
    <>
      <p className={styles.line}>
        {isNew && (
          <>
            <SparkIcon tone="muted" />
            <span>New</span>
            {sitter.ratingCount > 0 && <span> · </span>}
          </>
        )}
        {sitter.ratingAverage === null ? (
          !isNew && <span>No reviews yet</span>
        ) : (
          <>
            <StarIcon tone="star" />
            <strong>{sitter.ratingAverage.toFixed(1)}</strong>
            <span> · {sitter.ratingCount} reviews</span>
          </>
        )}
      </p>

      <p className={styles.line}>
        <PinIcon tone="muted" />
        {sitter.distanceKm.toFixed(1)} km away
        <span className={styles.dot}>·</span>
        <ClockIcon tone="muted" />
        replies in ~{sitter.medianResponseMinutes} min
      </p>

      <p className={cx(styles.line, styles.tags)}>
        <Tag>fake profile</Tag>
        {sitter.identityVerified ? (
          <Tag variant="verified">
            <ShieldIcon />
            ID verified
          </Tag>
        ) : (
          <Tag variant="warning">not verified</Tag>
        )}
      </p>
    </>
  );
}
