/**
 * Re-runnable import of the historical workbook.
 *   npm run import:pipeline                      → uses PIPELINE_WORKBOOK from .env
 *   npm run import:pipeline -- ./path/to.xlsx    → explicit path
 * Idempotent: rows are identified by (workbook, sheet, row) and opportunities by legacy #.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { importPipeline } from "../src/lib/import/importer";
import { renderMigrationReport } from "../src/lib/import/report";

async function main() {
  const filePath = resolve(process.argv[2] ?? process.env.PIPELINE_WORKBOOK ?? "./data/Acompanhamento do Pipe_20260817.xlsx");
  const prisma = new PrismaClient();
  const started = Date.now();
  try {
    const summary = await importPipeline(prisma, { filePath, log: (m) => console.log(`[import] ${m}`) });
    mkdirSync("reports", { recursive: true });
    writeFileSync("reports/migration-report.md", renderMigrationReport(summary));
    writeFileSync("reports/migration-report.json", JSON.stringify(summary, null, 2));
    console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s. Report: reports/migration-report.md`);
    console.log(`created=${summary.created} updated=${summary.updated} unchanged=${summary.unchanged} errors=${summary.errors} issues=${summary.issuesTotal}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
