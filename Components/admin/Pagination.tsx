"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/classNames";

function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const ordered = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const output: Array<number | "gap"> = [];
  ordered.forEach((value, index) => {
    const previous = ordered[index - 1];
    if (previous !== undefined && value - previous > 1) output.push("gap");
    output.push(value);
  });
  return output;
}

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 0) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-4"
    >
      <p className="text-xs text-subtle" aria-live="polite">
        Showing <span className="tabular-nums text-muted">{from}–{to}</span> of{" "}
        <span className="tabular-nums text-muted">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#edf2ef] disabled:cursor-not-allowed disabled:text-[#b9c6bf] disabled:hover:bg-transparent"
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        {pageWindow(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-subtle">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              disabled={disabled}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={cx(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs tabular-nums transition-colors",
                item === page
                  ? "bg-brand font-semibold text-white"
                  : "text-muted hover:bg-[#edf2ef]",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-[#edf2ef] disabled:cursor-not-allowed disabled:text-[#b9c6bf] disabled:hover:bg-transparent"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
