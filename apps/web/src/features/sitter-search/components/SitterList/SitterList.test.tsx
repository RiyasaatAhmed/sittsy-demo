// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "@sitter/domain/ranking";
import { sitterResult, sittersResponse } from "../../testing/fake-api/fake-api";
import { SitterList } from "./SitterList";

afterEach(cleanup);
it("keeps stale results visible but prevents booking their old dates while a new search loads", () => {
  const ranking = sittersResponse(new URLSearchParams("service=boarding&from=2026-11-02&to=2026-11-05"),
    DEFAULT_WEIGHTS, [sitterResult(1, "Fake sitter", 0.5, DEFAULT_WEIGHTS)], { totalCandidates: 1, totalPages: 1 });
  const props = { ranking, previous: undefined, selectedId: null, onHover: () => {}, renderAction: () => <button>Request stay</button> };
  const view = render(<SitterList {...props} busy={true} />);
  expect(screen.getByText("Fake sitter")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Request stay" })).toBeNull();
  view.rerender(<SitterList {...props} busy={false} />);
  expect(screen.getByRole("button", { name: "Request stay" })).toBeTruthy();
});
