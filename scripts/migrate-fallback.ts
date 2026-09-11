/**
 * Applies pending Prisma migrations without the Prisma CLI.
 * Mirrors `prisma migrate deploy`: reads each migration.sql under prisma/migrations, skips the ones already
 * recorded in _prisma_migrations, applies the rest in order and records them.
 * Self-healing: if a migration is recorded but its objects are missing (interrupted run), it is re-applied
 * statement by statement, ignoring "already exists" errors.
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const SENTINEL_TABLE = "Opportunity";

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((chunk) => chunk.split(/\r?\n/).filter((line) => !line.trim().startsWith("--")).join("\n").trim())
    .filter(Boolean);
}

async function main() {
  const dir = process.argv[2] ?? join(process.cwd(), "prisma", "migrations");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL,
      logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
    let applied = new Set((await prisma.$queryRawUnsafe<{ migration_name: string }[]>(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`)).map((r) => r.migration_name));
    const sentinel = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists`, SENTINEL_TABLE);
    const names = readdirSync(dir).filter((n) => existsSync(join(dir, n, "migration.sql"))).sort();
    const sqlByName = new Map(names.map((name) => [name, readFileSync(join(dir, name, "migration.sql"), "utf8")] as const));
    const migrationTables = [...sqlByName.values()].flatMap((sql) => [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((m) => m[1]));
    const migrationTypes = [...sqlByName.values()].flatMap((sql) => [...sql.matchAll(/CREATE TYPE "([^"]+)"/g)].map((m) => m[1]));
    const existingTables = new Set((await prisma.$queryRawUnsafe<{ table_name: string }[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)).map((r) => r.table_name));
    const existingTypes = new Set((await prisma.$queryRawUnsafe<{ typname: string }[]>(`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'`)).map((r) => r.typname));
    const partial = migrationTables.some((t) => existingTables.has(t)) || migrationTypes.some((t) => existingTypes.has(t));
    if (!sentinel[0]?.exists && (applied.size > 0 || partial)) {
      // An earlier run left the schema half-created (recorded without objects, or objects without a record). The core
      // table is missing, so there is no business data yet: drop the partial objects and re-apply everything from scratch.
      console.log(`[migrate] table "${SENTINEL_TABLE}" is missing but the schema is partially created — repairing (dropping partial objects, re-applying all migrations)`);
      for (const table of migrationTables) await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      for (const type of migrationTypes) await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${type}" CASCADE`);
      await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations"`);
      applied = new Set();
    }
    let count = 0;
    for (const name of names) {
      if (applied.has(name)) continue;
      const sql = sqlByName.get(name)!;
      const statements = splitStatements(sql);
      console.log(`[migrate] applying ${name} (${statements.length} statements)`);
      let skipped = 0;
      for (const st of statements) {
        try {
          await prisma.$executeRawUnsafe(st);
        } catch (e) {
          const msg = (e as Error).message;
          if (/already exists/i.test(msg)) {
            skipped++;
            continue;
          }
          throw e;
        }
      }
      const checksum = createHash("sha256").update(sql).digest("hex");
      const id = createHash("md5").update(name + String(Date.now())).digest("hex").slice(0, 8) + "-0000-4000-8000-" + createHash("md5").update(name).digest("hex").slice(0, 12);
      await prisma.$executeRawUnsafe(`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count) VALUES ($1, $2, now(), $3, NULL, now(), $4)`, id, checksum, name, statements.length);
      if (skipped) console.log(`[migrate]   ${skipped} statement(s) skipped (objects already existed)`);
      count++;
    }
    const tables = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*)::bigint AS n FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log(`[migrate] done — ${count} migration(s) applied, ${names.length - count} already present, ${Number(tables[0]?.n ?? 0)} tables in schema public`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[migrate] FAILED:", (e as Error).message);
  process.exit(1);
});
