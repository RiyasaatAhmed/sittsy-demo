import { postJson } from "../http-client/http-client";

let pending: Promise<unknown> | undefined;

/** Concurrent operations in one page share the cookie handshake. Recheck on later operations. */
export async function ensureDemoSession(): Promise<void> {
  pending ??= postJson("/api/session").finally(() => { pending = undefined; });
  await pending;
}
