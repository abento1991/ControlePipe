"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DECLINE_REASONS, DECLINED_BY_LABELS, type DeclineReasonKey, type DeclinedByKey } from "@/lib/normalization/decline-reasons";
import { useState } from "react";

export interface DeclineValue {
  declineReason: DeclineReasonKey | null;
  declinedBy: DeclinedByKey | null;
  closeReason: string;
}

/** Structured decline: reason (closed list), who walked away, and free-text details. Shared by every screen that declines. */
export function DeclineFields({ value, onChange, compact }: { value: DeclineValue; onChange: (v: DeclineValue) => void; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Motivo da recusa</Label>
        <Select value={value.declineReason ?? ""} onValueChange={(v) => onChange({ ...value, declineReason: v as DeclineReasonKey })}>
          <SelectTrigger className={cn("bg-card", compact ? "h-8 text-xs" : "h-9 text-sm")}>
            <SelectValue placeholder="Escolha o motivo principal" />
          </SelectTrigger>
          <SelectContent>
            {DECLINE_REASONS.map((r) => (
              <SelectItem key={r.key} value={r.key} className="text-xs">
                <span className="block">{r.label}</span>
                {!compact && <span className="block text-2xs text-muted-foreground">{r.hint}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Quem recusou</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(DECLINED_BY_LABELS) as DeclinedByKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChange({ ...value, declinedBy: k })}
              className={cn("rounded-md border px-3 py-1.5 text-left transition-colors", compact ? "text-xs" : "text-sm", value.declinedBy === k ? "border-leto-green bg-leto-green-faint ring-1 ring-leto-green font-medium" : "bg-card hover:bg-muted")}
            >
              {DECLINED_BY_LABELS[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Detalhes {value.declineReason === "OUTRO" ? "" : "(opcional)"}</Label>
        <Textarea value={value.closeReason} onChange={(e) => onChange({ ...value, closeReason: e.target.value })} rows={compact ? 2 : 3} className={cn("bg-card", compact && "text-xs min-h-0")} placeholder="Ex.: garantia de R$ 50 mm para empréstimo de R$ 120 mm; TIR abaixo de CDI + 12%." />
      </div>
    </div>
  );
}

export const EMPTY_DECLINE: DeclineValue = { declineReason: null, declinedBy: "LETO", closeReason: "" };

/** Modal used when an opportunity is being marked as Declinada from a status dropdown. */
export function DeclineDialog({ open, onOpenChange, initial, onConfirm, pending, title = "Declinar oportunidade", description = "Registre o motivo para o dashboard de recusas. Pode ser ajustado depois na coluna “Motivo / feedback”." }: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Partial<DeclineValue>; onConfirm: (v: DeclineValue) => void; pending?: boolean; title?: string; description?: string }) {
  const [value, setValue] = useState<DeclineValue>({ ...EMPTY_DECLINE, ...initial });
  const canConfirm = !!value.declineReason && !!value.declinedBy && (value.declineReason !== "OUTRO" || value.closeReason.trim().length > 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DeclineFields value={value} onChange={setValue} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pending || !canConfirm} onClick={() => onConfirm(value)}>
            Confirmar recusa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
