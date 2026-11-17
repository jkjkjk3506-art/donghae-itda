import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { sbServer } from "@/lib/supabase";

export const maxDuration = 60;

/** 일회성 데이터 적재: /api/seed?token=SEED_TOKEN  (끝나면 Supabase에서 seed 함수 삭제) */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token !== process.env.SEED_TOKEN) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const dir = path.join(process.cwd(), "data");
  const load = async (f: string) => JSON.parse(await readFile(path.join(dir, f), "utf8"));
  const db = sbServer();
  const out: Record<string, number | string> = {};
  const call = async (kind: string, payload: unknown[]) => {
    const { data, error } = await db.rpc("seed_import", { token, kind, payload });
    if (error) throw new Error(`${kind}: ${error.message}`);
    out[kind] = (Number(out[kind]) || 0) + Number(data);
  };
  try {
    await call("work_types", await load("work_types.json"));
    await call("programs", await load("programs.json"));
    const B = await load("businesses.json");
    for (let i = 0; i < B.businesses.length; i += 400) await call("businesses", B.businesses.slice(i, i + 400));
    for (let i = 0; i < B.private.length; i += 800) await call("business_private", B.private.slice(i, i + 800));
    const { data, error } = await db.rpc("seed_legal", { token, payload: await load("legal_notes.json") });
    if (error) throw new Error("legal: " + error.message);
    out.legal_notes = Number(data);
    return NextResponse.json({ ok: true, out });
  } catch (e) {
    return NextResponse.json({ ok: false, out, error: String(e) }, { status: 500 });
  }
}
