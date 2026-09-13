import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { MessageList } from "../api/types";
import { StatusBadge } from "../components/Badge";
import { Pagination } from "../components/Pagination";

export function MessagesPage() {
  const [data, setData] = useState<MessageList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | "sent" | "failed">("");
  const [phone, setPhone] = useState("");
  const [debouncedPhone, setDebouncedPhone] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebouncedPhone(phone);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [phone]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debouncedPhone) params.set("phone", debouncedPhone);
    if (status) params.set("status", status);
    api
      .get<MessageList>(`/api/messages?${params}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [page, debouncedPhone, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold uppercase tracking-widest">Messages</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input !w-48"
            placeholder="search phone…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <select
            className="input !w-36"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "" | "sent" | "failed");
              setPage(1);
            }}
          >
            <option value="">all statuses</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
          </select>
        </div>
      </div>

      {error && <p className="border border-danger/40 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">⚠ {error}</p>}

      <div className="panel rise overflow-x-auto">
        {data === null ? (
          <p className="pulse-dot p-8 text-center font-display text-xs uppercase tracking-[0.3em] text-ink-400">
            Loading log…
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-8 text-center font-mono text-sm text-ink-400">
            {debouncedPhone || status ? "No records match the filter." : "No messages sent yet."}
          </p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Recipient</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Provider msg ID</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-ink-400">
                      {new Date(m.created_at).toLocaleString("id-ID", { hour12: false })}
                    </td>
                    <td>
                      {m.recipient_phone}
                      {m.recipient_name && <span className="block text-[11px] text-ink-400">{m.recipient_name}</span>}
                    </td>
                    <td className="text-ink-400">{m.template_name ?? "—"}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td className="max-w-[9rem] truncate text-ink-400">{m.provider_message_id ?? "—"}</td>
                    <td className="max-w-[12rem] truncate text-danger" title={m.error ?? undefined}>
                      {m.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4">
              <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
