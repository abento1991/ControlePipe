import { describe, expect, it } from "vitest";
import { scheduledBucket, type BackupSchedule } from "@/lib/jobs/backup-email";

const weekly: BackupSchedule = { enabled: true, recipients: ["a@b.c"], frequency: "weekly", day: 1, hour: 6, provider: "smtp" };
const daily: BackupSchedule = { ...weekly, frequency: "daily" };

describe("backup schedule buckets (São Paulo time)", () => {
  it("weekly: only on the configured weekday, from the configured hour", () => {
    expect(scheduledBucket(new Date("2026-09-14T08:30:00-03:00"), weekly)).toBe("week-2026-09-14"); // Monday 08:30
    expect(scheduledBucket(new Date("2026-09-14T05:59:00-03:00"), weekly)).toBeNull(); // Monday before 06:00
    expect(scheduledBucket(new Date("2026-09-15T10:00:00-03:00"), weekly)).toBeNull(); // Tuesday
  });
  it("daily: one bucket per local day after the hour", () => {
    expect(scheduledBucket(new Date("2026-09-15T06:00:00-03:00"), daily)).toBe("2026-09-15");
    expect(scheduledBucket(new Date("2026-09-15T02:00:00-03:00"), daily)).toBeNull();
    // 23:30 UTC is still 20:30 in São Paulo → same local day
    expect(scheduledBucket(new Date("2026-09-15T23:30:00Z"), daily)).toBe("2026-09-15");
  });
});
