import { afterEach, expect, it, vi } from "vitest";
import { ensureDemoSession } from "./demo-session";

afterEach(() => vi.unstubAllGlobals());
it("shares an in-flight session handshake between concurrent operations", async () => {
  const fetcher = vi.fn(async () => Response.json({ ready: true }));
  vi.stubGlobal("fetch", fetcher);
  await Promise.all([ensureDemoSession(), ensureDemoSession()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await ensureDemoSession();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
