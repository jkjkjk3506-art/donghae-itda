import { NextResponse } from "next/server";
import { sbServer } from "@/lib/supabase";
import { allow, ipOf } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  if (!allow("iq:" + ipOf(req), 10, 600_000)) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요" }, { status: 429 });
  const name = String(b.citizen_name || "").trim().slice(0, 30);
  const phone = String(b.citizen_phone || "").replace(/[^0-9-]/g, "").slice(0, 15);
  if (!name || phone.replace(/-/g, "").length < 9) return NextResponse.json({ error: "이름과 연락처를 확인해 주세요" }, { status: 400 });
  if (!b.consent) return NextResponse.json({ error: "개인정보 제공 동의가 필요해요" }, { status: 400 });
  const ids: number[] = (Array.isArray(b.business_ids) ? b.business_ids : [b.business_id]).map(Number).filter(Boolean).slice(0, 5);
  if (!ids.length) return NextResponse.json({ error: "업체를 선택해 주세요" }, { status: 400 });
  const rows = ids.map((business_id) => ({
    consultation_id: b.consultation_id || null, business_id, citizen_name: name, citizen_phone: phone,
    dong: b.dong || null, work_code: b.work_code || null, message: String(b.message || "").slice(0, 500), consent: true,
  }));
  const { error } = await sbServer().from("inquiries").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sent: rows.length });
}
