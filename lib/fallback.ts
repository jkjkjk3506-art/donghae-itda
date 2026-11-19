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
  STORE: ["가게", "식당", "매장", "상가", "영업장"],
  TREE: ["나무", "가지치기", "벌목", "베고", "벨", "나뭇가지"], LANDSCAPE: ["정원", "잔디", "화단", "조경", "마당 꾸"],
  FENCE: ["담장", "담벼락", "대문", "울타리", "펜스"], PAVING: ["포장", "주차장", "진입로", "마당을 콘크리트"],
  CONCRETE: ["축대", "옹벽", "외부 계단", "석축"], DRAIN: ["하수구", "막혔", "역류", "정화조", "배수", "변기 물"],
  AIRCON: ["에어컨", "실외기", "환풍기", "환기"], TELECOM: ["CCTV", "씨씨티비", "인터넷", "인터폰", "통신"],
  FIRE: ["소화기", "화재감지기", "감지기", "스프링클러", "소방"], DEMOLITION: ["철거", "부수", "허물", "해체"],
  EXTENSION: ["증축", "비가림", "데크", "창고를 짓", "방을 늘", "옥상 지붕", "판넬"], SIGN: ["간판"],
};

/** AI가 없을 때 보여줄 공정별 기본 설명 (현장 일반론) */
export const WORK_INFO: Record<string, { problems: string[]; method: string[]; risk: string; severity: "low" | "mid" | "high" }> = {
  LEAK_ROOF: { problems: ["천장 누수 또는 물 얼룩", "옥상·지붕 방수층 손상 의심"], method: ["누수 위치와 옥상 방수층 상태 확인", "들뜨거나 갈라진 방수층 제거", "바탕면 균열 보수·청소", "방수재(우레탄 등) 도포", "배수구 정비"], risk: "천장 마감재가 썩고 곰팡이·누전으로 번질 수 있어요.", severity: "high" },
  WALL_CRACK: { problems: ["외벽 균열", "페인트 벗겨짐·가루 날림"], method: ["균열 폭·깊이 확인", "들뜬 도막 제거·고압 세척", "균열 보수(실링·보수재)", "하도 → 상도 도장"], risk: "균열로 빗물이 스며들어 실내 누수·철근 부식이 생길 수 있어요.", severity: "mid" },
  WINDOW_LEAK: { problems: ["창틀 주변 실리콘 노후", "창 주변 빗물 유입"], method: ["기존 실리콘 제거", "틈 청소·건조", "프라이머 후 새 실리콘(코킹) 시공"], risk: "벽 안으로 물이 스며 곰팡이·벽지 손상이 생길 수 있어요.", severity: "mid" },
  MOLD: { problems: ["벽·천장 곰팡이", "겨울철 결로"], method: ["곰팡이 원인(결로·누수) 구분", "곰팡이 제거·살균", "단열 보강 또는 결로 방지 처리", "도배·도장 마감"], risk: "곰팡이가 퍼지고 호흡기 건강에 나쁠 수 있어요.", severity: "mid" },
  WINDOW: { problems: ["창문 틈 외풍", "노후 창호"], method: ["창호 상태·크기 실측", "기존 창 철거", "새 창호 설치", "주변 마감·실리콘"], risk: "난방비가 많이 들고 결로가 계속 생겨요.", severity: "low" },
  BOILER: { problems: ["난방·온수 불량"], method: ["고장 원인 점검(부품·배관)", "수리 또는 교체 결정", "설치 후 가스 누설·배기 점검"], risk: "겨울철 동파나 일산화탄소 위험이 있을 수 있어요.", severity: "high" },
  PIPE_LEAK: { problems: ["배관 누수 의심", "바닥 습기·수도요금 증가"], method: ["누수 탐지(장비)", "누수 부위 바닥·벽 개방", "배관 교체·보수", "바닥·마감 복구"], risk: "아랫집 피해와 바닥 썩음이 생길 수 있어요.", severity: "high" },
  BATH_KITCHEN: { problems: ["타일 깨짐·들뜸", "욕실 바닥 누수 의심"], method: ["손상 범위 확인", "타일 철거", "방수층 재시공", "타일·위생기구 시공"], risk: "아래층 누수와 미끄럼 사고가 생길 수 있어요.", severity: "mid" },
  WALLPAPER_FLOOR: { problems: ["벽지 들뜸·장판 찢어짐"], method: ["기존 벽지·장판 제거", "바탕 정리", "새 벽지·장판 시공"], risk: "곰팡이가 숨어 있으면 다시 들뜰 수 있어요.", severity: "low" },
  ELECTRIC: { problems: ["차단기 떨어짐·콘센트 이상"], method: ["누전·과부하 점검", "노후 배선·차단기 교체", "절연 측정"], risk: "누전으로 화재·감전 위험이 있어요.", severity: "high" },
  ROOF_SLATE: { problems: ["노후 슬레이트(석면 가능성)"], method: ["석면 함유 여부 조사", "등록 업체가 석면 해체·제거", "새 지붕재 시공"], risk: "깨진 석면 슬레이트는 가루가 날려 건강에 해로워요.", severity: "mid" },
  ACCESS: { problems: ["미끄러짐·문턱 등 이동 불편"], method: ["생활 동선 확인", "안전손잡이·미끄럼 방지 시공", "문턱 제거·경사로 설치"], risk: "낙상 사고 위험이 계속돼요.", severity: "mid" },
  STORE: { problems: ["영업장 시설 노후"], method: ["현장 실측·요구 확인", "철거", "설비·마감 시공"], risk: "영업에 지장이 생길 수 있어요.", severity: "low" },
  TREE: { problems: ["나무가 집·전깃줄·도로 쪽으로 자람", "쓰러질 위험"], method: ["나무가 서 있는 땅이 내 대지인지·가로수인지 확인", "전깃줄 근처면 한전에 먼저 연락", "가지부터 위에서 아래로 잘라 내림", "밑동 제거(필요 시 뿌리 제거)", "잘라낸 나무 처리"], risk: "태풍 때 쓰러지면 집·차·전선 피해와 이웃 분쟁이 생길 수 있어요.", severity: "mid" },
  LANDSCAPE: { problems: ["마당 정비 필요"], method: ["원하는 모양·예산 상담", "흙·배수 정리", "잔디·나무 심기, 화단 조성", "물주기·관리 안내"], risk: "배수를 안 잡으면 마당에 물이 고여요.", severity: "low" },
  FENCE: { problems: ["담장 균열·기울어짐", "대문 노후"], method: ["경계선·기울기 확인", "위험한 부분 철거", "기초 보강", "담장·대문·펜스 새로 시공"], risk: "기운 담장은 갑자기 무너져 사람이 다칠 수 있어요.", severity: "mid" },
  PAVING: { problems: ["마당·진입로 파손", "물 고임"], method: ["기존 바닥 정리·철거", "배수 경사 잡기", "바닥 다짐", "콘크리트·아스콘·블록 포장"], risk: "패인 곳에 물이 고이고 넘어질 수 있어요.", severity: "low" },
  CONCRETE: { problems: ["옹벽·축대 균열", "배부름"], method: ["균열·배부름 상태 확인(심하면 안전 점검)", "배수 구멍 정비", "균열 보수 또는 부분 재시공", "필요하면 보강 구조물 설치"], risk: "축대·옹벽이 무너지면 큰 사고가 날 수 있어요. 배가 불렀다면 빨리 점검받으세요.", severity: "high" },
  DRAIN: { problems: ["하수구 막힘·역류", "정화조 관리"], method: ["막힌 위치 확인(내시경 카메라)", "고압 세척 또는 뚫음", "파손된 관은 교체", "정화조는 등록 업체가 청소"], risk: "역류하면 집 안 위생 문제와 악취가 생겨요.", severity: "mid" },
  AIRCON: { problems: ["냉방·환기 불량 또는 새로 설치"], method: ["설치 위치·배관 길이 확인", "실외기 받침·고정", "배관·배수 연결", "작동·누설 점검"], risk: "실외기를 대충 달면 떨어지거나 물이 샐 수 있어요.", severity: "low" },
  TELECOM: { problems: ["통신·방범 설비 필요"], method: ["설치 위치와 촬영 범위 정하기", "배선 경로 잡기", "장비 설치·연결", "녹화·화질 확인"], risk: "CCTV가 이웃집을 비추면 분쟁이 생길 수 있어요.", severity: "low" },
  FIRE: { problems: ["소방시설 설치·정비 필요"], method: ["필요한 소방시설 확인(건물 용도·면적)", "등록 업체가 설치·보수", "작동 점검"], risk: "불이 났을 때 늦게 알아채면 크게 다칠 수 있어요.", severity: "mid" },
  DEMOLITION: { problems: ["노후 건물·창고 철거 필요"], method: ["석면 조사", "시청에 해체 신고·허가", "전기·가스·수도 끊기", "해체 공사", "건설폐기물 처리"], risk: "무너질 듯한 빈집은 사고·화재 위험이 있어요.", severity: "mid" },
  EXTENSION: { problems: ["면적·공간을 늘리는 공사"], method: ["건축신고·허가 대상인지 시청에 확인", "도면·구조 검토", "기초·골조 공사", "지붕·마감 공사"], risk: "신고 없이 지으면 위반건축물이 되어 이행강제금을 낼 수 있어요.", severity: "low" },
  SIGN: { problems: ["간판 설치·교체 필요"], method: ["시청 옥외광고물 허가·신고 확인", "간판 제작", "고정·전기 연결"], risk: "고정이 약한 간판은 강풍에 떨어질 수 있어요.", severity: "low" },
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
    urgent: /누전|타는|불꽃|가스 냄새|무너/.test(t),
    source: "keyword",
    problems: WORK_INFO[best]?.problems, cause: w?.defect_hint || undefined,
    method: WORK_INFO[best]?.method, risk: WORK_INFO[best]?.risk, severity: WORK_INFO[best]?.severity,
  };
}
