"use client";

import { useMemo, useState } from "react";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg bg-[#1a1c1e] font-semibold text-[#f3efe6]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      ब
    </span>
  );
}

export function Badge({ tone, children }: { tone: "due" | "paid" | "neutral" | "warning"; children: React.ReactNode }) {
  const color =
    tone === "paid"
      ? "bg-[#e7f5ee] text-[#1f6b45]"
      : tone === "due"
        ? "bg-[#fdecec] text-[#8f3d32]"
        : tone === "warning"
          ? "bg-[#fef3c7] text-[#92400e]"
          : "bg-[#f1f2f4] text-[#616161]";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>{children}</span>;
}

export function SampleTag({ className = "", text = "Sample Data" }: { className?: string; text?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shrink-0 ${className}`}
      title="Demo Sample Data"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
      {text}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-border bg-white px-6 py-16 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[#616161]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, action }: { kicker?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8d5a2b] uppercase">{kicker}</p> : null}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#616161]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a1c1e]/40 p-3 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" className="text-sm text-[#616161]" onClick={onClose}>
            Band
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  align?: "right";
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, onRow, card }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRow?: (row: T) => void; card?: (row: T) => React.ReactNode }) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const copy = [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return sort.dir === "asc" ? compared : -compared;
    });
    return copy;
  }, [columns, rows, sort]);
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {card ? (
        <ul className="divide-y divide-[#f1f2f4] md:hidden">
          {visible.map((row) => (
            <li key={rowKey(row)}>
              <button type="button" className="min-h-16 w-full px-4 py-3 text-left" onClick={() => onRow?.(row)}>
                {card(row)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={card ? "hidden overflow-x-auto md:block" : "overflow-x-auto"}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "text-right" : ""}>
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="font-semibold"
                      onClick={() => setSort((current) => ({ key: column.key, dir: current?.key === column.key && current.dir === "asc" ? "desc" : "asc" }))}
                    >
                      {column.header}
                      {sort?.key === column.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)} onClick={() => onRow?.(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "text-right tabular-nums" : ""}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-[#616161]">
        <span>
          {sorted.length === 0 ? "0" : `${safePage * pageSize + 1}–${Math.min(sorted.length, (safePage + 1) * pageSize)}`} of {sorted.length}
        </span>
        <span className="flex gap-2">
          <button type="button" className="btn btn-secondary h-10 px-3 md:h-7" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            ‹
          </button>
          <button type="button" className="btn btn-secondary h-10 px-3 md:h-7" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
            ›
          </button>
        </span>
      </div>
    </div>
  );
}
