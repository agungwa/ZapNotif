import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ApiError, SendTemplateResponse, TemplateDetailResponse, WhatsappTemplate } from "../types.ts";
import type { TemplateStore } from "../store/template-store.ts";
import { renderTemplateBody } from "../store/template-store.ts";
import type { MessageStore } from "../store/message-store.ts";
import type { WhatsappClient } from "../services/whatsapp-client.ts";
import { requireApiKey } from "../middleware/auth.ts";

const sendTemplateSchema = z.object({
  recipientPhoneNumber: z.string().min(8, "recipientPhoneNumber is required"),
  recipientName: z.string().optional(),
  templateId: z.string().min(1, "templateId is required"),
  languageCode: z.string().min(2).default("id"),
  bodyParameters: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
        valueText: z.string().optional(),
      }),
    )
    .default([]),
});

export interface WhatsappRouteDeps {
  templates: TemplateStore;
  whatsapp: WhatsappClient;
  messages: MessageStore;
}

export function createWhatsappRoutes(deps: WhatsappRouteDeps) {
  const app = new Hono();

  // Optional Bearer API-key gate — active only when API_KEY env is set
  app.use("*", requireApiKey());

  // GET /v1/whatsapp/templates — list templates
  app.get("/templates", (c) => {
    return c.json(deps.templates.list() satisfies WhatsappTemplate[]);
  });

  // GET /v1/whatsapp/templates/:id — template detail
  app.get("/templates/:id", (c) => {
    const template = deps.templates.findById(c.req.param("id"));
    if (!template) {
      return c.json<ApiError>({ message: "Template not found", requestId: crypto.randomUUID() }, 400);
    }
    if (template.status !== "APPROVED") {
      return c.json<ApiError>({ message: "Template not found", requestId: crypto.randomUUID() }, 400);
    }
    const body: TemplateDetailResponse = {
      id: template.id,
      name: template.name,
      language: template.language,
      body: template.body,
      status: template.status,
      category: template.category,
      createdAt: template.createdAt,
    };
    return c.json(body);
  });

  // GET /v1/whatsapp/session/status — connection status
  app.get("/session/status", (c) => c.json({ status: deps.whatsapp.getStatus() }));

  // GET /v1/whatsapp/session/qr — latest pairing QR (if awaiting scan)
  app.get("/session/qr", (c) => {
    const qr = deps.whatsapp.getQr();
    if (!qr) return c.json({ message: "No QR available. Session may already be paired." }, 404);
    return c.json({ qr });
  });

  // POST /v1/whatsapp/session/logout — unpair device (fresh QR afterwards)
  app.post("/session/logout", async (c) => {
    try {
      await deps.whatsapp.unpair();
      return c.json({ status: "logged_out" });
    } catch (err) {
      console.error("[whatsapp] unpair failed:", err);
      return c.json<ApiError>({ message: "External service error", requestId: crypto.randomUUID() }, 503);
    }
  });

  // POST /v1/whatsapp/messages/template — send rendered template as WA text message
  app.post(
    "/messages/template",
    zValidator("json", sendTemplateSchema, (result, c) => {
      if (!result.success) {
        const first = result.error.issues[0];
        const field = first?.path.join(".");
        const message = field ? `${field} is required` : "Validation error";
        return c.json<ApiError>({ message, requestId: crypto.randomUUID() }, 400);
      }
    }),
    async (c) => {
      const payload = c.req.valid("json");
      const requestId = crypto.randomUUID();

      const template = deps.templates.findById(payload.templateId);
      if (!template) {
        return c.json<ApiError>({ message: "Template not found", requestId }, 400);
      }

      const params = new Map(payload.bodyParameters.map((p) => [p.key, p.value]));
      const missing = template.variables.filter((slot) => !params.has(slot));
      if (missing.length > 0) {
        return c.json<ApiError>(
          { message: `Missing body parameters: ${missing.join(", ")}`, requestId },
          400,
        );
      }

      const text = renderTemplateBody(template.body, params);

      if (!deps.whatsapp.isConnected()) {
        return c.json<ApiError>({ message: "External service error", requestId }, 503);
      }

      try {
        const { messageId } = await deps.whatsapp.sendText(payload.recipientPhoneNumber, text);
        logMessage(deps.messages, {
          requestId,
          templateId: template.id,
          templateName: template.name,
          recipientPhone: payload.recipientPhoneNumber,
          recipientName: payload.recipientName ?? null,
          providerMessageId: messageId,
          status: "sent",
          error: null,
        });
        return c.json<SendTemplateResponse>({ providerMessageId: messageId, providerStatus: "success" });
      } catch (err) {
        console.error("[whatsapp] send failed:", err);
        logMessage(deps.messages, {
          requestId,
          templateId: template.id,
          templateName: template.name,
          recipientPhone: payload.recipientPhoneNumber,
          recipientName: payload.recipientName ?? null,
          providerMessageId: null,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
        return c.json<ApiError>({ message: "External service error", requestId }, 503);
      }
    },
  );

  return app;
}

/** Logging must never break the send contract. */
function logMessage(
  store: MessageStore,
  row: {
    requestId: string;
    templateId: string;
    templateName: string;
    recipientPhone: string;
    recipientName: string | null;
    providerMessageId: string | null;
    status: "sent" | "failed";
    error: string | null;
  },
): void {
  try {
    store.insert({
      request_id: row.requestId,
      template_id: row.templateId,
      template_name: row.templateName,
      recipient_phone: row.recipientPhone,
      recipient_name: row.recipientName,
      provider_message_id: row.providerMessageId,
      status: row.status,
      error: row.error,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[zapnotif] failed to log message:", err);
  }
}
