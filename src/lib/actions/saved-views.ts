"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { actionUser } from "../session";
import { ok, fail, errorMessage, type ActionResult } from "./result";

export async function saveView(input: { name: string; page: string; filters: Record<string, unknown>; isShared?: boolean }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await actionUser();
    const name = input.name.trim();
    if (!name) return fail("Dê um nome à view.");
    const existing = await prisma.savedView.findFirst({ where: { userId: user.id, page: input.page, name } });
    const view = existing
      ? await prisma.savedView.update({ where: { id: existing.id }, data: { filters: input.filters as object, isShared: !!input.isShared } })
      : await prisma.savedView.create({ data: { name, page: input.page, filters: input.filters as object, isShared: !!input.isShared, userId: user.id } });
    revalidatePath(`/${input.page}`);
    return ok({ id: view.id });
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function deleteView(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await actionUser();
    const view = await prisma.savedView.findUnique({ where: { id } });
    if (!view) return fail("View não encontrada.");
    if (view.userId !== user.id && user.role !== "ADMIN") return fail("Sem permissão.");
    await prisma.savedView.delete({ where: { id } });
    revalidatePath(`/${view.page}`);
    return ok(undefined);
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function listViews(page: string) {
  const user = await actionUser();
  return prisma.savedView.findMany({ where: { page, OR: [{ userId: user.id }, { isShared: true }] }, orderBy: { name: "asc" }, include: { user: { select: { name: true } } } });
}
