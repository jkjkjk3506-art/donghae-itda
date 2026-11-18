import { NextResponse } from "next/server";
import { planFor } from "@/lib/match";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.work_code || !b?.housing) return NextResponse.json({ error: "work_code, housing 필요" }, { status: 400 });
  try {
    const r = await planFor({ work_code: String(b.work_code), housing: String(b.housing), dong: b.dong || undefined,
      floors: ["low", "high"].includes(b.floors) ? b.floors : undefined, conditions: Array.isArray(b.conditions) ? b.conditions.map(String) : [] });
    const { recipients, ...rest } = r;
    return NextResponse.json({ ...rest, recipient_count: recipients.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
