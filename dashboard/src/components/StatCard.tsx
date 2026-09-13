interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "signal" | "amber" | "danger" | "cyan";
}

const accents: Record<string, string> = {
  signal: "text-signal-dim dark:text-signal",
  amber: "text-amber",
  danger: "text-danger",
  cyan: "text-cyan",
};

export function StatCard({ label, value, hint, accent = "signal" }: StatCardProps) {
  return (
    <div className="panel panel-hover relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accent === "signal" ? "bg-signal-dim/50 dark:bg-signal/50" : ""}`}
        style={accent !== "signal" ? { background: "currentColor" } : undefined}
        data-accent={accent}
      />
      <p className="label">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold ${accents[accent]}`}>{value}</p>
      {hint && <p className="mt-1 font-mono text-[11px] text-ink-600 dark:text-ink-300">{hint}</p>}
    </div>
  );
}
