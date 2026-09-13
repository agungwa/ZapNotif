import { Hono } from "hono";
import { existsSync } from "node:fs";
import { serveStatic } from "hono/bun";
import { TemplateStore } from "./store/template-store.ts";
import { MessageStore } from "./store/message-store.ts";
import { AllowlistStore } from "./store/allowlist-store.ts";
import { WhatsappClient } from "./services/whatsapp-client.ts";
import { createWhatsappRoutes } from "./routes/whatsapp.routes.ts";
import { createAuthRoutes } from "./routes/auth.routes.ts";
import { createDashboardRoutes } from "./routes/dashboard.routes.ts";

const PORT = Number(process.env.PORT ?? 3000);
const DASHBOARD_DIST = "./dashboard/dist";

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn(
    "[zapnotif] ADMIN_USERNAME / ADMIN_PASSWORD not set — dashboard login will reject all requests. Set them in .env",
  );
}

const templates = new TemplateStore();
await templates.load();

const messages = new MessageStore();
const allowlist = new AllowlistStore();

const whatsapp = new WhatsappClient();
await whatsapp.start();

const app = new Hono();

// --- Public API (Postman-compatible contract) ---
app.get("/v1/health", (c) =>
  c.json({ status: "ok", whatsapp: whatsapp.getStatus() }),
);

app.route(
  "/v1/whatsapp",
  createWhatsappRoutes({ templates, whatsapp, messages, allowlist }),
);

// --- Dashboard API (cookie-authenticated) ---
app.route("/api/auth", createAuthRoutes());
app.route("/api", createDashboardRoutes({ templates, messages, allowlist, whatsapp }));

// --- Dashboard SPA ---
if (existsSync(DASHBOARD_DIST)) {
  app.use("*", serveStatic({ root: DASHBOARD_DIST }));
  // SPA fallback: unknown GET paths serve index.html
  app.get("*", async (c) => {
    const index = Bun.file(`${DASHBOARD_DIST}/index.html`);
    if (await index.exists()) {
      return c.html(await index.text());
    }
    return c.notFound();
  });
} else {
  console.warn("[zapnotif] dashboard/dist not found — run `bun run build:dashboard` to serve the UI.");
}

Bun.serve({ fetch: app.fetch, port: PORT });
console.log(`[zapnotif] listening on http://localhost:${PORT}`);
