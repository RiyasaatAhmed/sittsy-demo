// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WEIGHTS } from "@sitter/domain/ranking";
import { MAX_RETRIES } from "@/lib/retry-policy/retry-policy";
import {
  errorResponse,
  serveApi,
  sittersCalls,
  sittersResponse,
  threeSittersApi,
} from "../../testing/fake-api/fake-api";
import { fakeMap } from "../../testing/fake-sitter-map/fake-sitter-map";
import {
  names,
  renderPlayground,
  resultsStatus,
  setupPlaygroundTests,
} from "../../testing/playground-test-setup/playground-test-setup";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

const databaseDown = () =>
  errorResponse(503, "Database unavailable. Run `docker compose up -d` and `npm run db:seed`, then retry.");
/** A request that never answers, to look at the loading state. */
const never = () => new Promise<Response>(() => {});
const resultsRegion = () => screen.getByRole("region", { name: "Ranked sitters" });

/** The API is down for /api/sitters only; other requests still work. */
function sittersDown(url: string) {
  return url.startsWith("/api/sitters") ? databaseDown() : threeSittersApi(url);
}

describe("loading", () => {
  it("shows skeleton rows and announces loading before the first answer", async () => {
    serveApi(never);
    renderPlayground();

    expect(screen.getByTestId("results-skeleton")).toBeTruthy();
    expect(resultsStatus().textContent).toBe("Loading sitters…");
  });

  it("says it is still trying while automatic retries run", async () => {
    let attempts = 0;
    serveApi((url) => {
      if (!url.startsWith("/api/sitters")) return threeSittersApi(url);
      attempts += 1;
      return attempts === 1 ? databaseDown() : never();
    });
    renderPlayground();

    await waitFor(() => expect(resultsStatus().textContent).toBe("Still trying to reach the server…"));
    expect(
      within(screen.getByTestId("results-skeleton")).getByText("Still trying to reach the server…"),
    ).toBeTruthy();
  });
});

describe("errors", () => {
  it("after the automatic retries, shows the error with Try again, which recovers", async () => {
    serveApi(sittersDown);
    renderPlayground();

    const alert = await within(resultsRegion()).findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load sitters");
    expect(alert.textContent).toContain("Database unavailable");
    // The first attempt plus MAX_RETRIES automatic retries.
    expect(sittersCalls()).toHaveLength(1 + MAX_RETRIES);

    serveApi(threeSittersApi);
    act(() => {
      fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    });

    await waitFor(() => expect(names()).toEqual(["Anna Fake", "Chloe Fake", "Bruno Fake"]));
    expect(within(resultsRegion()).queryByRole("alert")).toBeNull();
  });

  it("shows the 400 message at once, without retrying or offering Try again", async () => {
    // An out-of-range latitude in a shared link reaches the API, which explains the range.
    renderPlayground("/?service=dog_walking&lat=95&lng=2.35&location=Nowhere");

    const alert = await within(resultsRegion()).findByRole("alert");
    expect(alert.textContent).toContain("lat must be between -90 and 90");
    expect(within(alert).queryByRole("button", { name: "Try again" })).toBeNull();
    expect(sittersCalls().filter((url) => url.startsWith("/api/sitters?lat=95"))).toHaveLength(1);
  });

  it("keeps the list on screen when a refresh fails, with a banner to try again", async () => {
    const { client } = renderPlayground();
    await waitFor(() => expect(names().length).toBe(3));

    serveApi(sittersDown);
    await act(() => client.refetchQueries({ queryKey: ["sitters", "ranking"] }));

    const banner = await within(resultsRegion()).findByRole("alert");
    expect(banner.textContent).toContain("Couldn't update the results");
    // Data first: the last good list is still there.
    expect(names()).toEqual(["Anna Fake", "Chloe Fake", "Bruno Fake"]);

    serveApi(threeSittersApi);
    act(() => {
      fireEvent.click(within(banner).getByRole("button", { name: "Try again" }));
    });
    await waitFor(() => expect(within(resultsRegion()).queryByRole("alert")).toBeNull());
  });

  it("keeps a map crash inside the map column, with Try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeMap.crash = true;
    renderPlayground();

    const mapAlert = await screen.findByText("The map could not be shown");
    // The rest of the page still works.
    await waitFor(() => expect(names().length).toBe(3));

    fakeMap.crash = false;
    act(() => {
      const notice = mapAlert.closest<HTMLElement>("[role=alert]");
      if (!notice) throw new Error("The map error is not inside an alert");
      fireEvent.click(within(notice).getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findByRole("button", { name: "Pin 1" })).toBeTruthy();
    vi.mocked(console.error).mockRestore();
  });
});

describe("empty results", () => {
  it("explains that nobody offers the service", async () => {
    serveApi((url) =>
      url.startsWith("/api/sitters")
        ? Response.json(
            sittersResponse(new URL(url, "http://localhost").searchParams, DEFAULT_WEIGHTS, [], {
              totalCandidates: 0,
              totalPages: 1,
            }),
          )
        : threeSittersApi(url),
    );
    renderPlayground();

    expect(await within(resultsRegion()).findByText("No sitters found")).toBeTruthy();
    expect(resultsStatus().textContent).toBe("No sitters found.");
    expect(screen.queryByTestId("sitter-card")).toBeNull();
  });
});

describe("what the search page leaves out", () => {
  it("shows no listed-prices section and no links to the demo pages", async () => {
    renderPlayground();
    await waitFor(() => expect(names().length).toBe(3));

    expect(screen.queryByRole("region", { name: "Listed prices" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Demo guide →" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Compare ranking policies →" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Demo activity →" })).toBeNull();
  });
});
