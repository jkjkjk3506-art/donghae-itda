import CitizenFlow from "@/components/CitizenFlow";

export default function Home() {
  return (
    <main className="wrap">
      <div className="hero">
        <h1>사진 한 장이면, 우리 집 수리에 맞는<br />지원사업과 동해시 업체를 이어 드려요</h1>
        <p>AI가 필요한 공사를 알려주고, 받을 수 있는 지원사업·지켜야 할 법·믿을 수 있는 동해시 업체를 함께 보여드려요.</p>
      </div>
      <CitizenFlow />
      <p className="foot">동해시 AI 잇다 · 2026 한림 G-Lab@동해 AI 해커톤 시제품 · 업체 정보: 국토부 KISCON·공공데이터·카카오맵·산군 공사실적 교차 확인 · 지원사업: 동해시·중앙부처 공고 기준(2026.11.17 확인)</p>
    </main>
  );
}
