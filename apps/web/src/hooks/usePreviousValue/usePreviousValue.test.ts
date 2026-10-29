// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePreviousValue } from "./usePreviousValue";

describe("usePreviousValue", () => {
  it("is undefined until the value changes, then holds the value before the change", () => {
    const { result, rerender } = renderHook(({ value }) => usePreviousValue(value), {
      initialProps: { value: "a" },
    });
    expect(result.current).toBeUndefined();

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    // Re-rendering with the same value keeps the last change.
    rerender({ value: "b" });
    expect(result.current).toBe("a");

    rerender({ value: "c" });
    expect(result.current).toBe("b");
  });
});
