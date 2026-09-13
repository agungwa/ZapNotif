import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type SessionVars } from "../middleware/auth.ts";
import type { TemplateStore } from "../store/template-store.ts";
import type { MessageStore } from "../store/message-store.ts";
import type { AllowlistStore } from "../store/allowlist-store.ts";
import type { WhatsappClient } from "../services/whatsapp-client.ts";
import type { ApiError } from "../types.ts";

const templateInputSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(2),
  body: z.string().min(1),
  category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]).default("MARKETING"),
  status: z.enum(["APPROVED", "PENDING", "REJECTED"]).default("APPROVED"),
});

const listMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  phone: z.string().optional(),
  status: z.enum(["sent", "failed"]).optional(),
});

const allowlistAddSchema = z.object({
  phone: z.string().min(8),
  label: z.string().optional(),
});

export function createDashboardRoutes(deps: {
  templates: TemplateStore;
  messages: MessageStore;
  allowlist: AllowlistStore;
  whatsapp: WhatsappClient;
}) {
  const app = new Hono<{ Variables: SessionVars }>();

  app.use("*", authMiddleware());

  // GET /api/stats — overview numbers + WA connection status
  app.get("/stats", (c) => {
    return c.json({ ...deps.messages.stats(), whatsapp: deps.whatsapp.getStatus() });
  });

  // GET /api/messages — paginated log with search/filter
  app.get("/messages", zValidator("query", listMessagesSchema, (result, c) => {
    if (!result.success) {
      return c.json<ApiError>({ message: "Invalid query", requestId: crypto.randomUUID() }, 400);
    }
  }), (c) => {
    const q = c.req.valid("query");
    return c.json(deps.messages.list(q));
  });

  // GET /api/templates — full template list (includes variables)
  app.get("/templates", (c) => c.json(deps.templates.list()));

  // POST /api/templates — create
  app.post("/templates", zValidator("json", templateInputSchema, (result, c) => {
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first?.path.join(".");
      return c.json<ApiError>(
        { message: field ? `${field}: ${first?.message ?? "Invalid value"}` : "Validation error", requestId: crypto.randomUUID() },
        400,
      );
    }
  }), async (c) => {
    const input = c.req.valid("json");
    const template = await deps.templates.create(input);
    return c.json(template, 201);
  });

  // PUT /api/templates/:id — update
  app.put("/templates/:id", zValidator("json", templateInputSchema, (result, c) => {
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first?.path.join(".");
      return c.json<ApiError>(
        { message: field ? `${field}: ${first?.message ?? "Invalid value"}` : "Validation error", requestId: crypto.randomUUID() },
        400,
      );
    }
  }), async (c) => {
    const updated = await deps.templates.update(c.req.param("id"), c.req.valid("json"));
    if (!updated) {
      return c.json<ApiError>({ message: "Template not found", requestId: crypto.randomUUID() }, 404);
    }
    return c.json(updated);
  });

  // DELETE /api/templates/:id
  app.delete("/templates/:id", async (c) => {
    const removed = await deps.templates.remove(c.req.param("id"));
    if (!removed) {
      return c.json<ApiError>({ message: "Template not found", requestId: crypto.randomUUID() }, 404);
    }
    return c.body(null, 204);
  });

  // GET /api/allowlist — list allowed recipient numbers
  app.get("/allowlist", (c) => {
    return c.json({ items: deps.allowlist.list(), size: deps.allowlist.size() });
  });

  // POST /api/allowlist — add a number
  app.post("/allowlist", zValidator("json", allowlistAddSchema, (result, c) => {
    if (!result.success) {
      return c.json<ApiError>({ message: "phone is required", requestId: crypto.randomUUID() }, 400);
    }
  }), (c) => {
    const { phone, label } = c.req.valid("json");
    return c.json(deps.allowlist.add(phone, label ?? null), 201);
  });

  // DELETE /api/allowlist/:phone
  app.delete("/allowlist/:phone", (c) => {
    const removed = deps.allowlist.remove(c.req.param("phone"));
    if (!removed) {
      return c.json<ApiError>({ message: "Number not found", requestId: crypto.randomUUID() }, 404);
    }
    return c.body(null, 204);
  });

  return app;
}
