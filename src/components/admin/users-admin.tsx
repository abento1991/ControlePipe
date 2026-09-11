"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, ShieldCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/common/user-avatar";
import { upsertUser } from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  initials: string | null;
  color: string | null;
  isActive: boolean;
  isArchived: boolean;
  hasPassword: boolean;
  createdAt: string;
  assignments: number;
}

export function UsersAdmin({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | null | "new">(null);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [active, setActive] = useState(true);
  const [pending, start] = useTransition();
  const open = editing !== null;
  const row = editing && editing !== "new" ? editing : null;

  function openDialog(u: UserRow | "new") {
    setEditing(u);
    setRole(u === "new" ? "USER" : u.role);
    setActive(u === "new" ? true : u.isActive);
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => openDialog("new")}>
          <Plus /> Novo usuário
        </Button>
      </div>
      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Usuário</th>
              <th className="text-left px-4 py-2">E-mail</th>
              <th className="text-left px-4 py-2">Papel</th>
              <th className="text-left px-4 py-2">Situação</th>
              <th className="text-right px-4 py-2">Oportunidades</th>
              <th className="text-left px-4 py-2">Criado em</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className={u.isArchived ? "opacity-70" : ""}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={u.name} initials={u.initials} color={u.color} isArchived={u.isArchived} />
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2">{u.role === "ADMIN" ? <Badge variant="accent">Admin</Badge> : <Badge variant="muted">User</Badge>}</td>
                <td className="px-4 py-2">
                  {u.isArchived ? (
                    <Badge variant="muted">Archived User (legado)</Badge>
                  ) : u.isActive ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="danger">Inativo</Badge>
                  )}
                  {!u.isArchived && !u.hasPassword && <span className="ml-2 text-2xs text-warning">sem senha</span>}
                </td>
                <td className="px-4 py-2 text-right tabular">{u.assignments}</td>
                <td className="px-4 py-2 text-muted-foreground tabular">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2 text-right">
                  {!u.isArchived && (
                    <Button size="xs" variant="ghost" onClick={() => openDialog(u)}>
                      <Pencil /> Editar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Usuários arquivados representam responsáveis antigos da planilha (Hugo, Bernardo, Mollica, Mauad). Eles não podem entrar no sistema, mas preservam o histórico de atribuições.</p>

      <Dialog open={open} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{row ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>Admins gerenciam usuários, normalização, tipos e auditoria. Users visualizam, criam e editam oportunidades e atividades.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                const res = await upsertUser(row?.id ?? null, { name: String(f.get("name")), email: String(f.get("email")), role, password: String(f.get("password") ?? "") || null, color: String(f.get("color") ?? "") || null, isActive: active });
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("Usuário salvo.");
                  setEditing(null);
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input name="name" defaultValue={row?.name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input name="email" type="email" defaultValue={row?.email ?? ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "USER")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cor do avatar</Label>
                <Input name="color" type="color" defaultValue={row?.color ?? "#5c7a2e"} className="h-9 p-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{row ? "Nova senha (deixe em branco para manter)" : "Senha inicial"}</Label>
              <Input name="password" type="password" minLength={8} required={!row} autoComplete="new-password" />
            </div>
            {row && row.id !== currentUserId && (
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={active} onCheckedChange={setActive} /> Usuário ativo (pode entrar no sistema)
              </label>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <ShieldCheck /> Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <UserX className="hidden" />
    </>
  );
}
