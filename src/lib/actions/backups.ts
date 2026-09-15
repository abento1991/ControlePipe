"use server";

import { revalidatePath } from "next/cache";
import { actionAdmin } from "../session";
import { runBackupEmail } from "../jobs/backup-email";
import { ok, fail, errorMessage, type ActionResult } from "./result";

/** Admin-only: builds and e-mails the backup right now (to the configured recipients, or the ones given). */
export async function sendBackupNow(recipients?: string[]): Promise<ActionResult<{ runId: string }>> {
  try {
    const user = await actionAdmin();
    const clean = (recipients ?? []).map((r) => r.trim()).filter((r) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r));
    const res = await runBackupEmail({ trigger: "manual", userId: user.id, recipients: clean.length ? clean : undefined });
    revalidatePath("/admin/backups");
    if (!res.ran || !res.runId) return fail("Não foi possível iniciar o envio.");
    if (res.error) return fail(res.error);
    return ok({ runId: res.runId });
  } catch (e) {
    return fail(errorMessage(e));
  }
}
