/**
 * Applies pending Prisma migrations without the Prisma CLI (fallback for slim containers).
 * Mirrors `prisma migrate deploy`: reads each migration.sql under prisma/migrations, skips the ones already
 * recorded in _prisma_migrations, applies the rest in order and records them.
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

async function main() {
  const dir = process.argv[2] ?? join(process.cwd(), "prisma", "migrations");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL,
      logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
    const applied = new Set((await prisma.$queryRawUnsafe<{ migration_name: string }[]>(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`)).map((r) => r.migration_name));
    const names = readdirSync(dir).filter((n) => existsSync(join(dir, n, "migration.sql"))).sort();
    let count = 0;
    for (const name of names) {
      if (applied.has(name)) continue;
      const sql = readFileSync(join(dir, name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const id = createHash("md5").update(name + Date.now()).digest("hex").slice(0, 8) + "-0000-4000-8000-" + createHash("md5").update(name).digest("hex").slice(0, 12);
      console.log(`[migrate] applying ${name}`);
      await prisma.$transaction(async (tx) => {
        const statements = sql
          .split(/;\s*(?:\r?\n|$)/)
          .map((chunk) => chunk.split(/\r?\n/).filter((line) => !line.trim().startsWith("--")).join("\n").trim())
          .filter(Boolean);
        for (const st of statements) await tx.$executeRawUnsafe(st);
        await tx.$executeRawUnsafe(`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count) VALUES ($1, $2, now(), $3, NULL, now(), $4)`, id, checksum, name, statements.length);
      });
      count++;
    }
    console.log(`[migrate] done — ${count} migration(s) applied, ${names.length - count} already present`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[migrate] FAILED:", e.message);
  process.exit(1);
});
