import { NextResponse } from "next/server";
import { geminiPreview } from "@/lib/gemini";
import { allow, ipOf } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { image, instruction = "" } = await req.json().catch(() => ({}));
  if (!image || String(image).length > 6_000_000) return NextResponse.json({ error: "사진을 확인해 주세요" }, { status: 400 });
  if (process.env.DEMO_MODE === "1" || !process.env.GEMINI_API_KEY)
    return NextResponse.json({ error: "시연 안전모드라 AI 이미지는 꺼져 있어요. 색 바꾸기 미리보기를 써 주세요.", fallback: true }, { status: 503 });
  if (!allow("pv:" + ipOf(req), 5, 600_000)) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요", fallback: true }, { status: 429 });
  try {
    const out = await geminiPreview(String(image), String(instruction).slice(0, 300));
    return NextResponse.json({ image: out });
  } catch (e) {
    return NextResponse.json({ error: "AI 이미지를 만들지 못했어요. 색 바꾸기 미리보기를 써 주세요.", fallback: true, debug: String(e).slice(0, 300) }, { status: 502 });
  }
}
