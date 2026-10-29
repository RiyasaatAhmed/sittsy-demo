// @vitest-environment jsdom
import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pagedApi, serveApi, sittersCalls } from "../../testing/fake-api/fake-api";
import { names, renderPlayground, setupPlaygroundTests } from "../../testing/playground-test-setup/playground-test-setup";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

afterEach(() => {
  act(() => onlineManager.setOnline(true));
});

const resultsRegion = () => within(screen.getByRole("region", { name: "Ranked sitters" }));

/** What `fetch` does with no network: it rejects with a TypeError. */
const noNetwork = (): Response => {
  throw new TypeError("Failed to fetch");
};

/** Goes offline the way the browser reports it, and the network stops answering. */
function goOffline() {
  serveApi(noNetwork);
  act(() => onlineManager.setOnline(false));
}

describe("offline", () => {
  it("clicking a page while offline replaces the list with an offline state and Try again", async () => {
    serveApi(pagedApi);
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));

    goOffline();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    });

    const state = await resultsRegion().findByRole("alert");
    expect(within(state).getByText("You're offline")).toBeTruthy();
    expect(
      within(state).getByText("Page 2 will load when you're back online, or try again now."),
    ).toBeTruthy();
    expect(within(state).getByRole("button", { name: "Try again" })).toBeTruthy();
    // Like the reference: the stale page and the page buttons give way to the message.
    expect(screen.queryAllByTestId("sitter-card")).toHaveLength(0);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("Try again while still offline shows loading rows, then the offline state again", async () => {
    serveApi(pagedApi);
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
    goOffline();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    });
    const state = await resultsRegion().findByRole("alert");

    // The retried request fails only when the test says so.
    let failRequest: (reason: Error) => void = () => {};
    serveApi(() => new Promise<Response>((_, reject) => (failRequest = reject)));
    act(() => {
      fireEvent.click(within(state).getByRole("button", { name: "Try again" }));
    });

    expect(await screen.findByTestId("results-skeleton")).toBeTruthy();
    expect(screen.queryAllByTestId("sitter-card")).toHaveLength(0);

    act(() => failRequest(new TypeError("Failed to fetch")));
    expect(await resultsRegion().findByText("You're offline")).toBeTruthy();
    expect(screen.queryByTestId("results-skeleton")).toBeNull();
  });

  it("loads the page by itself when the connection comes back", async () => {
    serveApi(pagedApi);
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
    goOffline();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    });
    await resultsRegion().findByRole("alert");

    serveApi(pagedApi);
    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(names()[0]).toBe("Sitter 21 Fake"));
    expect(resultsRegion().queryByRole("alert")).toBeNull();
  });

  it("Try again loads the page as soon as the server answers, even if the browser still reports offline", async () => {
    serveApi(pagedApi);
    renderPlayground();
    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
    goOffline();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    });
    const notice = await resultsRegion().findByRole("alert");

    serveApi(pagedApi);
    act(() => {
      fireEvent.click(within(notice).getByRole("button", { name: "Try again" }));
    });

    await waitFor(() => expect(names()[0]).toBe("Sitter 21 Fake"));
  });

  it("still talks to a reachable API when the browser reports offline (e.g. localhost)", async () => {
    serveApi(pagedApi);
    act(() => onlineManager.setOnline(false));
    renderPlayground();

    await waitFor(() => expect(names()[0]).toBe("Sitter 1 Fake"));
    expect(sittersCalls()).toHaveLength(1);
  });

  it("first load while offline shows the offline notice instead of endless skeletons", async () => {
    goOffline();
    renderPlayground();

    const notice = await resultsRegion().findByRole("alert");
    expect(within(notice).getByText("You're offline")).toBeTruthy();
    expect(within(notice).getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
