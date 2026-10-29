import { expect, test } from "@playwright/test";
import { bookingToday } from "@sitter/domain/booking";
import { addDays } from "@sitter/domain/calendar";

const stay = { from: addDays(bookingToday(new Date()), 14), to: addDays(bookingToday(new Date()), 17) };
const search = `/?service=boarding&lat=48.8566&lng=2.3522&from=${stay.from}&to=${stay.to}`;

test.beforeEach(async ({ page }) => {
  // External basemap availability is not part of the booking contract.
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1sAAAAASUVORK5CYII=", "base64") }));
});

test("search, quote, request, persist, confirm, and cancel", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(search);
  const card = page.getByTestId("sitter-card").first();
  await expect(card).toBeVisible();
  const name = await card.getByRole("heading").innerText();
  await card.getByRole("button", { name: "Request to book" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(name);
  const sent = page.waitForResponse((response) => response.url().endsWith("/api/bookings") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: /Send request · €/ }).click();
  const response = await sent;
  expect(response.status()).toBe(201);
  const { booking } = await response.json();
  expect(booking.quote.totalCents).toBe(booking.quote.lines[0].unitAmountCents * booking.quote.nights);
  await expect(dialog.getByText("Request sent", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("request-sent.png") });
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.reload();
  const requests = page.getByRole("region", { name: "Your booking requests" });
  await expect(requests).toContainText(name);
  await expect(requests).toContainText("Waiting for the sitter");
  await expect(page.getByTestId("sitter-card").filter({ has: page.getByRole("heading", { name, exact: true }) })).toHaveCount(0);
  await requests.getByRole("button", { name: /Confirm/ }).click();
  await expect(requests.getByText("Confirmed", { exact: true })).toBeVisible();
  await requests.getByRole("button", { name: /Cancel/ }).click();
  await expect(requests.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByTestId("sitter-card").filter({ has: page.getByRole("heading", { name, exact: true }) })).toBeVisible();
  expect(errors).toEqual([]);
});

test("empty geography fits the viewport", async ({ page }) => {
  await page.goto("/?service=boarding&lat=23.8103&lng=90.4125&location=Dhaka");
  await expect(page.getByTestId("sitter-card")).toHaveCount(0);
  await expect(page.getByText(/No sitters/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("map follows a new place and mobile view controls preserve the search", async ({ page, isMobile }) => {
  await page.goto("/?service=boarding&lat=23.8103&lng=90.4125&location=Dhaka");
  const map = page.getByRole("application", { name: "Sitter map: click to set the search location" });
  if (isMobile) {
    await expect(map).toBeHidden();
    const toggle = page.getByRole("button", { name: "Map", exact: true });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  }
  await expect(map).toBeVisible();
  await page.getByRole("button", { name: /^Where/ }).click();
  await page.getByRole("textbox", { name: "Search for a place" }).fill("48.8566, 2.3522");
  await page.getByRole("textbox", { name: "Search for a place" }).press("Enter");
  await expect(page).toHaveURL(/lat=48.8566/);
  // The selected search point must be centered in the viewport after moving from Dhaka to Paris.
  await expect.poll(async () => {
    const frame = await map.boundingBox();
    const point = await map.locator('[class*="searchMarker"]').boundingBox();
    if (!frame || !point) return false;
    return Math.abs(point.x + point.width / 2 - (frame.x + frame.width / 2)) < 3 &&
      Math.abs(point.y + point.height / 2 - (frame.y + frame.height / 2)) < 3;
  }).toBe(true);
  const url = page.url();
  const pin = map.getByRole("button", { name: /^Rank 1:/ });
  await expect(pin).toBeVisible();
  await pin.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("sitter-card").first()).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("sitter-card").first()).toBeFocused();
  if (isMobile) {
    await expect(map).toBeHidden();
    await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(map).toBeVisible();
  }
  await expect(page).toHaveURL(url);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("narrow screens fit the loaded font, navigation and booking controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(search);
  await expect(page.getByTestId("sitter-card").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(await fits()).toBe(true);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("application")).toBeVisible();
  expect(await fits()).toBe(true);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: "Request to book" }).first().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: /Send request/ })).toBeVisible();
  expect(await fits()).toBe(true);
});

test("an HTTP-compatible browser can complete a booking", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // Plain HTTP on a LAN has getRandomValues, but no randomUUID.
    Object.defineProperty(crypto, "randomUUID", { value: undefined });
  });
  await page.goto(search);
  await page.getByRole("button", { name: "Request to book" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const sent = page.waitForResponse((response) => response.url().endsWith("/api/bookings") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: /Send request · €/ }).click();
  const response = await sent;
  expect(response.status()).toBe(201);
  const { booking } = await response.json();
  await expect(dialog.getByText("Request sent", { exact: true })).toBeVisible();
  expect((await page.request.post(`/api/bookings/${booking.id}/cancel`)).status()).toBe(200);
  expect(errors).toEqual([]);
});
