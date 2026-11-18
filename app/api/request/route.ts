import { NextResponse } from "next/server";
import { planFor } from "@/lib/match";
import { sbServer } from "@/lib/supabase";
import { allow, ipOf } from "@/lib/ratelimit";

/** 견적 요청 만들기: 받을 업체는 서버에서 다시 골라 조작을 막음 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.work_code || !b?.housing) return NextResponse.json({ error: "요청 내용을 확인해 주세요" }, { status: 400 });
  if (!allow("rq:" + ipOf(req), 8, 600_000)) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요" }, { status: 429 });
  try {
    const conditions = Array.isArray(b.conditions) ? b.conditions.map(String) : [];
    const floors = ["low", "high"].includes(b.floors) ? b.floors : undefined;
    const plan = await planFor({ work_code: String(b.work_code), housing: String(b.housing), dong: b.dong || undefined, floors, conditions });
    const { data, error } = await sbServer().rpc("create_request", { p: {
      channel: b.channel === "counter" ? "counter" : "citizen", work_code: plan.work.code, housing: b.housing, floors: floors || null, dong: b.dong || null,
      text: String(b.text || "").slice(0, 800), photo: typeof b.photo === "string" && b.photo.startsWith("data:image/") ? b.photo : null,
      diagnosis: b.diagnosis ?? null, program_ids: plan.programs.map((p) => p.id), recipients: plan.recipients.map((x) => x.id),
      citizen_name: String(b.citizen_name || "").trim(), citizen_phone: String(b.citizen_phone || "").replace(/[^0-9-]/g, ""), consent: !!b.consent,
    } });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
