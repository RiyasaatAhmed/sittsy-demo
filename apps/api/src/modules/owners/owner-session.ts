// Who is calling? The demo has no accounts: each browser is a "demo owner",
// identified by a random token in an HttpOnly cookie, established before its first
// booking or activity write. Only the token's hash is stored. A booking is only ever
// shown to, or changed by, the owner who made it.

import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { OwnersRepository } from "./owners.repository";

export const OWNER_COOKIE = "demo_owner";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** 32 random bytes in base64url: 43 characters. Anything else is not one of our tokens. */
const TOKEN = /^[\w-]{43}$/;

export type OwnerSession = {
  /** The caller's owner id, or null when the request has no valid token. */
  find(req: Request): Promise<number | null>;
  /** The caller's owner id; creates an owner and sets the cookie when there is none. */
  ensure(req: Request, res: Response): Promise<number>;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createOwnerSession({
  owners,
  secureCookies,
}: {
  owners: OwnersRepository;
  /** Send the cookie over HTTPS only. Off for plain-http localhost. */
  secureCookies: boolean;
}): OwnerSession {
  async function find(req: Request): Promise<number | null> {
    // cookie-parser types `req.cookies` as any: read it as unknown and check.
    const token: unknown = req.cookies?.[OWNER_COOKIE];
    if (typeof token !== "string" || !TOKEN.test(token)) return null;
    return owners.findIdByTokenHash(hashToken(token));
  }

  return {
    find,
    async ensure(req, res) {
      const existing = await find(req);
      if (existing !== null) return existing;
      const token = randomBytes(32).toString("base64url");
      const id = await owners.create(hashToken(token));
      res.cookie(OWNER_COOKIE, token, {
        httpOnly: true, // Not readable by page scripts (XSS cannot steal it).
        sameSite: "lax", // Not sent on cross-site POSTs (CSRF).
        secure: secureCookies,
        path: "/api",
        maxAge: COOKIE_MAX_AGE_MS,
      });
      return id;
    },
  };
}
