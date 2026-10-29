import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WEIGHTS } from "@sitter/domain/ranking";
import { ApiError } from "@/lib/api-error/api-error";
import { fetchSitters } from "./sitters-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSitters", () => {
  const search = {
    lat: 48.8566,
    lng: 2.3522,
    service: "dog_walking" as const,
    limit: 20,
    page: 2,
    weights: DEFAULT_WEIGHTS,
    coldStartBoost: true,
    stay: null,
  };

  it("requests the right URL, passes the abort signal and returns the JSON body", async () => {
    const fetchMock = vi.fn(async () => Response.json({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    await expect(fetchSitters(search, signal)).resolves.toEqual({ results: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/sitters\?lat=48\.8566&lng=2\.3522&service=dog_walking&limit=20&page=2&/),
      { signal },
    );
  });

  it("throws an ApiError with the status and every validation message on a 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "Invalid query parameters", details: ["lat is required", "service is required"] },
          { status: 400 },
        ),
      ),
    );

    const error = await fetchSitters(search).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toBe(
      "Invalid query parameters — lat is required — service is required",
    );
  });

  it("still throws a readable ApiError when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 502 })));
    await expect(fetchSitters(search)).rejects.toThrow("Request failed (502)");
  });
});
