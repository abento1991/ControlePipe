"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "./reference-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/common/user-avatar";
import { changeOwnPassword } from "@/lib/actions/admin";

export function UserMenu() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <UserAvatar name={user.name} initials={user.initials} color={user.color} className="h-8 w-8" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-2xs font-normal text-muted-foreground">{user.email}</div>
            <div className="text-2xs font-normal text-muted-foreground mt-0.5">{user.role === "ADMIN" ? "Administrador" : "Usuário"}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <KeyRound /> Alterar senha
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
            <LogOut /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                const res = await changeOwnPassword(String(f.get("current")), String(f.get("next")));
                if (res.ok) {
                  toast.success("Senha alterada.");
                  setOpen(false);
                } else toast.error(res.error);
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Senha atual</Label>
              <Input name="current" type="password" required />
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input name="next" type="password" required minLength={8} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
