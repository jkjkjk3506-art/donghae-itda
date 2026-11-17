export type WorkType = {
  code: string; name: string; plain_examples: string[]; defect_hint: string | null;
  db_categories: string[]; program_tags: string[]; license_note: string | null; sort: number;
};
export type Diagnosis = {
  work_code: string; work_name?: string; defect: string; plain_explain: string;
  confidence: number; questions: string[]; urgent: boolean; source: "gemini" | "keyword" | "demo";
};
export type Program = {
  id: string; name: string; operator: string | null; audience: string; donghae_status: string | null;
  verification_status: string | null; work_types: string[]; building_types: string[]; support_type: string[];
  requires: string[]; amount_text: string | null; schedule_2026: string | null; expected_next: string | null;
  apply_where: string | null; contact: string | null; contractor_opportunity: string | null;
  official_source_url: string[]; eligibility: Record<string, string> | null; active?: boolean;
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
