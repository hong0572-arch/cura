# 공항 VIP 의전 서비스 웹사이트

공항 VIP 의전 서비스를 홍보하고 온라인 예약·결제를 받는 웹사이트.

## 비즈니스 컨텍스트
- 서비스 공항/범위: 인천공항·김포공항 출입국 의전, 라운지, 픽업(차량)
- 주요 고객: 외국인 비즈니스 고객, 기업 담당자, 고령 고객의 가족
- 결제 수단/PG: PayPal(해외), NICEPAY(국내) — Toss는 사용하지 않음(코드 제거 완료)
- 지원 언어: 한국어/영어 (`src/translations.js`)

## 기술 스택 (실제 코드 기준)
- 프론트: React 19 + Vite 8 SPA (`src/`) — Next.js가 아님. 클라이언트 렌더링이라 SEO/GEO 개선 시 이 점을 고려할 것
- 백엔드: Express (`api/index.js`), Vercel 서버리스로 배포 (`vercel.json` rewrites, 매일 0시 `/api/cron`)
- 데이터: Firebase (`src/firebase.js`)
- 주요 화면: `BookingWizard.jsx`(예약 단계), `NicePayment.jsx`, `pages/VehicleReservation.jsx`, `pages/Success.jsx`, `AdminDashboard.jsx`, `Chatbot.jsx`(Gemini)
- 명령어: `npm run dev`, `npm run build`, `npm run lint`

## 결제·보안 구조 (2026-10 개편)
- 가격 계산은 `src/utils/pricing.js`의 `computeQuote` 하나로 브라우저와 서버가 공유한다. **결제 금액은 서버가 확정**하며 브라우저가 보낸 금액은 쓰지 않는다.
- NICEPAY(원화 카드)는 카드 수수료를 고객에게 부과하지 않는다(여신전문금융업법 제19조). PayPal(USD)만 4% 수수료(`PAYPAL_FEE_RATE`)를 받는다.
- 예약 흐름: 위저드 → `POST /api/reservations/:id`(진행 저장, 고객 토큰) → `/submit`(금액 확정·관리자 알림) → 결제 → 서버가 PG 승인 확인 후 `결제 완료` 기록 → `/success`는 상태 조회만 한다.
- Firestore `reservations`는 서버(firebase-admin)만 쓴다. 규칙은 `firestore.rules`, `storage.rules`(콘솔에 수동 게시).
- 관리자 = Firebase Auth 이메일 로그인 + `admins/{uid}` 문서. 비밀번호·API 키를 `siteData`(공개 문서)에 저장하지 않는다.
- 서버 환경변수: `FIREBASE_SERVICE_ACCOUNT`, `GEMINI_API_KEY`, `CRON_SECRET`, `NICEPAY_SECRET_KEY`, `NICEPAY_CLIENT_ID`(또는 `VITE_NICEPAY_CLIENT_KEY`), `NICEPAY_API_BASE`(테스트 시 sandbox), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAILS`(선택)

## 작업 원칙
- 프리미엄 서비스에 맞는 신뢰감 있고 고급스러운 디자인을 지향한다.
- 예약·결제 전환율을 최우선 지표로 본다(단계 최소화, 가격 투명성, 신뢰 요소).
- 다국어·해외 결제 고객의 사용 흐름을 항상 고려한다(통화 표시, 시차, 영문 이름·여권 표기, PayPal 흐름).
- 결제·개인정보(여권 정보 등) 관련 제안에는 보안과 법적 고려사항(개인정보보호법, PG 규정, 전자상거래법 등)을 함께 짚는다.
- 검색 노출(SEO)과 GEO(생성형 AI 검색 노출), 모바일 속도를 개선 제안에 포함한다.
- 문구를 추가·수정할 때는 한/영 번역을 함께 반영한다.
- 답변은 한국어로 한다.

## 주의
- 결제 키·Firebase 서비스 계정 등 비밀값은 커밋하지 말고 환경변수로만 다룬다.
- 결제 흐름 변경은 테스트 모드에서 검증한 뒤 반영한다.
