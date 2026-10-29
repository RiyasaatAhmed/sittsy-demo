import request from "supertest";
import { describe, expect, it } from "vitest";
import { DatabaseUnavailableError } from "../../shared/http/errors";
import { fakeRepository, fakeSitter, testApp } from "../../testing/test-app";

// The routes are tested through HTTP against the real app, without a database:
// the repository is a fake.

describe("AC6: GET /api/sitters returns 400 on bad params", () => {
  it.each([
    ["missing lat", "/api/sitters?lng=2.35&service=dog_walking"],
    ["missing lng", "/api/sitters?lat=48.85&service=dog_walking"],
    ["missing service", "/api/sitters?lat=48.85&lng=2.35"],
    ["invalid lat (text)", "/api/sitters?lat=north&lng=2.35&service=dog_walking"],
    ["invalid lat (out of range)", "/api/sitters?lat=123&lng=2.35&service=dog_walking"],
    ["invalid lng (text)", "/api/sitters?lat=48.85&lng=east&service=dog_walking"],
    ["invalid lng (out of range)", "/api/sitters?lat=48.85&lng=200&service=dog_walking"],
    ["invalid service", "/api/sitters?lat=48.85&lng=2.35&service=cat_grooming"],
  ])("%s → 400", async (_label, path) => {
    const { app, sitters } = testApp();
    const response = await request(app).get(path);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid query parameters");
    expect(response.body.details.length).toBeGreaterThan(0);
    expect(sitters.findOffering).not.toHaveBeenCalled();
  });
});

describe("GET /api/sitters with valid params", () => {
  it("returns no Paris candidates for a search from Dhaka", async () => {
    const { app } = testApp();
    const response = await request(app).get("/api/sitters?lat=23.8103&lng=90.4125&service=dog_walking");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ totalCandidates: 0, totalPages: 1, results: [] });
  });

  it("filters before pagination even when the distance weight is zero", async () => {
    const sitters = fakeRepository([
      fakeSitter(1), fakeSitter(2), fakeSitter(3),
      fakeSitter(4, { lat: 23.8103, lng: 90.4125, ratingSum: 500, ratingCount: 100 }),
    ]);
    const { app } = testApp({ sitters });
    const response = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=2&page=2&w_distance=0");
    expect(response.body).toMatchObject({ totalCandidates: 3, totalPages: 2, page: 2 });
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].rank).toBe(3);
    expect(response.body.results[0].id).not.toBe(4);
  });

  it("returns sitters sorted by score with a breakdown, respecting limit", async () => {
    const { app, sitters } = testApp();
    const response = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=3");
    expect(response.status).toBe(200);
    const body = response.body;

    expect(sitters.findOffering).toHaveBeenCalledWith("dog_walking");
    expect(body.totalCandidates).toBe(5);
    expect(body.results).toHaveLength(3);
    expect(body.results.map((r: { rank: number }) => r.rank)).toEqual([1, 2, 3]);
    const scores = body.results.map((r: { score: number }) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(Object.keys(body.results[0].breakdown).sort()).toEqual(
      ["activity", "coldStart", "distance", "quality", "responsiveness"],
    );
    expect(body.results[0].breakdown.quality.weight).toBe(body.weights.quality);
  });

  it("returns one page of the ranking with overall ranks and page metadata", async () => {
    const { app } = testApp();
    const all = (await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=5")).body;
    const response = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=2&page=2");
    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({ page: 2, pageSize: 2, totalPages: 3, totalCandidates: 5 });
    // Page 2 is exactly sitters #3 and #4 of the full ranking.
    expect(response.body.results.map((r: { rank: number }) => r.rank)).toEqual([3, 4]);
    expect(response.body.results.map((r: { id: number }) => r.id)).toEqual(
      all.results.slice(2, 4).map((r: { id: number }) => r.id),
    );
  });

  it("returns an empty page, not an error, past the last page", async () => {
    const { app } = testApp();
    const response = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=2&page=9");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 9, totalPages: 3, results: [] });
  });

  it("returns 400 for an invalid page", async () => {
    const { app } = testApp();
    const response = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&page=0");
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(["page must be a number between 1 and 10000"]);
  });

  it("passes weights from the query string into the ranking", async () => {
    const { app } = testApp();
    const response = await request(app).get(
      "/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&w_distance=1&w_activity=0",
    );
    expect(response.body.weights.distance).toBe(1);
    expect(response.body.weights.activity).toBe(0);
    expect(response.body.results[0].breakdown.distance.weight).toBe(1);
  });

  it("returns 503 with a hint when the database is down", async () => {
    const sitters = fakeRepository();
    sitters.findOffering.mockRejectedValue(new DatabaseUnavailableError());
    const { app } = testApp({ sitters });
    const response = await request(app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking");
    expect(response.status).toBe(503);
    expect(response.body.error).toContain("docker compose up -d");
  });
});

describe("GET /api/sitters with dates", () => {
  // testApp's clock is 2026-06-01, Paris.
  const SEARCH = "/api/sitters?lat=48.8566&lng=2.3522&service=boarding";
  const boardingSitters = () =>
    fakeRepository([1, 2, 3].map((id) => fakeSitter(id, { prices: { boarding: 40 }, ratingSum: 10 * id, ratingCount: 2 * id })));

  it("searches without dates as before: no availability check", async () => {
    const { app, sitters } = testApp({ sitters: boardingSitters() });
    const response = await request(app).get(SEARCH);
    expect(response.body).toMatchObject({ stay: null, unavailableCount: 0, totalCandidates: 3 });
    expect(sitters.findUnavailable).not.toHaveBeenCalled();
  });

  it("leaves out an unavailable sitter even when they would rank first", async () => {
    const sitters = boardingSitters();
    const { app } = testApp({ sitters });
    const ranking = (await request(app).get(SEARCH)).body;
    const best = ranking.results[0].id;

    sitters.findUnavailable.mockResolvedValue(new Set([best]));
    const response = await request(app).get(`${SEARCH}&from=2026-06-10&to=2026-06-13`);

    expect(response.status).toBe(200);
    expect(sitters.findUnavailable).toHaveBeenCalledWith(
      { checkIn: "2026-06-10", checkOut: "2026-06-13" },
      new Date("2026-06-01T12:00:00Z"),
      [1, 2, 3],
    );
    expect(response.body).toMatchObject({
      stay: { checkIn: "2026-06-10", checkOut: "2026-06-13" },
      totalCandidates: 2,
      unavailableCount: 1,
    });
    expect(response.body.results.map((r: { id: number }) => r.id)).not.toContain(best);
    expect(response.body.results[0].rank).toBe(1);
  });

  it.each([
    ["reversed dates", "&from=2026-06-13&to=2026-06-10", "to must be after from (at least one night)"],
    ["dates in the past", "&from=2026-05-01&to=2026-05-03", "from cannot be in the past"],
    ["a start without an end", "&from=2026-06-10", "to must be a date (YYYY-MM-DD)"],
  ])("rejects %s with a 400, before touching the database", async (_label, dates, detail) => {
    const { app, sitters } = testApp();
    const response = await request(app).get(`${SEARCH}${dates}`);
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([detail]);
    expect(sitters.findOffering).not.toHaveBeenCalled();
  });
});
