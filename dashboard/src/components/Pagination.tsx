interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-1 py-3 font-mono text-xs text-ink-600 dark:text-ink-300">
      <span>
        {total} record{total === 1 ? "" : "s"} — page {page}/{pages}
      </span>
      <div className="flex gap-2">
        <button className="btn-ghost !px-3 !py-1" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Prev
        </button>
        <button className="btn-ghost !px-3 !py-1" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
