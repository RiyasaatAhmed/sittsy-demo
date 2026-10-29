import request from "supertest";
import { describe, expect, it } from "vitest";
import { DatabaseUnavailableError } from "../../shared/http/errors";
import { fakeRepository, testApp } from "../../testing/test-app";

describe("health checks", () => {
  it("live: ok whenever the process runs, even if the database is down", async () => {
    const sitters = fakeRepository();
    sitters.ping.mockRejectedValue(new DatabaseUnavailableError());
    const response = await request(testApp({ sitters }).app).get("/health/live");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("ready: ok when the database answers", async () => {
    const { app, sitters } = testApp();
    const response = await request(app).get("/health/ready");
    expect(response.status).toBe(200);
    expect(sitters.ping).toHaveBeenCalled();
  });

  it("ready: 503 when the database does not answer", async () => {
    const sitters = fakeRepository();
    sitters.ping.mockRejectedValue(new DatabaseUnavailableError());
    const response = await request(testApp({ sitters }).app).get("/health/ready");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "database unavailable" });
  });

  it("ready: 503 while shutting down, without asking the database", async () => {
    const { app, sitters } = testApp({ isShuttingDown: () => true });
    const response = await request(app).get("/health/ready");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "shutting down" });
    expect(sitters.ping).not.toHaveBeenCalled();
  });
});
