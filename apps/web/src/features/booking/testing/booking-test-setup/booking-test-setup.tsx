// Shared setup for the booking UI tests: a fake booking server behind a
// mocked fetch, the <dialog> stand-in, and rendering with a fresh query cache.

import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client/query-client";
import { installDialogPolyfill } from "@/testing/dialog-polyfill/dialog-polyfill";
import { fakeBookingServer, type FakeBookingServer } from "../fake-booking-server/fake-booking-server";

/** Registers the per-test reset; `server()` is the current test's fake server. */
export function setupBookingTests() {
  let current: FakeBookingServer = fakeBookingServer();
  beforeEach(() => {
    installDialogPolyfill();
    current = fakeBookingServer();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await current.handle(String(input), init);
        if (!response) throw new Error(`Unexpected request: ${String(input)}`);
        return response;
      }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  return { server: () => current };
}

/** Renders with the app's query defaults, minus the retry delays. */
export function renderWithQueryClient(ui: ReactElement) {
  const client = makeQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, retryDelay: 0 },
    mutations: { ...defaults.mutations, retryDelay: 0 },
  });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}
