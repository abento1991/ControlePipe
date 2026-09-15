import { describe, expect, it } from "vitest";
import { ADMIN_TASK_CATEGORIES, ADMIN_TASK_STATUSES, LEGACY_ADMIN_TASKS } from "@/lib/normalization/admin-tasks";

describe("admin task catalogue", () => {
  it("has unique keys", () => {
    expect(new Set(ADMIN_TASK_CATEGORIES.map((c) => c.key)).size).toBe(ADMIN_TASK_CATEGORIES.length);
    expect(new Set(ADMIN_TASK_STATUSES.map((s) => s.key)).size).toBe(ADMIN_TASK_STATUSES.length);
  });
  it("lists each legacy row once with a known category", () => {
    const ids = LEGACY_ADMIN_TASKS.map((t) => t.legacyId);
    expect(new Set(ids).size).toBe(ids.length);
    const cats = new Set(ADMIN_TASK_CATEGORIES.map((c) => c.key));
    for (const t of LEGACY_ADMIN_TASKS) expect(cats.has(t.category)).toBe(true);
  });
});
