"use client";

import * as React from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type ColumnSizingState, type RowSelectionState, type SortingState, type VisibilityState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Copy, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Storage key for column visibility / sizing persistence. */
  storageKey: string;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Server-side sorting: current sort and change handler. When omitted, sorts client-side. */
  sorting?: SortingState;
  onSortingChange?: (s: SortingState) => void;
  /** Server-side pagination. */
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void };
  selection?: { selected: RowSelectionState; onChange: (s: RowSelectionState) => void };
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  exportHref?: (format: "csv" | "xlsx") => string;
  /** Rendered instead of the table on small screens. */
  renderMobileCard?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  dense?: boolean;
  maxHeight?: string;
  columnLabels?: Record<string, string>;
  defaultHidden?: string[];
  /** Number of leading visible columns pinned to the left while scrolling horizontally. */
  stickyColumns?: number;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function DataTable<T>({ columns, data, storageKey, getRowId, onRowClick, sorting, onSortingChange, pagination, selection, toolbarLeft, toolbarRight, exportHref, renderMobileCard, emptyMessage = "Nenhum registro.", dense, maxHeight = "calc(100vh - 260px)", columnLabels = {}, defaultHidden = [], stickyColumns = 0 }: DataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => Object.fromEntries(defaultHidden.map((c) => [c, false])));
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [localSorting, setLocalSorting] = React.useState<SortingState>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setColumnVisibility(loadJSON(`${storageKey}:visibility`, Object.fromEntries(defaultHidden.map((c) => [c, false]))));
    setColumnSizing(loadJSON(`${storageKey}:sizing`, {}));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(`${storageKey}:visibility`, JSON.stringify(columnVisibility));
      localStorage.setItem(`${storageKey}:sizing`, JSON.stringify(columnSizing));
    } catch {}
  }, [columnVisibility, columnSizing, storageKey, hydrated]);

  const manualSorting = !!onSortingChange;
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { columnVisibility, columnSizing, sorting: manualSorting ? sorting ?? [] : localSorting, rowSelection: selection?.selected ?? {} },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: (u) => {
      const next = typeof u === "function" ? u(manualSorting ? sorting ?? [] : localSorting) : u;
      if (manualSorting) onSortingChange!(next);
      else setLocalSorting(next);
    },
    onRowSelectionChange: (u) => selection?.onChange(typeof u === "function" ? u(selection.selected) : u),
    enableRowSelection: !!selection,
    manualSorting,
    manualPagination: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const visible = table.getVisibleLeafColumns();
  const stickyStyle = (colId: string): React.CSSProperties => {
    const idx = visible.findIndex((c) => c.id === colId);
    if (idx < 0 || idx >= stickyColumns) return {};
    const left = visible.slice(0, idx).reduce((n, c) => n + c.getSize(), 0);
    return { position: "sticky", left, zIndex: 2 };
  };

  function copyTable() {
    const visible = table.getVisibleLeafColumns().filter((c) => c.id !== "select");
    const header = visible.map((c) => columnLabels[c.id] ?? (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id)).join("\t");
    const lines = table.getRowModel().rows.map((r) =>
      visible
        .map((c) => {
          const v = r.getValue(c.id);
          if (v === null || v === undefined) return "";
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        })
        .join("\t"),
    );
    navigator.clipboard.writeText([header, ...lines].join("\n")).then(() => toast.success("Tabela copiada."));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {toolbarLeft}
        <div className="ml-auto flex items-center gap-1.5">
          {toolbarRight}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 /> Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-auto">
              <DropdownMenuLabel>Mostrar colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.id !== "select" && c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} onSelect={(e) => e.preventDefault()}>
                    {columnLabels[c.id] ?? (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exportHref && (
                <>
                  <DropdownMenuItem asChild>
                    <a href={exportHref("csv")}>
                      <Download /> CSV
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={exportHref("xlsx")}>
                      <FileSpreadsheet /> Excel
                    </a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onSelect={copyTable}>
                <Copy /> Copiar tabela
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {renderMobileCard && (
        <div className="md:hidden space-y-2">
          {table.getRowModel().rows.map((r) => (
            <div key={r.id} onClick={() => onRowClick?.(r.original)}>
              {renderMobileCard(r.original)}
            </div>
          ))}
          {!data.length && <p className="text-center text-sm text-muted-foreground py-8">{emptyMessage}</p>}
        </div>
      )}

      <div className={cn("rounded-lg border bg-card shadow-card overflow-auto scrollbar-thin", renderMobileCard && "hidden md:block")} style={{ maxHeight }}>
        <Table style={{ width: table.getTotalSize(), minWidth: "100%" }}>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <TableHead key={h.id} style={{ width: h.getSize(), ...stickyStyle(h.column.id) }} className={cn("relative select-none group/th", stickyStyle(h.column.id).position && "bg-card")}>
                      {h.isPlaceholder ? null : canSort ? (
                        <button className="flex items-center gap-1 w-full text-left hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                          <span className="truncate">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                          {sorted === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : sorted === "desc" ? <ArrowDown className="h-3 w-3 shrink-0" /> : <ArrowUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover/th:opacity-50" />}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 w-full text-left">
                          <span className="truncate">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                        </div>
                      )}
                      {h.column.getCanResize() && <div onMouseDown={h.getResizeHandler()} onTouchStart={h.getResizeHandler()} className={cn("absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none opacity-0 group-hover/th:opacity-100 bg-leto-green/60", h.column.getIsResizing() && "opacity-100 bg-leto-green")} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined} className={cn(onRowClick && "cursor-pointer", dense && "[&>td]:py-1")} onClick={() => onRowClick?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize(), ...stickyStyle(cell.column.id) }} className={cn("overflow-hidden", stickyStyle(cell.column.id).position && "bg-card shadow-[1px_0_0_0_hsl(var(--border))]")}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            {pagination.total ? `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} de ${pagination.total}` : "0 registros"}
            {selection && Object.keys(selection.selected).length > 0 && ` · ${Object.keys(selection.selected).length} selecionados`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Select value={String(pagination.pageSize)} onValueChange={(v) => pagination.onPageSizeChange(parseInt(v, 10))}>
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon-sm" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>
              <ChevronLeft />
            </Button>
            <span className="tabular">
              {pagination.page} / {totalPages}
            </span>
            <Button variant="outline" size="icon-sm" disabled={pagination.page >= totalPages} onClick={() => pagination.onPageChange(pagination.page + 1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const NATIVE_CB = "h-4 w-4 cursor-pointer rounded-sm border-input accent-[#0f1411] align-middle";

export function SelectHeader<T>({ table }: { table: import("@tanstack/react-table").Table<T> }) {
  const all = table.getIsAllPageRowsSelected();
  const some = table.getIsSomePageRowsSelected();
  return (
    <input
      type="checkbox"
      className={NATIVE_CB}
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = !all && some;
      }}
      onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
      aria-label="Selecionar tudo"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function SelectCell<T>({ row }: { row: import("@tanstack/react-table").Row<T> }) {
  return <input type="checkbox" className={NATIVE_CB} checked={row.getIsSelected()} onChange={(e) => row.toggleSelected(e.target.checked)} aria-label="Selecionar" onClick={(e) => e.stopPropagation()} />;
}
