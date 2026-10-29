"use client";

import { useState } from "react";
import { SparkIcon } from "@/components/icons/icons";
import { cx } from "@/utils/cx/cx";
import { Tag } from "@/components/Tag/Tag";
import styles from "./SitterOverview.module.css";

/** Overview paragraph, clamped to three lines until "Show more" is clicked. */
export function SitterOverview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={styles.overview}>
      <p className={styles.title}>
        <SparkIcon tone="accent" />
        Overview
        <Tag className={styles.sampleTag}>sample text</Tag>
      </p>
      <p className={cx(styles.text, !expanded && styles.clamped)}>{text}</p>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </section>
  );
}
