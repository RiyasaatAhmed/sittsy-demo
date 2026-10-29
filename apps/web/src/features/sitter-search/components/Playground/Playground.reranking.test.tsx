// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { itemAt } from "@sitter/domain/testing";
import { sittersCalls } from "../../testing/fake-api/fake-api";
import {
  chooseService,
  names,
  renderPlayground,
  setupPlaygroundTests,
} from "../../testing/playground-test-setup/playground-test-setup";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

describe("AC8: changing a weight slider re-orders the list without a page reload", () => {
  it("re-fetches with the new weight and re-renders the list in the new order", async () => {
    renderPlayground();

    await waitFor(() => expect(names()).toEqual(["Anna Fake", "Chloe Fake", "Bruno Fake"]));
    const historyLength = window.history.length;
    const firstAnnaCard = screen.getAllByTestId("sitter-card")[0];

    // The sliders live behind the "Ranking weights" chip.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /ranking weights/i }));
    });
    act(() => {
      fireEvent.change(screen.getByLabelText("Distance weight"), { target: { value: "1" } });
    });

    await waitFor(() => expect(names()).toEqual(["Bruno Fake", "Anna Fake", "Chloe Fake"]));

    // The API was asked with the new weight…
    expect(sittersCalls().at(-1)).toContain("w_distance=1");

    // …the link now carries the weight, updated in place (replaceState, no new
    // history entry, so dragging a slider does not flood Back)…
    expect(new URLSearchParams(window.location.search).get("w_distance")).toBe("1");
    expect(window.history.length).toBe(historyLength);

    // …and the page was not reloaded: React kept the same DOM node for Anna
    // (keyed by id) and simply moved it.
    expect(screen.getAllByTestId("sitter-card")[1]).toBe(firstAnnaCard);

    // Rank movement is shown: Bruno moved up two places.
    expect(within(itemAt(screen.getAllByTestId("sitter-card"), 0)).getByText("▲2")).toBeTruthy();
  });

  it("compares ranks only within the same search, not across a new service", async () => {
    renderPlayground();
    await waitFor(() => expect(names().length).toBe(3));

    chooseService("Boarding");

    await waitFor(() => expect(sittersCalls().at(-1)).toContain("service=boarding"));
    // Wait for the boarding results themselves (the fake API reverses the order),
    // not the previous list that stays on screen while they load.
    await waitFor(() => expect(names()).toEqual(["Bruno Fake", "Chloe Fake", "Anna Fake"]));
    // No ▲/▼/↑in markers: a new search is not compared with the previous one.
    const markers = screen
      .getAllByTestId("sitter-card")
      .map((card) => /[▲▼]|↑in/.test(card.textContent ?? ""));
    expect(markers).toEqual([false, false, false]);
  });

  it("sends boost=false when the cold-start toggle is switched off", async () => {
    renderPlayground();
    await waitFor(() => expect(names().length).toBe(3));

    act(() => {
      fireEvent.click(screen.getByRole("checkbox"));
    });

    await waitFor(() => expect(sittersCalls().at(-1)).toContain("boost=false"));
  });
});
