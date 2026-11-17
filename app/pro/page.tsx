"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { LoginBox, useProfile } from "@/components/Auth";
import { LegalList, ProgramCard } from "@/components/Cards";
import type { Business, LegalNote, Program, WorkType } from "@/lib/types";

type Inquiry = { id: string; created_at: string; citizen_name: string; citizen_phone: string; dong: string | null; work_code: string | null; message: string | null; status: string };
const STATUS: Record<string, string> = { new: "새 문의", contacted: "연락함", done: "완료", declined: "어려움" };

export default function ProPage() {
  const { profile, ready, logout } = useProfile();
  const [tab, setTab] = useState("inbox");
  const [biz, setBiz] = useState<Business | null>(null);
  const [works, setWorks] = useState<WorkType[]>([]);
  const [inq, setInq] = useState<Inquiry[]>([]);
  const [progs, setProgs] = useState<Program[]>([]);
  const [legal, setLegal] = useState<LegalNote[]>([]);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (profile?.role !== "contractor" || !profile.business_id) return;
    const db = sb();
    db.from("businesses").select("*").eq("id", profile.business_id).single().then(({ data }) => setBiz(data as Business));
    db.from("work_types").select("*").order("sort").then(({ data }) => setWorks((data || []) as WorkType[]));
    db.from("inquiries").select("*").order("created_at", { ascending: false }).then(({ data }) => setInq((data || []) as Inquiry[]));
    db.from("programs").select("*").eq("audience", "business").then(({ data }) => setProgs((data || []) as Program[]));
    db.from("legal_notes").select("*").in("audience", ["contractor", "both"]).order("sort").then(({ data }) => setLegal((data || []) as LegalNote[]));
  }, [profile]);

  if (!ready) return <main className="wrap">불러오는 중…</main>;
  if (!profile) return <main className="wrap"><LoginBox title="시공업체 로그인" hint="동해시 시공업체 전용 화면이에요. 시연 계정으로 로그인하세요." /></main>;
  if (profile.role !== "contractor") return <main className="wrap"><p>시공업체 계정이 아니에요. <button className="btn sm ghost" onClick={logout}>로그아웃</button></p></main>;

  async function setStatus(id: string, status: string) {
    await sb().from("inquiries").update({ status }).eq("id", id);
    setInq(inq.map((x) => (x.id === id ? { ...x, status } : x)));
  }
  async function save() {
    if (!biz) return;
    const { error } = await sb().from("businesses").update({ work_codes: biz.work_codes, intro: biz.intro, phone: biz.phone }).eq("id", biz.id);
    setSaved(error ? "저장 실패: " + error.message : "저장했어요. 시민 화면에 반영돼요.");
  }
  const myWorks = biz?.work_codes || [];
  const myLegal = legal.filter((n) => n.work_codes.includes("*") || n.work_codes.some((c) => myWorks.includes(c)));
  const wname = (c: string | null) => works.find((w) => w.code === c)?.name || c || "-";

  return (
    <main className="wrap">
      <div className="hero">
        <h1>{biz?.name || "내 업체"}</h1>
        <p>{profile.display_name} · <button className="btn sm ghost" onClick={logout}>로그아웃</button></p>
      </div>
      <div className="tabs">
        {[["inbox", `문의함 (${inq.filter((x) => x.status === "new").length})`], ["info", "내 업체 정보"], ["legal", "시공 법·안전"], ["support", "업체 지원사업"]].map(([k, l]) =>
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "inbox" && (
        <div className="card">
          {inq.length === 0 ? <p className="muted">아직 문의가 없어요. 시민 화면에서 이 업체에 문의를 보내 보세요.</p> :
            <table><thead><tr><th>받은 때</th><th>공사</th><th>동</th><th>이름·연락처</th><th>내용</th><th>상태</th></tr></thead>
              <tbody>{inq.map((q) => (
                <tr key={q.id}>
                  <td className="small">{new Date(q.created_at).toLocaleString("ko-KR")}</td>
                  <td>{wname(q.work_code)}</td><td>{q.dong || "-"}</td>
                  <td>{q.citizen_name}<br /><a href={`tel:${q.citizen_phone}`}>{q.citizen_phone}</a></td>
                  <td className="small">{q.message}</td>
                  <td><select value={q.status} onChange={(e) => setStatus(q.id, e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                </tr>))}</tbody></table>}
        </div>
      )}

      {tab === "info" && biz && (
        <div className="card">
          <div className="notice">정보를 많이 입력해도 노출 순서가 올라가지 않아요. 시민 화면의 업체는 매번 무작위로 골라 공평하게 보여줍니다.</div>
          <label className="f">시공하는 공정 (시민 문의 연결에 사용)</label>
          <div className="chips">{works.filter((w) => w.code !== "OTHER").map((w) => (
            <button key={w.code} className={`chip ${myWorks.includes(w.code) ? "on" : ""}`}
              onClick={() => setBiz({ ...biz, work_codes: myWorks.includes(w.code) ? myWorks.filter((x) => x !== w.code) : [...myWorks, w.code] })}>{w.name}</button>))}</div>
          <label className="f">전화번호</label><input type="tel" value={biz.phone || ""} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
          <label className="f">업체 소개 (한두 줄)</label><textarea rows={2} value={biz.intro || ""} onChange={(e) => setBiz({ ...biz, intro: e.target.value })} />
          <div className="small muted" style={{ marginTop: 10 }}>상호·면허·신뢰도·노출 여부는 동해시(주무관)가 공공데이터로 확인해 관리해요. 바꿀 내용이 있으면 경제과에 요청하세요.</div>
          <div className="row" style={{ marginTop: 14 }}><button className="btn sea" onClick={save}>저장</button><span className="small">{saved}</span></div>
          <div className="grid g3" style={{ marginTop: 18 }}>
            <div><div className="muted small">면허</div>{biz.licenses || "-"}</div>
            <div><div className="muted small">확인 출처</div>{biz.source_count}곳 · {"★".repeat(biz.trust_level)}</div>
            <div><div className="muted small">공공공사 실적</div>{biz.public_works || "없음"}</div>
          </div>
        </div>
      )}

      {tab === "legal" && <LegalList notes={myLegal} title="내 공정에 해당하는 법·안전 기준" />}

      {tab === "support" && (
        <>
          <div className="notice" style={{ marginBottom: 12 }}>동해시 수의계약 희망업체 등록제(DH-011)에 등록하면 시 발주 소규모 공사 견적 기회를 받을 수 있어요.</div>
          <div className="grid g2">{progs.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
        </>
      )}
    </main>
  );
}
