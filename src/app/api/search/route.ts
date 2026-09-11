import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { globalSearch } from "@/lib/queries/search";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await globalSearch(q));
}
