import { Hono } from "hono";
import { TemplateStore } from "./store/template-store.ts";
import { WhatsappClient } from "./services/whatsapp-client.ts";
import { createWhatsappRoutes } from "./routes/whatsapp.routes.ts";

const PORT = Number(process.env.PORT ?? 3000);

const templates = new TemplateStore();
await templates.load();

const whatsapp = new WhatsappClient();
await whatsapp.start();

const app = new Hono();

app.get("/v1/health", (c) =>
  c.json({ status: "ok", whatsapp: whatsapp.getStatus() }),
);

// Convenience endpoints for pairing the unofficial session
app.get("/v1/whatsapp/session/status", (c) => c.json({ status: whatsapp.getStatus() }));
app.get("/v1/whatsapp/session/qr", (c) => {
  const qr = whatsapp.getQr();
  if (!qr) return c.json({ message: "No QR available. Session may already be paired." }, 404);
  return c.json({ qr });
});

app.route(
  "/v1/whatsapp",
  createWhatsappRoutes({ templates, whatsapp }),
);

Bun.serve({ fetch: app.fetch, port: PORT });
console.log(`[zapnotif] listening on http://localhost:${PORT}`);
