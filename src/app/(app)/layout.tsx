import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [types, statuses, users] = await Promise.all([
    prisma.operationType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, category: true, color: true } }),
    prisma.opportunityStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, key: true, name: true, group: true, color: true } }),
    prisma.user.findMany({ where: { isArchived: false, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, initials: true, color: true } }),
  ]);
  return (
    <AppShell user={user} reference={{ types, statuses, users }}>
      {children}
    </AppShell>
  );
}
