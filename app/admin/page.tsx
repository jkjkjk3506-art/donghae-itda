"use client";
import { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { LoginBox, useProfile } from "@/components/Auth";
import CitizenFlow from "@/components/CitizenFlow";
import type { Program, WorkType } from "@/lib/types";

type C = { id: string; created_at: string; channel: string; dong: string | null; housing: string | null; work_code: string | null; program_ids: string[]; business_ids: number[] };
type B = { id: number; name: string; category: string; trust_level: number; phone: string | null; visible: boolean; is_newcomer: boolean; is_demo: boolean; public_works_total: number };

function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <table><tbody>{rows.map(([k, v]) => (
    <tr key={k}><td style={{ width: "38%" }}>{k}</td><td><div className="row" style={{ flexWrap: "nowrap" }}><div className="bar" style={{ width: `${(v / max) * 100}%` }} /><b>{v}</b></div></td></tr>))}</tbody></table>;
}
const count = <T,>(xs: T[], f: (x: T) => string | null | undefined) => {
  const m = new Map<string, number>(); xs.forEach((x) => { const k = f(x) || "미입력"; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export default function AdminPage() {
  const { profile, ready, logout } = useProfile();
  const [tab, setTab] = useState("counter");
  const [cons, setCons] = useState<C[]>([]);
  const [inqN, setInqN] = useState(0);
  const [works, setWorks] = useState<WorkType[]>([]);
  const [progs, setProgs] = useState<Program[]>([]);
  const [biz, setBiz] = useState<B[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const db = sb();
    const [c, i, w, p, b] = await Promise.all([
      db.from("consultations").select("id,created_at,channel,dong,housing,work_code,program_ids,business_ids").order("created_at", { ascending: false }).limit(2000),
      db.from("inquiries").select("id", { count: "exact", head: true }),
      db.from("work_types").select("*").order("sort"),
      db.from("programs").select("*").order("id"),
      db.from("businesses").select("id,name,category,trust_level,phone,visible,is_newcomer,is_demo,public_works_total").order("id").range(0, 2999),
    ]);
    setCons((c.data || []) as C[]); setInqN(i.count || 0); setWorks((w.data || []) as WorkType[]); setProgs((p.data || []) as Program[]); setBiz((b.data || []) as B[]);
  }
  useEffect(() => { if (profile?.role === "admin") load(); }, [profile]);

  const stats = useMemo(() => {
    const wname = (c: string | null) => works.find((w) => w.code === c)?.name || c;
    const pname = (id: string) => progs.find((p) => p.id === id)?.name || id;
    const bmap = new Map(biz.map((b) => [b.id, b]));
    const shown = cons.flatMap((c) => c.business_ids || []).map((id) => bmap.get(id)).filter((b): b is B => !!b && !b.is_demo);
    const distinct = new Set(shown.map((b) => b.id)).size;
    return {
      byWork: count(cons, (c) => wname(c.work_code)).slice(0, 10),
      byDong: count(cons, (c) => c.dong).slice(0, 10),
      byProg: count(cons.flatMap((c) => c.program_ids || []), (x) => pname(x)).slice(0, 8),
      newShare: shown.length ? Math.round((shown.filter((b) => b.is_newcomer).length / shown.length) * 100) : 0,
      distinct, counter: cons.filter((c) => c.channel === "counter").length,
    };
  }, [cons, works, progs, biz]);

  if (!ready) return <main className="wrap">불러오는 중…</main>;
  if (!profile) return <main className="wrap"><LoginBox title="주무관 로그인" hint="동해시 담당 공무원 전용 화면이에요. 시연 계정으로 로그인하세요." /></main>;
  if (profile.role !== "admin") return <main className="wrap"><p>주무관 계정이 아니에요. <button className="btn sm ghost" onClick={logout}>로그아웃</button></p></main>;

  async function toggleProg(p: Program) {
    const { error } = await sb().from("programs").update({ active: !p.active, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (!error) setProgs(progs.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
  }
  async function editSchedule(p: Program) {
    const v = prompt(`${p.name}\n2026 일정을 수정하세요`, p.schedule_2026 || "");
    if (v === null) return;
    const { error } = await sb().from("programs").update({ schedule_2026: v, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (!error) setProgs(progs.map((x) => (x.id === p.id ? { ...x, schedule_2026: v } : x)));
  }
  async function toggleBiz(b: B) {
    const { error } = await sb().from("businesses").update({ visible: !b.visible }).eq("id", b.id);
    if (!error) setBiz(biz.map((x) => (x.id === b.id ? { ...x, visible: !b.visible } : x)));
  }
  const filtered = biz.filter((b) => !q || b.name.includes(q) || b.category.includes(q)).slice(0, 80);

  return (
    <main className="wrap">
      <div className="hero">
        <h1>주무관 행정 화면</h1>
        <p>{profile.display_name} · <button className="btn sm ghost" onClick={logout}>로그아웃</button></p>
      </div>
      <div className="tabs">
        {[["counter", "창구 모드"], ["dash", "현황판"], ["programs", "지원사업 관리"], ["biz", "업체 관리"]].map(([k, l]) =>
          <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); if (k === "dash") load(); }}>{l}</button>)}
      </div>

      {tab === "counter" && <>
        <div className="notice" style={{ marginBottom: 12 }}>행정복지센터 창구에서 어르신 대신 입력하고, 결과를 문자 요약으로 보내거나 인쇄해 드리세요.</div>
        <CitizenFlow channel="counter" />
      </>}

      {tab === "dash" && <>
        <div className="grid g3">
          <div className="card"><div className="muted small">전체 상담</div><div className="kpi">{cons.length}</div><div className="small muted">창구 {stats.counter}건</div></div>
          <div className="card"><div className="muted small">업체 문의 연결</div><div className="kpi">{inqN}</div></div>
          <div className="card"><div className="muted small">신규 업체 노출 비율</div><div className="kpi">{stats.newShare}%</div><div className="small muted">노출된 서로 다른 업체 {stats.distinct}곳</div></div>
        </div>
        <div className="grid g2" style={{ marginTop: 16 }}>
          <div className="card"><h3>공사 수요 (공정별)</h3><Bars rows={stats.byWork} /></div>
          <div className="card"><h3>동별 상담</h3><Bars rows={stats.byDong} /></div>
          <div className="card"><h3>안내된 지원사업</h3><Bars rows={stats.byProg} /></div>
          <div className="card"><h3>읽는 법</h3><p className="small">공정별 수요는 내년 지원사업 예산 배분 근거로, 동별 상담은 찾아가는 상담 지역 선정에 쓸 수 있어요. 신규 업체 노출 비율로 특정 업체 쏠림이 없는지 확인해요.</p></div>
        </div>
      </>}

      {tab === "programs" && (
        <div className="card">
          <p className="small muted">끄면 시민 화면에서 바로 빠져요. 공고가 바뀌면 일정을 고쳐 주세요.</p>
          <table><thead><tr><th>ID</th><th>사업</th><th>대상</th><th>2026 일정</th><th>상태</th></tr></thead>
            <tbody>{progs.map((p) => (
              <tr key={p.id}><td className="small">{p.id}</td><td>{p.name}<div className="small muted">{p.contact}</div></td><td className="small">{p.audience}</td>
                <td className="small">{p.schedule_2026} <button className="btn sm ghost" onClick={() => editSchedule(p)}>수정</button></td>
                <td><button className={`btn sm ${p.active ? "sea" : "ghost"}`} onClick={() => toggleProg(p)}>{p.active ? "안내 중" : "꺼짐"}</button></td></tr>))}</tbody></table>
        </div>
      )}

      {tab === "biz" && (
        <div className="card">
          <div className="row"><input type="text" placeholder="상호·분류 검색" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
            <span className="small muted">전체 {biz.length}곳 · 노출 {biz.filter((b) => b.visible).length}곳 · 신규 {biz.filter((b) => b.visible && b.is_newcomer).length}곳</span></div>
          <table style={{ marginTop: 10 }}><thead><tr><th>상호</th><th>분류</th><th>신뢰도</th><th>전화</th><th>실적</th><th>시민 노출</th></tr></thead>
            <tbody>{filtered.map((b) => (
              <tr key={b.id}><td>{b.name}{b.is_newcomer && <span className="tag new" style={{ marginLeft: 6 }}>신규</span>}{b.is_demo && <span className="tag demo" style={{ marginLeft: 6 }}>시연</span>}</td>
                <td className="small">{b.category}</td><td>{"★".repeat(b.trust_level)}</td><td className="small">{b.phone || "-"}</td><td>{b.public_works_total}</td>
                <td><button className={`btn sm ${b.visible ? "sea" : "ghost"}`} onClick={() => toggleBiz(b)}>{b.visible ? "노출" : "숨김"}</button></td></tr>))}</tbody></table>
          <p className="small muted">사업자번호는 국세청 휴·폐업 조회용으로만 보관하고 화면에 보이지 않아요.</p>
        </div>
      )}
    </main>
  );
}
