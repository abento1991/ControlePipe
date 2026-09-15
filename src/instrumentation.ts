/**
 * Next.js instrumentation hook: runs once when the server starts. Hosts the in-process scheduler for the
 * e-mailed backup (checks every 10 minutes; the job itself is idempotent per period).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_JOBS === "1") return;
  const { backupTick } = await import("./lib/jobs/backup-email");
  const tick = () => backupTick().catch((e) => console.error("[jobs] backup tick failed:", e instanceof Error ? e.message : e));
  setTimeout(tick, 60_000);
  setInterval(tick, 10 * 60_000);
}
