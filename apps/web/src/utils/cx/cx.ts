/** Joins class names, skipping empty ones: cx("a", isOn && "b") → "a b" or "a". */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
