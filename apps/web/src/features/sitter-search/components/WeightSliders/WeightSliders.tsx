"use client";

import type { CSSProperties } from "react";
import { PART_NAMES, type PartName, type Weights } from "@sitter/domain/ranking";
import { PART_COLORS, PART_LABELS } from "../../utils/labels/labels";
import { ColorSwatch } from "@/components/ColorSwatch/ColorSwatch";
import styles from "./WeightSliders.module.css";

type Props = {
  weights: Weights;
  onChange: (part: PartName, value: number) => void;
};

export function WeightSliders({ weights, onChange }: Props) {
  return (
    <fieldset className={styles.weights}>
      <legend className="visually-hidden">Ranking weights</legend>
      {PART_NAMES.map((part) => (
        <label key={part} className={styles.slider}>
          <span className={styles.head}>
            <ColorSwatch color={PART_COLORS[part]} />
            {PART_LABELS[part]}
            <output>{weights[part].toFixed(2)}</output>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights[part]}
            aria-label={`${PART_LABELS[part]} weight`}
            // CSS custom properties are not in React's CSSProperties type, hence the cast.
            style={
              {
                "--slider-color": PART_COLORS[part],
                "--slider-fill": `${weights[part] * 100}%`,
              } as CSSProperties
            }
            onChange={(event) => onChange(part, Number(event.target.value))}
          />
        </label>
      ))}
    </fieldset>
  );
}
