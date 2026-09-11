import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <p className="text-2xs font-semibold uppercase tracking-wider text-leto-green-deep">404</p>
      <h1 className="text-xl font-semibold mt-1">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground mt-1">O registro pode ter sido removido ou o endereço está incorreto.</p>
      <Link href="/dashboard" className="mt-4 text-sm underline">
        Voltar ao dashboard
      </Link>
    </div>
  );
}
