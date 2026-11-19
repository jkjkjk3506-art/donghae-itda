"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { LoginBox, useProfile } from "@/components/Auth";
import { LegalList, ProgramCard } from "@/components/Cards";
import type { Business, LegalNote, Program, WorkType } from "@/lib/types";
import { HOUSING, FLOORS, won } from "@/lib/types";
import type { Diagnosis } from "@/lib/types";

type MyQuote = { price_min: number; price_max: number; visit: string | null; period: string | null; message: string | null; status: string };
type Req = { id: string; created_at: string; work_code: string; work_name: string; housing: string; floors: string | null; dong: string | null; text: string | null;
  photo: string | null; diagnosis: Diagnosis | null; status: string; quote_count: number; my_quote: MyQuote | null;
  citizen_name: string | null; citizen_phone: string | null };

function ago(t: string) { const m = Math.round((Date.now() - +new Date(t)) / 60000); return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; }

function QuoteForm({ r, onDone }: { r: Req; onDone: () => void }) {
  const q = r.my_quote;
  const [f, setF] = useState({ min: q?.price_min?.toString() || "", max: q?.price_max?.toString() || "", visit: q?.visit || "", period: q?.period || "", msg: q?.message || "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function send() {
    setErr(""); const a = parseInt(f.min), b = parseInt(f.max || f.min);
    if (!(a >= 0) || !(b >= a)) { setErr("금액(만원)을 확인해 주세요."); return; }
    setBusy(true);
    const { error } = await sb().rpc("submit_quote", { rid: r.id, pmin: a, pmax: b, visit: f.visit, period: f.period, msg: f.msg });
    setBusy(false); if (error) setErr(error.message); else onDone();
  }
  return (
    <div className="qform">
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="f">예상 금액 최소 <small>(만원)</small></label><input type="text" inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value.replace(/\D/g, "") })} placeholder="예) 150" /></div>
        <div><label className="f">최대 <small>(만원)</small></label><input type="text" inputMode="numeric" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/\D/g, "") })} placeholder="예) 220" /></div>
        <div><label className="f">방문 가능</label><input type="text" value={f.visit} onChange={(e) => setF({ ...f, visit: e.target.value })} placeholder="예) 이번 주 토요일 오전" /></div>
        <div><label className="f">공사 기간</label><input type="text" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} placeholder="예) 2일" /></div>
      </div>
      <label className="f">시민에게 남길 말</label>
      <textarea rows={3} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} placeholder="예) 사진상 옥상 우레탄 방수층이 갈라져 있습니다. 방문해서 정확히 확인 후 확정 견적 드리겠습니다." />
      {parseInt(f.max) >= 1500 && <p className="small" style={{ color: "var(--warn)" }}>1,500만원 이상은 해당 전문공사 건설업 면허가 있어야 시공할 수 있어요. 시민 화면에 면허 여부가 함께 표시돼요.</p>}
      <button className="btn" style={{ marginTop: 10 }} onClick={send} disabled={busy}>{busy ? "보내는 중…" : q ? "견적 고쳐서 다시 보내기" : "견적 보내기"}</button>
      {err && <p className="errtext">{err}</p>}
    </div>
  );
}

export default function ProPage() {
  const { profile, ready, logout } = useProfile();
  const [tab, setTab] = useState("req");
  const [biz, setBiz] = useState<Business | null>(null);
  const [works, setWorks] = useState<WorkType[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [progs, setProgs] = useState<Program[]>([]);
  const [legal, setLegal] = useState<LegalNote[]>([]);
  const [saved, setSaved] = useState("");

  async function loadReqs() { const { data } = await sb().rpc("pro_requests"); setReqs((data || []) as Req[]); }
  useEffect(() => {
    if (profile?.role !== "contractor" || !profile.business_id) return;
    const db = sb();
    db.from("businesses").select("*").eq("id", profile.business_id).single().then(({ data }) => setBiz(data as Business));
    db.from("work_types").select("*").order("sort").then(({ data }) => setWorks((data || []) as WorkType[]));
    db.from("programs").select("*").eq("audience", "business").then(({ data }) => setProgs((data || []) as Program[]));
    db.from("legal_notes").select("*").in("audience", ["contractor", "both"]).order("sort").then(({ data }) => setLegal((data || []) as LegalNote[]));
    loadReqs(); const t = setInterval(loadReqs, 20000); return () => clearInterval(t);
  }, [profile]);

  if (!ready) return <main className="wrap">불러오는 중…</main>;
  if (!profile) return <main className="wrap"><LoginBox role="contractor" title="시공업체 로그인" hint="동해시 시민의 견적 요청을 받고 견적을 보내는 업체 전용 화면이에요." /></main>;
  if (profile.role !== "contractor") return <main className="wrap"><p>시공업체 계정이 아니에요. <button className="btn sm ghost" onClick={logout}>로그아웃</button></p></main>;

  async function save() {
    if (!biz) return;
    const { error } = await sb().from("businesses").update({ work_codes: biz.work_codes, intro: biz.intro, phone: biz.phone }).eq("id", biz.id);
    setSaved(error ? "저장 실패: " + error.message : "저장했어요. 고른 공사의 요청을 받게 돼요."); loadReqs();
  }
  const newReqs = reqs.filter((r) => r.status === "open" && !r.my_quote);
  const sentReqs = reqs.filter((r) => r.my_quote);
  const won_ = sentReqs.filter((r) => r.my_quote?.status === "chosen");
  const myWorks = biz?.work_codes || [];
  const myLegal = legal.filter((n) => n.work_codes.includes("*") || n.work_codes.some((c) => myWorks.includes(c)));
  const list = tab === "req" ? newReqs : sentReqs;

  return (
    <main className="wrap">
      <div className="pagehead row between">
        <div><h1>{biz?.name || "내 업체"}</h1><p>견적 요청을 확인하고 견적을 보내세요</p></div>
        <button className="btn sm ghost" onClick={logout}>로그아웃</button>
      </div>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card"><div className="muted small">새 견적 요청</div><div className="kpi">{newReqs.length}건</div></div>
        <div className="card"><div className="muted small">보낸 견적</div><div className="kpi">{sentReqs.length}건</div></div>
        <div className="card"><div className="muted small">시민이 나를 선택</div><div className="kpi">{won_.length}건</div></div>
      </div>
      <div className="tabs">
        {[["req", `새 요청 ${newReqs.length}`], ["sent", `보낸 견적 ${sentReqs.length}`], ["info", "받을 공사·정보"], ["legal", "시공 법·안전"], ["support", "업체 지원사업"]].map(([k, l]) =>
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {(tab === "req" || tab === "sent") && (list.length === 0
        ? <div className="card flat muted">{tab === "req" ? "새 견적 요청이 없어요. 시민 화면(첫 화면)에서 요청을 보내 보세요." : "아직 보낸 견적이 없어요."}</div>
        : <div className="grid" style={{ gap: 12 }}>{list.map((r) => {
          const chosenMe = r.my_quote?.status === "chosen";
          return (
            <div key={r.id} className={`card req ${chosenMe ? "sel" : ""}`}>
              <div className="reqtop">
                {r.photo && <img src={r.photo} alt="" />}
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="tag">{r.work_name}</span>
                    {r.dong && <span className="tag">{r.dong}</span>}
                    <span className="small muted">{ago(r.created_at)} · 다른 업체 견적 {Math.max(0, r.quote_count - (r.my_quote ? 1 : 0))}개</span>
                  </div>
                  <p style={{ margin: "6px 0 2px" }}><b>“{r.text || "(사진으로 요청)"}”</b></p>
                  <div className="small muted">{[HOUSING.find((h) => h.v === r.housing)?.label, FLOORS.find((f) => f.v === r.floors)?.label].filter(Boolean).join(" · ")}
                    {r.diagnosis?.defect && <> · AI 추정: {r.diagnosis.defect}</>}</div>
                </div>
              </div>
              {r.diagnosis && (r.diagnosis.problems?.length || r.diagnosis.method?.length) ? (
                <details style={{ marginTop: 8 }}><summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>AI 진단 보기 (보이는 문제·추정 원인)</summary>
                  <div className="small" style={{ marginTop: 6 }}>
                    {r.diagnosis.problems?.length ? <p style={{ margin: "0 0 4px" }}><b>보이는 문제:</b> {r.diagnosis.problems.join(", ")}</p> : null}
                    {r.diagnosis.cause && <p style={{ margin: "0 0 4px" }}><b>추정 원인:</b> {r.diagnosis.cause}</p>}
                    {r.diagnosis.questions?.length ? <p style={{ margin: 0 }}><b>시민에게 확인할 것:</b> {r.diagnosis.questions.join(" / ")}</p> : null}
                  </div></details>) : null}
              {r.my_quote && (
                <div className={`mine ${chosenMe ? "won" : r.my_quote.status === "declined" ? "lost" : ""}`}>
                  {chosenMe ? <>🎉 시민이 우리 업체를 골랐어요 → <b>{r.citizen_name}</b> <a href={`tel:${r.citizen_phone}`}><b>{r.citizen_phone}</b></a> 방문 일정을 잡아 주세요.</>
                    : r.my_quote.status === "declined" ? "시민이 다른 업체를 골랐어요." : "보낸 견적: 시민이 비교 중이에요."}
                  <span className="small"> ({won(r.my_quote.price_min)}~{won(r.my_quote.price_max)})</span>
                </div>
              )}
              {r.status === "open" && (open === r.id
                ? <QuoteForm r={r} onDone={() => { setOpen(null); loadReqs(); setTab("sent"); }} />
                : <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setOpen(r.id)}>{r.my_quote ? "견적 고치기" : "견적 보내기"}</button>)}
            </div>);
        })}</div>)}

      {tab === "info" && biz && (
        <div className="card">
          <div className="notice">고른 공사의 견적 요청이 들어와요. 정보를 많이 입력하거나 돈을 내도 요청을 더 받지 않아요. 요청은 공사에 맞는 업체에 골고루 가요.</div>
          <label className="f">받을 공사</label>
          <div className="chips">{works.filter((w) => w.code !== "OTHER").map((w) => (
            <button key={w.code} className={`chip ${myWorks.includes(w.code) ? "on" : ""}`}
              onClick={() => setBiz({ ...biz, work_codes: myWorks.includes(w.code) ? myWorks.filter((x) => x !== w.code) : [...myWorks, w.code] })}>{w.name}</button>))}</div>
          <label className="f">전화번호</label><input type="tel" value={biz.phone || ""} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
          <label className="f">업체 소개</label><textarea rows={2} value={biz.intro || ""} onChange={(e) => setBiz({ ...biz, intro: e.target.value })} />
          <div className="small muted" style={{ marginTop: 10 }}>상호·면허·신뢰도는 동해시가 공공데이터로 확인해 관리해요.</div>
          <div className="row" style={{ marginTop: 14 }}><button className="btn sea" onClick={save}>저장</button><span className="small">{saved}</span></div>
        </div>
      )}
      {tab === "legal" && <><p className="sub">받는 공사에 해당하는 기준이에요.</p><LegalList notes={myLegal} /></>}
      {tab === "support" && <><div className="notice" style={{ marginBottom: 12 }}>동해시 수의계약 희망업체 등록제(DH-011)에 등록하면 시 발주 소규모 공사 견적 기회를 받을 수 있어요.</div>
        <div className="grid g2">{progs.map((p) => <ProgramCard key={p.id} p={p} />)}</div></>}
    </main>
  );
}
