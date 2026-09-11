"use server";

import { timingSafeEqual } from "node:crypto";
import { prisma } from "../db";

export interface LoginUserOption {
  name: string;
  email: string;
  initials: string | null;
  color: string | null;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Step 1 of the shared-password login: validates the team password without creating a session.
 * The team roster is only returned after the password is confirmed, so the login screen never lists names.
 */
export async function verifySharedPassword(password: string): Promise<{ ok: true; users: LoginUserOption[] } | { ok: false }> {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword || !password || !safeEqual(password, appPassword)) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: false };
  }
  const users = await prisma.user.findMany({
    where: { isActive: true, isArchived: false, email: { not: "equipe@letocapital.com.br" } },
    orderBy: { name: "asc" },
    select: { name: true, email: true, initials: true, color: true },
  });
  return { ok: true, users };
}
