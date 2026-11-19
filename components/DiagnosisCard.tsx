"use client";
import type { Diagnosis } from "@/lib/types";
import { WORK_INFO } from "@/lib/fallback";

const SEV = { high: ["빨리 고치는 게 좋아요", "danger"], mid: ["올해 안에 고치세요", "warn"], low: ["천천히 해도 돼요", "new"] } as const;

/** AI 진단 결과: 보이는 문제 → 원인 → 필요한 공사 → 놔두면 */
export default function DiagnosisCard({ d, workCode, workName, photo, compact }: { d: Diagnosis; workCode: string; workName: string; photo?: string | null; compact?: boolean }) {
  const same = workCode === d.work_code;
  const base = WORK_INFO[workCode];
  const problems = (same && d.problems?.length ? d.problems : base?.problems) || [];
  const method = (same && d.method?.length ? d.method : base?.method) || [];
  const risk = (same && d.risk) || base?.risk;
  const sev = SEV[(same && d.severity) || base?.severity || "mid"];
  return (
    <div className="dx">
      <div className="dxhead">
        {photo && <img src={photo} alt="올린 사진" />}
        <div>
          <div className="row" style={{ gap: 6 }}>
            <span className="tag">{d.source === "gemini" ? "AI 사진·설명 진단" : "기본 진단"}</span>
            <span className={`tag ${sev[1]}`}>{sev[0]}</span>
            <span className="small muted">확신도 <span className="meter"><i style={{ width: `${Math.round(d.confidence * 100)}%` }} /></span></span>
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>필요한 공사</div>
          <div className="big">{workName}</div>
          <p style={{ margin: "4px 0 0" }}>{same ? d.plain_explain : `직접 고르신 '${workName}' 기준이에요.`}</p>
        </div>
      </div>
      <div className={`dxgrid ${compact ? "c" : ""}`}>
        {problems.length > 0 && <div><h4>🔍 보이는 문제</h4><ul>{problems.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {(same ? d.cause || d.defect : base && null) && <div><h4>💡 추정 원인</h4><p>{d.cause || d.defect}</p></div>}
        {method.length > 0 && <div className="wide"><h4>🔨 이렇게 고쳐요 <small className="muted">(보통 순서)</small></h4><ol className="steps2">{method.map((x, i) => <li key={i}>{x}</li>)}</ol></div>}
        {risk && <div className="wide risk"><h4>⚠️ 그대로 두면</h4><p>{risk}</p></div>}
      </div>
      {same && d.questions?.length > 0 && <div className="notice small" style={{ marginTop: 10 }}>업체가 더 정확히 보려면: {d.questions.join(" / ")}</div>}
      <p className="small muted" style={{ margin: "8px 0 0" }}>AI 추정이에요. 정확한 원인과 공사 범위는 업체가 현장을 보고 정해요.</p>
    </div>
  );
}
