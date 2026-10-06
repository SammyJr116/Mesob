import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @typedef {{
 *   key: string,
 *   header: string,
 *   align?: "left" | "right",
 *   sortable?: boolean,
 *   sortValue?: (row: any) => any,
 *   render: (row: any) => import("react").ReactNode,
 * }} DataTableColumn
 */

/**
 * The one table in the app: attributed headings, sortable columns, optional
 * pagination, and a horizontal scroll wrapper for narrow screens.
 *
 * @param {{
 *   caption: string,
 *   columns: DataTableColumn[],
 *   rows: any[],
 *   rowKey?: (row: any) => string,
 *   pageSize?: number,
 *   initialSort?: { key: string, dir: "asc" | "desc" },
 *   onRowClick?: (row: any) => void,
 *   empty?: import("react").ReactNode,
 * }} props
 */
export default function DataTable({ caption, columns, rows, rowKey, pageSize = 0, initialSort, onRowClick, empty }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const value = col.sortValue || ((row) => row[col.key]);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true }) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount);
  const visible = pageSize ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted;

  const toggleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  return (
    <div className={cn("card-soft overflow-hidden", onRowClick && "p-0")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined;
                const Icon = !c.sortable ? null : active ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn("px-4 py-3 font-medium", c.align === "right" && "text-right")}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        aria-label={`Sort by ${c.header}`}
                        className={cn("inline-flex items-center gap-1 uppercase tracking-wide", c.align === "right" && "flex-row-reverse")}
                      >
                        {c.header}
                        {Icon && <Icon aria-hidden="true" className="h-3 w-3" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick && "cursor-pointer hover:bg-secondary/40"}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.align === "right" && "text-right")}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                  {empty || "Nothing to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageSize && sorted.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {visible.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page" className="rounded-lg border border-border p-1.5 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-muted-foreground">Page {safePage} of {pageCount}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage === pageCount} aria-label="Next page" className="rounded-lg border border-border p-1.5 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}