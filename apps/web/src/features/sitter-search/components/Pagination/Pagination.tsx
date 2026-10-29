"use client";

import { pageItems } from "@sitter/domain/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/icons";
import styles from "./Pagination.module.css";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Called when a page button is hovered or focused, to load that page early. */
  onPrefetch: (page: number) => void;
};

/**
 * Previous / numbered pages / next. Buttons (not links) because the page lives
 * in React state, not in the URL. Hidden when everything fits on one page.
 */
export function Pagination({ page, totalPages, onChange, onPrefetch }: Props) {
  if (totalPages <= 1) return null;

  // Props for a button that goes to `target`: click to go, hover or focus to prefetch.
  const goTo = (target: number) => ({
    onClick: () => onChange(target),
    onMouseEnter: () => onPrefetch(target),
    onFocus: () => onPrefetch(target),
  });

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.button}
        aria-label="Previous page"
        disabled={page <= 1}
        {...goTo(page - 1)}
      >
        <ChevronLeftIcon />
      </button>

      <ul className={styles.pages}>
        {pageItems(page, totalPages).map((item) =>
          typeof item === "number" ? (
            <li key={item}>
              <button
                type="button"
                className={styles.button}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                {...goTo(item)}
              >
                {item}
              </button>
            </li>
          ) : (
            // The gap is decoration: screen readers already hear each page number.
            <li key={item} className={styles.gap} aria-hidden="true">
              …
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className={styles.button}
        aria-label="Next page"
        disabled={page >= totalPages}
        {...goTo(page + 1)}
      >
        <ChevronRightIcon />
      </button>
    </nav>
  );
}
