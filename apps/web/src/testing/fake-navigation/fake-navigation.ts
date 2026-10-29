// Stand-in for `next/navigation` in UI tests, which run without the Next.js
// router. Like Next.js, it treats history.pushState / replaceState and Back /
// Forward (popstate) as URL changes and re-renders `useSearchParams` users.

import { useSyncExternalStore } from "react";

const URL_CHANGE = "test:url-change";
let historyPatched = false;

function patchHistory() {
  if (historyPatched) return;
  historyPatched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      window.dispatchEvent(new Event(URL_CHANGE));
    };
  }
}

function subscribe(onChange: () => void) {
  patchHistory();
  window.addEventListener(URL_CHANGE, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(URL_CHANGE, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return new URLSearchParams(search);
}
