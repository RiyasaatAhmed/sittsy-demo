import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api-error/api-error";
import { getJson, postJson } from "./http-client";

const fetchMock = vi.fn<typeof fetch>();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("http client", () => {
  it("posts JSON with extra headers and reads the JSON answer", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(Response.json({ booking: { id: 1 } }, { status: 201 }));

    await expect(postJson("/api/bookings", { sitterId: 1 }, { "Idempotency-Key": "k" })).resolves.toEqual({ booking: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledWith("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "k" },
      body: '{"sitterId":1}',
    });
  });

  it("keeps the status, a readable message and the error body", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(Response.json({ error: "Taken", code: "unavailable" }, { status: 409 }));

    const error = await postJson("/api/bookings").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "Taken", body: { error: "Taken", code: "unavailable" } });
  });

  it("joins the details into the message, and copes with a body that is not JSON", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Invalid", details: ["a", "b"] }, { status: 400 }));
    await expect(getJson("/api/x")).rejects.toThrow("Invalid — a — b");

    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    await expect(getJson("/api/x")).rejects.toMatchObject({ message: "Request failed (502)", body: undefined });
  });
});
