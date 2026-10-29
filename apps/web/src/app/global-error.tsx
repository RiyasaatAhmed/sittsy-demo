"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import styles from "./global-error.module.css";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it renders its own <html> and <body> and depends on nothing
 * else in the app.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className={styles.body}>
        <title>Something went wrong · Sitter Ranking</title>
        <main className={styles.page} role="alert">
          <h1>Something went wrong</h1>
          <p>The page could not be loaded.</p>
          <button type="button" className={styles.button} onClick={() => retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
