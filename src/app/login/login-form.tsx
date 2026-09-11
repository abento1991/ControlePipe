"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { verifySharedPassword, type LoginUserOption } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Two modes:
 *  - shared=true  → one team password (APP_PASSWORD). Step 1 asks only for the password (no names on screen);
 *                   once it is confirmed, a dialog asks who is entering so edits are attributed to that person
 *                   (or to "Equipe Leto").
 *  - shared=false → pick your name (or type e-mail) + your own password.
 */
export function LoginForm({ callbackUrl, initialError, users, shared }: { callbackUrl?: string; initialError?: string; users: LoginUserOption[]; shared: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ? "Não foi possível entrar. Verifique a senha." : null);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string>(shared ? "" : users[0]?.email ?? "");
  const [useEmail, setUseEmail] = useState(!shared && users.length === 0);
  const [password, setPassword] = useState("");
  const [roster, setRoster] = useState<LoginUserOption[] | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);

  function finish(email: string, pwd: string) {
    start(async () => {
      const res = await signIn("credentials", { email, password: pwd, redirect: false });
      if (!res || res.error) {
        setChoosing(null);
        setRoster(null);
        setError("Senha incorreta.");
        return;
      }
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/pipeline");
      router.refresh();
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pwd = String(form.get("password") ?? "");
    setError(null);
    if (shared) {
      start(async () => {
        const res = await verifySharedPassword(pwd);
        if (!res.ok) {
          setError("Senha incorreta.");
          return;
        }
        setPassword(pwd);
        setRoster(res.users);
      });
      return;
    }
    const email = useEmail ? String(form.get("email") ?? "") : selected;
    finish(email, pwd);
  }

  function choose(email: string) {
    setChoosing(email || "equipe");
    finish(email, password);
  }

  const picker = (
    <div className="space-y-1.5">
      <Label>Quem é você?</Label>
      <div className="grid grid-cols-2 gap-2">
        {users.map((u) => (
          <button
            key={u.email}
            type="button"
            onClick={() => setSelected(u.email)}
            className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors", selected === u.email ? "border-leto-green bg-leto-green-faint ring-1 ring-leto-green" : "bg-card hover:bg-muted")}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold text-white" style={{ backgroundColor: u.color ?? "#6b6f66" }}>
              {u.initials ?? u.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{u.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">{shared ? "Senha de acesso" : "Senha"}</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        </div>
        {!shared && (useEmail ? (
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nome@letocapital.com.br" />
          </div>
        ) : (
          picker
        ))}
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" variant="accent" className="w-full font-semibold" disabled={pending || (!shared && !useEmail && !selected)}>
          {pending && !roster && <Loader2 className="animate-spin" />}
          Entrar
        </Button>
        {!shared && users.length > 0 && (
          <button type="button" onClick={() => setUseEmail((v) => !v)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
            {useEmail ? "Escolher pelo nome" : "Entrar com e-mail"}
          </button>
        )}
      </form>

      <Dialog open={roster !== null} onOpenChange={(open) => { if (!open && !pending) { setRoster(null); setChoosing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <p className="text-2xs font-bold uppercase tracking-[0.18em] text-leto-green-deep">Special Situations</p>
            <DialogTitle>Quem está entrando?</DialogTitle>
            <DialogDescription>Suas alterações ficam registradas no seu nome.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(roster ?? []).map((u) => (
              <button
                key={u.email}
                type="button"
                disabled={pending}
                onClick={() => choose(u.email)}
                className={cn("flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:bg-leto-green-faint hover:border-leto-green disabled:opacity-60", choosing === u.email && "border-leto-green bg-leto-green-faint ring-1 ring-leto-green")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-semibold text-white" style={{ backgroundColor: u.color ?? "#6b6f66" }}>
                  {choosing === u.email ? <Loader2 className="h-4 w-4 animate-spin" /> : (u.initials ?? u.name.slice(0, 2).toUpperCase())}
                </span>
                <span className="truncate font-medium">{u.name}</span>
              </button>
            ))}
          </div>
          <button type="button" disabled={pending} onClick={() => choose("")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-60">
            {choosing === "equipe" ? "Entrando…" : "Continuar como Equipe Leto"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
