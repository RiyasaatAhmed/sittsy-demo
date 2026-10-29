// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addMonths, toIsoDate } from "@sitter/domain/calendar";
import {
  addressQueries,
  addressResponse,
  pagedApi,
  serveAddresses,
  serveApi,
  sittersCalls,
} from "../../testing/fake-api/fake-api";
import {
  chooseService,
  names,
  renderPlayground,
  setupPlaygroundTests,
  urlParams,
} from "../../testing/playground-test-setup/playground-test-setup";

vi.mock("../SitterMap/SitterMap", () => import("../../testing/fake-sitter-map/fake-sitter-map"));
vi.mock("next/navigation", () => import("@/testing/fake-navigation/fake-navigation"));
setupPlaygroundTests();

afterEach(() => {
  vi.unstubAllGlobals();
});

const segment = (label: "Service" | "Where" | "When") =>
  screen.getByRole("button", { name: new RegExp(`^${label}`) });
const lastSittersQuery = () => new URLSearchParams(sittersCalls().at(-1)?.split("?")[1]);

describe("search from the URL", () => {
  it("reads service, place and dates from a link like the reference site's", async () => {
    renderPlayground(
      "/?service=day_care&lat=46.227638&lng=2.213749&location=France&from=2026-10-29&to=2026-10-30",
    );

    expect(segment("Service").textContent).toContain("Day care");
    expect(segment("Where").textContent).toContain("France");
    expect(segment("When").textContent).toContain("October 29–30");
    await waitFor(() => expect(sittersCalls()).toHaveLength(1));
    expect(lastSittersQuery().get("service")).toBe("day_care");
    expect(lastSittersQuery().get("lat")).toBe("46.227638");
    expect(lastSittersQuery().get("lng")).toBe("2.213749");
  });

  it("shows the defaults for a plain link", () => {
    renderPlayground("/");
    expect(segment("Service").textContent).toContain("Dog walking");
    expect(segment("Where").textContent).toContain("Paris");
    expect(segment("When").textContent).toContain("Add dates");
  });
});

describe("Service", () => {
  it("lists the services in groups, marks the current one, and writes the choice to the URL", async () => {
    renderPlayground("/");
    await waitFor(() => expect(names().length).toBe(3));

    act(() => {
      fireEvent.click(segment("Service"));
    });
    const panel = screen.getByRole("dialog", { name: "Choose a service" });
    expect(within(panel).getByRole("heading", { name: "At the sitter's home" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: /^Dog walking/ }).getAttribute("aria-pressed")).toBe("true");

    const historyLength = window.history.length;
    act(() => {
      fireEvent.click(within(panel).getByRole("button", { name: /^Boarding/ }));
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(urlParams().service).toBe("boarding");
    // A new search is a new history entry, so Back returns to it.
    expect(window.history.length).toBe(historyLength + 1);
    await waitFor(() => expect(lastSittersQuery().get("service")).toBe("boarding"));
  });
});

describe("Where", () => {
  it("finds a Paris place by name and searches there", async () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    const panel = screen.getByRole("dialog", { name: "Choose a place" });
    const input = within(panel).getByRole("textbox", { name: "Search for a place" });
    expect(document.activeElement).toBe(input);

    act(() => {
      fireEvent.change(input, { target: { value: "montm" } });
    });
    act(() => {
      fireEvent.click(within(panel).getByRole("button", { name: /^Montmartre/ }));
    });

    expect(segment("Where").textContent).toContain("Montmartre");
    expect(urlParams()).toMatchObject({ location: "Montmartre", lat: "48.8867", lng: "2.3431" });
    await waitFor(() => expect(lastSittersQuery().get("lat")).toBe("48.8867"));
  });

  it("accepts typed coordinates and picks the first suggestion on Enter", () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    const input = screen.getByRole("textbox", { name: "Search for a place" });
    act(() => {
      fireEvent.change(input, { target: { value: "48.9, 2.3" } });
    });
    act(() => {
      fireEvent.submit(input);
    });

    expect(urlParams()).toMatchObject({ lat: "48.9", lng: "2.3", location: "48.9, 2.3" });
  });

  it("finds any address online and searches there", async () => {
    serveAddresses((url) =>
      new URL(url).searchParams.get("q") === "10 downing street"
        ? addressResponse([
            { name: "10 Downing Street", city: "London", country: "United Kingdom", lat: 51.5033635, lng: -0.1276248 },
          ])
        : addressResponse([]),
    );
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    const panel = screen.getByRole("dialog", { name: "Choose a place" });
    act(() => {
      fireEvent.change(within(panel).getByRole("textbox", { name: "Search for a place" }), {
        target: { value: "10 downing street" },
      });
    });
    expect(within(panel).getByRole("status").textContent).toContain("Searching addresses");

    const result = await within(panel).findByRole("button", { name: /^10 Downing Street\s*London, United Kingdom/ });
    // Typing pauses are debounced: one lookup for the whole address.
    expect(addressQueries()).toEqual(["10 downing street"]);
    act(() => {
      fireEvent.click(result);
    });

    expect(segment("Where").textContent).toContain("10 Downing Street");
    expect(urlParams()).toMatchObject({ location: "10 Downing Street", lat: "51.50336", lng: "-0.12762" });
    await waitFor(() => expect(lastSittersQuery().get("lat")).toBe("51.50336"));
  });

  it("on Enter, waits for the address lookup and picks its best match", async () => {
    serveAddresses(() => addressResponse([{ name: "Lyon", country: "France", lat: 45.7578137, lng: 4.8320114 }]));
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    const input = screen.getByRole("textbox", { name: "Search for a place" });
    act(() => {
      fireEvent.change(input, { target: { value: "lyon" } });
    });
    act(() => {
      fireEvent.submit(input);
    });

    await waitFor(() => expect(urlParams()).toMatchObject({ location: "Lyon", lat: "45.75781", lng: "4.83201" }));
  });

  it("explains when the address search cannot be reached", async () => {
    serveAddresses(() => {
      throw new TypeError("Failed to fetch");
    });
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: "Search for a place" }), {
        target: { value: "somewhere far" },
      });
    });
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't reach the address search");
  });

  it("does not search when the typed text is neither a place nor coordinates", async () => {
    renderPlayground("/");
    await waitFor(() => expect(sittersCalls()).toHaveLength(1));
    const urlBefore = window.location.search;
    act(() => {
      fireEvent.click(segment("Where"));
    });
    const input = screen.getByRole("textbox", { name: "Search for a place" });
    act(() => {
      fireEvent.change(input, { target: { value: "48.86, east" } });
    });
    act(() => {
      fireEvent.submit(input);
    });

    expect(await screen.findByText(/No matching place/)).toBeTruthy();
    expect(window.location.search).toBe(urlBefore);
    expect(screen.getByRole("dialog", { name: "Choose a place" })).toBeTruthy();
    expect(sittersCalls()).toHaveLength(1);
  });

  it("says when nothing matches", async () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: "Search for a place" }), {
        target: { value: "qwxzv" },
      });
    });
    expect(await screen.findByText(/No matching place/)).toBeTruthy();
    expect(addressQueries()).toEqual(["qwxzv"]);
  });

  it("remembers recent places in this browser", () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: "Search for a place" }), {
        target: { value: "bastille" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^Bastille/ }));
    });

    act(() => {
      fireEvent.click(segment("Where"));
    });
    const panel = screen.getByRole("dialog", { name: "Choose a place" });
    expect(within(panel).getByRole("heading", { name: "Recent" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Bastille" })).toBeTruthy();
  });

  it("uses the current position, and explains when it is not available", () => {
    const getCurrentPosition = vi.fn((onSuccess: PositionCallback) =>
      onSuccess({ coords: { latitude: 48.871, longitude: 2.36579 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Where"));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Use my current position" }));
    });
    expect(urlParams()).toMatchObject({ lat: "48.871", lng: "2.36579", location: "Current position" });

    getCurrentPosition.mockImplementation((_onSuccess: PositionCallback, onError?: PositionErrorCallback | null) =>
      onError?.({ code: 1 } as GeolocationPositionError),
    );
    act(() => {
      fireEvent.click(segment("Where"));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Use my current position" }));
    });
    expect(screen.getByRole("alert").textContent).toContain("Couldn't get your position");
  });
});

describe("When", () => {
  // It is already October 30 in Dhaka, but booking dates follow Paris (October 29).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T22:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());
  const now = new Date(2026, 9, 29);
  const next = addMonths(now.getFullYear(), now.getMonth(), 1);
  const dayLabel = (day: number) =>
    new Date(next.year, next.month, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const iso = (day: number) => toIsoDate(new Date(next.year, next.month, day));

  it("picks a start and an end day, writes them to the URL, and can clear them", () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("When"));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: dayLabel(10) }));
    });
    // Still open after the first day.
    expect(screen.getByRole("dialog", { name: "Choose dates" })).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: dayLabel(12) }));
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(urlParams()).toMatchObject({ from: iso(10), to: iso(12) });
    expect(segment("When").textContent).not.toContain("Add dates");

    act(() => {
      fireEvent.click(segment("When"));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
    });
    expect(urlParams().from).toBeUndefined();
    expect(segment("When").textContent).toContain("Add dates");
  });

  it("does not offer past days", () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("When"));
    });
    expect(
      (screen.getByRole("button", { name: "Previous month" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole("button", { name: "Wednesday, October 28" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Thursday, October 29" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("panels", () => {
  it("close on Escape, returning focus to their segment, and on a click outside", () => {
    renderPlayground("/");
    act(() => {
      fireEvent.click(segment("Service"));
    });
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(segment("Service"));

    act(() => {
      fireEvent.click(segment("When"));
    });
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("history", () => {
  it("Back returns to the previous search", async () => {
    renderPlayground("/");
    await waitFor(() => expect(names().length).toBe(3));
    chooseService("Boarding");
    expect(segment("Service").textContent).toContain("Boarding");

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(segment("Service").textContent).toContain("Dog walking"));
  });

  it("keeps the page in the URL, and a shared link opens on that page", async () => {
    serveApi(pagedApi);
    renderPlayground("/?service=dog_walking&lat=48.8566&lng=2.3522&location=Paris&page=2");

    await waitFor(() => expect(names()[0]).toBe("Sitter 21 Fake"));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    });
    expect(urlParams().page).toBe("3");
    await waitFor(() => expect(names()[0]).toBe("Sitter 41 Fake"));
  });

  it("clicking the map searches there", async () => {
    renderPlayground("/");
    await waitFor(() => expect(names().length).toBe(3));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Click the map" }));
    });
    expect(urlParams()).toMatchObject({ lat: "48.9", lng: "2.3", location: "Pinned on the map" });
    expect(segment("Where").textContent).toContain("Pinned on the map");
  });
});
