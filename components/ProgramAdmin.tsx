"use client";
import { useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import type { Program } from "@/lib/types";
import { applyStatus, AUD_LABEL, ELIG_LABEL } from "@/lib/types";

type Form = {
  notice_title: string; notice_no: string; apply_start: string; apply_end: string; schedule_2026: string; expected_next: string;
  amount_text: string; apply_where: string; contact: string; urls: string; elig: string; verified_note: string;
};
const toForm = (p: Program): Form => ({
  notice_title: p.notice_title || "", notice_no: p.notice_no || "", apply_start: p.apply_start || "", apply_end: p.apply_end || "",
  schedule_2026: p.schedule_2026 || "", expected_next: p.expected_next || "", amount_text: p.amount_text || "", apply_where: p.apply_where || "",
  contact: p.contact || "", urls: (p.official_source_url || []).join("\n"),
  elig: Object.entries(p.eligibility || {}).map(([k, v]) => `${ELIG_LABEL[k] || k}: ${v}`).join("\n"), verified_note: p.verified_note || "",
});
const LABEL_KEY = Object.fromEntries(Object.entries(ELIG_LABEL).map(([k, v]) => [v, k]));
function parseElig(t: string) {
  const o: Record<string, string> = {};
  t.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l, i) => {
    const m = /^([^:：]+)[:：]\s*(.+)$/.exec(l);
    if (m) o[LABEL_KEY[m[1].trim()] || m[1].trim()] = m[2].trim(); else o[`condition${i ? i + 1 : ""}`] = l;
  });
  return o;
}
const TONE: Record<string, string> = { open: "new", always: "new", soon: "warn", closed: "", unknown: "warn" };

export default function ProgramAdmin({ progs, setProgs, flash, who }: { progs: Program[]; setProgs: (p: Program[]) => void; flash: (m: string) => void; who: string }) {
  const [q, setQ] = useState("");
  const [aud, setAud] = useState("");
  const [only, setOnly] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => progs.filter((p) =>
    (!q || `${p.name} ${p.id} ${p.operator} ${(p.keywords || []).join(" ")}`.includes(q)) && (!aud || p.audience === aud) &&
    (!only || (only === "off" ? !p.active : only === "nourl" ? !p.official_source_url?.length : applyStatus(p).tone === only))), [progs, q, aud, only]);
  const p = progs.find((x) => x.id === sel) || null;
  const replace = (np: Program) => setProgs(progs.map((x) => (x.id === np.id ? np : x)));

  async function save() {
    if (!p || !edit) return;
    if (edit.apply_start && edit.apply_end && edit.apply_end < edit.apply_start) return flash("마감일이 시작일보다 빨라요.");
    setBusy(true);
    const patch = {
      notice_title: edit.notice_title || null, notice_no: edit.notice_no || null, apply_start: edit.apply_start || null, apply_end: edit.apply_end || null,
      schedule_2026: edit.schedule_2026 || null, expected_next: edit.expected_next || null, amount_text: edit.amount_text || null,
      apply_where: edit.apply_where || null, contact: edit.contact || null,
      official_source_url: edit.urls.split("\n").map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u)),
      eligibility: parseElig(edit.elig), verified_note: edit.verified_note || null,
      verified_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString(), updated_by: who,
    };
    const { data, error } = await sb().from("programs").update(patch).eq("id", p.id).select("*").single();
    setBusy(false);
    if (error) return flash("저장 실패: " + error.message);
    replace(data as Program); setEdit(null); flash("저장했어요. 시민 화면에 바로 반영돼요.");
  }
  async function toggle() {
    if (!p) return;
    const { error } = await sb().from("programs").update({ active: !p.active, updated_at: new Date().toISOString(), updated_by: who }).eq("id", p.id);
    if (error) return flash("저장 실패: " + error.message);
    replace({ ...p, active: !p.active }); flash(p.active ? "시민 안내를 껐어요." : "다시 시민에게 안내해요.");
  }
  async function upload(f: File) {
    if (!p) return;
    if (f.size > 20 * 1024 * 1024) return flash("20MB 이하 파일만 올릴 수 있어요.");
    setBusy(true);
    const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${p.id}/${Date.now()}.${ext}`;
    const up = await sb().storage.from("notices").upload(path, f, { contentType: f.type || "application/octet-stream" });
    if (up.error) { setBusy(false); return flash("올리기 실패: " + up.error.message); }
    const url = sb().storage.from("notices").getPublicUrl(path).data.publicUrl;
    const files = [...(p.notice_files || []), { name: f.name, path, url }];
    const { error } = await sb().from("programs").update({ notice_files: files, updated_at: new Date().toISOString(), updated_by: who }).eq("id", p.id);
    setBusy(false);
    if (error) return flash("저장 실패: " + error.message);
    replace({ ...p, notice_files: files }); flash("공고문 파일을 올렸어요. 시민 화면에서도 내려받을 수 있어요.");
  }
  async function removeFile(path: string) {
    if (!p || !confirm("이 파일을 지울까요?")) return;
    await sb().storage.from("notices").remove([path]);
    const files = (p.notice_files || []).filter((x) => x.path !== path);
    const { error } = await sb().from("programs").update({ notice_files: files }).eq("id", p.id);
    if (!error) replace({ ...p, notice_files: files });
  }

  const count = (f: (p: Program) => boolean) => progs.filter(f).length;
  return (
    <div className="padmin">
      <div className="card flat" style={{ marginBottom: 12 }}>
        <div className="row">
          <input type="text" placeholder="사업명·기관·키워드 검색" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} aria-label="지원사업 검색" />
          <select value={aud} onChange={(e) => setAud(e.target.value)} style={{ width: "auto" }} aria-label="대상">
            <option value="">대상 전체</option>{Object.entries(AUD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          {[["", `전체 ${progs.length}`], ["open", `신청 중 ${count((x) => applyStatus(x).tone === "open")}`], ["always", `연중 ${count((x) => applyStatus(x).tone === "always")}`],
            ["soon", `예정 ${count((x) => applyStatus(x).tone === "soon")}`], ["unknown", `일정 확인 필요 ${count((x) => applyStatus(x).tone === "unknown")}`],
            ["nourl", `공고 링크 없음 ${count((x) => !x.official_source_url?.length)}`], ["off", `안내 꺼짐 ${count((x) => !x.active)}`]].map(([k, l]) =>
            <button key={k} className={`chip ex ${only === k ? "on" : ""}`} onClick={() => setOnly(k)}>{l}</button>)}
        </div>
      </div>

      <div className="pgrid">
        <div className="plist card flat">
          {list.length === 0 && <p className="muted small">조건에 맞는 사업이 없어요.</p>}
          {list.map((x) => { const st = applyStatus(x); return (
            <button key={x.id} className={`pitem ${x.id === sel ? "on" : ""} ${x.active ? "" : "off"}`} onClick={() => { setSel(x.id); setEdit(null); }}>
              <span className="small muted">{x.id} · {AUD_LABEL[x.audience] || x.audience}</span>
              <b>{x.name}</b>
              <span className="row" style={{ gap: 4 }}><span className={`tag ${TONE[st.tone]}`}>{st.label}</span>{!x.active && <span className="tag">꺼짐</span>}{!x.official_source_url?.length && <span className="tag warn">링크 없음</span>}</span>
            </button>); })}
        </div>

        <div className="pdetail">
          {!p ? <div className="card flat muted">왼쪽에서 사업을 고르면 공고 정보가 보여요.</div> : edit ? (
            <div className="card">
              <div className="row between"><h3 style={{ margin: 0 }}>{p.name} 수정</h3><span className="small muted">{p.id}</span></div>
              <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <div><label className="f">공고명</label><input type="text" value={edit.notice_title} onChange={(e) => setEdit({ ...edit, notice_title: e.target.value })} /></div>
                <div><label className="f">공고번호</label><input type="text" value={edit.notice_no} onChange={(e) => setEdit({ ...edit, notice_no: e.target.value })} placeholder="예) 동해시 공고 제2026-123호" /></div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label className="f">신청 시작일</label><input type="date" value={edit.apply_start} onChange={(e) => setEdit({ ...edit, apply_start: e.target.value })} /></div>
                <div><label className="f">신청 마감일</label><input type="date" value={edit.apply_end} onChange={(e) => setEdit({ ...edit, apply_end: e.target.value })} /></div>
              </div>
              <p className="small muted" style={{ margin: "4px 0 0" }}>날짜를 넣으면 시민 화면에 '신청 중 · 마감 D-7'처럼 자동으로 표시되고, 마감 후에는 '신청 마감'으로 바뀌어요.</p>
              <label className="f">일정 설명</label><input type="text" value={edit.schedule_2026} onChange={(e) => setEdit({ ...edit, schedule_2026: e.target.value })} />
              <label className="f">다음 공고 예정</label><input type="text" value={edit.expected_next} onChange={(e) => setEdit({ ...edit, expected_next: e.target.value })} />
              <label className="f">지원 내용·금액</label><textarea rows={3} value={edit.amount_text} onChange={(e) => setEdit({ ...edit, amount_text: e.target.value })} />
              <label className="f">신청 자격 <small>(한 줄에 하나, '항목: 내용')</small></label><textarea rows={4} value={edit.elig} onChange={(e) => setEdit({ ...edit, elig: e.target.value })} placeholder={"소득 기준: 중위소득 48% 이하\n지역: 송정동"} />
              <div className="grid g2">
                <div><label className="f">신청 방법·장소</label><input type="text" value={edit.apply_where} onChange={(e) => setEdit({ ...edit, apply_where: e.target.value })} /></div>
                <div><label className="f">문의처</label><input type="text" value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} placeholder="부서명 033-530-0000" /></div>
              </div>
              <label className="f">공고 원문 링크 <small>(한 줄에 하나)</small></label><textarea rows={3} value={edit.urls} onChange={(e) => setEdit({ ...edit, urls: e.target.value })} placeholder="https://www.dh.go.kr/..." />
              <label className="f">공고 요약·확인 메모 <small>(주무관용)</small></label><textarea rows={4} value={edit.verified_note} onChange={(e) => setEdit({ ...edit, verified_note: e.target.value })} />
              <div className="row" style={{ marginTop: 14 }}><button className="btn sea" onClick={save} disabled={busy}>{busy ? "저장 중…" : "저장"}</button><button className="btn ghost" onClick={() => setEdit(null)}>취소</button></div>
            </div>
          ) : (
            <div className="card">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="small muted">{p.id} · {p.level} · {p.operator}</div>
                  <h3 style={{ margin: "2px 0 0", fontSize: "1.2em" }}>{p.name}</h3>
                  {p.notice_title && p.notice_title !== p.name && <div className="small">공고명: {p.notice_title}</div>}
                  {p.notice_no && <div className="small muted">{p.notice_no}</div>}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm sea" onClick={() => setEdit(toForm(p))}>수정</button>
                  <button className={`btn sm ${p.active ? "ghost" : ""}`} onClick={toggle}>{p.active ? "시민 안내 끄기" : "다시 안내하기"}</button>
                </div>
              </div>
              <div className="row" style={{ gap: 6, margin: "10px 0" }}>
                <span className={`tag ${TONE[applyStatus(p).tone]}`}>{applyStatus(p).label}</span>
                <span className="tag">{AUD_LABEL[p.audience] || p.audience}</span>
                {p.donghae_status && <span className="tag">{p.donghae_status}</span>}
                {p.verification_status && <span className={`tag ${p.verification_status === "공식확인" ? "new" : "warn"}`}>{p.verification_status}</span>}
                {!p.active && <span className="tag">시민 안내 꺼짐</span>}
              </div>

              <dl className="pdl">
                <dt>지원 내용</dt><dd>{p.amount_text || "-"}</dd>
                <dt>지원 방식</dt><dd>{p.support_type?.join(", ") || "-"}</dd>
                <dt>신청 기간</dt><dd>{p.apply_start || p.apply_end ? `${p.apply_start || "?"} ~ ${p.apply_end || "?"}` : <span className="muted">날짜 미입력</span>}</dd>
                <dt>일정</dt><dd>{p.schedule_2026 || "-"}</dd>
                <dt>다음 공고</dt><dd>{p.expected_next || "-"}</dd>
                <dt>신청 방법</dt><dd>{p.apply_where || "-"}</dd>
                <dt>문의처</dt><dd>{p.contact ? <b>{p.contact}</b> : <span className="muted">미입력</span>}</dd>
              </dl>

              <h4>신청 자격</h4>
              {Object.keys(p.eligibility || {}).length ? <table className="small"><tbody>{Object.entries(p.eligibility || {}).map(([k, v]) => <tr key={k}><th style={{ width: 110 }}>{ELIG_LABEL[k] || k}</th><td>{v}</td></tr>)}</tbody></table>
                : <p className="small muted">입력된 자격 조건이 없어요.</p>}

              <h4>공고 원문</h4>
              {p.official_source_url?.length ? <ul className="links">{p.official_source_url.map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{(() => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } })()} 공고 열기 ↗</a><span className="small muted">{u}</span></li>)}</ul>
                : <p className="small" style={{ color: "var(--warn)" }}>공고 링크가 없어요. '수정'에서 넣어 주세요.</p>}

              <h4>공고문 파일</h4>
              {(p.notice_files || []).length > 0 && <ul className="links">{p.notice_files!.map((f) => <li key={f.path}><a href={f.url} target="_blank" rel="noreferrer">📄 {f.name}</a><button className="btn sm ghost" onClick={() => removeFile(f.path)}>지우기</button></li>)}</ul>}
              <label className="btn sm ghost" style={{ cursor: "pointer" }}>{busy ? "올리는 중…" : "공고문 파일 올리기 (PDF·HWP·이미지)"}
                <input type="file" hidden accept=".pdf,.hwp,.hwpx,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} /></label>

              <h4>매칭 기준 <small className="muted">(시민 견적 요청과 연결할 때 쓰는 값)</small></h4>
              <dl className="pdl">
                <dt>공사 종류</dt><dd>{p.work_types?.join(", ") || "-"}</dd>
                <dt>건물</dt><dd>{p.building_types?.join(", ") || "제한 없음"}</dd>
                <dt>필요 조건</dt><dd>{p.requires?.join(", ") || "없음"}</dd>
                {p.contractor_opportunity && <><dt>업체 참여</dt><dd>{p.contractor_opportunity}</dd></>}
              </dl>

              {p.verified_note && <><h4>공고 요약·확인 메모</h4><p className="small memo">{p.verified_note}</p></>}
              <p className="small muted" style={{ marginBottom: 0 }}>마지막 확인 {p.verified_date || "-"}{p.updated_by ? ` · ${p.updated_by}` : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
