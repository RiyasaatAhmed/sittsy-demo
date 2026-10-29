import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";
import { createShutdown } from "./shutdown";

const logger = pino({ level: "silent" });

function setup(overrides: { closeError?: Error; closeResources?: () => Promise<void>; timeoutMs?: number } = {}) {
  const order: string[] = [];
  const server = {
    close: vi.fn((callback: (error?: Error) => void) => {
      order.push("server closed");
      callback(overrides.closeError);
    }),
  };
  const closeResources = vi.fn(
    overrides.closeResources ??
      (async () => {
        order.push("resources closed");
      }),
  );
  const exit = vi.fn((code: number) => {
    order.push(`exit ${code}`);
  });
  const onStart = vi.fn(() => {
    order.push("not ready");
  });
  const shutdown = createShutdown({ server, closeResources, logger, timeoutMs: overrides.timeoutMs ?? 1000, onStart, exit });
  return { shutdown, server, closeResources, exit, onStart, order };
}

describe("graceful shutdown", () => {
  it("stops being ready, drains the server, then closes resources, then exits 0", async () => {
    const { shutdown, order } = setup();
    await shutdown("SIGTERM");
    expect(order).toEqual(["not ready", "server closed", "resources closed", "exit 0"]);
  });

  it("runs once even if several signals arrive", async () => {
    const { shutdown, server, exit } = setup();
    await shutdown("SIGTERM");
    await shutdown("SIGINT");
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("exits 1 if closing fails", async () => {
    const { shutdown, exit, closeResources } = setup({ closeError: new Error("busy") });
    await shutdown("SIGTERM");
    expect(closeResources).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits 1 when draining takes longer than the timeout", async () => {
    vi.useFakeTimers();
    try {
      const { shutdown, exit } = setup({ closeResources: () => new Promise<void>(() => {}), timeoutMs: 500 });
      void shutdown("SIGTERM");
      await vi.advanceTimersByTimeAsync(500);
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
