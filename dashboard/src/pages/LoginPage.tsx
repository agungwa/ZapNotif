import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-backdrop relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 p-4 text-ink-300">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-signal/10 blur-3xl" />

      <div className="rise panel relative w-full max-w-sm p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center bg-signal font-display text-xl font-bold text-ink-950 shadow-[0_0_32px_-4px_var(--color-signal)]">
            Z
          </span>
          <div>
            <h1 className="font-display text-lg font-bold uppercase tracking-widest text-ink-100">
              ZapNotif
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-400">
              dispatch console · secure access
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="label mb-1.5 block">
              Operator ID
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label mb-1.5 block">
              Passphrase
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              ⚠ {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? "Authenticating…" : "Authenticate"}
          </button>
        </form>

        <p className="mt-6 font-mono text-[10px] leading-relaxed text-ink-400">
          creds via ADMIN_USERNAME / ADMIN_PASSWORD env
        </p>
      </div>
    </div>
  );
}
