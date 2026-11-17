"use client";
import { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { LoginBox, useProfile } from "@/components/Auth";
import CitizenFlow from "@/components/CitizenFlow";
import type { Program, WorkType } from "@/lib/types";

type C = { id: string; created_at: string; channel: string; dong: string | null; housing: string | null; work_code: string | null; program_ids: string[]; business_ids: number[] };
type B = { id: number; name: string; category: string; trust_level: number; phone: string | null; visible: boolean; is_newcomer: boolean; is_demo: boolean; public_works_total: number };
const AUD: Record<string, string> = { citizen: "시민", store: "가게", facility: "시설", business: "업체", info: "안내" };
const CH: Record<string, string> = { citizen: "시민", counter: "창구", demo: "예시" };

function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="muted small">아직 자료가 없어요.</p>;
  return <table><tbody>{rows.map(([k, v]) => (
    <tr key={k}><td style={{ width: "42%" }}>{k}</td><td><div className="row" style={{ flexWrap: "nowrap" }}><div className="bar" style={{ width: `${(v / max) * 100}%` }} /><b>{v}</b></div></td></tr>))}</tbody></table>;
}
const count = <T,>(xs: T[], f: (x: T) => string | null | undefined) => {
  const m = new Map<string, number>(); xs.forEach((x) => { const k = f(x) || "미입력"; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export default function AdminPage() {
  const { profile, ready, logout } = useProfile();
  const [tab, setTab] = useState("counter");
  const [cons, setCons] = useState<C[]>([]);
  const [inq, setInq] = useState<{ status: string }[]>([]);
  const [works, setWorks] = useState<WorkType[]>([]);
  const [progs, setProgs] = useState<Program[]>([]);
  const [biz, setBiz] = useState<B[]>([]);
  const [q, setQ] = useState("");
  const [withDemo, setWithDemo] = useState(true);
  const [edit, setEdit] = useState<{ id: string; v: string } | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const db = sb();
    const [c, i, w, p, b] = await Promise.all([
      db.from("consultations").select("id,created_at,channel,dong,housing,work_code,program_ids,business_ids").order("created_at", { ascending: false }).limit(2000),
      db.from("inquiries").select("status"),
      db.from("work_types").select("*").order("sort"),
      db.from("programs").select("*").order("id"),
      db.from("businesses").select("id,name,category,trust_level,phone,visible,is_newcomer,is_demo,public_works_total").order("id").range(0, 2999),
    ]);
    setCons((c.data || []) as C[]); setInq(i.data || []); setWorks((w.data || []) as WorkType[]); setProgs((p.data || []) as Program[]); setBiz((b.data || []) as B[]);
  }
  useEffect(() => { if (profile?.role === "admin") load(); }, [profile]);

  const wname = (c: string | null) => works.find((w) => w.code === c)?.name || c || "-";
  const view = useMemo(() => (withDemo ? cons : cons.filter((c) => c.channel !== "demo")), [cons, withDemo]);
  const stats = useMemo(() => {
    const pname = (id: string) => progs.find((p) => p.id === id)?.name || id;
    const bmap = new Map(biz.map((b) => [b.id, b]));
    const shown = view.flatMap((c) => c.business_ids || []).map((id) => bmap.get(id)).filter((b): b is B => !!b && !b.is_demo);
    const per = new Map<number, number>(); shown.forEach((b) => per.set(b.id, (per.get(b.id) || 0) + 1));
    const topShare = shown.length ? Math.round((Math.max(0, ...per.values()) / shown.length) * 100) : 0;
    return {
      byWork: count(view, (c) => works.find((w) => w.code === c.work_code)?.name || c.work_code).slice(0, 10),
      byDong: count(view, (c) => c.dong).slice(0, 10),
      byProg: count(view.flatMap((c) => c.program_ids || []), (x) => pname(x)).slice(0, 8),
      newShare: shown.length ? Math.round((shown.filter((b) => b.is_newcomer).length / shown.length) * 100) : 0,
      distinct: per.size, topShare, counter: view.filter((c) => c.channel === "counter").length, demo: cons.filter((c) => c.channel === "demo").length,
    };
  }, [view, cons, works, progs, biz]);

  if (!ready) return <main className="wrap">불러오는 중…</main>;
  if (!profile) return <main className="wrap"><LoginBox role="admin" title="주무관 로그인" hint="동해시 담당 공무원 전용 화면이에요. 시연 계정으로 로그인하세요." /></main>;
  if (profile.role !== "admin") return <main className="wrap"><p>주무관 계정이 아니에요. <button className="btn sm ghost" onClick={logout}>로그아웃</button></p></main>;

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  async function toggleProg(p: Program) {
    const { error } = await sb().from("programs").update({ active: !p.active, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) return flash("저장 실패: " + error.message);
    setProgs(progs.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x))); flash(`${p.name}: ${p.active ? "안내를 껐어요" : "다시 안내해요"}`);
  }
  async function saveSchedule() {
    if (!edit) return;
    const { error } = await sb().from("programs").update({ schedule_2026: edit.v, updated_at: new Date().toISOString() }).eq("id", edit.id);
    if (error) return flash("저장 실패: " + error.message);
    setProgs(progs.map((x) => (x.id === edit.id ? { ...x, schedule_2026: edit.v } : x))); setEdit(null); flash("일정을 저장했어요. 시민 화면에 바로 반영돼요.");
  }
  async function toggleBiz(b: B) {
    const { error } = await sb().from("businesses").update({ visible: !b.visible }).eq("id", b.id);
    if (error) return flash("저장 실패: " + error.message);
    setBiz(biz.map((x) => (x.id === b.id ? { ...x, visible: !b.visible } : x)));
  }
  function csv() {
    const rows = [["일시", "경로", "동", "건물", "공사", "안내 지원사업 수", "소개 업체 수"], ...view.map((c) => [new Date(c.created_at).toLocaleString("ko-KR"), CH[c.channel] || c.channel, c.dong || "", c.housing || "", wname(c.work_code), c.program_ids.length, c.business_ids.length])];
    const blob = new Blob(["﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "잇다_상담현황.csv"; a.click();
  }
  const filtered = biz.filter((b) => !q || b.name.includes(q) || b.category.includes(q)).slice(0, 80);
  const st = (s: string) => inq.filter((x) => x.status === s).length;

  return (
    <main className="wrap">
      <div className="pagehead row between">
        <div><h1>주무관 행정 화면</h1><p>{profile.display_name}</p></div>
        <button className="btn sm ghost" onClick={logout}>로그아웃</button>
      </div>
      <div className="tabs">
        {[["counter", "창구 모드"], ["dash", "현황판"], ["programs", "지원사업 관리"], ["biz", "업체 관리"]].map(([k, l]) =>
          <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); if (k === "dash") load(); }}>{l}</button>)}
      </div>
      {msg && <div className="notice" role="status" style={{ marginBottom: 12 }}>{msg}</div>}

      {tab === "counter" && <>
        <div className="notice" style={{ marginBottom: 14 }}>행정복지센터 창구에서 어르신 대신 입력하고, 맨 아래 요약을 문자로 보내거나 인쇄해 드리세요. 창구 상담은 현황판에 따로 집계돼요.</div>
        <CitizenFlow channel="counter" />
      </>}

      {tab === "dash" && <>
        <div className="row between" style={{ marginBottom: 12 }}>
          <label className="check small" style={{ margin: 0 }}><input type="checkbox" checked={withDemo} onChange={(e) => setWithDemo(e.target.checked)} /><span>시연용 예시 상담 {stats.demo}건 포함 (실제 상담 아님)</span></label>
          <button className="btn sm ghost" onClick={csv}>엑셀(CSV)로 내려받기</button>
        </div>
        <div className="grid g3">
          <div className="card"><div className="muted small">상담</div><div className="kpi">{view.length}</div><div className="small muted">그중 창구 {stats.counter}건</div></div>
          <div className="card"><div className="muted small">업체 견적 문의</div><div className="kpi">{inq.length}</div><div className="small muted">새 문의 {st("new")} · 연락함 {st("contacted")} · 완료 {st("done")}</div></div>
          <div className="card"><div className="muted small">소개된 업체</div><div className="kpi">{stats.distinct}곳</div><div className="small muted">신규 업체 비율 {stats.newShare}% · 한 업체 최대 {stats.topShare}%</div></div>
        </div>
        <div className="grid g2" style={{ marginTop: 14 }}>
          <div className="card"><h3>공사 수요 (공정별)</h3><Bars rows={stats.byWork} /></div>
          <div className="card"><h3>동별 상담</h3><Bars rows={stats.byDong} /></div>
          <div className="card"><h3>많이 안내된 지원사업</h3><Bars rows={stats.byProg} /></div>
          <div className="card"><h3>이 숫자를 이렇게 써요</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              <li>공정별 수요: 내년 집수리 지원사업 물량·예산 배분 근거</li>
              <li>동별 상담: 찾아가는 상담, 홍보가 필요한 동 선정</li>
              <li>한 업체 최대 비율: 특정 업체에 소개가 쏠리지 않는지 확인</li>
              <li>신규 업체 비율: 새 업체에게도 기회가 돌아가는지 확인</li>
            </ul></div>
        </div>
        <div className="card scroll" style={{ marginTop: 14 }}>
          <h3>최근 상담</h3>
          <table><thead><tr><th>일시</th><th>경로</th><th>동</th><th>건물</th><th>공사</th><th>지원사업</th><th>업체</th></tr></thead>
            <tbody>{view.slice(0, 12).map((c) => <tr key={c.id}><td className="small">{new Date(c.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              <td>{CH[c.channel] || c.channel}</td><td>{c.dong || "-"}</td><td>{c.housing}</td><td>{wname(c.work_code)}</td><td>{c.program_ids.length}개</td><td>{c.business_ids.length}곳</td></tr>)}</tbody></table>
        </div>
      </>}

      {tab === "programs" && (
        <div className="card scroll">
          <p className="small muted" style={{ marginTop: 0 }}>'안내 중'을 끄면 시민 화면에서 바로 빠져요. 공고가 바뀌면 일정을 고쳐 주세요. 전체 {progs.length}개 · 안내 중 {progs.filter((p) => p.active).length}개</p>
          <table><thead><tr><th>사업</th><th>대상</th><th>2026 일정</th><th>상태</th></tr></thead>
            <tbody>{progs.map((p) => (
              <tr key={p.id}><td><b>{p.name}</b><div className="small muted">{p.id} · {p.contact || p.apply_where}</div></td><td className="small">{AUD[p.audience] || p.audience}</td>
                <td className="small" style={{ minWidth: 240 }}>{edit?.id === p.id
                  ? <><textarea rows={2} value={edit.v} onChange={(e) => setEdit({ id: p.id, v: e.target.value })} /><div className="row" style={{ marginTop: 6 }}><button className="btn sm sea" onClick={saveSchedule}>저장</button><button className="btn sm ghost" onClick={() => setEdit(null)}>취소</button></div></>
                  : <>{p.schedule_2026 || "-"} <button className="btn sm ghost" onClick={() => setEdit({ id: p.id, v: p.schedule_2026 || "" })}>수정</button></>}</td>
                <td><button className={`btn sm ${p.active ? "sea" : "ghost"}`} onClick={() => toggleProg(p)}>{p.active ? "안내 중" : "꺼짐"}</button></td></tr>))}</tbody></table>
        </div>
      )}

      {tab === "biz" && (
        <div className="card scroll">
          <div className="row"><input type="text" placeholder="상호·분류 검색" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} aria-label="업체 검색" />
            <span className="small muted">전체 {biz.length}곳 · 시민 화면 노출 {biz.filter((b) => b.visible).length}곳 · 그중 신규 {biz.filter((b) => b.visible && b.is_newcomer).length}곳</span></div>
          <table style={{ marginTop: 10 }}><thead><tr><th>상호</th><th>분류</th><th>신뢰도</th><th>전화</th><th>공공실적</th><th>시민 노출</th></tr></thead>
            <tbody>{filtered.map((b) => (
              <tr key={b.id}><td>{b.name} {b.is_newcomer && <span className="tag new">신규</span>} {b.is_demo && <span className="tag demo">시연</span>}</td>
                <td className="small">{b.category}</td><td>{"★".repeat(b.trust_level)}</td><td className="small">{b.phone || "-"}</td><td>{b.public_works_total}</td>
                <td><button className={`btn sm ${b.visible ? "sea" : "ghost"}`} onClick={() => toggleBiz(b)}>{b.visible ? "노출" : "숨김"}</button></td></tr>))}</tbody></table>
          <p className="small muted">검색 결과는 80곳까지 보여요. 사업자번호는 휴·폐업 확인용으로만 보관하고 화면에 표시하지 않아요.</p>
        </div>
      )}
    </main>
  );
}
