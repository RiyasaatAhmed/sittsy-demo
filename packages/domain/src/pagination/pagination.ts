// Offset pagination helpers. Pure functions, used by the API (which page of the
// ranking to return) and by the UI (which page buttons to show).

export type Page<T> = {
  items: T[];
  /** 1-based page number that was asked for. */
  page: number;
  pageSize: number;
  totalItems: number;
  /** At least 1, so "page 1 of 1" is shown even when there are no items. */
  totalPages: number;
};

export function countPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

/**
 * Returns one page of `items`. A page past the end is not an error: it comes
 * back empty, with `totalPages` so the caller can offer a way back.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: countPages(items.length, pageSize),
  };
}

/** What a pagination bar shows in each slot: a page number or a gap ("…"). */
export type PageItem = number | "gap-start" | "gap-end";

/**
 * The page buttons to show, e.g. for page 5 of 10:
 * `[1, "gap-start", 4, 5, 6, "gap-end", 10]`.
 *
 * Always shows the first page, the last page, the current page and
 * `siblings` pages on each side of it. When there are too many pages, gaps
 * replace the rest. The number of slots stays the same as you move through the
 * pages (7 with the default of one sibling), so the buttons do not jump around.
 */
export function pageItems(current: number, totalPages: number, siblings = 1): PageItem[] {
  // first + last + current + siblings on both sides + two gaps
  const slots = 2 * siblings + 5;
  if (totalPages <= slots) return range(1, totalPages);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, totalPages);
  // A gap only makes sense when it hides at least 2 pages; otherwise show them.
  const gapAtStart = left > 3;
  const gapAtEnd = right < totalPages - 2;
  // Slots on the side without a gap: first/last + current + siblings + the gap's slot.
  const sideCount = 2 * siblings + 3;

  if (!gapAtStart) return [...range(1, sideCount), "gap-end", totalPages];
  if (!gapAtEnd) return [1, "gap-start", ...range(totalPages - sideCount + 1, totalPages)];
  return [1, "gap-start", ...range(left, right), "gap-end", totalPages];
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
