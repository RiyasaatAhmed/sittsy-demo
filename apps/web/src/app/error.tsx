"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState/ErrorState";
import styles from "./error.module.css";

/**
 * Route-level error boundary: catches anything the panel boundaries did not.
 * `retry()` re-fetches and re-renders the page segment.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // The place to report to an error tracking service.
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Something went wrong</h1>
      <ErrorState title="This page could not be shown" onRetry={retry} />
    </main>
  );
}
