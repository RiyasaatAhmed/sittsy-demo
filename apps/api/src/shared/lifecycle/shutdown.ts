import type { Logger } from "../../logger/logger";

/** The part of http.Server that shutdown needs (a fake in tests). */
type ClosableServer = { close(callback: (error?: Error) => void): unknown };

type ShutdownDeps = {
  server: ClosableServer;
  /** Closes what the server used, e.g. the database pool. Runs after the server stopped. */
  closeResources: () => Promise<void>;
  logger: Logger;
  timeoutMs: number;
  /** Called first: readiness starts failing so no new traffic is sent here. */
  onStart: () => void;
  exit?: (code: number) => void;
};

/**
 * Graceful shutdown, in this order: stop being ready, stop accepting
 * connections and let in-flight requests finish (`server.close`), then close
 * resources (the pool, so no query is cut short), then exit. If that takes
 * longer than `timeoutMs`, exit anyway with an error code. Calling it twice
 * (e.g. SIGTERM then SIGINT) does nothing the second time.
 */
export function createShutdown({ server, closeResources, logger, timeoutMs, onStart, exit = process.exit }: ShutdownDeps) {
  let started = false;

  return async function shutdown(signal: string): Promise<void> {
    if (started) return;
    started = true;
    onStart();
    logger.info({ signal }, "shutting down");

    const timer = setTimeout(() => {
      logger.error({ timeoutMs }, "shutdown timed out, exiting");
      exit(1);
    }, timeoutMs);
    timer.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await closeResources();
      clearTimeout(timer);
      logger.info("shutdown complete");
      exit(0);
    } catch (error) {
      clearTimeout(timer);
      logger.error({ err: error }, "shutdown failed");
      exit(1);
    }
  };
}
