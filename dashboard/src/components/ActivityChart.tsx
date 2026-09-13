interface ActivityChartProps {
  data: { date: string; sent: number; failed: number }[];
}

/** Inline SVG stacked bar chart — last 14 days, no chart library. */
export function ActivityChart({ data }: ActivityChartProps) {
  const max = Math.max(1, ...data.map((d) => d.sent + d.failed));
  const barW = 100 / data.length;

  return (
    <div>
      <div className="flex items-center gap-4 pb-3">
        <span className="label">Last 14 days</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-400">
          <span className="inline-block h-2 w-2 bg-signal-dim dark:bg-signal" /> sent
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-400">
          <span className="inline-block h-2 w-2 bg-danger" /> failed
        </span>
      </div>
      <svg viewBox="0 0 100 42" className="h-40 w-full" preserveAspectRatio="none">
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2="100" y1={36 - 32 * f} y2={36 - 32 * f}
            className="stroke-ink-700/30 dark:stroke-ink-800" strokeWidth="0.15" />
        ))}
        {data.map((d, i) => {
          const x = i * barW + barW * 0.2;
          const w = barW * 0.6;
          const sentH = (d.sent / max) * 32;
          const failedH = (d.failed / max) * 32;
          return (
            <g key={d.date}>
              <title>{`${d.date} — sent ${d.sent}, failed ${d.failed}`}</title>
              <rect x={x} y={36 - sentH} width={w} height={sentH}
                className="fill-signal-dim dark:fill-signal" opacity="0.85" />
              <rect x={x} y={36 - sentH - failedH} width={w} height={failedH} className="fill-danger" />
            </g>
          );
        })}
        <line x1="0" x2="100" y1="36" y2="36" className="stroke-ink-600" strokeWidth="0.25" />
      </svg>
      <div className="flex justify-between font-mono text-[9px] text-ink-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
