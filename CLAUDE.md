# 공항 VIP 의전 서비스 웹사이트

공항 VIP 의전 서비스를 홍보하고 온라인 예약·결제를 받는 웹사이트.

## 비즈니스 컨텍스트
- 서비스 공항/범위: 인천공항·김포공항 출입국 의전, 라운지, 픽업(차량)
- 사업 방향(2026-10): 공항 의전 회사 → **DMC(Destination Management Company)**로 확장. 공항 의전·차량은 "바로 예약", 맞춤 여행·단체·기업 프로그램은 "제안 요청"의 두 갈래.
- 주요 고객: **럭셔리 여행을 계획하는 개인·가족·소규모 단체**, 외국인 비즈니스 고객, 기업 담당자(대표단·MICE), 고령 고객의 가족
- 디자인 방향(확정): "A×B Aviation Luxe" — 네이비 운영 패널(운항 안내판·항공편 추적) + 세리프 제목(Cormorant Garamond)·본문 Manrope·숫자 IBM Plex Mono + 아이보리 바탕·샴페인 골드. 로고(금색 #FEC74D, 투명 배경)는 유지하며 어두운 배경 위에만 둔다. 시안: https://claude.ai/artifact/PaGSrYzajTNWVGnfC43CfT (AB-Motion)
- 애니메이션 원칙: 예약 CTA·가격은 지연 없이 즉시 표시, `prefers-reduced-motion` 존중, 라이브러리 없이 CSS 위주(스크롤 효과는 `animation-timeline: view()`), 사전 렌더링 내용은 HTML에 그대로 두고 효과는 마운트 후 시작
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
- 예약 위저드(2026-10 "탑승권" 개편): 화면 3단계(일정 → 탑승객 → 확인·결제), 문구는 `BookingWizard.jsx`의 COPY(한/영), 스타일 `components/checkout/boardingPass.css`(.bp 범위). 서버는 단계 번호로 상태를 정하므로 화면 1/2/3단계를 서버 1/4/6단계로 보낸다(SERVER_STEP). 전화번호는 국가번호 포함으로 저장. 생년월일 받지 않음. 영어 화면 기본 PayPal, 한국어 기본 NICEPAY. 시안 미리보기 `/preview/boarding-pass`(개발 서버 전용).
- 의전 기본 요금에 3명까지 포함(`INCLUDED_PASSENGERS`, 2026-10). 4번째부터 1인당 `extraPassengerFeeUsd`.
- 차량 권장 인원·수하물: 관리자 공항별 차량의 `maxPax`/`maxBags`(0=안내 안 함). 비어 있으면 차종 이름(Staria 4/G90 2/Sprinter 6)으로 기본값. 초과 시 위저드가 안내만 하고 막지는 않는다.
- NICEPAY 카드 수수료(4%)는 부과하지 않기로 확정(2026-10, 여신전문금융업법 제19조). 원화 수익 조정이 필요하면 관리자 환율 설정으로 원화 가격 전체를 조정한다.
- Firestore `reservations`는 서버(firebase-admin)만 쓴다. 규칙은 `firestore.rules`, `storage.rules`(콘솔에 수동 게시).
- 관리자 = Firebase Auth 이메일 로그인 + `admins/{uid}` 문서. 비밀번호·API 키를 `siteData`(공개 문서)에 저장하지 않는다.
- 서버 환경변수: `FIREBASE_SERVICE_ACCOUNT`, `GEMINI_API_KEY`, `CRON_SECRET`, `NICEPAY_SECRET_KEY`, `NICEPAY_CLIENT_ID`(또는 `VITE_NICEPAY_CLIENT_KEY`), `NICEPAY_API_BASE`(테스트 시 sandbox), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAILS`(선택)

## SEO·사전 렌더링 구조 (2026-10 개편)
- 대표 도메인은 `https://beyondthegate.kr` 하나. `servicebycura.com`은 리다이렉트만 하고 canonical/hreflang/사이트맵에 쓰지 않는다.
- 언어는 경로로 구분: 한국어 `/about`, 영어 `/en/about` (`src/utils/locale.js`). 링크·navigate 는 `localizePath()`를 거친다. 예전 `?lang=en` 주소는 App에서 `/en/...`으로 옮긴다.
- `npm run build` = vite build → SSR 빌드(`src/entry-server.jsx`) → `scripts/prerender.mjs`. 공개 페이지(PAGES 목록)를 `dist/*.html`로 미리 렌더링하고 `sitemap.xml`을 생성한다. 빌드 시 Firestore `siteData/main`(공개)을 읽어 HTML과 `window.__SITE_DATA__`에 싣는다 → 관리자 화면에서 문구를 바꾸면 **재배포해야** 검색엔진용 HTML에 반영된다(방문자 화면은 즉시 갱신).
- 공개 페이지를 추가하면 `scripts/prerender.mjs`의 PAGES, `SEOMeta.jsx`의 PAGE_META, App 라우트를 함께 갱신한다.
- 사전 렌더링되는 컴포넌트는 렌더 중에 `window`/`document`/`Date.now()`/난수를 쓰지 않는다(하이드레이션 불일치). 브라우저 API는 effect·이벤트 핸들러 안에서만.
- `vercel.json`: 공개 페이지마다 rewrite(`/about` → `/about.html`)를 명시하고, 나머지 경로는 `spa.html`(빈 셸)로 보낸다. **`cleanUrls`는 쓰지 않는다** — 켜면 `/api/*`·`/payment` rewrite가 404가 된다(2026-10 운영 장애).
- 이미지: `public/`의 png/jpg는 `node scripts/optimize-images.mjs`로 WebP를 만들고 코드에서는 `.webp`를 쓴다(Firestore 경로는 `optimizedImage()`가 변환).
- 홈 구성(2026-10): Hero(문구+운항 안내판 `home/FlipBoard`) → `home/ThreeWays`(Private Journeys 사전 상담·공항&차량·단체&기업) → Services(입국/출국/환승 탭 + `home/ServiceJourney` 공항 동선 모션: 고객·에스코트가 단계 지점을 함께 이동, 보안/일반구역 표시, PC 가로·휴대폰 세로, 보일 때만 자동 재생, 단계 문구는 번역의 diagrams.*.steps) → `home/OpsTracker`(항공편 추적) → Fleet → CoreValues(간결 목록) → Reviews → FAQ → `home/ClosingCta`. 새 섹션 문구는 `src/content/homeCopy.js`(코드 관리, 한/영)에 있고 관리자 화면에서는 편집되지 않는다.
- 디자인 토큰·공용 클래스(`.btg-btn`, `.btg-eyebrow`, `.btg-card`, `.btg-panel`, `.btg-reveal`, `.btg-sheen`)는 `src/index.css` 상단/하단. 어두운 영역은 `.on-navy` 등으로 기존 변수를 재정의한다. 결제·완료·실패 화면은 `components/checkout/`.
- **Private Journeys는 현재 비활성화**(2026-10, 요금·가이드·법적 확인 대기): `src/config/features.js`의 `FEATURES.privateJourneys=false` → 메뉴·홈 카드·하단 CTA·블로그 버튼 숨김, 페이지는 '준비 중' 안내(noindex)·사이트맵 제외, 플래너 API는 503. true로 바꾸고 배포하면 다시 열린다.
- Private Journeys(맞춤 여행, 2026-10 플래너): 기본 = 입국 의전 + 출국 의전 + 공항↔숙소 차량 왕복(각 의전 견적에 선택 차량 1회 포함) − 패키지 할인. 숙소·식당 예약은 하지 않는다. 고객이 날짜별로 장소를 고르고(AI 추천 `POST /api/journeys/suggest` → 브라우저에서 구글 지도 textSearch로 확인), 날짜별 반일·종일 차량과 목적지별 가이드(선택)를 붙여 `POST /api/journey-requests`로 견적 요청 → Firestore `journeyRequests` + 관리자 메일(Reply-To 고객) + 고객 접수 메일. 예상 금액은 `computeJourneyQuote`(pricing.js, 서버와 공유), 요금은 관리자 'Private Journeys Pricing' 탭(settings.journeys; 0이면 '별도 견적'). 장거리 = 서울 중심에서 longDistanceKm 초과, 제주는 별도 견적. 플래너는 `components/journeys/JourneyPlanner.jsx`(브라우저 전용 lazy, localStorage 저장), 문구 `content/journeysCopy.js`. 확정 금액·결제 링크 발송은 아직 관리자가 수동(이메일)으로 한다. 예전 `/api/journey-enquiries`는 호환용으로 남아 있다.
- 영어 홈 'Korea this month'(`home/KoreaNow.jsx`, 2026-10): 공공데이터로 날씨(기상청 단기예보 `/api/korea/weather`, 서울·부산·제주)와 이달의 축제·명소(한국관광공사 영문 TourAPI EngService2 `/api/korea/highlights?month=`)를 보여 준다. 키는 서버 환경변수 `DATA_GO_KR_KEY`(공공데이터포털 일반 인증키 Decoding). CDN 캐시(날씨 30분·관광 6시간)로 호출량 보호. 사진은 공공누리 1유형만 쓰고 출처 표시. 명소는 `MONTH_KEYWORDS`(api/index.js)로 달마다 검색. 홈 검색창 날짜를 바꾸면 `btg:trip-date` 이벤트로 그 달 내용으로 바뀐다. 데이터를 못 받으면 섹션을 숨긴다.
- 대표 연락 이메일은 `cura@beyondthegate.kr`로 통일(관리자 알림 기본 수신처).
- 차량 예약(`/book-vehicle`): 지도 로딩과 무관하게 폼 표시(자동완성은 보조), 항공편 번호 저장, 출발 24시간 이내·지난 시간 예약 차단(WhatsApp 안내), 차량 권장 인원 초과 시 안내, 견적 실패 사유 표시.
- 로컬 개발: `node api/index.js`(4242) + `npm run dev`(5173, /api 프록시). 서비스 계정이 없으면 설정은 코드 기본값을 쓰고 Firestore 쓰기는 실패한다(메일 발송은 실제로 나감).
- 블로그: 목록 `/blog`(사진 카드), 글 `/blog/:postId`(`pages/BlogPost.jsx`, lazy). 매일 `/api/cron`이 글 작성 후 `attachBlogImages()`로 커버·본문 이미지 2장을 Gemini 이미지 모델(`GEMINI_IMAGE_MODEL`, 기본 `gemini-3.1-flash-image` — Imagen 은 종료됨)로 생성해 Storage `blog/<id>/`에 저장하고 글에 주소·대체 텍스트를 기록한다. 이미지가 없으면 화면은 `utils/blogImages.js`가 주제에 맞는 사이트 사진을 고른다. 기존 글 채우기: `POST /api/blog/backfill-images?limit=3` (Bearer CRON_SECRET).
- 관리자 화면·예약 위저드는 `React.lazy`로 분리돼 있다. 방문자 첫 화면 번들에 무거운 라이브러리를 추가하지 않는다.

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
