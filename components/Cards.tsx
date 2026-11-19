"use client";
import { useState } from "react";
import ProgramDetail from "./ProgramDetail";
import type { Business, LegalNote, Program } from "@/lib/types";
import { applyStatus } from "@/lib/types";

const ICON = { danger: "금지·의무", warn: "주의", info: "알아두기" };

export function LegalList({ notes }: { notes: LegalNote[] }) {
  if (!notes.length) return <p className="muted">해당하는 안내가 없어요.</p>;
  return (
    <>
      <div className="grid g2">
        {notes.map((n) => (
          <div key={n.code} className={`legal ${n.level} ${n.applies ? "hit" : ""}`}>
            <div className="row" style={{ gap: 6, marginBottom: 6 }}>
              <span className={`tag ${n.level === "danger" ? "danger" : n.level === "warn" ? "warn" : ""}`}>{ICON[n.level]}</span>
              {n.applies && <span className="tag demo">내 경우 해당</span>}
              {n.condition && !n.applies && <span className="cond">해당: {n.condition}</span>}
            </div>
            <h3>{n.title}</h3>
            <div className="small">{n.body}</div>
            {n.law && <div className="law">근거: {n.law}</div>}
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>법령을 쉽게 요약한 안내예요. 개별 사안은 동해시 건축과(033-530-2643) 등 담당 부서에 확인하세요.</p>
    </>
  );
}

export function ProgramCard({ p, why }: { p: Program; why?: string }) {
  const [open_, setOpen] = useState(false);
  const st = applyStatus(p);
  const open = st.tone === "open" || st.tone === "always";
  return (
    <div className="card prog">
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        {p.support_type.map((s) => <span key={s} className="tag">{s}</span>)}
        {(p.donghae_status === "시행확인" || p.donghae_status === "지구한정") && <span className="tag new">동해시 사업</span>}
        <span className={`tag ${open ? "new" : st.tone === "closed" ? "" : "warn"}`}>{st.label}</span>
        {why && <span className="tag warn">{why}</span>}
      </div>
      <h3>{p.name}</h3>
      {p.amount_text && <div className="amt small">{p.amount_text}</div>}
      <dl>
        {p.schedule_2026 && <><dt>일정</dt><dd>{p.schedule_2026}</dd></>}
        {!open && p.expected_next && <><dt>다음 공고</dt><dd>{p.expected_next}</dd></>}
        <dt>신청</dt><dd>{p.apply_where || "-"}</dd>
        {p.contact && <><dt>문의</dt><dd><b>{p.contact}</b></dd></>}
      </dl>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <button className="btn sm sea" onClick={() => setOpen(true)}>자세히 보기</button>
        {p.official_source_url?.[0] && <a className="small" href={p.official_source_url[0]} target="_blank" rel="noreferrer">공고 원문 →</a>}
      </div>
      {open_ && <ProgramDetail p={p} why={why} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function BusinessCard({ b, selected, onToggle }: { b: Business; selected?: boolean; onToggle?: () => void }) {
  return (
    <div className={`card biz ${selected ? "sel" : ""}`}>
      <div className="row" style={{ gap: 6, marginBottom: 6 }}>
        <span className="tag">{b.category}</span>
        {b.is_demo ? <span className="tag demo">시연용 가상 업체</span> : b.is_newcomer ? <span className="tag new">새로 소개하는 업체</span> : null}
      </div>
      <div className="name">{b.name}</div>
      {b.sub_category && <div className="small muted">{b.sub_category}</div>}
      {b.licenses && <div className="small"><span className="muted">면허</span> {b.licenses}</div>}
      {b.public_works && <div className="small"><span className="muted">공공공사</span> {b.public_works}</div>}
      {b.intro && <div className="small">“{b.intro}”</div>}
      {b.address && <div className="small muted">{b.address}</div>}
      <div className="foot2">
        <div className="row between">
          {b.phone ? <a className="phone" href={`tel:${b.phone}`}>{b.phone}</a> : <span className="small muted">전화번호 없음</span>}
          {onToggle && <button className={`btn sm ${selected ? "sea" : "ghost"}`} onClick={onToggle} aria-pressed={selected}>{selected ? "✓ 선택됨" : "문의 대상에 담기"}</button>}
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>확인 출처 {b.source_count ?? 1}곳 · 신뢰도 {"★".repeat(b.trust_level)}{"☆".repeat(3 - b.trust_level)}</div>
      </div>
    </div>
  );
}
