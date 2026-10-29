import { describe, expect, it } from "vitest";
import { countPages, pageItems, paginate } from "./pagination";

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, index) => index + 1);

  it("returns the requested slice and the page metadata", () => {
    expect(paginate(items, 1, 20)).toMatchObject({
      items: items.slice(0, 20),
      page: 1,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
    });
    expect(paginate(items, 2, 20).items).toEqual(items.slice(20, 40));
  });

  it("returns a short last page", () => {
    expect(paginate(items, 3, 20).items).toEqual([41, 42, 43, 44, 45]);
  });

  it("returns an empty page past the end, still saying how many pages exist", () => {
    expect(paginate(items, 4, 20)).toMatchObject({ items: [], page: 4, totalPages: 3 });
  });

  it("has one (empty) page when there are no items", () => {
    expect(paginate([], 1, 20)).toMatchObject({ items: [], totalPages: 1 });
  });
});

describe("countPages", () => {
  it("rounds up and is never below 1", () => {
    expect(countPages(40, 20)).toBe(2);
    expect(countPages(41, 20)).toBe(3);
    expect(countPages(0, 20)).toBe(1);
  });
});

describe("pageItems", () => {
  it("shows every page when they fit in 7 slots", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pageItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("near the start: one gap before the last page", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, "gap-end", 10]);
    expect(pageItems(4, 10)).toEqual([1, 2, 3, 4, 5, "gap-end", 10]);
  });

  it("in the middle: gaps on both sides of the current page and its neighbours", () => {
    expect(pageItems(5, 10)).toEqual([1, "gap-start", 4, 5, 6, "gap-end", 10]);
    expect(pageItems(50, 100)).toEqual([1, "gap-start", 49, 50, 51, "gap-end", 100]);
  });

  it("near the end: one gap after the first page", () => {
    expect(pageItems(7, 10)).toEqual([1, "gap-start", 6, 7, 8, 9, 10]);
    expect(pageItems(10, 10)).toEqual([1, "gap-start", 6, 7, 8, 9, 10]);
  });

  it("always has 7 slots once there are more than 7 pages, so buttons do not jump", () => {
    for (let current = 1; current <= 12; current++) {
      const items = pageItems(current, 12);
      expect(items).toHaveLength(7);
      expect(items).toContain(current);
      expect(items[0]).toBe(1);
      expect(items.at(-1)).toBe(12);
    }
  });

  it("supports more neighbours", () => {
    expect(pageItems(10, 20, 2)).toEqual([1, "gap-start", 8, 9, 10, 11, 12, "gap-end", 20]);
  });
});
