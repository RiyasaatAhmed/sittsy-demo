"use client";

import { useState } from "react";
import { SlidersIcon } from "@/components/icons/icons";
import type { PartName, Weights } from "@sitter/domain/ranking";
import { WeightSliders } from "../WeightSliders/WeightSliders";
import { cx } from "@/utils/cx/cx";
import styles from "./FilterBar.module.css";

type Props = {
  weights: Weights;
  coldStartBoost: boolean;
  /** How many fake sitters offer the service (0 until the first answer). */
  totalCandidates: number;
  onWeightChange: (part: PartName, value: number) => void;
  onResetWeights: () => void;
  onColdStartBoostChange: (on: boolean) => void;
};

/** Chips under the header: weight sliders toggle, cold-start boost, reset, and the fake-data note. */
export function FilterBar({
  weights,
  coldStartBoost,
  totalCandidates,
  onWeightChange,
  onResetWeights,
  onColdStartBoostChange,
}: Props) {
  const [showWeights, setShowWeights] = useState(false);

  return (
    <>
      <div className={styles.chips}>
        <button
          type="button"
          className={cx(styles.chip, styles.chipFilter, showWeights && styles.chipOn)}
          aria-expanded={showWeights}
          onClick={() => setShowWeights((shown) => !shown)}
        >
          <SlidersIcon />
          Ranking weights
        </button>
        <span className={styles.divider} aria-hidden="true" />
        <label className={cx(styles.chip, coldStartBoost && styles.chipOn)}>
          <input
            type="checkbox"
            checked={coldStartBoost}
            onChange={(event) => onColdStartBoostChange(event.target.checked)}
          />
          Cold-start boost {coldStartBoost ? "on" : "off"}
        </label>
        <button type="button" className={styles.chip} onClick={onResetWeights}>
          Reset weights
        </button>
        <span className={styles.fakeNote} role="note">
          {totalCandidates} fake sitters · all data invented
        </span>
      </div>
      {showWeights && <WeightSliders weights={weights} onChange={onWeightChange} />}
    </>
  );
}
