"use client";
import { useRef, useState } from "react";
import type { Diagnosis, MatchResult } from "@/lib/types";
import { CONDITIONS, DONGS, HOUSING } from "@/lib/types";
import { BusinessCard, LegalList, ProgramCard } from "./Cards";
import Preview from "./Preview";

const EXAMPLES = ["비 오면 천장에서 물이 새요", "외벽에 금이 가고 페인트가 벗겨져요", "겨울마다 벽에 곰팡이가 펴요", "어르신이 화장실에서 자꾸 미끄러져요"];

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const s = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.85);
}

export default function CitizenFlow({ channel = "citizen" }: { channel?: "citizen" | "counter" }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [housing, setHousing] = useState("단독주택");
  const [dong, setDong] = useState("");
  const [conds, setConds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [res, setRes] = useState<MatchResult | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", message: "", consent: false });
  const [sent, setSent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run() {
    if (!text.trim() && !photo) { setErr("사진을 올리거나 증상을 적어 주세요."); return; }
    setErr(""); setRes(null); setDiag(null); setSent(""); setSel([]);
    try {
      setBusy("AI가 사진과 설명을 보고 있어요…");
      const d: Diagnosis = await fetch("/api/diagnose", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image: photo, demo: new URLSearchParams(location.search).get("demo") === "1" }) }).then((r) => r.json());
      if ((d as unknown as { error?: string }).error) throw new Error((d as unknown as { error: string }).error);
      setDiag(d);
      await match(d.work_code, d);
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
    setBusy("");
  }
  async function match(work_code: string, d: Diagnosis | null = diag) {
    setBusy("지원사업과 업체를 찾고 있어요…");
    const r = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_code, housing, dong, conditions: conds, channel, input_text: text, has_photo: !!photo, diagnosis: d }) }).then((r) => r.json());
    if (r.error) throw new Error(r.error);
    setRes(r); setBusy("");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  async function send() {
    setErr("");
    const r = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultation_id: res?.consultation_id, business_ids: sel, citizen_name: form.name, citizen_phone: form.phone,
        message: form.message || text, consent: form.consent, dong, work_code: res?.work.code }) }).then((r) => r.json());
    if (r.ok) setSent(`${r.sent}곳에 문의를 보냈어요. 업체가 연락드릴 거예요.`); else setErr(r.error);
  }
  const summary = res && diag ? [
    `[동해시 AI 잇다 상담 요약]`,
    `증상: ${text || "(사진 상담)"}`,
    `필요 공사: ${res.work.name}`,
    res.programs.length ? `받을 수 있는 지원: ${res.programs.slice(0, 3).map((p) => `${p.name}(${p.contact || p.apply_where})`).join(" / ")}` : `지원사업: 해당 없음`,
    `업체: ${res.businesses.slice(0, 3).map((b) => `${b.name} ${b.phone || ""}`).join(" / ")}`,
    res.legal.filter((l) => l.level !== "info").slice(0, 2).map((l) => `주의: ${l.title}`).join("\n"),
    `※ 금액·기간은 매년 바뀝니다. 신청 전 공고 원문을 확인하세요.`,
  ].filter(Boolean).join("\n") : "";

  return (
    <div>
      <div className="card">
        <div className="steps"><span className={!res ? "on" : ""}>1. 사진·증상</span><span className={res ? "on" : ""}>2. 지원사업·업체·법 안내</span><span>3. 문의</span></div>
        <div className="grid g2">
          <div>
            <label className="f">사진 (선택)</label>
            <div className="photo" onClick={() => fileRef.current?.click()}>
              {photo ? <img src={photo} alt="올린 사진" /> : <span className="muted">📷 눌러서 사진 올리기</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await shrink(f)); }} />
            {photo && <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setPhoto(null)}>사진 지우기</button>}
          </div>
          <div>
            <label className="f">어떤 문제가 있나요?</label>
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="예) 비 오면 안방 천장에서 물이 떨어져요" />
            <div className="chips" style={{ marginTop: 8 }}>
              {EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => setText(x)}>{x}</button>)}
            </div>
          </div>
        </div>
        <label className="f">건물 종류</label>
        <div className="chips">{HOUSING.map((h) => <button key={h.v} className={`chip ${housing === h.v ? "on" : ""}`} onClick={() => setHousing(h.v)}>{h.label}</button>)}</div>
        <div className="grid g2">
          <div>
            <label className="f">사는 동네</label>
            <select value={dong} onChange={(e) => setDong(e.target.value)}>
              <option value="">선택 안 함</option>{DONGS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="f">해당하는 것 (지원사업 확인용, 선택)</label>
            <div className="chips">{CONDITIONS.map((c) => <button key={c.v} className={`chip ${conds.includes(c.v) ? "on" : ""}`}
              onClick={() => setConds(conds.includes(c.v) ? conds.filter((x) => x !== c.v) : [...conds, c.v])}>{c.label}</button>)}</div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn" onClick={run} disabled={!!busy}>{busy || "AI로 확인하기"}</button>
          {err && <span style={{ color: "var(--danger)", fontWeight: 700 }}>{err}</span>}
        </div>
      </div>

      <div ref={resultRef} />
      {diag && res && (
        <>
          <h2>🔍 판별 결과</h2>
          {diag.urgent && <div className="alert" style={{ marginBottom: 12 }}>⚠️ 위험할 수 있어요. 가스 냄새·누전이면 즉시 119 또는 가스안전공사(1544-4500)에 연락하세요.</div>}
          <div className="card diag">
            <div className="muted small">필요한 공사</div>
            <div className="big">{res.work.name}</div>
            <p style={{ margin: "6px 0" }}>{diag.plain_explain}</p>
            <div className="row small muted">
              <span>추정 원인: {diag.defect}</span>
              <span className="row">확신도 <span className="meter"><i style={{ width: `${Math.round(diag.confidence * 100)}%` }} /></span></span>
              <span>{diag.source === "gemini" ? "AI 판별" : "키워드 판별"}</span>
            </div>
            {diag.questions?.length > 0 && <div className="notice" style={{ marginTop: 10 }}>더 정확히 알려면: {diag.questions.join(" / ")}</div>}
            {res.work.license_note && <div className="small" style={{ marginTop: 8 }}>📋 {res.work.license_note}</div>}
            <details style={{ marginTop: 10 }}>
              <summary className="small">공사 종류가 다르다면 직접 고르기</summary>
              <div className="chips" style={{ marginTop: 8 }}>
                {["LEAK_ROOF","WALL_CRACK","WINDOW_LEAK","MOLD","WINDOW","BOILER","PIPE_LEAK","BATH_KITCHEN","WALLPAPER_FLOOR","ELECTRIC","ROOF_SLATE","ACCESS","STORE"].map((c) =>
                  <button key={c} className={`chip ${c === res.work.code ? "on" : ""}`} onClick={() => match(c)}>{c === res.work.code ? res.work.name : c}</button>)}
              </div>
            </details>
          </div>

          <h2>💰 받을 수 있는 지원사업 {res.programs.length}개</h2>
          {res.programs.length ? <div className="grid g2">{res.programs.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
            : <p className="muted">조건에 딱 맞는 사업이 없어요. 아래 '조건이 맞으면' 사업이나 동 행정복지센터에 문의해 보세요.</p>}
          {res.maybe_programs.length > 0 && <>
            <h3 style={{ marginTop: 18 }}>조건이 맞으면 받을 수 있어요</h3>
            <div className="grid g2">{res.maybe_programs.map(({ p, why }) => <ProgramCard key={p.id} p={p} why={why} />)}</div>
          </>}
          <p className="muted small">금액·기간은 매년 바뀝니다. 신청 전 공고 원문을 확인하세요.</p>

          <LegalList notes={res.legal} />

          <h2>🔨 동해시 업체</h2>
          <p className="muted small">공공 데이터에서 확인된 동해시 업체를 매번 다르게 골라 보여드려요. 광고·순위가 아니에요. 새로 시작한 업체도 함께 소개해요.</p>
          <div className="grid g3">{res.businesses.map((b) => <BusinessCard key={b.id} b={b} selected={sel.includes(b.id)}
            onToggle={() => setSel(sel.includes(b.id) ? sel.filter((x) => x !== b.id) : [...sel, b.id])} />)}</div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>✍️ 계약 전 확인할 것</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
              <li>견적은 2곳 이상 받아 비교하기</li>
              <li>사업자등록·건설업 면허를 확인하기 (금액이 크면 면허 필수)</li>
              <li>계약서에 공사 범위·금액·하자보수 기간 적기</li>
              <li>지원사업을 받을 거면 결정 통보 전에 공사 시작하지 않기</li>
            </ul>
          </div>

          {sel.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>📨 선택한 {sel.length}곳에 문의 보내기</h3>
              {sent ? <div className="notice">{sent}</div> : <>
                <div className="grid g2">
                  <div><label className="f">이름</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="f">연락처</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" /></div>
                </div>
                <label className="f">남길 말 (선택)</label>
                <textarea rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={text} />
                <label className="check small"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                  선택한 업체에 이름·연락처·증상을 전달하는 데 동의해요 (상담 목적으로만 사용).</label>
                <button className="btn" style={{ marginTop: 12 }} onClick={send}>문의 보내기</button>
              </>}
            </div>
          )}

          {photo && <Preview image={photo} workName={res.work.name} />}

          {channel === "counter" && (
            <section>
              <h2>🧾 창구 요약 (문자로 보내기)</h2>
              <textarea rows={8} readOnly value={summary} />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sea" onClick={() => navigator.clipboard.writeText(summary)}>복사하기</button>
                <button className="btn ghost" onClick={() => window.print()}>인쇄</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
