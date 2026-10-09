"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  label?: string;
  className?: string;
};

/** First, last, and a window around the current page, with gaps as null. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  label = "items",
  className = "",
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const buttonBase =
    "min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg border text-xs font-semibold transition-colors";

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>
          Showing {from}–{to} of {total} {label}
        </span>
        {onLimitChange && (
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Rows per page</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${buttonBase} bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/40 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageWindow(page, totalPages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={`${buttonBase} ${
                n === page
                  ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/40"
              }`}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={`${buttonBase} bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/40 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
