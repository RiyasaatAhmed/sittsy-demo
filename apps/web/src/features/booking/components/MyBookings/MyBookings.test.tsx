// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient, setupBookingTests } from "../../testing/booking-test-setup/booking-test-setup";
import { MyBookings } from "./MyBookings";

const { server } = setupBookingTests();

/** Records a request on the fake server, as the dialog would. */
async function bookSitter(sitterId: number) {
  await fetch("/api/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": `key-${sitterId}-0000` },
    body: JSON.stringify({ sitterId, service: "boarding", from: "2026-11-02", to: "2026-11-05", expectedTotalCents: 12600 }),
  });
}

const item = async (name: string) => (await screen.findByText(name)).closest("li") as HTMLElement;
const click = (element: HTMLElement) =>
  act(() => {
    fireEvent.click(element);
  });

describe("MyBookings", () => {
  it("shows nothing before the first request", async () => {
    const { container } = renderWithQueryClient(<MyBookings />);
    await act(async () => {});
    expect(container.textContent).toBe("");
  });

  it("lists the requests from the server, so their status survives a reload", async () => {
    await bookSitter(7);
    renderWithQueryClient(<MyBookings />);
    const row = await item("Sitter 7 Fake");
    expect(within(row).getByText("Waiting for the sitter")).toBeTruthy();
    expect(within(row).getByText("Boarding · November 2–5 · 3 nights · €126")).toBeTruthy();

    click(within(row).getByRole("button", { name: "Confirm" }));
    expect(await within(row).findByText("Confirmed")).toBeTruthy();

    // A reload: a new page with an empty cache asks the server again.
    cleanup();
    renderWithQueryClient(<MyBookings />);
    const reloaded = await item("Sitter 7 Fake");
    expect(within(reloaded).getByText("Confirmed")).toBeTruthy();
    expect(within(reloaded).getByRole("button", { name: "Cancel booking" })).toBeTruthy();
    expect(within(reloaded).queryByRole("button", { name: "Confirm" })).toBeNull();
  });

  it("cancels a request and frees the dates", async () => {
    await bookSitter(7);
    const onAvailabilityChange = vi.fn();
    renderWithQueryClient(<MyBookings onAvailabilityChange={onAvailabilityChange} />);
    const row = await item("Sitter 7 Fake");

    click(within(row).getByRole("button", { name: "Cancel request" }));

    expect(await within(row).findByText("Cancelled")).toBeTruthy();
    expect(within(row).queryByRole("button")).toBeNull();
    expect(onAvailabilityChange).toHaveBeenCalled();
    expect(server().state.bookings[0]?.status).toBe("cancelled");
  });

  it("shows the current status and why, when a change is refused", async () => {
    await bookSitter(7);
    renderWithQueryClient(<MyBookings />);
    const row = await item("Sitter 7 Fake");
    // Meanwhile the sitter declined (e.g. from another tab).
    server().state.bookings[0]!.status = "declined";

    click(within(row).getByRole("button", { name: "Cancel request" }));

    expect(await within(row).findByRole("alert")).toHaveProperty("textContent", "This booking is declined.");
    expect(within(row).getByText("Declined")).toBeTruthy();
  });
});
