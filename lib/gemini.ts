import type { Diagnosis, WorkType } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const TEXT_MODELS = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash"];
const IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image", "gemini-2.5-flash-image"];

/** 모델명이 바뀌거나 내려가도 다음 후보로 넘어가도록 순서대로 시도 */
async function callGemini(models: (string | undefined)[], key: string, body: unknown, timeout: number) {
  const list = [...new Set(models.filter(Boolean) as string[])];
  let last = "";
  for (const model of list) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body), signal: AbortSignal.timeout(timeout),
    });
    if (res.ok) return { json: await res.json(), model };
    last = `${model} ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if ([401, 403].includes(res.status)) break; // 키 문제만 중단, 모델 없음·한도·과부하(503)는 다음 후보로
  }
  throw new Error("Gemini 실패 " + last);
}

function parseDataUrl(d?: string | null) {
  if (!d) return null;
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(d);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

export async function geminiDiagnose(text: string, image: string | null, works: WorkType[]): Promise<Diagnosis> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY 없음");
  const list = works.map((w) => `- ${w.code}: ${w.name} (예: ${w.plain_examples.join(", ")})`).join("\n");
  const prompt = `당신은 동해시 집수리 상담 도우미입니다. 시민이 보낸 사진과 설명으로 어떤 공사가 필요한지 판별하세요.
반드시 아래 공정 코드 중 하나만 고르세요. 확실하지 않으면 confidence를 낮추고 questions에 확인 질문을 1~2개 넣으세요.
업체 이름, 가격, 지원금액은 절대 말하지 마세요. 모든 글은 어르신도 이해할 수 있는 쉬운 말로 쓰세요.
- plain_explain: 한두 문장 요약
- problems: 사진·설명에서 실제로 보이는 문제 2~4개 (보이지 않는 것은 지어내지 말 것)
- cause: 가장 그럴듯한 원인 한 문장 (추정이라는 걸 전제로)
- method: 보통 하는 공사 순서 3~5단계 (예: 기존 방수층 상태 확인 → 들뜬 부분 제거 → 바탕 보수 → 방수재 도포)
- risk: 그대로 두면 생길 수 있는 일 한 문장
- severity: 급한 정도 low(천천히 해도 됨)/mid(올해 안에)/high(빨리)
가스 냄새·누전·구조 붕괴 위험이 보이면 urgent를 true로 하세요.

공정 코드:
${list}

시민 설명: ${text || "(설명 없음, 사진만 있음)"}`;
  const parts: unknown[] = [{ text: prompt }];
  const img = parseDataUrl(image);
  if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });

  const { json: j } = await callGemini([process.env.GEMINI_MODEL, ...TEXT_MODELS], key, {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            work_code: { type: "STRING", enum: works.map((w) => w.code) },
            defect: { type: "STRING", description: "추정 하자(전문 용어 가능, 짧게)" },
            plain_explain: { type: "STRING" },
            confidence: { type: "NUMBER" },
            questions: { type: "ARRAY", items: { type: "STRING" } },
            urgent: { type: "BOOLEAN" },
            problems: { type: "ARRAY", items: { type: "STRING" } },
            cause: { type: "STRING" },
            method: { type: "ARRAY", items: { type: "STRING" } },
            risk: { type: "STRING" },
            severity: { type: "STRING", enum: ["low", "mid", "high"] },
          },
          required: ["work_code", "defect", "plain_explain", "confidence", "questions", "urgent", "problems", "cause", "method", "risk", "severity"],
        },
      },
    }, 20000);
  const out = j?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
  const d = JSON.parse(out);
  const w = works.find((x) => x.code === d.work_code) || works.find((x) => x.code === "OTHER")!;
  return { ...d, work_code: w.code, work_name: w.name, confidence: Math.max(0, Math.min(1, Number(d.confidence) || 0)), source: "gemini" };
}

export async function geminiPreview(image: string, instruction: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY 없음");
  const img = parseDataUrl(image);
  if (!img) throw new Error("이미지 형식 오류");
  const { json: j } = await callGemini([process.env.GEMINI_IMAGE_MODEL, ...IMAGE_MODELS], key, {
      contents: [{ role: "user", parts: [
        { text: `이 건물 사진을 '공사가 끝난 뒤' 모습으로 편집해 주세요. ${instruction}
건물의 형태, 구도, 창문 위치, 주변 배경은 그대로 두고 표면 상태만 바꾸세요. 글자나 로고는 넣지 마세요.` },
        { inline_data: { mime_type: img.mimeType, data: img.data } },
      ] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }, 28000);
  const part = j?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown; inline_data?: unknown }) => p.inlineData || p.inline_data);
  const data = part?.inlineData || part?.inline_data;
  if (!data) throw new Error("이미지가 생성되지 않았어요");
  return `data:${data.mimeType || data.mime_type || "image/png"};base64,${data.data}`;
}
