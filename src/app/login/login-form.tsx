"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ callbackUrl, initialError }: { callbackUrl?: string; initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ? "Não foi possível entrar. Verifique e-mail e senha." : null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await signIn("credentials", { email: String(form.get("email")), password: String(form.get("password")), redirect: false });
      if (!res || res.error) {
        setError("E-mail ou senha incorretos.");
        return;
      }
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/pipeline");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nome@letocapital.com.br" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
