"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Diagnosis, Plan } from "@/lib/types";
import { CONDITIONS, DONGS, FLOORS, HOUSING, applyStatus } from "@/lib/types";
import DiagnosisCard from "./DiagnosisCard";
import ProgramDetail from "./ProgramDetail";
import type { Program } from "@/lib/types";

const EXAMPLES = ["비 오면 천장에서 물이 새요", "외벽에 금이 가고 페인트가 벗겨져요", "겨울마다 벽에 곰팡이가 펴요", "보일러가 고장났어요", "화장실 타일이 깨졌어요"];

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.8);
}
const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

type SR = { lang: string; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start: () => void };

/** 견적 요청서 만들기: ① 사진·증상 → ② AI가 정리한 요청서 확인(+지원금 알림) → ③ 연락처 넣고 보내기 */
export default function RequestForm({ channel = "citizen" }: { channel?: "citizen" | "counter" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [housing, setHousing] = useState("단독주택");
  const [floors, setFloors] = useState("");
  const [dong, setDong] = useState("");
  const [conds, setConds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", consent: false });
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ p: Program; why?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const step2 = useRef<HTMLDivElement>(null);

  function speak() {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Rec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Rec) { setErr("이 브라우저는 말로 입력하기를 지원하지 않아요. 글로 적어 주세요."); return; }
    const r = new Rec(); r.lang = "ko-KR"; setListening(true); setErr("");
    r.onresult = (e) => setText((t) => (t ? t + " " : "") + e.results[0][0].transcript);
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    r.start();
  }
  async function loadPlan(code: string) {
    const p = await post("/api/plan", { work_code: code, housing, floors, dong, conditions: conds });
    if (p.error) throw new Error(p.error);
    setPlan(p);
  }
  async function analyze() {
    if (!text.trim() && !photo) { setErr("사진을 올리거나 증상을 적어 주세요."); return; }
    setErr(""); setPlan(null);
    try {
      setBusy(photo ? "AI가 사진을 보고 요청서를 쓰고 있어요" : "AI가 요청서를 쓰고 있어요");
      const d = await post("/api/diagnose", { text, image: photo });
      if (d.error) throw new Error(d.error);
      setDiag(d);
      await loadPlan(d.work_code);
      setTimeout(() => step2.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (e) { setErr(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요."); }
    setBusy("");
  }
  async function changeWork(code: string) {
    setBusy("다시 정리하고 있어요");
    try { await loadPlan(code); } catch (e) { setErr(e instanceof Error ? e.message : "오류"); }
    setBusy("");
  }
  async function submit() {
    setErr("");
    if (!form.name.trim() || form.phone.replace(/\D/g, "").length < 9) { setErr("이름과 연락처를 확인해 주세요."); return; }
    if (!form.consent) { setErr("개인정보 제공에 동의해 주세요."); return; }
    setBusy("업체에 보내고 있어요");
    const r = await post("/api/request", { channel, work_code: plan!.work.code, housing, floors, dong, conditions: conds, text, photo,
      diagnosis: diag, citizen_name: form.name, citizen_phone: form.phone, consent: true }).catch(() => ({ error: "네트워크 오류예요." }));
    setBusy("");
    if (!r.token) { setErr(r.error || "보내지 못했어요."); return; }
    if (channel === "counter") { setDone(r.token); return; }
    try { const k = "itda_requests"; const list = JSON.parse(localStorage.getItem(k) || "[]"); localStorage.setItem(k, JSON.stringify([r.token, ...list].slice(0, 10))); } catch {}
    router.push(`/r/${r.token}`);
  }

  if (done) {
    const link = `${location.origin}/r/${done}`;
    const sms = `[동해시 AI 잇다] ${form.name}님의 집수리 견적 요청이 접수됐어요. 업체 견적이 오면 아래 링크에서 비교하고 고르세요.\n${link}`;
    return (
      <div className="card">
        <h3>접수됐어요</h3>
        <p className="small">민원인 휴대폰으로 견적 확인 링크를 보내 주세요. 견적이 오면 이 링크에서 비교하고 고를 수 있어요.</p>
        <textarea rows={4} readOnly value={sms} />
        <div className="row" style={{ marginTop: 10 }}>
          <a className="btn sm sea" href={`sms:${form.phone}?&body=${encodeURIComponent(sms)}`}>문자로 보내기</a>
          <a className="btn sm ghost" href={`/r/${done}`} target="_blank">요청 화면 열기</a>
          <button className="btn sm ghost" onClick={() => { setDone(null); setPlan(null); setDiag(null); setText(""); setPhoto(null); setForm({ name: "", phone: "", consent: false }); }}>다음 민원 접수</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="stephead"><span className="n">1</span><b>어디가 문제인가요?</b></div>
        <div className="grid g2">
          <div>
            <button type="button" className="photo" onClick={() => fileRef.current?.click()}>
              {photo ? <img src={photo} alt="올린 사진" /> : <><span className="ico" aria-hidden>📷</span><span>사진 찍기·올리기</span><small>업체가 보고 견적을 더 정확히 내요</small></>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setPhoto(await shrink(f)); } catch { setErr("사진을 읽지 못했어요."); } } e.target.value = ""; }} />
            {photo && <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setPhoto(null)}>사진 지우기</button>}
          </div>
          <div>
            <div className="row between">
              <label className="f" htmlFor="sym" style={{ margin: 0 }}>증상</label>
              <button type="button" className="btn sm ghost" onClick={speak} disabled={listening}>{listening ? "듣고 있어요…" : "🎤 말로 하기"}</button>
            </div>
            <textarea id="sym" rows={4} style={{ marginTop: 6 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="예) 비 오면 안방 천장에서 물이 떨어져요" />
            <div className="chips" style={{ marginTop: 8 }}>{EXAMPLES.map((x) => <button key={x} type="button" className="chip ex" onClick={() => setText(x)}>{x}</button>)}</div>
          </div>
        </div>
        <div className="grid g2">
          <div>
            <label className="f">건물</label>
            <div className="chips">{HOUSING.map((h) => <button key={h.v} type="button" className={`chip ${housing === h.v ? "on" : ""}`} aria-pressed={housing === h.v} onClick={() => setHousing(h.v)}>{h.label}</button>)}</div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="f">층수</label>
              <div className="chips">{FLOORS.map((f) => <button key={f.v} type="button" className={`chip ${floors === f.v ? "on" : ""}`} aria-pressed={floors === f.v} onClick={() => setFloors(floors === f.v ? "" : f.v)}>{f.label}</button>)}</div>
            </div>
            <div>
              <label className="f" htmlFor="dong">동네</label>
              <select id="dong" value={dong} onChange={(e) => setDong(e.target.value)}><option value="">선택</option>{DONGS.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
          </div>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>지원금 받을 수 있는지도 같이 확인하기 (선택)</summary>
          <div className="chips" style={{ marginTop: 8 }}>{CONDITIONS.map((c) => <button key={c.v} type="button" className={`chip ${conds.includes(c.v) ? "on" : ""}`} aria-pressed={conds.includes(c.v)}
            onClick={() => setConds(conds.includes(c.v) ? conds.filter((x) => x !== c.v) : [...conds, c.v])}>{c.label}</button>)}</div>
        </details>
        {!plan && <button className="btn wide" style={{ marginTop: 20 }} onClick={analyze} disabled={!!busy}>{busy ? <><span className="spin" />{busy}</> : "견적 요청서 만들기"}</button>}
        {plan && <button className="btn sm ghost" style={{ marginTop: 14 }} onClick={analyze} disabled={!!busy}>내용을 바꿨어요, 다시 만들기</button>}
        {err && !plan && <p role="alert" className="errtext">{err}</p>}
      </div>

      <div ref={step2} />
      {plan && diag && (
        <>
          <div className="card" style={{ marginTop: 14 }}>
            <div className="stephead"><span className="n">2</span><b>{photo ? "AI가 사진을 보고 진단했어요" : "AI 진단 결과"}</b><span className="small muted">이 내용이 견적 요청서로 업체에 전달돼요</span></div>
            <DiagnosisCard d={diag} workCode={plan.work.code} workName={plan.work.name} photo={photo} />
            <div className="small muted" style={{ marginTop: 10 }}>{[HOUSING.find((h) => h.v === housing)?.label, FLOORS.find((f) => f.v === floors)?.label, dong].filter(Boolean).join(" · ")}{text && ` · "${text}"`}</div>
            {plan.work.license_note && <div className="small" style={{ marginTop: 6 }}><span className="tag warn">면허</span> {plan.work.license_note}</div>}
            <details open={diag.confidence < 0.5 || plan.work.code === "OTHER"} style={{ marginTop: 10 }}>
              <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>공사 종류가 다르면 고르기</summary>
              <div className="chips" style={{ marginTop: 8 }}>{plan.all_works.filter((w) => w.code !== "OTHER").map((w) =>
                <button key={w.code} className={`chip ${w.code === plan.work.code ? "on" : ""}`} disabled={!!busy} onClick={() => changeWork(w.code)}>{w.name}</button>)}</div>
            </details>
            {diag.urgent && <div className="alert" style={{ marginTop: 12 }}>위험할 수 있어요. 가스 냄새면 119·한국가스안전공사(1544-4500), 누전이면 한국전기안전공사(1588-7500)에 먼저 연락하세요.</div>}
          </div>

          {(plan.programs.length > 0 || plan.maybe_programs.length > 0) && (
            <div className="card money" style={{ marginTop: 14 }}>
              <b>💰 {plan.programs.length ? `이 공사, 지원금 받을 수 있는 사업이 ${plan.programs.length}개 있어요` : "조건이 맞으면 받을 수 있는 지원사업이 있어요"}</b>
              <p className="small" style={{ margin: "6px 0 4px" }}>대부분 <b>공사 시작 전에 신청</b>해야 해요. 견적을 받는 동안 먼저 문의해 보세요.</p>
              {[...plan.programs.map((p) => ({ p, why: undefined as string | undefined })), ...plan.maybe_programs].map(({ p, why }) => {
                const st = applyStatus(p);
                return (
                  <div key={p.id} className="moneyrow">
                    <div style={{ minWidth: 0 }}>
                      <b>{p.name}</b>
                      <div className="row" style={{ gap: 4, margin: "3px 0" }}>
                        <span className={`tag ${st.tone === "open" || st.tone === "always" ? "new" : "warn"}`}>{st.label}</span>
                        {why && <span className="tag warn">{why}</span>}
                      </div>
                      {p.amount_text && <div className="small muted">{p.amount_text.length > 80 ? p.amount_text.slice(0, 80) + "…" : p.amount_text}</div>}
                    </div>
                    <button className="btn sm sea" style={{ flex: "none", alignSelf: "center" }} onClick={() => setDetail({ p, why })}>자세히 보기</button>
                  </div>
                );
              })}
            </div>
          )}
          {detail && <ProgramDetail p={detail.p} why={detail.why} onClose={() => setDetail(null)} />}

          <div className="card" style={{ marginTop: 14 }}>
            <div className="stephead"><span className="n">3</span><b>동해 업체 {plan.recipient_count}곳에 견적 요청 보내기</b></div>
            <p className="small muted" style={{ marginTop: 0 }}>이 공사를 하는 것으로 확인된 동해시 업체에 보내요. 광고나 순위 없이 골고루 골라요. 업체가 견적을 보내면 비교한 뒤 마음에 드는 곳만 고르면 돼요.</p>
            <div className="grid g2">
              <div><label className="f" htmlFor="nm">이름</label><input id="nm" type="text" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="f" htmlFor="ph">연락처</label><input id="ph" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" /></div>
            </div>
            <label className="check small"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span>견적 요청을 위해 증상·사진·동네를 업체에 보여주는 데 동의해요. <b>연락처는 내가 고른 업체에만</b> 전달돼요.</span></label>
            <button className="btn wide" style={{ marginTop: 16 }} onClick={submit} disabled={!!busy}>{busy ? <><span className="spin" />{busy}</> : "견적 요청 보내기"}</button>
            {err && <p role="alert" className="errtext">{err}</p>}
          </div>
        </>
      )}
    </div>
  );
}
