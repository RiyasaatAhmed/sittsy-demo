import request from "supertest";
import { describe, expect, it } from "vitest";
import { DatabaseUnavailableError } from "../../shared/http/errors";
import { fakeRepository, testApp } from "../../testing/test-app";

// The routes are tested through HTTP against the real app, without a database:
// the repository is a fake.

describe("GET /api/price-suggestion", () => {
  it("returns 400 for bad params", async () => {
    const { app, sitters } = testApp();
    const response = await request(app).get("/api/price-suggestion?lat=x&lng=2.35");
    expect(response.status).toBe(400);
    expect(sitters.findOffering).not.toHaveBeenCalled();
  });

  it("returns 503 with a hint when the database is down", async () => {
    const sitters = fakeRepository();
    sitters.findOffering.mockRejectedValue(new DatabaseUnavailableError());
    const { app } = testApp({ sitters });
    const response = await request(app).get("/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking");
    expect(response.status).toBe(503);
  });

  it("returns the price suggestion for nearby sitters", async () => {
    const { app } = testApp();
    const response = await request(app).get("/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking");
    expect(response.status).toBe(200);
    // Prices 11, 12, 13, 14, 15, all within 1 km.
    expect(response.body.suggestion).toMatchObject({ sampleSize: 5, p25: 12, median: 13, p75: 14 });
  });
});
