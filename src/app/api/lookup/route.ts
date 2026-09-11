import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchCompanies, searchContacts } from "@/lib/queries/originators";
import { COMPANY_CATEGORY_LABELS } from "@/lib/normalization/originators";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");
  const q = sp.get("q") ?? "";
  if (kind === "company") {
    const rows = await searchCompanies(q);
    return NextResponse.json(rows.map((r) => ({ id: r.id, label: r.name, hint: COMPANY_CATEGORY_LABELS[r.category as keyof typeof COMPANY_CATEGORY_LABELS] })));
  }
  if (kind === "contact") {
    const rows = await searchContacts(q, sp.get("companyId"));
    return NextResponse.json(rows.map((r) => ({ id: r.id, label: r.fullName, hint: r.company?.name ?? null })));
  }
  return NextResponse.json([]);
}
