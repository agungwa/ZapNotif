import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MessageList, Stats } from "../api/types";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/Badge";
import { ActivityChart } from "../components/ActivityChart";

export function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<MessageList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Stats>("/api/stats"),
      api.get<MessageList>("/api/messages?page=1&pageSize=8"),
    ])
      .then(([s, r]) => {
        setStats(s);
        setRecent(r);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) {
    return <p className="border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-sm text-danger">⚠ {error}</p>;
  }
  if (!stats || !recent) {
    return <p className="pulse-dot font-display text-xs uppercase tracking-[0.3em] text-ink-400">Loading telemetry…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold uppercase tracking-widest">Overview</h1>
        <StatusBadge status={stats.whatsapp} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rise rise-1"><StatCard label="Total sent" value={stats.totalSent} hint="all-time deliveries" /></div>
        <div className="rise rise-1"><StatCard label="Sent today" value={stats.sentToday} accent="cyan" hint="local time" /></div>
        <div className="rise rise-2"><StatCard label="Success rate" value={`${stats.successRate}%`} accent={stats.successRate >= 90 ? "signal" : "amber"} hint={`${stats.totalFailed} failed`} /></div>
        <div className="rise rise-2"><StatCard label="WA session" value={stats.whatsapp} accent={stats.whatsapp === "connected" ? "signal" : "danger"} hint="baileys socket" /></div>
      </div>

      <div className="rise rise-3 grid gap-6 xl:grid-cols-2">
        <div className="panel p-5">
          <ActivityChart data={stats.last14Days} />
        </div>

        <div className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="label">Recent dispatches</p>
            <Link to="/messages" className="font-mono text-[11px] text-ink-400 hover:text-signal">
              view all →
            </Link>
          </div>
          {recent.items.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-ink-400">
              No messages yet — try the <Link to="/composer" className="text-signal underline">composer</Link>
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent.items.map((m) => (
                  <tr key={m.id}>
                    <td>{m.recipient_phone}</td>
                    <td className="max-w-[10rem] truncate text-ink-400">{m.template_name ?? "—"}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td className="text-ink-400">{new Date(m.created_at).toLocaleString("id-ID", { hour12: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
