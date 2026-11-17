# 동해시 AI 잇다

사진 한 장으로 우리 집 수리에 맞는 지원사업·법적 안내·동해시 업체를 이어 주는 서비스 (2026 한림 G-Lab@동해 AI 해커톤).

- `/` 시민 · `/admin` 주무관(창구 모드·현황판·데이터 관리) · `/pro` 시공업체(문의함·내 정보·법·안전·지원사업)
- Next.js + Supabase(Postgres·Auth·RLS) + Gemini(판별·이미지) + Vercel
- 원칙: AI는 판별·설명만. 지원사업·업체·법 안내는 DB 규칙으로만 고름 (AI가 업체·사업을 지어내지 못함)

## 데이터
- `data/businesses.json` 동해시 사업자 통합DB 정리본 (대표자명 제외, 사업자번호는 비공개 테이블)
- `data/programs.json` 지원사업 46개 (v3.1 공식 검증)
- `data/work_types.json` 공정 매핑표 · `data/legal_notes.json` 공정별 법·안전 안내
- `scripts/` 엑셀·JSON → 위 파일 변환 스크립트

## 환경변수
`.env.example` 참고. GEMINI_API_KEY 는 Vercel 설정에만 넣기.
