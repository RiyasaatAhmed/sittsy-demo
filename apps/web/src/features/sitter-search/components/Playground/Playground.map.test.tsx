// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { itemAt } from "@sitter/domain/testing";
import { names, renderPlayground, scrollIntoView, setupPlaygroundTests } from "../../testing/playground-test-setup/playground-test-setup";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

describe("clicking a pin on the map", () => {
  it("scrolls the list to that sitter and highlights their row", async () => {
    renderPlayground();
    await waitFor(() => expect(names()).toEqual(["Anna Fake", "Chloe Fake", "Bruno Fake"]));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Pin 2" }));
    });

    const chloeCard = itemAt(screen.getAllByTestId("sitter-card"), 1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(chloeCard);
    expect(chloeCard.getAttribute("aria-current")).toBe("true");
    // CSS Modules class names are hashed in tests as `_selected_<hash>`.
    expect(chloeCard.className).toMatch(/_selected_/);

    // Only one row is highlighted at a time.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Pin 1" }));
    });
    const highlighted = screen
      .getAllByTestId("sitter-card")
      .filter((card) => card.getAttribute("aria-current") === "true");
    expect(highlighted.map((card) => within(card).getByRole("heading").textContent)).toEqual([
      "Anna Fake",
    ]);
  });
});
