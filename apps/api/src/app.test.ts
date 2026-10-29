import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { DatabaseUnavailableError } from "./shared/http/errors";
import { fakeRepository, testApp } from "./testing/test-app";

/** A logger that keeps its JSON lines, to assert what was logged. */
function capturingLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = pino({ level: "info" }, { write: (line: string) => lines.push(JSON.parse(line)) });
  return { logger, lines };
}

describe("cross-cutting HTTP behaviour", () => {
  it("answers unknown routes with a JSON 404", async () => {
    const response = await request(testApp().app).get("/nope");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Not found" });
  });

  it("turns an unexpected error into a generic 500, without leaking details", async () => {
    const sitters = fakeRepository();
    sitters.findOffering.mockRejectedValue(new Error("secret internal detail"));
    const response = await request(testApp({ sitters }).app).get(
      "/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking",
    );
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });

  it("logs a database failure with its cause and the request id", async () => {
    const { logger, lines } = capturingLogger();
    const sitters = fakeRepository();
    sitters.findOffering.mockRejectedValue(new DatabaseUnavailableError({ cause: new Error("ECONNREFUSED") }));
    const response = await request(testApp({ sitters, logger }).app)
      .get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking")
      .set("x-request-id", "trace-me");

    expect(response.status).toBe(503);
    const logged = lines.find((line) => line.msg === "database unavailable");
    expect(logged).toMatchObject({ level: 50, req: { id: "trace-me" } });
    expect(JSON.stringify(logged)).toContain("ECONNREFUSED");
  });

  it("logs an unexpected error with its message, which the client never sees", async () => {
    const { logger, lines } = capturingLogger();
    const sitters = fakeRepository();
    sitters.findOffering.mockRejectedValue(new Error("secret internal detail"));
    await request(testApp({ sitters, logger }).app).get("/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking");

    const logged = lines.find((line) => line.msg === "unhandled error");
    expect(JSON.stringify(logged)).toContain("secret internal detail");
  });

  it("sets security headers and hides the framework", async () => {
    const response = await request(testApp().app).get("/health/live");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toBeDefined();
  });

  it("gives every response a request id, reusing a safe incoming one", async () => {
    const app = testApp().app;
    const generated = await request(app).get("/health/live");
    expect(generated.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);

    const reused = await request(app).get("/health/live").set("x-request-id", "abc-123");
    expect(reused.headers["x-request-id"]).toBe("abc-123");

    const unsafe = await request(app).get("/health/live").set("x-request-id", "<script>");
    expect(unsafe.headers["x-request-id"]).not.toBe("<script>");
  });

  it("rate-limits /api per client, with a JSON 429 and standard headers", async () => {
    const { app } = testApp({ config: { rateLimitPerMinute: 2 } });
    const path = "/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking";
    expect((await request(app).get(path)).status).toBe(200);
    expect((await request(app).get(path)).status).toBe(200);
    const limited = await request(app).get(path);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toContain("Too many requests");
    expect(limited.headers["ratelimit-policy"]).toBeDefined();
    // Health checks are not rate-limited.
    expect((await request(app).get("/health/live")).status).toBe(200);
  });

  it("allows only the configured browser origins (CORS)", async () => {
    const { app } = testApp({ config: { corsOrigins: ["http://localhost:3000"] } });
    const path = "/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking";
    const allowed = await request(app).get(path).set("origin", "http://localhost:3000");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    const other = await request(app).get(path).set("origin", "https://evil.example");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("lets an allowed origin send booking requests with the owner cookie", async () => {
    const { app } = testApp({ config: { corsOrigins: ["http://localhost:3000"] } });
    const preflight = await request(app)
      .options("/api/bookings")
      .set("origin", "http://localhost:3000")
      .set("access-control-request-method", "POST")
      .set("access-control-request-headers", "content-type,idempotency-key");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-methods"]).toBe("GET,POST");
    expect(preflight.headers["access-control-allow-headers"]).toBe("Content-Type,Idempotency-Key");
    expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("sends no CORS headers when no origin is configured (same origin behind nginx)", async () => {
    const response = await request(testApp().app)
      .get("/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking")
      .set("origin", "http://localhost:3000");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
