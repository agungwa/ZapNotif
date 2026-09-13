import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  authMiddleware,
  createSessionToken,
  type SessionVars,
} from "../middleware/auth.ts";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function createAuthRoutes() {
  const app = new Hono<{ Variables: SessionVars }>();

  app.post("/login", zValidator("json", loginSchema), (c) => {
    const { username, password } = c.req.valid("json");
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;

    if (!expectedUser || !expectedPass || username !== expectedUser || password !== expectedPass) {
      return c.json({ message: "Invalid username or password", requestId: crypto.randomUUID() }, 401);
    }

    setCookie(c, SESSION_COOKIE, createSessionToken(username), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
    return c.json({ username });
  });

  app.post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.body(null, 204);
  });

  app.get("/me", authMiddleware(), (c) => {
    return c.json({ username: c.get("adminUser") });
  });

  return app;
}
