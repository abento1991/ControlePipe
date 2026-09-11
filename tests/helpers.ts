import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";

export const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/leto_pipeline_test?schema=public";
export const WORKBOOK = process.env.PIPELINE_WORKBOOK ?? "./data/Acompanhamento do Pipe_20260817.xlsx";
export const hasWorkbook = existsSync(WORKBOOK);

let client: PrismaClient | null = null;
export function testPrisma(): PrismaClient {
  if (!client) client = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
  return client;
}
