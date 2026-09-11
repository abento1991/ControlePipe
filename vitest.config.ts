import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/leto_pipeline_test?schema=public", AUTH_SECRET: "test-secret" },
  },
});
