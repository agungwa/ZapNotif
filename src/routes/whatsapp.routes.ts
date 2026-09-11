import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ApiError, SendTemplateResponse, TemplateDetailResponse } from "../types.ts";
import type { TemplateStore } from "../store/template-store.ts";
import { renderTemplateBody } from "../store/template-store.ts";
import type { WhatsappClient } from "../services/whatsapp-client.ts";

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

export function createWhatsappRoutes(deps: { templates: TemplateStore; whatsapp: WhatsappClient }) {
  const app = new Hono();

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
      return c.json<SendTemplateResponse>({ providerMessageId: messageId, providerStatus: "success" });
    } catch (err) {
      console.error("[whatsapp] send failed:", err);
      return c.json<ApiError>({ message: "External service error", requestId }, 503);
    }
  });

  return app;
}
