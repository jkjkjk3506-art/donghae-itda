import { NextResponse } from "next/server";
import { sbServer } from "@/lib/supabase";
import { geminiDiagnose } from "@/lib/gemini";
import { keywordDiagnose } from "@/lib/fallback";
import { allow, ipOf } from "@/lib/ratelimit";
import type { WorkType } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { text = "", image = null, demo = false } = await req.json().catch(() => ({}));
  if (String(image || "").length > 6_000_000) return NextResponse.json({ error: "사진이 너무 커요" }, { status: 413 });
  const { data, error } = await sbServer().from("work_types").select("*").order("sort");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const works = data as WorkType[];
  const useAI = !demo && process.env.DEMO_MODE !== "1" && !!process.env.GEMINI_API_KEY && allow("dx:" + ipOf(req), 20, 60_000);
  if (useAI) {
    try {
      return NextResponse.json(await geminiDiagnose(String(text).slice(0, 1000), image, works));
    } catch (e) {
      const d = keywordDiagnose(text, works);
      return NextResponse.json({ ...d, note: "AI 응답이 늦어 기본 판별로 안내해요", debug: String(e).slice(0, 200) });
    }
  }
  return NextResponse.json({ ...keywordDiagnose(text, works), source: demo || process.env.DEMO_MODE === "1" ? "demo" : "keyword" });
}

/** 점검용: /api/diagnose?token=SEED_TOKEN&text=... (Gemini 응답 확인) */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!process.env.SEED_TOKEN || u.searchParams.get("token") !== process.env.SEED_TOKEN) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data } = await sbServer().from("work_types").select("*").order("sort");
  try { return NextResponse.json(await geminiDiagnose(u.searchParams.get("text") || "", null, data as WorkType[])); }
  catch (e) { return NextResponse.json({ error: String(e).slice(0, 400) }, { status: 502 }); }
}
