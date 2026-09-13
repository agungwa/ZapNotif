import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";

export const SESSION_COOKIE = "zapnotif_session";
const SESSION_TTL_SECONDS = 7 * 24 * 3600;

export type SessionVars = { adminUser: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Fallback: deterministic per-install secret so cookies survive restarts
  // even when SESSION_SECRET is unset. Warn once.
  if (!secretWarned) {
    console.warn("[zapnotif] SESSION_SECRET not set — using derived fallback. Set it in .env for production.");
    secretWarned = true;
  }
  return createHmac("sha256", "zapnotif-fallback").update(`${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`).digest("hex");
}
let secretWarned = false;

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload = b64url(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): { sub: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub: string; exp: number };
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}

/** Protect dashboard routes with the session cookie. */
export function authMiddleware(): MiddlewareHandler<{ Variables: SessionVars }> {
  return async (c, next) => {
    const session = verifySessionToken(getCookie(c, SESSION_COOKIE));
    if (!session) {
      return c.json({ message: "Unauthorized", requestId: crypto.randomUUID() }, 401);
    }
    c.set("adminUser", session.sub);
    await next();
  };
}

/** Require `Authorization: Bearer <API_KEY>` on public API routes when API_KEY is set. No-op otherwise. */
export function requireApiKey(): MiddlewareHandler {
  return async (c, next) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return next();
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const a = Buffer.from(token);
    const b = Buffer.from(apiKey);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ message: "Unauthorized", requestId: crypto.randomUUID() }, 401);
    }
    await next();
  };
}

export { SESSION_TTL_SECONDS };

/** Helper for routes: current admin user (set by authMiddleware). */
export function getAdminUser(c: Context<{ Variables: SessionVars }>): string {
  return c.get("adminUser");
}
