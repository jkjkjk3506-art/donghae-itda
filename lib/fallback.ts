import type { Diagnosis, WorkType } from "./types";

/** AI 없이 키워드로 공정 판별 (Gemini 실패·시연 안전모드용) */
const KEYWORDS: Record<string, string[]> = {
  LEAK_ROOF: ["천장", "옥상", "누수", "물이 새", "물새", "비 오면", "비오면", "얼룩", "지붕 새"],
  WALL_CRACK: ["외벽", "금이", "균열", "갈라", "페인트", "도색", "벗겨", "가루", "칠"],
  WINDOW_LEAK: ["창틀", "실리콘", "코킹", "창문 틈", "샷시 틈"],
  MOLD: ["곰팡이", "결로", "습기", "젖어", "축축한 벽"],
  WINDOW: ["창문", "샷시", "새시", "창호", "바람이", "외풍", "난방비"],
  BOILER: ["보일러", "난방", "온수", "따뜻", "연탄"],
  PIPE_LEAK: ["배관", "수도", "아랫집", "수도요금", "바닥이 축축", "동파"],
  BATH_KITCHEN: ["화장실", "욕실", "타일", "변기", "세면대", "싱크대", "주방"],
  WALLPAPER_FLOOR: ["도배", "벽지", "장판", "바닥재"],
  ELECTRIC: ["전기", "차단기", "콘센트", "누전", "전등", "조명", "스위치"],
  ROOF_SLATE: ["슬레이트", "석면", "철거", "빈집", "창고 지붕"],
  ACCESS: ["미끄러", "손잡이", "문턱", "휠체어", "어르신", "경사로"],
  STORE: ["가게", "식당", "매장", "상가", "영업장", "간판"],
};

export function keywordDiagnose(text: string, works: WorkType[]): Diagnosis {
  const t = (text || "").replace(/\s+/g, " ");
  let best = "OTHER", bestScore = 0;
  for (const [code, words] of Object.entries(KEYWORDS)) {
    const s = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (s > bestScore) { best = code; bestScore = s; }
  }
  const w = works.find((x) => x.code === best);
  return {
    work_code: best,
    work_name: w?.name,
    defect: w?.defect_hint || "추가 확인이 필요해요",
    plain_explain: best === "OTHER"
      ? "말씀만으로는 어떤 공사인지 정하기 어려워요. 사진을 올리거나 증상을 조금 더 알려주세요."
      : `말씀하신 증상은 보통 '${w?.name}' 공사로 해결해요. 정확한 원인은 업체 현장 확인으로 정해집니다.`,
    confidence: bestScore >= 2 ? 0.7 : bestScore === 1 ? 0.5 : 0.2,
    questions: best === "OTHER" ? ["어디에서(천장·벽·바닥·창문) 문제가 생겼나요?", "언제부터, 비 올 때만 그런가요?"] : [],
    urgent: /누전|타|불꽃|가스 냄새|무너/.test(t),
    source: "keyword",
  };
}
