"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "@/components/icons/icons";
import { nightsIn, type BookingTarget } from "@sitter/domain/booking";
import { describeStay } from "../../utils/booking-labels/booking-labels";
import { RequestFlow } from "../RequestFlow/RequestFlow";
import styles from "./BookingDialog.module.css";

/** A sitter and stay the owner chose to request. */
export type StayChoice = BookingTarget & { sitterName: string };

type Props = {
  choice: StayChoice;
  onClose: () => void;
  /** Called when a booking changed who is free, so search results can refresh. */
  onAvailabilityChange?: () => void;
};

/**
 * The request flow in a modal <dialog>: the browser moves focus into it, makes
 * the page behind inert and closes it on Escape. Render it with a `key` per
 * choice, so each choice starts fresh (and gets its own Idempotency-Key).
 */
export function BookingDialog({ choice, onClose, onAvailabilityChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { sitterName, ...target } = choice;

  // Opening a modal is an imperative browser API: sync it once on mount.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          Request a stay with {sitterName}
        </h2>
        <button type="button" className={styles.close} aria-label="Close" onClick={close}>
          <CloseIcon />
        </button>
      </div>
      <p className={styles.stay}>Boarding · {describeStay(target.stay, nightsIn(target.stay))}</p>
      <RequestFlow target={target} sitterName={sitterName} onDone={close} onAvailabilityChange={onAvailabilityChange} />
      <p className={styles.fake}>Demo with fake sitters: nobody is contacted and no payment is taken.</p>
    </dialog>
  );
}
