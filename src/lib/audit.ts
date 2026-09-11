import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

function serialize(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

type Tx = PrismaClient | Prisma.TransactionClient;

export async function logAudit(
  tx: Tx | null,
  params: { entity: string; entityId: string; opportunityId?: string | null; action: string; userId?: string | null; changes: AuditChange[] },
) {
  const client = tx ?? defaultPrisma;
  const rows = params.changes
    .filter((c) => serialize(c.oldValue) !== serialize(c.newValue))
    .map((c) => ({
      entity: params.entity,
      entityId: params.entityId,
      opportunityId: params.opportunityId ?? null,
      action: params.action,
      field: c.field,
      oldValue: serialize(c.oldValue),
      newValue: serialize(c.newValue),
      userId: params.userId ?? null,
    }));
  if (!rows.length) return;
  await client.auditLog.createMany({ data: rows });
}

/** Computes the changed fields between two plain objects for the given keys. */
export function diffFields<T extends Record<string, unknown>>(before: T, after: Partial<T>, keys: (keyof T)[]): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const k of keys) {
    if (!(k in after)) continue;
    const a = before[k];
    const b = after[k];
    if (serialize(a) !== serialize(b)) changes.push({ field: String(k), oldValue: a, newValue: b });
  }
  return changes;
}
