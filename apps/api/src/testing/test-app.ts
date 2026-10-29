// Builds the real Express app for tests, with fake repositories and a silent
// logger, so routes are tested through HTTP without a database.

import { pino } from "pino";
import { vi } from "vitest";
import type { Sitter } from "@sitter/domain/sitter";
import { createApp, type AppDeps } from "../app";
import type { SittersRepository } from "../modules/sitters/sitters.repository";

export function fakeSitter(id: number, overrides: Partial<Sitter> = {}): Sitter {
  return {
    id,
    name: `Fake Sitter ${id}`,
    lat: 48.8566 + id * 0.001,
    lng: 2.3522,
    prices: { dog_walking: 10 + id },
    ratingSum: 45,
    ratingCount: 10,
    medianResponseMinutes: 30,
    bookingsLast30d: id,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    identityVerified: true,
    ...overrides,
  };
}

export function fakeRepository(sitters: Sitter[] = [1, 2, 3, 4, 5].map((id) => fakeSitter(id))) {
  return {
    findOffering: vi.fn<SittersRepository["findOffering"]>(async () => sitters),
    findUnavailable: vi.fn<SittersRepository["findUnavailable"]>(async () => new Set<number>()),
    ping: vi.fn<SittersRepository["ping"]>(async () => {}),
  };
}

type TestAppOptions = Partial<Omit<AppDeps, "config">> & {
  config?: Partial<AppDeps["config"]>;
};

export function testApp(options: TestAppOptions = {}) {
  const sitters = options.sitters ?? fakeRepository();
  const app = createApp({
    config: { corsOrigins: [], trustProxy: false, rateLimitPerMinute: 1000, ...options.config },
    logger: options.logger ?? pino({ level: "silent" }),
    sitters,
    isShuttingDown: options.isShuttingDown ?? (() => false),
    now: options.now ?? (() => new Date("2026-06-01T12:00:00Z")),
  });
  return { app, sitters };
}
