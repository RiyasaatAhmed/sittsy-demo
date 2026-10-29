import { useEffect, useEffectEvent, type RefObject } from "react";

export type DismissReason = "escape" | "outside";

/**
 * Calls `onDismiss` when the user presses Escape or presses the pointer down
 * outside `ref`, while `active`, saying which one happened. For popovers and dropdown panels. (An effect
 * is right here: it subscribes to document events, an external system.)
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: (reason: DismissReason) => void,
) {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!active) return;
    function onPointerDown(event: PointerEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) dismiss("outside");
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss("escape");
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, ref]);
}
