export type WorkType = {
  code: string; name: string; plain_examples: string[]; defect_hint: string | null;
  db_categories: string[]; program_tags: string[]; license_note: string | null; sort: number; grp?: string | null;
};
export type Diagnosis = {
  work_code: string; work_name?: string; defect: string; plain_explain: string;
  confidence: number; questions: string[]; urgent: boolean; source: "gemini" | "keyword" | "demo";
  problems?: string[];   // 사진·설명에서 보이는 문제
  cause?: string;        // 추정 원인
  method?: string[];     // 필요한 공사 순서
  risk?: string;         // 그대로 두면
  severity?: "low" | "mid" | "high";
};
export type Program = {
  id: string; name: string; operator: string | null; audience: string; donghae_status: string | null;
  verification_status: string | null; work_types: string[]; building_types: string[]; support_type: string[];
  requires: string[]; amount_text: string | null; schedule_2026: string | null; expected_next: string | null;
  apply_where: string | null; contact: string | null; contractor_opportunity: string | null;
  official_source_url: string[]; eligibility: Record<string, string> | null; active?: boolean;
  level?: string | null; keywords?: string[]; verified_note?: string | null; verified_date?: string | null; updated_at?: string;
  notice_title?: string | null; notice_no?: string | null; apply_start?: string | null; apply_end?: string | null;
  notice_files?: { name: string; path: string; url: string }[]; updated_by?: string | null;
};
export type Business = {
  id: number; name: string; category: string; sub_category: string | null; trust_level: number;
  source_count: number | null; phone: string | null; address: string | null; licenses: string | null;
  biz_status: string | null; public_works: string | null; public_works_total: number; homepage: string | null;
  is_newcomer: boolean; is_demo: boolean; work_codes: string[]; intro: string | null; visible?: boolean;
};
export type LegalNote = {
  code: string; work_codes: string[]; audience: string; level: "info" | "warn" | "danger";
  condition: string | null; title: string; body: string; law: string | null; sort: number;
  applies?: boolean; // 입력한 조건으로 '내 경우 해당'이 확인된 항목
};
export type MatchResult = {
  consultation_id: string; work: WorkType; programs: Program[]; maybe_programs: { p: Program; why: string }[];
  businesses: Business[]; legal: LegalNote[]; all_works: { code: string; name: string }[];
};
export const FLOORS = [
  { v: "low", label: "1~2층" },
  { v: "high", label: "3층 이상" },
];
export const HOUSING = [
  { v: "단독주택", label: "단독주택" },
  { v: "다가구다세대", label: "빌라·다세대" },
  { v: "아파트단지", label: "아파트" },
  { v: "상가영업장", label: "가게·식당" },
  { v: "어린이집", label: "어린이집" },
  { v: "노인장애인시설", label: "복지시설" },
];
export const CONDITIONS = [
  { v: "low_income", label: "기초생활·차상위·저소득" },
  { v: "senior", label: "65세 이상 어르신" },
  { v: "disabled", label: "장애인 가구" },
  { v: "rural", label: "농어촌 지역(읍·면·농촌주택)" },
  { v: "youth", label: "청년(39세 이하)" },
];
export const DONGS = ["천곡동","송정동","북삼동","부곡동","동호동","발한동","묵호동","북평동","망상동","삼화동"];
export const REQ_LABEL: Record<string, string> = {
  low_income: "저소득 가구", senior: "65세 이상", disabled: "장애인 가구", rural: "농어촌 주택", youth: "청년",
};

export type Plan = {
  work: WorkType; programs: Program[]; maybe_programs: { p: Program; why: string }[];
  legal: LegalNote[]; recipient_count: number; all_works: { code: string; name: string; grp?: string | null }[];
};
export type QuoteBiz = {
  id: number; name: string; category: string; phone: string | null; licenses: string | null; public_works?: string | null;
  trust_level: number; source_count?: number | null; is_newcomer: boolean; is_demo: boolean; intro?: string | null; joined?: boolean;
};
export type Quote = {
  id: string; created_at: string; price_min: number; price_max: number; visit: string | null; period: string | null;
  message: string | null; status: "sent" | "chosen" | "declined"; business: QuoteBiz;
};
export type RequestView = {
  request: {
    id: string; created_at: string; work_code: string; work_name: string; housing: string; floors: string | null; dong: string | null;
    text: string | null; photo: string | null; diagnosis: Diagnosis | null; program_ids: string[]; status: "open" | "chosen" | "closed";
    chosen_quote: string | null; citizen_name: string | null;
  };
  quotes: Quote[]; recipients: QuoteBiz[];
};
export const won = (man: number) => (man >= 10000 ? `${(man / 10000).toFixed(man % 10000 ? 1 : 0)}억` : `${man.toLocaleString()}만`) + "원";

/** 신청 상태: 날짜가 있으면 날짜로, 없으면 일정 문구로 판단 */
export function applyStatus(p: Program): { label: string; tone: "open" | "soon" | "closed" | "always" | "unknown"; dday?: number } {
  const today = new Date(new Date().toDateString()).getTime();
  const d = (x?: string | null) => (x ? new Date(x + "T00:00:00").getTime() : null);
  const s = d(p.apply_start), e = d(p.apply_end);
  if (s || e) {
    if (s && today < s) return { label: `신청 예정 (${p.apply_start} 시작)`, tone: "soon" };
    if (e && today > e) return { label: "신청 마감", tone: "closed" };
    const dday = e ? Math.round((e - today) / 86400000) : undefined;
    return { label: dday !== undefined ? `신청 중 · 마감 D-${dday}` : "신청 중", tone: "open", dday };
  }
  if (/연중|상시|수시|소진 시/.test(p.schedule_2026 || "")) return { label: "연중 신청", tone: "always" };
  return { label: "일정 확인 필요", tone: "unknown" };
}
export const ELIG_LABEL: Record<string, string> = {
  income: "소득 기준", building: "건물 조건", location: "지역", owner_or_tenant: "거주 형태", extra: "추가 지원", age: "나이",
  household: "가구 조건", target: "대상", business: "사업자 조건", facility: "시설 조건", period: "기간", exclude: "제외 대상", condition: "조건", note: "참고",
};
export const AUD_LABEL: Record<string, string> = { citizen: "시민(주택)", store: "가게·영업장", facility: "복지·보육 시설", business: "시공업체", info: "정보 안내" };

export const GROUPS = ["지붕·외벽", "집 안", "설비·전기", "마당·외부", "철거·증축", "가게"];
