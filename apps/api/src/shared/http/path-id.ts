/** Largest Postgres `integer`. */
const MAX_ID = 2_147_483_647;

/** A positive id from a URL path segment, or null (the caller answers 404). */
export function parsePathId(raw: string | undefined): number | null {
  if (raw === undefined || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_ID ? id : null;
}
