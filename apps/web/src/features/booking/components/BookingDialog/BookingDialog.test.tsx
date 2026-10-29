// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient, setupBookingTests } from "../../testing/booking-test-setup/booking-test-setup";
import { quoteStay } from "@sitter/domain/booking";
import { bookingQueries } from "../../api/queries/queries";
import { BookingDialog, type StayChoice } from "./BookingDialog";

const { server } = setupBookingTests();

const choice: StayChoice = {
  sitterId: 7,
  sitterName: "Sitter 7 Fake",
  service: "boarding",
  stay: { checkIn: "2026-11-02", checkOut: "2026-11-05" },
};

function renderDialog() {
  const onClose = vi.fn();
  const onAvailabilityChange = vi.fn();
  const { client } = renderWithQueryClient(<BookingDialog choice={choice} onClose={onClose} onAvailabilityChange={onAvailabilityChange} />);
  return { client, onClose, onAvailabilityChange };
}

const send = async () => {
  const button = await screen.findByRole("button", { name: /^Send request/ });
  act(() => {
    fireEvent.click(button);
  });
};

describe("BookingDialog", () => {
  it("preserves the original payload when a quote refreshes after a lost response", async () => {
    const { client } = renderDialog();
    server().state.loseResponses = 3;
    await send();
    await screen.findByText("Couldn't send the request");
    act(() => {
      client.setQueryData(bookingQueries.quote({ sitterId: choice.sitterId, service: choice.service, stay: choice.stay }).queryKey, {
        sitterId: choice.sitterId, sitterName: choice.sitterName, service: choice.service,
        ...choice.stay, quote: quoteStay(45, choice.stay), available: true,
      });
    });
    await screen.findByText("3 nights × €45");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    await screen.findByText("Request sent");
    const posts = server().state.posts;
    expect(posts).toHaveLength(4);
    expect(posts[3]).toEqual(posts[0]);
  });
  it("shows the server's itemised quote, sends the request and shows what was recorded", async () => {
    const { onAvailabilityChange } = renderDialog();
    expect(screen.getByRole("dialog", { name: "Request a stay with Sitter 7 Fake" })).toBeTruthy();
    expect(screen.getByText("Boarding · November 2–5 · 3 nights")).toBeTruthy();
    expect(await screen.findByText("3 nights × €42")).toBeTruthy();

    await send();

    expect(await screen.findByText("Request sent")).toBeTruthy();
    expect(screen.getByText("Waiting for the sitter")).toBeTruthy();
    expect(screen.getByText("The sitter has until Oct 30, 11:00 (Paris time) to answer.")).toBeTruthy();
    expect(server().state.posts).toEqual([
      {
        key: expect.stringMatching(/^[0-9a-f]{32}$/),
        body: { sitterId: 7, service: "boarding", from: "2026-11-02", to: "2026-11-05", expectedTotalCents: 12600 },
      },
    ]);
    expect(onAvailabilityChange).toHaveBeenCalled();
  });

  it("records one booking when the answer is lost and the request is retried", async () => {
    renderDialog();
    server().state.loseResponses = 1;
    await send();

    expect(await screen.findByText("Request sent")).toBeTruthy();
    const { posts, bookings } = server().state;
    expect(posts).toHaveLength(2);
    expect(posts[1]?.key).toBe(posts[0]?.key);
    expect(bookings).toHaveLength(1);
  });

  it("offers Try again after every attempt failed, with the same key", async () => {
    renderDialog();
    server().state.failRequests = 3; // the first attempt and both automatic retries
    await send();

    expect(await screen.findByText("Couldn't send the request")).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findByText("Request sent")).toBeTruthy();
    const keys = new Set(server().state.posts.map((post) => post.key));
    expect(server().state.posts).toHaveLength(4);
    expect(keys.size).toBe(1);
  });

  it("shows the new total when the price changed, and sends again at that price", async () => {
    renderDialog();
    await screen.findByText("3 nights × €42");
    server().state.nightlyRateEur = 45;
    await send();

    expect(await screen.findByText("The price changed")).toBeTruthy();
    expect(screen.getByText("3 nights × €45")).toBeTruthy();
    expect(server().state.bookings).toHaveLength(0);

    await send();
    expect(await screen.findByText("Request sent")).toBeTruthy();
    const [first, second] = server().state.posts;
    expect(second?.body.expectedTotalCents).toBe(13500);
    expect(second?.key).not.toBe(first?.key);
  });

  it("explains a lost availability race and refreshes the search", async () => {
    const { onAvailabilityChange } = renderDialog();
    await screen.findByText("3 nights × €42");
    server().state.unavailable.add(7);
    await send();

    expect(await screen.findByText("Not available for these dates")).toBeTruthy();
    expect(screen.getByText("This sitter is no longer available for these dates.")).toBeTruthy();
    expect(onAvailabilityChange).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Send request/ })).toBeNull();
  });

  it("does not offer to send when the quote says the sitter is not free", async () => {
    server().state.unavailable.add(7);
    renderDialog();
    expect(await screen.findByText("Not available for these dates")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Send request/ })).toBeNull();
  });

  it("closes with the close button", async () => {
    const { onClose } = renderDialog();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
