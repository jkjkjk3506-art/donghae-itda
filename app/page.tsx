import RequestForm from "@/components/RequestForm";
import MyRequests from "@/components/MyRequests";

export default function Home() {
  return (
    <main>
      <div className="band">
        <div className="in">
          <h1>사진 한 장 올리면<br /><em>동해 업체들이 견적을 보내드려요</em></h1>
          <p>어디에 맡겨야 할지 몰라 전화 돌릴 필요 없어요. AI가 요청서를 써 주고, 이 공사를 하는 것으로 확인된 동해시 업체들이 견적을 보내면 비교해서 고르기만 하세요.</p>
          <div className="how"><span><b>1</b>사진·증상 올리기</span><span><b>2</b>업체 견적 도착</span><span><b>3</b>비교하고 고르기</span></div>
        </div>
      </div>
      <div className="wrap lift">
        <MyRequests />
        <RequestForm />
        <div className="grid g3" style={{ marginTop: 40 }}>
          <div className="card flat"><h3>확인된 업체만</h3><p className="small muted" style={{ margin: 0 }}>국토부 건설업 등록, 공공공사 실적 등 공공 데이터로 확인된 동해시 업체에만 요청이 가요. 면허가 필요한 금액이면 면허 여부를 함께 보여줘요.</p></div>
          <div className="card flat"><h3>광고도 순위도 없어요</h3><p className="small muted" style={{ margin: 0 }}>돈을 내서 위에 뜨는 업체는 없어요. 공사에 맞는 업체에 골고루 보내고, 새로 시작한 업체에도 기회를 줘요.</p></div>
          <div className="card flat"><h3>지원금도 놓치지 않게</h3><p className="small muted" style={{ margin: 0 }}>동해시·정부 집수리 지원사업에 해당하면 공사 전에 먼저 알려드려요. 지원 결정 전에 공사를 시작하면 못 받는 경우가 많아요.</p></div>
        </div>
        <p className="foot">동해시 AI 잇다 · 2026 한림 G-Lab@동해 AI 해커톤 시제품 · 업체 정보: 국토교통부 KISCON·공공데이터·카카오맵·공공공사 실적 교차 확인 · 지원사업: 동해시·중앙부처 공고 기준(2026.11.17 확인) · 법령 안내는 요약이며 법적 효력이 없습니다.</p>
      </div>
    </main>
  );
}
