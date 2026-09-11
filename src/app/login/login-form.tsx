"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UserOption {
  name: string;
  email: string;
  initials: string | null;
  color: string | null;
}

/**
 * Two modes:
 *  - shared=true  → one team password (APP_PASSWORD). Only the password is required; optionally pick who you are
 *                   so edits are attributed to you (otherwise "Equipe Leto").
 *  - shared=false → pick your name (or type e-mail) + your own password.
 */
export function LoginForm({ callbackUrl, initialError, users, shared }: { callbackUrl?: string; initialError?: string; users: UserOption[]; shared: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ? "Não foi possível entrar. Verifique a senha." : null);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string>(shared ? "" : users[0]?.email ?? "");
  const [useEmail, setUseEmail] = useState(!shared && users.length === 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = useEmail ? String(form.get("email") ?? "") : selected;
    setError(null);
    start(async () => {
      const res = await signIn("credentials", { email, password: String(form.get("password")), redirect: false });
      if (!res || res.error) {
        setError("Senha incorreta.");
        return;
      }
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/pipeline");
      router.refresh();
    });
  }

  const picker = (
    <div className="space-y-1.5">
      <Label>{shared ? "Registrar minhas ações como (opcional)" : "Quem é você?"}</Label>
      <div className="grid grid-cols-2 gap-2">
        {users.map((u) => (
          <button
            key={u.email}
            type="button"
            onClick={() => setSelected(selected === u.email && shared ? "" : u.email)}
            className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors", selected === u.email ? "border-leto-green bg-leto-green-faint ring-1 ring-leto-green" : "bg-card hover:bg-muted")}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold text-white" style={{ backgroundColor: u.color ?? "#6b7266" }}>
              {u.initials ?? u.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{u.name}</span>
          </button>
        ))}
      </div>
      {shared && <p className="text-2xs text-muted-foreground">Sem seleção, as alterações ficam registradas como “Equipe Leto”.</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">{shared ? "Senha de acesso" : "Senha"}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {shared ? (
        users.length > 0 && picker
      ) : useEmail ? (
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nome@letocapital.com.br" />
        </div>
      ) : (
        picker
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" variant="accent" className="w-full font-semibold" disabled={pending || (!shared && !useEmail && !selected)}>
        {pending && <Loader2 className="animate-spin" />}
        Entrar
      </Button>
      {!shared && users.length > 0 && (
        <button type="button" onClick={() => setUseEmail((v) => !v)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          {useEmail ? "Escolher pelo nome" : "Entrar com e-mail"}
        </button>
      )}
    </form>
  );
}
