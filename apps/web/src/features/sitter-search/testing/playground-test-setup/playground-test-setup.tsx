// Shared setup for the Playground UI tests. Each test file must also mock the
// map and the router (vi.mock calls only work in the test file itself):
//   vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
//   vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));

import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client/query-client";
import { Playground } from "../../components/Playground/Playground";
import { fakeMap } from "../fake-sitter-map/fake-sitter-map";
import { fetchMock, serveAddresses, serveApi, threeSittersApi } from "../fake-api/fake-api";

/** jsdom does not implement scrolling, so calls are recorded instead. */
export const scrollIntoView = vi.fn();

/** Registers the per-test reset: fresh fetch mock, fake API and address search, scrolling and map. */
export function setupPlaygroundTests() {
  beforeEach(() => {
    fetchMock.mockReset();
    serveApi(threeSittersApi);
    serveAddresses();
    scrollIntoView.mockClear();
    fakeMap.crash = false;
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
}

/**
 * Renders the playground at `url` with a fresh query cache (no test sees
 * another test's data) and the app's real query defaults, minus the retry delay.
 */
export function renderPlayground(url = "/") {
  window.history.replaceState(null, "", url);
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } });
  render(
    <QueryClientProvider client={client}>
      <Playground />
    </QueryClientProvider>,
  );
  return { client };
}

/** Names of the sitters in the list, top to bottom. */
export function names(): string[] {
  return screen
    .getAllByTestId("sitter-card")
    .map((card) => within(card).getByRole("heading").textContent ?? "");
}

/** The results' live region (the map placeholder has its own status). */
export function resultsStatus(): HTMLElement {
  return within(screen.getByRole("region", { name: "Ranked sitters" })).getByRole("status");
}

/** Opens the Service picker and chooses `label` (e.g. "Boarding"). */
export function chooseService(label: string) {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /^Service/ }));
  });
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
  });
}

/** The current URL's query, as an object, to compare with expectations. */
export function urlParams(): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}
