"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export type Profile = { id: string; role: "admin" | "contractor"; display_name: string | null; business_id: number | null };

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  async function load() {
    const { data: { session } } = await sb().auth.getSession();
    if (!session) { setProfile(null); setReady(true); return; }
    const { data } = await sb().from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    setProfile(data as Profile | null); setReady(true);
  }
  useEffect(() => {
    load();
    const { data } = sb().auth.onAuthStateChange(() => load());
    return () => data.subscription.unsubscribe();
  }, []);
  return { profile, ready, logout: () => sb().auth.signOut() };
}

/** 시연용 계정: Vercel 환경변수(NEXT_PUBLIC_DEMO_*_PW)가 있을 때만 버튼이 보임. 지우면 버튼도 사라짐 */
const DEMO = {
  admin: { email: "admin@itda.demo", pw: process.env.NEXT_PUBLIC_DEMO_ADMIN_PW },
  contractor: { email: "pro@itda.demo", pw: process.env.NEXT_PUBLIC_DEMO_PRO_PW },
};

export function LoginBox({ title, hint, role }: { title: string; hint: string; role: "admin" | "contractor" }) {
  const demo = DEMO[role];
  const [busy, setBusy] = useState(false);
  async function demoLogin() {
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithPassword({ email: demo.email, password: demo.pw! });
    if (error) setErr("테스트 로그인에 실패했어요."); setBusy(false);
  }
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const { error } = await sb().auth.signInWithPassword({ email, password: pw });
    if (error) setErr("이메일 또는 비밀번호가 맞지 않아요.");
  }
  return (
    <form className="card" style={{ maxWidth: 420, margin: "40px auto" }} onSubmit={go}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p className="small muted">{hint}</p>
      {demo.pw && <>
        <button type="button" className="btn wide" onClick={demoLogin} disabled={busy}>{busy ? "들어가는 중…" : "테스트 계정으로 바로 로그인"}</button>
        <p className="small muted" style={{ textAlign: "center", margin: "14px 0 0" }}>또는 직접 입력</p>
      </>}
      <label className="f">이메일</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <label className="f">비밀번호</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <button className="btn sea" style={{ marginTop: 16, width: "100%" }}>로그인</button>
    </form>
  );
}
