/** Number(" ") is 0 and Number("1e3") is 1000, so only plain decimals are accepted. */
const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Reads a plain decimal like "48.85" or "-2". Anything else is undefined. */
export function parseDecimal(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = raw.trim();
  if (!DECIMAL.test(text)) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}
