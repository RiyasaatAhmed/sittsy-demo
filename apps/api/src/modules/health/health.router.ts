import { Router } from "express";
import type { SittersRepository } from "../sitters/sitters.repository";

type Deps = {
  sitters: Pick<SittersRepository, "ping">;
  /** True once a shutdown has started: stop sending new traffic here. */
  isShuttingDown: () => boolean;
};

/**
 * Liveness: the process is up (no dependencies checked, so a database outage
 * does not get the container restarted). Readiness: the API can serve traffic
 * now (database reachable, not shutting down).
 */
export function healthRouter({ sitters, isShuttingDown }: Deps): Router {
  const router = Router();
  router.get("/live", (_req, res) => {
    res.json({ status: "ok" });
  });
  router.get("/ready", async (_req, res) => {
    if (isShuttingDown()) {
      res.status(503).json({ status: "shutting down" });
      return;
    }
    try {
      await sitters.ping();
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "database unavailable" });
    }
  });
  return router;
}
