/** Result of parsing untrusted input: the value, or every problem found. */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };
