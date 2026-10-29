import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { ErrorResponse } from "@sitter/domain/contract";
import type { Config } from "./config/config";
import { errorHandler, notFound } from "./shared/http/error-handler";
import { requestId } from "./shared/http/request-id";
import type { Logger } from "./logger/logger";
import { bookingQuoteRouter } from "./modules/bookings/booking-quote.router";
import { bookingStatusRouter } from "./modules/bookings/booking-status.router";
import type { BookingsRepository } from "./modules/bookings/bookings.repository";
import { bookingsRouter } from "./modules/bookings/bookings.router";
import { healthRouter } from "./modules/health/health.router";
import { createOwnerSession } from "./modules/owners/owner-session";
import type { OwnersRepository } from "./modules/owners/owners.repository";
import { priceSuggestionRouter } from "./modules/sitters/price-suggestion.router";
import { sittersRouter } from "./modules/sitters/sitters.router";
import type { SittersRepository } from "./modules/sitters/sitters.repository";

export type AppDeps = {
  config: Pick<Config, "corsOrigins" | "trustProxy" | "rateLimitPerMinute" | "secureCookies">;
  logger: Logger;
  sitters: SittersRepository;
  owners: OwnersRepository;
  bookings: BookingsRepository;
  isShuttingDown: () => boolean;
  /** The current time, for ranking and bookings (injected so tests control it). */
  now?: () => Date;
};

/**
 * Builds the Express app from its dependencies. It never listens: server.ts
 * does that, and tests drive this app directly with supertest.
 */
export function createApp({
  config,
  logger,
  sitters,
  owners,
  bookings,
  isShuttingDown,
  now = () => new Date(),
}: AppDeps): Express {
  const app = express();

  // Behind nginx: use X-Forwarded-For for the client IP (rate limiting, logs).
  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      genReqId: requestId,
      customLogLevel: (_req, res, error) =>
        error || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      // Health checks run every few seconds; they would drown the useful lines.
      autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false },
      // One short line per request: no headers (cookies, tokens) and no bodies.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.use("/health", healthRouter({ sitters, isShuttingDown }));

  const api = express.Router();
  if (config.corsOrigins.length > 0) {
    api.use(
      cors({
        origin: config.corsOrigins,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Idempotency-Key"],
        exposedHeaders: ["Idempotent-Replayed", "Location"],
        // The demo-owner cookie must travel with cross-origin calls too.
        credentials: true,
      }),
    );
  }
  const tooManyRequests: ErrorResponse = { error: "Too many requests. Try again in a minute." };
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: tooManyRequests,
    }),
  );
  api.use(cookieParser());
  const session = createOwnerSession({ owners, secureCookies: config.secureCookies });
  api.use(sittersRouter({ sitters, now }));
  api.use(priceSuggestionRouter({ sitters }));
  api.use(bookingQuoteRouter({ bookings, now }));
  api.use(bookingsRouter({ bookings, session, now }));
  api.use(bookingStatusRouter({ bookings, session, now }));
  app.use("/api", api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
