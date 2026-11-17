import { sbServer } from "./supabase";
import type { Business, LegalNote, MatchResult, Program, WorkType } from "./types";
import { REQ_LABEL } from "./types";

export type MatchInput = {
  work_code: string; housing: string; dong?: string; floors?: string; conditions: string[];
  audience?: "citizen" | "contractor"; channel?: "citizen" | "counter";
  input_text?: string; has_photo?: boolean; diagnosis?: unknown; consultation_id?: string;
};

const FACILITY = new Set(["어린이집", "노인장애인시설", "지역아동센터", "사회복지시설"]);

/** 공정과 실제로 맞는 업체를 먼저 고르기 위한 낱말 (상호·세부업종·면허·실적에서 찾음) */
const MATCH_KW: Record<string, string[]> = {
  LEAK_ROOF: ["방수"], WALL_CRACK: ["도장", "페인트"], WINDOW_LEAK: ["코킹", "실링", "방수"], MOLD: ["단열", "도배", "결로", "도장"],
  WINDOW: ["창호", "샷시", "새시", "유리"], BOILER: ["보일러", "난방"], PIPE_LEAK: ["배관", "누수", "설비"],
  BATH_KITCHEN: ["욕실", "타일", "주방", "인테리어"], WALLPAPER_FLOOR: ["도배", "장판"], ELECTRIC: ["전기"],
  ROOF_SLATE: ["철거", "지붕", "석면"], ACCESS: ["인테리어", "집수리", "실내건축"], STORE: ["인테리어", "실내건축"],
};

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

/** 업체: 공정에 맞는 기존 업체 3 + 신규 2. 후보군 안에서 매번 무작위로 뽑아 특정 업체 쏠림을 막음 */
export function pickBusinesses(all: Business[], work: WorkType) {
  const kw = MATCH_KW[work.code] || [];
  const hit = (b: Business) => {
    if (b.work_codes?.includes(work.code)) return 2;
    const t = `${b.name} ${b.sub_category || ""} ${b.licenses || ""} ${b.public_works || ""}`;
    return kw.some((k) => t.includes(k)) ? 1 : 0;
  };
  const fit = all.filter((b) => work.db_categories.includes(b.category) || b.work_codes?.includes(work.code));
  const demo = fit.filter((b) => b.is_demo);
  const real = fit.filter((b) => !b.is_demo && b.phone);
  const est = real.filter((b) => !b.is_newcomer).sort((a, b) => hit(b) - hit(a) || b.trust_level - a.trust_level);
  const strong = est.filter((b) => hit(b) > 0);
  const pool = strong.length >= 6 ? strong : est.slice(0, Math.max(8, strong.length));
  const nb = real.filter((b) => b.is_newcomer);
  const nbStrong = nb.filter((b) => hit(b) > 0);
  const newbies = nbStrong.length >= 4 ? nbStrong : nb;
  return [...shuffle(pool).slice(0, 3), ...shuffle(newbies).slice(0, demo.length ? 1 : 2), ...demo];
}

const HOUSING_ONLY: Record<string, string[]> = {
  "L-APT": ["아파트단지", "다가구다세대"],
  "L-KIDS-PAINT": ["어린이집", "지역아동센터"],
};
const HIGH_ONLY = ["L-FACADE-FIRE", "L-ROPE"];
const RANK = { danger: 0, warn: 1, info: 2 };

/** 법·안전 안내: 공정·건물 종류·층수로 고르고, 입력으로 확인된 항목은 '내 경우 해당' 표시 */
export function pickLegal(all: LegalNote[], work_code: string, audience: "citizen" | "contractor", housing?: string, floors?: string) {
  return all
    .filter((n) => (n.work_codes.includes("*") || n.work_codes.includes(work_code)) && (n.audience === "both" || n.audience === audience))
    .filter((n) => !housing || !HOUSING_ONLY[n.code] || HOUSING_ONLY[n.code].includes(housing))
    .filter((n) => !(floors === "low" && HIGH_ONLY.includes(n.code)))
    .map((n) => ({ ...n, applies: (floors === "high" && HIGH_ONLY.includes(n.code)) || (!!housing && !!HOUSING_ONLY[n.code]) }))
    .sort((a, b) => Number(b.applies) - Number(a.applies) || RANK[a.level] - RANK[b.level] || a.sort - b.sort);
}

export async function runMatch(inp: MatchInput): Promise<MatchResult> {
  const db = sbServer();
  const [w, p, b, l] = await Promise.all([
    db.from("work_types").select("*").order("sort"),
    db.from("programs").select("*").eq("active", true),
    db.from("businesses").select("id,name,category,sub_category,trust_level,source_count,phone,address,licenses,biz_status,public_works,public_works_total,homepage,is_newcomer,is_demo,work_codes,intro").eq("visible", true),
    db.from("legal_notes").select("*"),
  ]);
  const err = w.error || p.error || b.error || l.error;
  if (err) throw new Error(err.message);
  const works = w.data as WorkType[];
  const work = works.find((x) => x.code === inp.work_code) || works.find((x) => x.code === "OTHER")!;
  const { programs, maybe } = pickPrograms(p.data as Program[], work, inp);
  const businesses = pickBusinesses(b.data as Business[], work);
  const legal = pickLegal(l.data as LegalNote[], work.code, inp.audience || "citizen", inp.housing, inp.floors);
  const consultation_id = /^[0-9a-f-]{36}$/.test(inp.consultation_id || "") ? inp.consultation_id! : crypto.randomUUID();
  // 기록 실패가 안내를 막지 않게 함
  await db.rpc("log_consultation", { p: {
    id: consultation_id, channel: inp.channel || "citizen", dong: inp.dong || null, housing: inp.housing, floors: inp.floors || null,
    conditions: inp.conditions, input_text: inp.input_text || "", has_photo: !!inp.has_photo, diagnosis: inp.diagnosis ?? null,
    work_code: work.code, program_ids: programs.map((x) => x.id), business_ids: businesses.map((x) => x.id),
  } }).then(() => null, () => null);
  return { consultation_id, work, programs, maybe_programs: maybe, businesses, legal, all_works: works.map(({ code, name }) => ({ code, name })) };
}
