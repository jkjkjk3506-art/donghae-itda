"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";
import { pickLegal } from "@/lib/match";
import type { LegalNote, Program, Quote, RequestView } from "@/lib/types";
import { HOUSING, FLOORS, won } from "@/lib/types";
import { LegalList, ProgramCard } from "./Cards";
import DiagnosisCard from "./DiagnosisCard";

const BIG_JOB = 1500; // 만원: 전문공사 면허 기준

function licenseCheck(q: Quote) {
  if (q.price_max < BIG_JOB) return { ok: true, text: "1,500만원 미만이라 면허 없이도 할 수 있는 공사예요" };
  if (q.business.licenses) return { ok: true, text: `건설업 면허 확인: ${q.business.licenses}` };
  return { ok: false, text: "1,500만원 이상 공사인데 이 업체의 건설업 면허가 확인되지 않아요. 계약 전 면허를 꼭 확인하세요." };
}

export default function RequestStatus({ token }: { token: string }) {
  const [v, setV] = useState<RequestView | null>(null);
  const [progs, setProgs] = useState<Program[]>([]);
  const [legal, setLegal] = useState<LegalNote[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb().rpc("get_request", { t: token });
    if (error || !data) { setErr("요청을 찾을 수 없어요. 링크를 다시 확인해 주세요."); return; }
    setV(data as RequestView);
  }, [token]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!v) return;
    if (v.request.program_ids.length) sb().from("programs").select("*").in("id", v.request.program_ids).then(({ data }) => setProgs((data || []) as Program[]));
    sb().from("legal_notes").select("*").then(({ data }) => setLegal(pickLegal((data || []) as LegalNote[], v.request.work_code, "citizen", v.request.housing, v.request.floors || undefined).filter((n) => n.level !== "info" || n.code.startsWith("L-WARRANTY"))));
  }, [v?.request.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(q: Quote) {
    if (!confirm(`${q.business.name}을(를) 고를까요?\n이 업체에만 연락처가 전달되고, 다른 업체에는 '다른 업체를 골랐다'고 알려요.`)) return;
    setBusy(true);
    const { error } = await sb().rpc("choose_quote", { t: token, q: q.id });
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  if (err && !v) return <div className="card"><p>{err}</p><Link href="/">처음으로</Link></div>;
  if (!v) return <p className="muted">불러오는 중…</p>;
  const r = v.request;
  const quotes = [...v.quotes].sort((a, b) => a.price_min - b.price_min);
  const chosen = quotes.find((q) => q.id === r.chosen_quote);
  const minP = quotes.length ? Math.min(...quotes.map((q) => q.price_min)) : 0;
  const quoted = new Set(quotes.map((q) => q.business.id));
  const waitingJoined = v.recipients.filter((b) => b.joined && !quoted.has(b.id));
  const callable = v.recipients.filter((b) => !b.joined && !b.is_demo && b.phone);

  return (
    <div>
      <div className="statushead">
        <div>
          <div className="small muted">{new Date(r.created_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} 요청 · {r.citizen_name}님</div>
          <h1>{r.work_name} 견적</h1>
        </div>
        <span className={`pill ${chosen ? "done" : quotes.length ? "got" : ""}`}>{chosen ? "업체 선택 완료" : quotes.length ? `견적 ${quotes.length}개 도착` : "견적 기다리는 중"}</span>
      </div>

      <div className="track">
        <div className="on"><b>1</b>요청 보냄</div>
        <div className={quotes.length ? "on" : ""}><b>2</b>견적 도착</div>
        <div className={chosen ? "on" : ""}><b>3</b>업체 선택</div>
        <div><b>4</b>방문·계약</div>
      </div>

      {r.diagnosis && <details className="card flat" style={{ marginBottom: 14 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>내 요청서 · AI 진단 다시 보기</summary>
        <div style={{ marginTop: 10 }}><DiagnosisCard d={r.diagnosis} workCode={r.work_code} workName={r.work_name} photo={r.photo} compact /></div>
      </details>}

      {chosen ? (
        <div className="card chosen">
          <h3>✓ {chosen.business.name}을(를) 골랐어요</h3>
          <p className="small" style={{ margin: "4px 0 10px" }}>업체에 연락처가 전달됐어요. 업체가 방문 일정을 잡으려고 연락드릴 거예요. 먼저 전화하셔도 돼요.</p>
          {chosen.business.phone && <a className="btn" href={`tel:${chosen.business.phone}`}>📞 {chosen.business.phone} 전화하기</a>}
          <div className="small muted" style={{ marginTop: 10 }}>견적 {won(chosen.price_min)} ~ {won(chosen.price_max)} · 방문 {chosen.visit || "협의"} · 공사 기간 {chosen.period || "협의"}</div>
        </div>
      ) : quotes.length === 0 ? (
        <div className="card">
          <h3>업체 {v.recipients.length}곳에 요청을 보냈어요</h3>
          <p className="small muted" style={{ margin: 0 }}>견적이 오면 이 화면에 바로 나타나요. 이 화면 주소를 저장하거나 아래 버튼으로 가족에게 보내 두세요.</p>
        </div>
      ) : (
        <p className="sub">금액이 낮은 순서예요. 금액만 보지 말고 면허·실적·방문 일정을 함께 보고 고르세요.</p>
      )}

      {quotes.length > 0 && (
        <div className="grid g2" style={{ marginTop: 12 }}>
          {quotes.map((q) => {
            const lc = licenseCheck(q);
            return (
              <div key={q.id} className={`card quote ${q.id === r.chosen_quote ? "sel" : ""} ${chosen && q.id !== r.chosen_quote ? "dim" : ""}`}>
                <div className="row" style={{ gap: 6 }}>
                  {q.price_min === minP && quotes.length > 1 && <span className="tag new">가장 낮은 금액</span>}
                  {q.business.is_newcomer && <span className="tag new">새로 소개하는 업체</span>}
                  {q.business.is_demo && <span className="tag demo">시연용 업체</span>}
                </div>
                <div className="qname">{q.business.name}</div>
                <div className="price">{won(q.price_min)} ~ {won(q.price_max)}</div>
                <dl className="qdl">
                  <dt>방문 가능</dt><dd>{q.visit || "협의"}</dd>
                  <dt>공사 기간</dt><dd>{q.period || "협의"}</dd>
                  {q.business.public_works && <><dt>공공공사</dt><dd>{q.business.public_works}</dd></>}
                  <dt>확인</dt><dd>출처 {q.business.source_count ?? 1}곳 · {"★".repeat(q.business.trust_level)}</dd>
                </dl>
                {q.message && <p className="msg">“{q.message}”</p>}
                <div className={`lic ${lc.ok ? "" : "bad"}`}>{lc.ok ? "✓ " : "⚠ "}{lc.text}</div>
                {!chosen && <button className="btn wide" style={{ marginTop: 12 }} disabled={busy} onClick={() => choose(q)}>이 업체로 고르기</button>}
              </div>
            );
          })}
        </div>
      )}

      {!chosen && (waitingJoined.length > 0 || callable.length > 0) && (
        <div className="card flat" style={{ marginTop: 14 }}>
          {waitingJoined.length > 0 && <p className="small" style={{ marginTop: 0 }}><b>견적 작성 중일 수 있는 업체:</b> {waitingJoined.map((b) => b.name).join(", ")}</p>}
          {callable.length > 0 && <>
            <p className="small" style={{ margin: "0 0 8px" }}><b>아직 잇다에 가입하지 않은 업체예요.</b> 전화로 직접 견적을 받을 수도 있어요.</p>
            <div className="calls">{callable.map((b) => <a key={b.id} href={`tel:${b.phone}`}><b>{b.name}</b><span>{b.category}{b.licenses ? " · 면허 있음" : ""}</span><span>{b.phone}</span></a>)}</div>
          </>}
        </div>
      )}

      {progs.length > 0 && <>
        <h2>💰 공사 전에 지원금부터 확인하세요</h2>
        <p className="sub">지원 결정 전에 공사를 시작하면 지원을 못 받을 수 있어요. 업체를 고르기 전에 문의해 보세요.</p>
        <div className="grid g2">{progs.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
      </>}

      <h2>✍️ 계약 전 확인할 것</h2>
      <p className="sub">이 공사와 건물에 해당하는 법·안전 기준이에요.</p>
      <LegalList notes={legal} />

      <div className="card flat" style={{ marginTop: 20 }}>
        <div className="row">
          <button className="btn sm sea" onClick={() => navigator.clipboard.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? "복사했어요 ✓" : "이 화면 주소 복사"}</button>
          <a className="btn sm ghost" href={`sms:?&body=${encodeURIComponent(`[동해시 AI 잇다] ${r.work_name} 견적 확인 ${typeof location !== "undefined" ? location.href : ""}`)}`}>가족에게 문자로 보내기</a>
          <Link className="btn sm ghost" href="/">새 요청 하기</Link>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>이 주소를 아는 사람만 이 화면을 볼 수 있어요. {[HOUSING.find((h) => h.v === r.housing)?.label, FLOORS.find((f) => f.v === r.floors)?.label, r.dong].filter(Boolean).join(" · ")}</p>
      </div>
      {err && <p className="errtext">{err}</p>}
    </div>
  );
}
