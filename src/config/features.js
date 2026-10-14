// 기능 스위치 — 브라우저·서버·사전 렌더링이 함께 쓴다.
// privateJourneys: 요금·가이드·법적 확인이 끝날 때까지 꺼 둔다(2026-10). true 로 바꾸고 배포하면 다시 열린다.
export const FEATURES = {
  privateJourneys: false,
  // 영어 홈 'Korea this month' — 실데이터 확인 전까지 숨김. 주소에 ?korea=1 을 붙이면 미리 볼 수 있다
  koreaNow: true,
};
