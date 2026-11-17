import { sbServer } from "./supabase";
import type { Business, LegalNote, MatchResult, Program, WorkType } from "./types";
import { REQ_LABEL } from "./types";

export type MatchInput = {
  work_code: string; housing: string; dong?: string; conditions: string[];
  audience?: "citizen" | "contractor"; channel?: "citizen" | "counter" | "demo";
  input_text?: string; has_photo?: boolean; diagnosis?: unknown;
};

const FACILITY = new Set(["어린이집", "노인장애인시설", "지역아동센터", "사회복지시설"]);

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** 지원사업: 규칙 기반 (AI가 사업을 만들어내지 못하게 DB에서만 고름) */
export function pickPrograms(all: Program[], work: WorkType, inp: MatchInput) {
  const aud = FACILITY.has(inp.housing) ? "facility" : inp.housing === "상가영업장" ? "store" : "citizen";
  const tags = new Set(work.program_tags);
  const ok: { p: Program; score: number }[] = [];
  const maybe: { p: Program; why: string }[] = [];
  for (const p of all) {
    if (p.audience !== aud) continue;
    const overlap = p.work_types.filter((t) => tags.has(t)).length;
    if (!overlap) continue;
    if (p.building_types.length && !p.building_types.includes(inp.housing)) continue;
    const missing: string[] = [];
    let blocked = false;
    for (const r of p.requires) {
      if (r.startsWith("district:")) { if (inp.dong !== r.slice(9)) blocked = true; continue; }
      if (!inp.conditions.includes(r)) missing.push(REQ_LABEL[r] || r);
    }
    if (blocked) continue;
    const score = overlap * 10 + (p.donghae_status === "시행확인" || p.donghae_status === "지구한정" ? 5 : 0) + (p.requires.length ? 3 : 0);
    if (missing.length) maybe.push({ p, why: `${missing.join("·")}이면 신청 가능` });
    else ok.push({ p, score });
  }
  ok.sort((a, b) => b.score - a.score);
  return { programs: ok.slice(0, 6).map((x) => x.p), maybe: maybe.slice(0, 4) };
}

/** 업체: 실적 많은 곳 3 + 신규 2, 매번 순서를 섞어 특정 업체 쏠림 방지 */
export function pickBusinesses(all: Business[], work: WorkType) {
  const fit = all.filter((b) => work.db_categories.includes(b.category) || b.work_codes?.includes(work.code));
  const demo = fit.filter((b) => b.is_demo);
  const real = fit.filter((b) => !b.is_demo);
  const est = real.filter((b) => !b.is_newcomer).sort((a, b) => b.trust_level - a.trust_level || b.public_works_total - a.public_works_total);
  const pool = est.slice(0, Math.max(8, Math.ceil(est.length / 3)));
  const newbies = real.filter((b) => b.is_newcomer && b.phone);
  const picked = [...shuffle(pool).slice(0, 3), ...shuffle(newbies).slice(0, demo.length ? 1 : 2), ...demo];
  return picked;
}

export function pickLegal(all: LegalNote[], work_code: string, audience: "citizen" | "contractor") {
  return all
    .filter((n) => (n.work_codes.includes("*") || n.work_codes.includes(work_code)) && (n.audience === "both" || n.audience === audience))
    .sort((a, b) => ({ danger: 0, warn: 1, info: 2 }[a.level] - { danger: 0, warn: 1, info: 2 }[b.level]) || a.sort - b.sort);
}

export async function runMatch(inp: MatchInput): Promise<MatchResult> {
  const db = sbServer();
  const [w, p, b, l] = await Promise.all([
    db.from("work_types").select("*"),
    db.from("programs").select("*").eq("active", true),
    db.from("businesses").select("id,name,category,sub_category,trust_level,source_count,phone,address,licenses,biz_status,public_works,public_works_total,homepage,is_newcomer,is_demo,work_codes,intro").eq("visible", true),
    db.from("legal_notes").select("*"),
  ]);
  if (w.error || p.error || b.error || l.error) throw new Error((w.error || p.error || b.error || l.error)!.message);
  const work = (w.data as WorkType[]).find((x) => x.code === inp.work_code) || (w.data as WorkType[]).find((x) => x.code === "OTHER")!;
  const { programs, maybe } = pickPrograms(p.data as Program[], work, inp);
  const businesses = pickBusinesses(b.data as Business[], work);
  const legal = pickLegal(l.data as LegalNote[], work.code, inp.audience || "citizen");
  const consultation_id = crypto.randomUUID();
  await db.from("consultations").insert({
    id: consultation_id, channel: inp.channel || "citizen", dong: inp.dong || null, housing: inp.housing,
    conditions: inp.conditions, input_text: (inp.input_text || "").slice(0, 500), has_photo: !!inp.has_photo,
    diagnosis: inp.diagnosis ?? null, work_code: work.code, program_ids: programs.map((x) => x.id), business_ids: businesses.map((x) => x.id),
  });
  return { consultation_id, work, programs, maybe_programs: maybe, businesses, legal };
}
