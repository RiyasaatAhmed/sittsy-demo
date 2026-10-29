// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serveApi, sittersCalls, sittersResponse, threeSittersApi } from "../../testing/fake-api/fake-api";
import { renderPlayground, setupPlaygroundTests } from "../../testing/playground-test-setup/playground-test-setup";
import { DEFAULT_WEIGHTS } from "@sitter/domain/ranking";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

// Only Date is faked, so TanStack Query's timers still run.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-29T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const BOARDING = "/?service=boarding&lat=48.8566&lng=2.3522&location=Paris";
const lastSittersQuery = () => new URLSearchParams(sittersCalls().at(-1)?.split("?")[1]);

describe("dates in the search", () => {
  it("sends the dates to the API, and a new request when they change", async () => {
    renderPlayground(`${BOARDING}&from=2026-11-02&to=2026-11-05`);
    await waitFor(() => expect(sittersCalls()).toHaveLength(1));
    expect(lastSittersQuery().get("from")).toBe("2026-11-02");
    expect(lastSittersQuery().get("to")).toBe("2026-11-05");
    expect(await screen.findByText(/^Free November 2–5/)).toBeTruthy();

    act(() => {
      window.history.pushState(null, "", `${BOARDING}&from=2026-11-10&to=2026-11-12`);
    });
    await waitFor(() => expect(sittersCalls()).toHaveLength(2));
    expect(lastSittersQuery().get("from")).toBe("2026-11-10");
  });

  it("sends a single day as that day", async () => {
    renderPlayground("/?service=day_care&lat=48.8566&lng=2.3522&location=Paris&from=2026-11-02&to=2026-11-02");
    await waitFor(() => expect(sittersCalls()).toHaveLength(1));
    expect(lastSittersQuery().get("to")).toBe("2026-11-03");
  });

  it("searches without dates that can no longer be searched, and says so", async () => {
    renderPlayground(`${BOARDING}&from=2026-10-01&to=2026-10-03`);
    await waitFor(() => expect(sittersCalls()).toHaveLength(1));
    expect(lastSittersQuery().has("from")).toBe(false);
    expect(await screen.findByText(/These dates can no longer be searched/)).toBeTruthy();
  });

  it("says how many sitters the dates left out, and explains an empty list", async () => {
    serveApi((url) => {
      if (!url.startsWith("/api/sitters")) return threeSittersApi(url);
      const params = new URL(url, "http://localhost").searchParams;
      const body = sittersResponse(params, DEFAULT_WEIGHTS, [], { totalCandidates: 0, totalPages: 1 });
      return Response.json({ ...body, unavailableCount: 2 });
    });
    renderPlayground(`${BOARDING}&from=2026-11-02&to=2026-11-05`);

    expect(await screen.findByText("Free November 2–5 · 2 sitters hidden: away or already booked")).toBeTruthy();
    expect(screen.getByText("No sitters free on these dates")).toBeTruthy();
    expect(screen.getByText(/All 2 sitters nearby offering boarding are away or already booked/)).toBeTruthy();
  });
});
