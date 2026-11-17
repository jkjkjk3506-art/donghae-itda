"use client";
import type { Business, LegalNote, Program } from "@/lib/types";

export function LegalList({ notes, title = "공사 전에 꼭 알아두세요 (법·안전)" }: { notes: LegalNote[]; title?: string }) {
  if (!notes.length) return null;
  return (
    <section>
      <h2>⚖️ {title}</h2>
      <div className="grid g2">
        {notes.map((n) => (
          <div key={n.code} className={`legal ${n.level}`}>
            {n.condition && <div className="cond">해당: {n.condition}</div>}
            <h3>{n.level === "danger" ? "⛔ " : n.level === "warn" ? "⚠️ " : "ℹ️ "}{n.title}</h3>
            <div className="small">{n.body}</div>
            {n.law && <div className="law">근거: {n.law}</div>}
          </div>
        ))}
      </div>
      <p className="muted small">법령 요약 안내예요. 개별 사안은 동해시 건축과(033-530-2643) 등 담당 부서에 확인하세요.</p>
    </section>
  );
}

export function ProgramCard({ p, why }: { p: Program; why?: string }) {
  return (
    <div className="card prog">
      <div className="row" style={{ marginBottom: 6 }}>
        {p.support_type.map((s) => <span key={s} className="tag">{s}</span>)}
        {p.donghae_status === "시행확인" && <span className="tag new">동해시 시행</span>}
        {why && <span className="tag warn">{why}</span>}
      </div>
      <h3>{p.name}</h3>
      {p.amount_text && <div className="amt small">{p.amount_text}</div>}
      {p.schedule_2026 && <div className="small muted">일정: {p.schedule_2026}</div>}
      {p.expected_next && <div className="small muted">다음 공고: {p.expected_next}</div>}
      <div className="small" style={{ marginTop: 6 }}>신청: {p.apply_where || "-"}</div>
      {p.contact && <div className="small"><b>문의 {p.contact}</b></div>}
      {p.official_source_url?.[0] && <a className="small" href={p.official_source_url[0]} target="_blank" rel="noreferrer">공고 원문 보기 →</a>}
    </div>
  );
}

export function BusinessCard({ b, selected, onToggle }: { b: Business; selected?: boolean; onToggle?: () => void }) {
  return (
    <div className="card biz" style={selected ? { borderColor: "var(--sea)", boxShadow: "0 0 0 2px var(--sea-soft)" } : undefined}>
      <div className="row" style={{ marginBottom: 4 }}>
        <span className="tag">{b.category}</span>
        {b.is_demo ? <span className="tag demo">시연용 가상 업체</span> : b.is_newcomer ? <span className="tag new">새로 소개하는 업체</span> : null}
      </div>
      <div className="name">{b.name}</div>
      {b.sub_category && <div className="small muted">{b.sub_category}</div>}
      {b.licenses && <div className="small">면허: {b.licenses}</div>}
      {b.public_works && <div className="small">공공공사 실적: {b.public_works}</div>}
      {b.intro && <div className="small">“{b.intro}”</div>}
      {b.address && <div className="small muted">{b.address}</div>}
      <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
        {b.phone ? <a className="phone" href={`tel:${b.phone}`}>{b.phone}</a> : <span className="small muted">전화번호 없음</span>}
        {onToggle && <button className={`btn sm ${selected ? "sea" : "ghost"}`} onClick={onToggle}>{selected ? "✓ 문의 대상" : "문의 보내기"}</button>}
      </div>
      <div className="small muted" style={{ marginTop: 4 }}>확인 출처 {b.source_count ?? 1}곳 · 신뢰도 {"★".repeat(b.trust_level)}</div>
    </div>
  );
}
