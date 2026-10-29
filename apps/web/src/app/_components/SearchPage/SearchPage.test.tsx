// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBookingServer } from "@/features/booking/testing/fake-booking-server/fake-booking-server";
import { renderWithQueryClient } from "@/features/booking/testing/booking-test-setup/booking-test-setup";
import { threeSittersApi } from "@/features/sitter-search/testing/fake-api/fake-api";
import { installDialogPolyfill } from "@/testing/dialog-polyfill/dialog-polyfill";
import { SearchPage } from "./SearchPage";

vi.mock("@/features/sitter-search/components/SitterMap/SitterMap", () =>
  import("@/features/sitter-search/testing/fake-sitter-map/fake-sitter-map"),
);
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));

// The search and booking features together, as the page composes them, over
// fake sitter and booking APIs.
let bookings = fakeBookingServer();
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  return (await bookings.handle(url, init)) ?? threeSittersApi(url);
});
const sittersCalls = () => fetchMock.mock.calls.filter(([input]) => String(input).startsWith("/api/sitters?")).length;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-29T10:00:00Z"));
  installDialogPolyfill();
  bookings = fakeBookingServer();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderPage(url: string) {
  window.history.replaceState(null, "", url);
  return renderWithQueryClient(<SearchPage />);
}

const PARIS = "lat=48.8566&lng=2.3522&location=Paris";
const cards = () => screen.getAllByTestId("sitter-card");

describe("search → quote → booking request → status", () => {
  it("requests a stay from a result, lists it, and refreshes who is free", async () => {
    renderPage(`/?service=boarding&${PARIS}&from=2026-11-02&to=2026-11-05`);
    await waitFor(() => expect(cards()).toHaveLength(3));
    const first = cards()[0] as HTMLElement;
    const name = within(first).getByRole("heading").textContent ?? "";
    const searchesBefore = sittersCalls();

    act(() => {
      fireEvent.click(within(first).getByRole("button", { name: "Request to book" }));
    });
    const dialog = await screen.findByRole("dialog", { name: `Request a stay with ${name}` });
    const sendButton = await within(dialog).findByRole("button", { name: "Send request · €126" });
    act(() => {
      fireEvent.click(sendButton);
    });

    expect(await within(dialog).findByText("Request sent")).toBeTruthy();
    const panel = await screen.findByRole("region", { name: "Your booking requests" });
    expect(within(panel).getByText("Waiting for the sitter")).toBeTruthy();
    await waitFor(() => expect(sittersCalls()).toBeGreaterThan(searchesBefore));

    act(() => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("asks for dates before booking", async () => {
    renderPage(`/?service=boarding&${PARIS}`);
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(within(cards()[0] as HTMLElement).getByText("Add dates to book")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Request to book" })).toBeNull();
  });

  it("offers booking for boarding only", async () => {
    renderPage(`/?service=dog_walking&${PARIS}&from=2026-11-02&to=2026-11-05`);
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(screen.queryByRole("button", { name: "Request to book" })).toBeNull();
    expect(screen.queryByText("Add dates to book")).toBeNull();
  });
});
