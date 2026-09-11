/**
 * Creates a fresh test database, applies migrations and imports the workbook once.
 * Integration tests run against real PostgreSQL to validate the migration end to end.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/leto_pipeline_test?schema=public";
const WORKBOOK = process.env.PIPELINE_WORKBOOK ?? "./data/Acompanhamento do Pipe_20260817.xlsx";

export default async function setup() {
  const dbName = TEST_URL.split("/").pop()!.split("?")[0];
  const adminUrl = TEST_URL.replace(/\/[^/]+(\?.*)?$/, "/postgres");
  execSync(
    `psql "${adminUrl}" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();" -c "DROP DATABASE IF EXISTS \\"${dbName}\\";" -c "CREATE DATABASE \\"${dbName}\\";"`,
    { stdio: "pipe" },
  );
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: TEST_URL }, stdio: "pipe" });
  process.env.DATABASE_URL = TEST_URL;
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
  const { seedReferenceData } = await import("../src/lib/seed-reference");
  const bcrypt = await import("bcryptjs");
  await seedReferenceData(prisma, { passwordHash: await bcrypt.default.hash("test-password", 4) });
  if (existsSync(WORKBOOK)) {
    const { importPipeline } = await import("../src/lib/import/importer");
    await importPipeline(prisma, { filePath: WORKBOOK });
  } else {
    console.warn(`Workbook ${WORKBOOK} not found — integration tests depending on it will be skipped.`);
  }
  await prisma.$disconnect();
}
