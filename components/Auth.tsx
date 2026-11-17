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

export function LoginBox({ title, hint }: { title: string; hint: string }) {
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
      <label className="f">이메일</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <label className="f">비밀번호</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <button className="btn sea" style={{ marginTop: 16, width: "100%" }}>로그인</button>
    </form>
  );
}
