import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; name: string; email: string; role: "ADMIN" | "USER"; initials: string; color: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
    initials: session.user.initials,
    color: session.user.color,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard?forbidden=1");
  return user;
}

export class ForbiddenError extends Error {
  constructor(message = "Sem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** For server actions: throws instead of redirecting. */
export async function actionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ForbiddenError("Sessão expirada. Faça login novamente.");
  return user;
}

export async function actionAdmin(): Promise<SessionUser> {
  const user = await actionUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem executar esta ação.");
  return user;
}
