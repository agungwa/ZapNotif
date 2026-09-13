import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ConnectionStatus, SendTemplateResponse, Template } from "../api/types";
import { TemplatePreview } from "../components/TemplatePreview";
import { StatusBadge } from "../components/Badge";

export function ComposerPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [templateId, setTemplateId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const template = templates?.find((t) => t.id === templateId) ?? null;

  useEffect(() => {
    api.get<Template[]>("/api/templates").then((list) => {
      setTemplates(list);
      const approved = list.find((t) => t.status === "APPROVED");
      if (approved) setTemplateId(approved.id);
    }).catch(() => setTemplates([]));
    api.get<{ status: ConnectionStatus }>("/v1/whatsapp/session/status").then((s) => setStatus(s.status)).catch(() => {});
  }, []);

  useEffect(() => {
    setParams({});
    setResult(null);
  }, [templateId]);

  async function send() {
    if (!template) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.post<SendTemplateResponse>("/v1/whatsapp/messages/template", {
        recipientPhoneNumber: phone,
        recipientName: name || undefined,
        templateId: template.id,
        languageCode: template.language,
        bodyParameters: template.variables.map((key) => ({
          key,
          value: params[key] ?? "",
          valueText: params[key] ?? "",
        })),
      });
      setResult({ ok: true, text: `Dispatched — provider message ID ${res.providerMessageId}` });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!templates) {
    return <p className="pulse-dot font-display text-xs uppercase tracking-[0.3em] text-ink-400">Loading composer…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold uppercase tracking-widest">Composer</h1>
        <StatusBadge status={status} />
      </div>

      {templates.length === 0 ? (
        <p className="panel p-8 text-center font-mono text-sm text-ink-400">
          No templates yet — create one on the <Link className="text-signal underline" to="/templates">templates page</Link>
        </p>
      ) : (
        <div className="rise grid gap-6 xl:grid-cols-2">
          <div className="panel space-y-4 p-6">
            <div>
              <label className="label mb-1.5 block">Template</label>
              <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language}){t.status !== "APPROVED" ? " — NOT APPROVED" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label mb-1.5 block">Recipient phone</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08123456789" />
              </div>
              <div>
                <label className="label mb-1.5 block">Recipient name (optional)</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
            </div>

            {template && template.variables.length > 0 && (
              <div>
                <label className="label mb-1.5 block">Parameters</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {template.variables.map((v) => (
                    <div key={v}>
                      <span className="mb-1 block font-mono text-[10px] text-ink-400">{"{{" + v + "}}"}</span>
                      <input
                        className="input"
                        value={params[v] ?? ""}
                        onChange={(e) => setParams({ ...params, [v]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <p className={`border px-3 py-2 font-mono text-xs ${result.ok ? "border-signal-dim/40 bg-signal/10 text-signal-dim dark:text-signal" : "border-danger/40 bg-danger/10 text-danger"}`}>
                {result.ok ? "✓" : "⚠"} {result.text}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="font-mono text-[10px] text-ink-400">
                {status !== "connected" && <span className="text-amber">session not connected — send will fail</span>}
              </p>
              <button
                className="btn-primary"
                disabled={busy || !template || !phone || template.variables.some((v) => !(params[v] ?? "").trim())}
                onClick={send}
              >
                {busy ? "Dispatching…" : "⚡ Send message"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {template && <TemplatePreview body={template.body} params={params} />}
            {template && (
              <div className="panel p-4 font-mono text-[11px] leading-relaxed text-ink-400">
                <p className="label mb-2">Payload</p>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(
                  {
                    recipientPhoneNumber: phone || "…",
                    templateId: template.id,
                    languageCode: template.language,
                    bodyParameters: template.variables.map((v) => ({ key: v, value: params[v] ?? "…" })),
                  },
                  null,
                  2,
                )}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
