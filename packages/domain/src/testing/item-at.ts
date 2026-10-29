/**
 * `items[index]`, failing the test with a clear message when it is missing.
 * Tests use this instead of `items[index]!` under `noUncheckedIndexedAccess`.
 */
export function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Expected an item at index ${index}, but the list has ${items.length}`);
  }
  return item;
}
