import { NextResponse } from "next/server";
import { runMatch } from "@/lib/match";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.work_code || !b?.housing) return NextResponse.json({ error: "work_code, housing 필요" }, { status: 400 });
  try {
    const r = await runMatch({
      work_code: String(b.work_code), housing: String(b.housing), dong: b.dong || undefined,
      conditions: Array.isArray(b.conditions) ? b.conditions.map(String) : [],
      channel: ["citizen", "counter", "demo"].includes(b.channel) ? b.channel : "citizen",
      input_text: b.input_text, has_photo: !!b.has_photo, diagnosis: b.diagnosis,
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
