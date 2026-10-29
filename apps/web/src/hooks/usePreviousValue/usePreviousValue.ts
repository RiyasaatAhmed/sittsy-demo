import { useState } from "react";

/**
 * The value before the most recent change (undefined until it changes once).
 * Uses React's "store information from previous renders" pattern: it updates
 * state during render when the value changes, instead of syncing in an effect.
 */
export function usePreviousValue<T>(value: T): T | undefined {
  const [history, setHistory] = useState<{ current: T; previous: T | undefined }>({
    current: value,
    previous: undefined,
  });
  if (!Object.is(value, history.current)) {
    setHistory({ current: value, previous: history.current });
  }
  return history.previous;
}
