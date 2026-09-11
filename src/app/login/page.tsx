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
  const users = await prisma.user.findMany({ where: { isActive: true, isArchived: false, passwordHash: { not: null } }, orderBy: { name: "asc" }, select: { name: true, email: true, initials: true, color: true } }).catch(() => []);
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-leto-ink text-white p-12 relative overflow-hidden">
        <div className="absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-leto-green/10 blur-3xl" />
        <div className="absolute right-24 top-24 h-72 w-72 rounded-full bg-leto-green/5 blur-2xl" />
        <Image src="/brand/leto-logo.svg" alt="Leto Capital" width={200} height={60} priority />
        <div className="relative">
          <p className="text-leto-green text-xs font-semibold tracking-[0.25em] uppercase mb-4">Special Situations</p>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight max-w-md">Leto Pipeline</h1>
          <p className="mt-3 text-lg text-white/70 max-w-md">Origination &amp; Opportunities CRM</p>
          <p className="mt-8 text-sm text-white/50 max-w-md leading-relaxed">Acompanhamento de originação, pipeline de oportunidades e relacionamento com originadores da Leto Capital.</p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Leto Capital · uso interno</p>
      </div>
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Image src="/brand/leto-logo-dark.svg" alt="Leto Capital" width={160} height={48} priority />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Entrar</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Escolha seu nome e digite a senha da equipe.</p>
          <LoginForm callbackUrl={sp.callbackUrl} initialError={sp.error} users={users} />
        </div>
      </div>
    </div>
  );
}
