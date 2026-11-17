import CitizenFlow from "@/components/CitizenFlow";

export default function Home() {
  return (
    <main>
      <div className="band">
        <div className="in">
          <h1>집수리, 어디에 맡기고<br />무슨 지원을 받을 수 있는지 <em>한 번에</em></h1>
          <p>사진을 올리거나 증상을 말하면 필요한 공사, 받을 수 있는 지원사업, 지켜야 할 법, 확인된 동해시 업체를 이어 드려요.</p>
          <div className="how"><span><b>1</b>사진·증상</span><span><b>2</b>지원사업·법·업체 확인</span><span><b>3</b>견적 문의</span></div>
        </div>
      </div>
      <div className="wrap lift">
        <CitizenFlow />
        <div className="grid g3" style={{ marginTop: 40 }}>
          <div className="card flat"><h3>AI는 판별만 해요</h3><p className="small muted" style={{ margin: 0 }}>업체와 지원사업은 AI가 지어내지 않아요. 공공 데이터와 공고로 확인된 목록에서 규칙으로만 골라요.</p></div>
          <div className="card flat"><h3>광고도 순위도 없어요</h3><p className="small muted" style={{ margin: 0 }}>공사에 맞는 업체를 매번 무작위로 보여주고, 새로 시작한 업체도 함께 소개해요.</p></div>
          <div className="card flat"><h3>창구에서도 함께 써요</h3><p className="small muted" style={{ margin: 0 }}>스마트폰이 어려우면 동 행정복지센터에서 담당자가 대신 확인하고 결과를 문자로 보내 드려요.</p></div>
        </div>
        <p className="foot">동해시 AI 잇다 · 2026 한림 G-Lab@동해 AI 해커톤 시제품 · 업체 정보: 국토교통부 KISCON·공공데이터·카카오맵·공공공사 실적 교차 확인 · 지원사업: 동해시·중앙부처 공고 기준(2026.11.17 확인) · 법령 안내는 요약이며 법적 효력이 없습니다.</p>
      </div>
    </main>
  );
}
