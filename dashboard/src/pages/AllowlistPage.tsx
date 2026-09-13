import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { Badge } from "../components/Badge";

interface AllowedNumber {
  phone: string;
  label: string | null;
  created_at: string;
}

interface AllowlistData {
  items: AllowedNumber[];
  size: number;
}

export function AllowlistPage() {
  const [data, setData] = useState<AllowlistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setData(await api.get<AllowlistData>("/api/allowlist"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/api/allowlist", { phone, label: label || undefined });
      setPhone("");
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(item: AllowedNumber) {
    try {
      await api.del(`/api/allowlist/${item.phone}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold uppercase tracking-widest">Allowlist</h1>
        <Badge tone={data && data.size > 0 ? "signal" : "amber"}>
          {data && data.size > 0 ? `${data.size} restricted` : "open — anyone can receive"}
        </Badge>
      </div>

      <div className="panel rise border-l-4 border-l-amber p-4 font-mono text-xs leading-relaxed text-ink-600 dark:text-ink-300">
        When the list is <span className="text-amber">empty</span>, messages can be sent to any number.
        Once you add at least one number, sending is restricted to the listed numbers only —
        blocked attempts are logged on the Messages page.
      </div>

      {error && <p className="border border-danger/40 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">⚠ {error}</p>}

      <form onSubmit={onAdd} className="panel rise rise-1 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[10rem] flex-1">
          <label className="label mb-1.5 block">Phone number</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08123456789" required />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="label mb-1.5 block">Label (optional)</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="QA tester" />
        </div>
        <button type="submit" className="btn-primary" disabled={busy || phone.trim().length < 8}>
          + Allow
        </button>
      </form>

      <div className="panel rise rise-2 overflow-x-auto">
        {data === null ? (
          <p className="pulse-dot p-8 text-center font-display text-xs uppercase tracking-[0.3em] text-ink-600 dark:text-ink-300">
            Loading allowlist…
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-8 text-center font-mono text-sm text-ink-600 dark:text-ink-300">
            No numbers allowed — open mode.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Phone (normalized)</th>
                <th>Label</th>
                <th>Added</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.phone}>
                  <td className="font-semibold text-ink-900 dark:text-ink-100">{item.phone}</td>
                  <td className="text-ink-600 dark:text-ink-300">{item.label ?? "—"}</td>
                  <td className="text-ink-600 dark:text-ink-300">{item.created_at.slice(0, 10)}</td>
                  <td className="text-right">
                    <button className="btn-danger !px-2 !py-1" onClick={() => onRemove(item)}>remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
