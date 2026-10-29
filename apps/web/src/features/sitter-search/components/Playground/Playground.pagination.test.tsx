// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemAt } from "@sitter/domain/testing";
import { pagedApi, serveApi, sittersCalls, threeSittersApi } from "../../testing/fake-api/fake-api";
import {
  chooseService,
  names,
  renderPlayground,
  resultsStatus,
  scrollIntoView,
  setupPlaygroundTests,
} from "../../testing/playground-test-setup/playground-test-setup";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

describe("pagination", () => {
  beforeEach(() => {
    serveApi(pagedApi);
  });

  const pageButton = (n: number) => screen.getByRole("button", { name: `Page ${n}` });

  it("starts on page 1 with Previous disabled", async () => {
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));

    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
    expect(pageButton(1).getAttribute("aria-current")).toBe("page");
    expect(pageButton(2).getAttribute("aria-current")).toBeNull();
    expect((screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled).toBe(true);
    expect(sittersCalls()[0]).toContain("page=1");
  });

  it("loads page 2 with overall ranks 21–40 and scrolls back to the top of the list", async () => {
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));

    act(() => {
      fireEvent.click(pageButton(2));
    });

    await waitFor(() => expect(names()[0]).toBe("Sitter 21 Fake"));
    expect(names()).toHaveLength(20);
    expect(within(itemAt(screen.getAllByTestId("sitter-card"), 0)).getByText("21.")).toBeTruthy();
    expect(pageButton(2).getAttribute("aria-current")).toBe("page");
    expect(sittersCalls().at(-1)).toContain("page=2");
    expect(scrollIntoView).toHaveBeenCalled();
    expect(resultsStatus().textContent).toBe("Page 2 of 3, sitters 21 to 40.");
  });

  it("disables Next on the last page", async () => {
    renderPlayground();
    await waitFor(() => expect(names().length).toBe(20));

    act(() => {
      fireEvent.click(pageButton(3));
    });

    await waitFor(() => expect(names()).toEqual(["Sitter 41 Fake", "Sitter 42 Fake", "Sitter 43 Fake", "Sitter 44 Fake", "Sitter 45 Fake"]));
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("prefetches a page when its button is hovered, so clicking it needs no new request", async () => {
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));

    act(() => {
      fireEvent.mouseEnter(pageButton(3));
    });
    await waitFor(() => expect(sittersCalls().filter((url) => url.includes("page=3"))).toHaveLength(1));

    act(() => {
      fireEvent.click(pageButton(3));
    });
    await waitFor(() => expect(names()[0]).toBe("Sitter 41 Fake"));
    expect(sittersCalls().filter((url) => url.includes("page=3"))).toHaveLength(1);
  });

  it("goes back to page 1 when the search changes", async () => {
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
    act(() => {
      fireEvent.click(pageButton(2));
    });
    await waitFor(() => expect(names()[0]).toBe("Sitter 21 Fake"));

    chooseService("Boarding");

    await waitFor(() => expect(sittersCalls().at(-1)).toContain("service=boarding"));
    expect(sittersCalls().at(-1)).toContain("page=1");
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
    expect(pageButton(1).getAttribute("aria-current")).toBe("page");
  });

  it("goes back to page 1 when a weight changes (the order changes)", async () => {
    renderPlayground("/?service=dog_walking&lat=48.8566&lng=2.3522&location=Paris&page=2");
    await waitFor(() => expect(names()[0]).toBe("Sitter 21 Fake"));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /ranking weights/i }));
    });
    act(() => {
      fireEvent.change(screen.getByLabelText("Distance weight"), { target: { value: "1" } });
    });

    expect(new URLSearchParams(window.location.search).get("page")).toBeNull();
    await waitFor(() => expect(sittersCalls().at(-1)).toContain("w_distance=1"));
    expect(sittersCalls().at(-1)).toContain("page=1");
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
  });

  it("is hidden when every sitter fits on one page", async () => {
    serveApi(threeSittersApi);
    renderPlayground();
    await waitFor(() => expect(names().length).toBe(3));
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });
});
