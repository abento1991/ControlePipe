"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sendBackupNow } from "@/lib/actions/backups";

export function SendBackupButton({ defaultRecipients, configured }: { defaultRecipients: string[]; configured: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultRecipients.join(", "));
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="accent" size="sm" onClick={() => setOpen(true)} disabled={!configured} title={configured ? "Gera o Excel e envia agora" : "Configure o envio de e-mail primeiro"}>
        <Mail /> Enviar backup agora
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar backup agora</DialogTitle>
            <DialogDescription>Gera o Excel completo e envia para os endereços abaixo. Leva alguns segundos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="bk-to">Destinatários (separados por vírgula)</Label>
            <Input id="bk-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="nome@letocapital.com.br, outro@letocapital.com.br" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button
              variant="accent"
              disabled={pending || !to.trim()}
              onClick={() =>
                start(async () => {
                  const res = await sendBackupNow(to.split(/[,;\s]+/));
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success("Backup enviado.");
                    setOpen(false);
                  }
                  router.refresh();
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
