"use client";
import { useRef, useState } from "react";
import type { Diagnosis, MatchResult } from "@/lib/types";
import { CONDITIONS, DONGS, FLOORS, HOUSING } from "@/lib/types";
import { BusinessCard, LegalList, ProgramCard } from "./Cards";
import Preview from "./Preview";

const EXAMPLES = ["비 오면 천장에서 물이 새요", "외벽에 금이 가고 페인트가 벗겨져요", "겨울마다 벽에 곰팡이가 펴요", "보일러가 고장났어요", "어르신이 화장실에서 자꾸 미끄러져요"];

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const s = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.85);
}
const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

type SR = { lang: string; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start: () => void };

export default function CitizenFlow({ channel = "citizen" }: { channel?: "citizen" | "counter" }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [housing, setHousing] = useState("단독주택");
  const [floors, setFloors] = useState("");
  const [dong, setDong] = useState("");
  const [conds, setConds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [res, setRes] = useState<MatchResult | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", message: "", consent: false });
  const [sent, setSent] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function speak() {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Rec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Rec) { setErr("이 브라우저는 말로 입력하기를 지원하지 않아요. 글로 적어 주세요."); return; }
    const r = new Rec(); r.lang = "ko-KR"; setListening(true); setErr("");
    r.onresult = (e) => setText((t) => (t ? t + " " : "") + e.results[0][0].transcript);
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    r.start();
  }

  async function match(work_code: string, d: Diagnosis | null, cid?: string) {
    setBusy("지원사업·법 안내·업체를 찾고 있어요");
    const r = await post("/api/match", { work_code, housing, floors, dong, conditions: conds, channel, input_text: text, has_photo: !!photo, diagnosis: d, consultation_id: cid });
    if (r.error) throw new Error(r.error);
    setRes(r); setSel([]); setSent("");
  }
  async function run() {
    if (!text.trim() && !photo) { setErr("사진을 올리거나 증상을 적어 주세요."); return; }
    setErr(""); setRes(null); setDiag(null);
    try {
      setBusy(photo ? "AI가 사진과 설명을 보고 있어요" : "어떤 공사가 필요한지 확인하고 있어요");
      const d = await post("/api/diagnose", { text, image: photo, demo: new URLSearchParams(location.search).get("demo") === "1" });
      if (d.error) throw new Error(d.error);
      setDiag(d);
      await match(d.work_code, d);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (e) { setErr(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요."); }
    setBusy("");
  }
  async function rematch(code: string) {
    if (!res) return;
    try { await match(code, diag, res.consultation_id); } catch (e) { setErr(e instanceof Error ? e.message : "오류"); }
    setBusy("");
  }
  async function send() {
    setErr("");
    if (!form.name.trim() || form.phone.replace(/\D/g, "").length < 9) { setErr("이름과 연락처를 확인해 주세요."); return; }
    if (!form.consent) { setErr("업체에 정보를 전달하려면 동의가 필요해요."); return; }
    setSending(true);
    const r = await post("/api/inquiry", { consultation_id: res?.consultation_id, business_ids: sel, citizen_name: form.name, citizen_phone: form.phone,
      message: form.message || text, consent: form.consent, dong, work_code: res?.work.code }).catch(() => ({ error: "네트워크 오류예요." }));
    setSending(false);
    if (r.ok) setSent(`${r.sent}곳에 문의를 보냈어요. 업체가 적어 주신 번호로 연락드릴 거예요.`); else setErr(r.error);
  }

  const top = res?.programs[0];
  const warranty = res?.legal.find((l) => l.code.startsWith("L-WARRANTY"));
  const todos = res ? [
    top ? `'${top.name}'을(를) 먼저 문의하세요. ${top.contact || top.apply_where || ""}. 지원 결정 통보 전에 공사를 시작하면 지원을 못 받을 수 있어요.`
        : res.maybe_programs.length ? "지금 조건으로 바로 받을 수 있는 지원사업은 없어요. '조건이 맞으면' 사업에 해당하는지 동 행정복지센터에 물어보세요."
        : "이 공사에 맞는 지원사업은 확인되지 않았어요. 바로 업체 견적으로 넘어가세요.",
    "아래 업체 중 2곳 이상에 견적을 받아 비교하세요. '문의 대상에 담기'를 누르면 한 번에 요청할 수 있어요.",
    `계약서에 공사 범위·금액·기간·하자보수 기간을 적으세요.${warranty ? ` (${warranty.title.replace("이에요", "")})` : ""}`,
  ] : [];
  const summary = res ? [
    "[동해시 AI 잇다] 집수리 상담 결과",
    `· 증상: ${text || "(사진 상담)"}`,
    `· 필요한 공사: ${res.work.name}`,
    res.programs.length ? `· 지원사업: ${res.programs.slice(0, 3).map((p) => `${p.name} (${p.contact || p.apply_where || "문의처 확인"})`).join(" / ")}` : "· 지원사업: 지금 조건으로 해당 없음",
    `· 동해시 업체: ${res.businesses.filter((b) => !b.is_demo).slice(0, 3).map((b) => `${b.name} ${b.phone || ""}`).join(" / ")}`,
    ...res.legal.filter((l) => l.level !== "info").slice(0, 2).map((l) => `· 주의: ${l.title}`),
    "※ 금액·기간은 매년 바뀝니다. 신청 전 공고 원문을 확인하세요.",
  ].join("\n") : "";
  const lowConf = !!diag && (diag.confidence < 0.5 || res?.work.code === "OTHER");

  return (
    <div>
      <div className="card">
        <div className="grid g2">
          <div>
            <label className="f" style={{ marginTop: 0 }}>사진 <small>(선택 · 있으면 더 정확해요)</small></label>
            <button type="button" className="photo" onClick={() => fileRef.current?.click()}>
              {photo ? <img src={photo} alt="올린 사진" /> : <><span className="ico" aria-hidden>📷</span><span>눌러서 사진 찍기·올리기</span></>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setPhoto(await shrink(f)); } catch { setErr("사진을 읽지 못했어요. 다른 사진으로 해 보세요."); } } e.target.value = ""; }} />
            {photo && <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setPhoto(null)}>사진 지우기</button>}
          </div>
          <div>
            <div className="row between">
              <label className="f" htmlFor="sym" style={{ marginTop: 0 }}>어떤 문제가 있나요?</label>
              <button type="button" className="btn sm ghost" onClick={speak} disabled={listening}>{listening ? "듣고 있어요…" : "🎤 말로 하기"}</button>
            </div>
            <textarea id="sym" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="예) 비 오면 안방 천장에서 물이 떨어져요" />
            <div className="chips" style={{ marginTop: 8 }}>
              {EXAMPLES.map((x) => <button key={x} type="button" className="chip ex" onClick={() => setText(x)}>{x}</button>)}
            </div>
          </div>
        </div>
        <div className="grid g2">
          <div>
            <label className="f">건물 종류</label>
            <div className="chips">{HOUSING.map((h) => <button key={h.v} type="button" className={`chip ${housing === h.v ? "on" : ""}`} aria-pressed={housing === h.v} onClick={() => setHousing(h.v)}>{h.label}</button>)}</div>
          </div>
          <div>
            <label className="f">건물 층수 <small>(법·안전 안내가 달라져요)</small></label>
            <div className="chips">{FLOORS.map((f) => <button key={f.v} type="button" className={`chip ${floors === f.v ? "on" : ""}`} aria-pressed={floors === f.v} onClick={() => setFloors(floors === f.v ? "" : f.v)}>{f.label}</button>)}</div>
          </div>
        </div>
        <div className="grid g2">
          <div>
            <label className="f" htmlFor="dong">사는 동네 <small>(선택)</small></label>
            <select id="dong" value={dong} onChange={(e) => setDong(e.target.value)}>
              <option value="">선택 안 함</option>{DONGS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="f">해당하면 눌러 주세요 <small>(지원사업 확인용)</small></label>
            <div className="chips">{CONDITIONS.map((c) => <button key={c.v} type="button" className={`chip ${conds.includes(c.v) ? "on" : ""}`} aria-pressed={conds.includes(c.v)}
              onClick={() => setConds(conds.includes(c.v) ? conds.filter((x) => x !== c.v) : [...conds, c.v])}>{c.label}</button>)}</div>
          </div>
        </div>
        <button className="btn wide" style={{ marginTop: 22 }} onClick={run} disabled={!!busy}>
          {busy ? <><span className="spin" />{busy}</> : res ? "다시 확인하기" : "확인하기"}
        </button>
        {err && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, margin: "10px 0 0" }}>{err}</p>}
      </div>

      <div ref={resultRef} />
      {diag && res && (
        <>
          <nav className="jump noprint" aria-label="결과 바로가기">
            <a href="#s-diag">판별</a><a href="#s-prog">지원사업 {res.programs.length}</a><a href="#s-legal">법·안전 {res.legal.length}</a><a href="#s-biz">업체 {res.businesses.length}</a>
            {photo && <a href="#s-preview">미리보기</a>}<a href="#s-share">저장·공유</a>
          </nav>

          <section id="s-diag" style={{ marginTop: 18 }}>
            {diag.urgent && <div className="alert" style={{ marginBottom: 12 }}>위험할 수 있어요. 가스 냄새가 나면 119나 한국가스안전공사(1544-4500), 누전이 의심되면 한국전기안전공사(1588-7500)에 바로 연락하세요.</div>}
            <div className="card diag">
              <div className="row between">
                <span className="muted small">필요한 공사</span>
                <span className="small muted">{diag.source === "gemini" ? "AI 판별" : "기본 판별"} · 확신도 <span className="meter"><i style={{ width: `${Math.round(diag.confidence * 100)}%` }} /></span></span>
              </div>
              <div className="big">{res.work.name}</div>
              <p style={{ margin: "6px 0" }}>{res.work.code === diag.work_code ? diag.plain_explain : `직접 고르신 '${res.work.name}' 기준으로 안내해요.`}</p>
              {res.work.code === diag.work_code && <div className="small muted">추정 원인: {diag.defect}</div>}
              {diag.questions?.length > 0 && <div className="notice" style={{ marginTop: 10 }}>더 정확히 알려면: {diag.questions.join(" / ")}</div>}
              {res.work.license_note && <div className="small" style={{ marginTop: 8 }}><span className="tag warn">면허</span> {res.work.license_note}</div>}
              <details open={lowConf} style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>{lowConf ? "어떤 공사인지 직접 골라 주세요" : "공사 종류가 다르다면 직접 고르기"}</summary>
                <div className="chips" style={{ marginTop: 8 }}>
                  {res.all_works.filter((w) => w.code !== "OTHER").map((w) =>
                    <button key={w.code} className={`chip ${w.code === res.work.code ? "on" : ""}`} disabled={!!busy} onClick={() => rematch(w.code)}>{w.name}</button>)}
                </div>
              </details>
              <div className="kpis">
                <div><b>{res.programs.length}개</b><span>받을 수 있는 지원사업</span></div>
                <div><b>{res.legal.filter((l) => l.level !== "info").length}개</b><span>꼭 지킬 법·안전</span></div>
                <div><b>{res.businesses.length}곳</b><span>동해시 업체</span></div>
              </div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h3>이렇게 진행하세요</h3>
              <ol className="todo">{todos.map((t, i) => <li key={i}><span>{t}</span></li>)}</ol>
            </div>
          </section>

          <section id="s-prog">
            <h2><span className="n">1</span>받을 수 있는 지원사업</h2>
            <p className="sub">입력하신 조건으로 동해시에서 신청할 수 있는 사업만 골랐어요. 금액·기간은 매년 바뀌니 신청 전 공고 원문을 확인하세요.</p>
            {res.programs.length ? <div className="grid g2">{res.programs.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
              : <div className="card flat muted">지금 조건에 바로 맞는 사업이 없어요.</div>}
            {res.maybe_programs.length > 0 && <>
              <h3 style={{ margin: "22px 0 10px" }}>조건이 맞으면 받을 수 있어요</h3>
              <div className="grid g2">{res.maybe_programs.map(({ p, why }) => <ProgramCard key={p.id} p={p} why={why} />)}</div>
            </>}
          </section>

          <section id="s-legal">
            <h2><span className="n">2</span>공사 전에 꼭 알아둘 법·안전</h2>
            <p className="sub">{floors ? "입력하신 건물 종류와 층수에 맞춰 골랐어요." : "건물 층수를 고르면 내 경우에 해당하는 항목을 더 정확히 보여드려요."}</p>
            <LegalList notes={res.legal} />
          </section>

          <section id="s-biz">
            <h2><span className="n">3</span>동해시 업체</h2>
            <p className="sub">공공 데이터로 확인된 동해시 업체 중에서 이 공사에 맞는 곳을 매번 무작위로 골라요. 광고나 순위가 아니고, 새로 시작한 업체도 함께 소개해요.</p>
            <div className="grid g3">{res.businesses.map((b) => <BusinessCard key={b.id} b={b} selected={sel.includes(b.id)}
              onToggle={() => { setSent(""); setSel(sel.includes(b.id) ? sel.filter((x) => x !== b.id) : [...sel, b.id]); }} />)}</div>
            <button className="btn sm ghost noprint" style={{ marginTop: 12 }} disabled={!!busy} onClick={() => rematch(res.work.code)}>다른 업체도 보기</button>

            {sel.length > 0 && !sent && <div className="sendbar noprint"><span>{sel.length}곳 선택됨</span>
              <button className="btn sm" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>견적 문의 작성하기</button></div>}

            <div ref={formRef} />
            {sel.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <h3>선택한 {sel.length}곳에 견적 문의 보내기</h3>
                {sent ? <div className="notice">{sent}</div> : <>
                  <div className="grid g2">
                    <div><label className="f" htmlFor="nm">이름</label><input id="nm" type="text" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div><label className="f" htmlFor="ph">연락처</label><input id="ph" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" /></div>
                  </div>
                  <label className="f" htmlFor="msg">남길 말 <small>(비우면 위에 적은 증상이 전달돼요)</small></label>
                  <textarea id="msg" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={text} />
                  <label className="check small"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                    <span>선택한 업체에 이름·연락처·증상을 전달하는 데 동의해요. 견적 상담 목적으로만 쓰여요.</span></label>
                  <button className="btn" style={{ marginTop: 14 }} onClick={send} disabled={sending}>{sending ? "보내는 중…" : "문의 보내기"}</button>
                </>}
              </div>
            )}
          </section>

          {photo && <Preview image={photo} workName={res.work.name} />}

          <section id="s-share">
            <h2><span className="n">{photo ? 6 : 4}</span>{channel === "counter" ? "창구 요약 전달" : "결과 저장·공유"}</h2>
            <p className="sub">{channel === "counter" ? "민원인 휴대폰으로 문자를 보내거나 인쇄해 드리세요." : "가족에게 보내거나 인쇄해서 행정복지센터에 가져가세요."}</p>
            <div className="card">
              <textarea rows={8} readOnly value={summary} aria-label="상담 요약" />
              <div className="row noprint" style={{ marginTop: 10 }}>
                <button className="btn sm sea" onClick={() => navigator.clipboard.writeText(summary).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? "복사했어요 ✓" : "복사하기"}</button>
                <a className="btn sm ghost" href={`sms:?&body=${encodeURIComponent(summary)}`}>문자로 보내기</a>
                <button className="btn sm ghost" onClick={() => window.print()}>인쇄하기</button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
