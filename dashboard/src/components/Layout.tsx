import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  { to: "/", label: "Overview", icon: "◈", end: true },
  { to: "/templates", label: "Templates", icon: "▤" },
  { to: "/composer", label: "Composer", icon: "✦" },
  { to: "/session", label: "Session", icon: "◉" },
  { to: "/messages", label: "Messages", icon: "≡" },
];

export function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem("zapnotif-theme") !== "light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("zapnotif-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  return (
    <div className="grid-backdrop min-h-screen text-ink-700 dark:text-ink-300 lg:grid lg:grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <aside className="border-b border-ink-700/60 bg-white/80 px-4 py-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center bg-signal font-display text-base font-bold text-ink-950 shadow-[0_0_24px_-4px_var(--color-signal)]">
            Z
          </span>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-widest text-ink-900 dark:text-ink-100">
              ZapNotif
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
              dispatch console
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-signal/10 text-ink-900 shadow-[inset_2px_0_0_var(--color-signal)] dark:text-signal"
                    : "text-ink-400 hover:text-ink-900 dark:hover:text-ink-200"
                }`
              }
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 hidden border-t border-ink-700/40 pt-4 font-mono text-[10px] leading-relaxed text-ink-400 lg:block dark:border-ink-800">
          unofficial wa gateway
          <br />
          baileys · bun · hono
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-ink-700/60 bg-white/60 px-6 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/60">
          <p className="label hidden sm:block">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
          </p>
          <div className="flex items-center gap-3">
            <button className="btn-ghost !px-2.5" onClick={toggle} title="Toggle theme">
              {dark ? "☀" : "☾"}
            </button>
            <span className="font-mono text-xs text-ink-400">
              @<span className="text-ink-900 dark:text-ink-200">{username}</span>
            </span>
            <button
              className="btn-ghost"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>

        <footer className="border-t border-ink-700/40 px-6 py-3 dark:border-ink-800">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            zapnotif — use responsibly · unofficial api · ban risk applies
          </p>
        </footer>
      </div>
    </div>
  );
}
