"use client";

import * as React from "react";
import Image from "next/image";
import { toPng, toSvg } from "html-to-image";
import { Download, Maximize2, MoreHorizontal, Presentation, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  period?: string;
  children: React.ReactNode;
  /** Big numbers shown in presentation mode next to the chart. */
  highlights?: { label: string; value: string }[];
  className?: string;
  height?: number;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

async function exportNode(node: HTMLElement, format: "png" | "svg", name: string) {
  const opts = { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true, filter: (n: HTMLElement) => !(n.dataset && n.dataset.noExport === "1") };
  const dataUrl = format === "png" ? await toPng(node, opts) : await toSvg(node, opts);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format}`;
  a.click();
}

/** Chart container with export (PNG/SVG) and a clean presentation mode sized for slides (16:9). */
export function ChartCard({ title, description, period, children, highlights, className, height = 260, actions, footer }: ChartCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const presRef = React.useRef<HTMLDivElement>(null);
  const [pres, setPres] = React.useState(false);

  async function doExport(format: "png" | "svg", node: HTMLElement | null) {
    if (!node) return;
    try {
      await exportNode(node, format, title);
      toast.success(`Gráfico exportado (${format.toUpperCase()}).`);
    } catch (e) {
      toast.error(`Falha ao exportar: ${(e as Error).message}`);
    }
  }

  return (
    <>
      <Card className={cn("flex flex-col", className)}>
        <div ref={ref} className="flex flex-col flex-1 bg-card rounded-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{title}</CardTitle>
              {(description || period) && <CardDescription className="mt-1">{[description, period].filter(Boolean).join(" · ")}</CardDescription>}
            </div>
            <div className="flex items-center gap-1" data-no-export="1">
              {actions}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setPres(true)}>
                    <Presentation /> Presentation Mode
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => doExport("png", ref.current)}>
                    <Download /> Exportar PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => doExport("svg", ref.current)}>
                    <Download /> Exportar SVG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="flex-1" style={{ minHeight: height }}>
            <div style={{ height }}>{children}</div>
            {footer}
          </CardContent>
        </div>
      </Card>

      <Dialog open={pres} onOpenChange={setPres}>
        <DialogContent className="max-w-[1120px] p-0 bg-transparent border-0 shadow-none" hideClose>
          <DialogTitle className="sr-only">{title} — Presentation Mode</DialogTitle>
          <div className="flex items-center justify-end gap-1 mb-2">
            <Button size="sm" variant="secondary" onClick={() => doExport("png", presRef.current)}>
              <Download /> PNG
            </Button>
            <Button size="sm" variant="secondary" onClick={() => doExport("svg", presRef.current)}>
              <Download /> SVG
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPres(false)}>
              <X /> Fechar
            </Button>
          </div>
          <div ref={presRef} className="presentation-root rounded-lg p-10 aspect-[16/9] w-full flex flex-col" style={{ background: "#fff" }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-leto-ink">{title}</h2>
                {(description || period) && <p className="text-sm text-leto-stone mt-1">{[description, period].filter(Boolean).join(" · ")}</p>}
              </div>
              <Image src="/brand/leto-logo-dark.svg" alt="Leto Capital" width={125} height={40} />
            </div>
            <div className="flex-1 grid gap-8 mt-6" style={{ gridTemplateColumns: highlights?.length ? "1fr 220px" : "1fr" }}>
              <div className="min-h-0">{children}</div>
              {highlights?.length ? (
                <div className="flex flex-col justify-center gap-6">
                  {highlights.map((h) => (
                    <div key={h.label}>
                      <div className="text-4xl font-semibold tracking-tight text-leto-ink tabular">{h.value}</div>
                      <div className="text-xs uppercase tracking-wider text-leto-stone mt-1">{h.label}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-between text-2xs text-leto-stone">
              <span>Leto Capital · Special Situations</span>
              <span>{new Date().toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ExpandIcon() {
  return <Maximize2 className="h-3.5 w-3.5" />;
}
