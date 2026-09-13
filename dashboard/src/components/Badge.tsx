interface BadgeProps {
  tone?: "signal" | "danger" | "amber" | "neutral" | "cyan";
  pulse?: boolean;
  children: React.ReactNode;
}

const tones: Record<string, string> = {
  signal: "bg-signal/10 text-signal-dim dark:text-signal border-signal-dim/40 dark:border-signal/40",
  danger: "bg-danger/10 text-danger border-danger/40",
  amber: "bg-amber/10 text-amber border-amber/40",
  cyan: "bg-cyan/10 text-cyan border-cyan/40",
  neutral: "bg-ink-600/10 text-ink-400 border-ink-600/40",
};

export function Badge({ tone = "neutral", pulse, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-widest ${tones[tone]}`}
    >
      {pulse && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return <Badge tone="signal">sent</Badge>;
    case "failed":
      return <Badge tone="danger">failed</Badge>;
    case "connected":
      return <Badge tone="signal" pulse>connected</Badge>;
    case "connecting":
      return <Badge tone="amber" pulse>connecting</Badge>;
    default:
      return <Badge tone="danger">disconnected</Badge>;
  }
}
