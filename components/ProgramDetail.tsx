"use client";
import { useEffect } from "react";
import type { Program } from "@/lib/types";
import { applyStatus, AUD_LABEL, ELIG_LABEL, REQ_LABEL } from "@/lib/types";

/** 지원사업 자세히 보기 (전체 화면 창) */
export default function ProgramDetail({ p, why, onClose }: { p: Program; why?: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  const st = applyStatus(p);
  const elig = Object.entries(p.eligibility || {});
  const phone = /(0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4})/.exec(p.contact || "")?.[1];
  return (
    <div className="modalbg" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${p.name} 자세히 보기`}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="small muted">{p.level} · {p.operator}</div>
            <h2 style={{ margin: "2px 0 0" }}>{p.name}</h2>
            {p.notice_no && <div className="small muted">{p.notice_no}</div>}
          </div>
          <button className="btn sm ghost" onClick={onClose} aria-label="닫기">닫기 ✕</button>
        </div>
        <div className="row" style={{ gap: 6, margin: "10px 0 14px" }}>
          <span className={`tag ${st.tone === "open" || st.tone === "always" ? "new" : "warn"}`}>{st.label}</span>
          {p.support_type?.map((s) => <span key={s} className="tag">{s}</span>)}
          <span className="tag">{AUD_LABEL[p.audience] || p.audience}</span>
          {why && <span className="tag warn">{why}</span>}
        </div>

        <section className="msec"><h4>무엇을 지원하나요</h4><p>{p.amount_text || "공고문을 확인해 주세요."}</p></section>

        <section className="msec"><h4>누가 받을 수 있나요</h4>
          {elig.length ? <table><tbody>{elig.map(([k, v]) => <tr key={k}><th>{ELIG_LABEL[k] || k}</th><td>{v}</td></tr>)}</tbody></table> : <p className="muted">공고문의 자격 기준을 확인해 주세요.</p>}
          {p.requires?.length > 0 && <p className="small muted">필요 조건: {p.requires.map((r) => r.startsWith("district:") ? `${r.slice(9)} 거주` : REQ_LABEL[r] || r).join(", ")}</p>}
          {p.building_types?.length > 0 && <p className="small muted">대상 건물: {p.building_types.join(", ")}</p>}
        </section>

        <section className="msec"><h4>언제 신청하나요</h4>
          <dl className="pdl">
            {(p.apply_start || p.apply_end) && <><dt>신청 기간</dt><dd><b>{p.apply_start || "?"} ~ {p.apply_end || "?"}</b></dd></>}
            <dt>일정</dt><dd>{p.schedule_2026 || "-"}</dd>
            {p.expected_next && <><dt>다음 공고</dt><dd>{p.expected_next}</dd></>}
          </dl>
        </section>

        <section className="msec"><h4>어떻게 신청하나요</h4>
          <dl className="pdl">
            <dt>신청 방법</dt><dd>{p.apply_where || "-"}</dd>
            <dt>문의처</dt><dd>{p.contact ? <b>{p.contact}</b> : "-"}</dd>
          </dl>
          <div className="row" style={{ marginTop: 10 }}>
            {phone && <a className="btn sm" href={`tel:${phone}`}>📞 {phone} 전화 문의</a>}
            {p.official_source_url?.map((u, i) => <a key={u} className="btn sm ghost" href={u} target="_blank" rel="noreferrer">공고 원문{p.official_source_url.length > 1 ? ` ${i + 1}` : ""} 보기 ↗</a>)}
            {(p.notice_files || []).map((f) => <a key={f.path} className="btn sm ghost" href={f.url} target="_blank" rel="noreferrer">📄 {f.name}</a>)}
          </div>
        </section>

        <div className="notice small">⚠️ 대부분의 집수리 지원사업은 <b>지원 결정 전에 공사를 시작하면 지원을 받을 수 없어요.</b> 업체와 계약하기 전에 먼저 문의하세요. 금액·기간은 매년 바뀌니 신청 전 공고 원문을 확인하세요.</div>
        <p className="small muted" style={{ marginBottom: 0 }}>정보 확인일 {p.verified_date || "-"} · {p.verification_status || ""}</p>
      </div>
    </div>
  );
}
