import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const user = await getSessionUser();
  const sp = await searchParams;
  if (user) redirect(sp.callbackUrl && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "/pipeline");
  const shared = !!process.env.APP_PASSWORD;
  // In shared mode the roster is only revealed after the team password is confirmed (see verifySharedPassword).
  const users = shared
    ? []
    : await prisma.user
        .findMany({ where: { isActive: true, isArchived: false, passwordHash: { not: null } }, orderBy: { name: "asc" }, select: { name: true, email: true, initials: true, color: true } })
        .catch(() => []);
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 brand-dots" aria-hidden />
        <Image src="/brand/leto-logo.svg" alt="Leto Capital" width={210} height={67} priority className="relative" />
        <div className="relative">
          <p className="text-white/60 text-xs font-semibold tracking-[0.25em] uppercase mb-4">Leto Capital</p>
          <h1 className="text-5xl font-bold tracking-tight leading-tight max-w-lg text-leto-green">Special Situations</h1>
          <p className="mt-3 text-lg text-white/70 max-w-md">Pipeline de originação &amp; oportunidades</p>
          <p className="mt-8 text-sm text-white/50 max-w-md leading-relaxed">Acompanhamento de originação, pipeline de oportunidades e relacionamento com originadores da Leto Capital.</p>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Leto Capital · uso interno</p>
      </div>
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Image src="/brand/leto-logo-dark.svg" alt="Leto Capital" width={170} height={54} priority />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-leto-green-deep mb-1">Special Situations</p>
          <h2 className="text-xl font-semibold tracking-tight">Entrar</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">{shared ? "Digite a senha de acesso da equipe." : "Escolha seu nome e digite sua senha."}</p>
          <LoginForm callbackUrl={sp.callbackUrl} initialError={sp.error} users={users} shared={shared} />
        </div>
      </div>
    </div>
  );
}
