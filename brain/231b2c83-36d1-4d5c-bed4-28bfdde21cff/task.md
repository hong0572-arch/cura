# 자동 이메일 발송 기능 태스크

- [x] 1. 백엔드 설정
  - [x] `nodemailer` 라이브러리 설치
  - [x] `.env` 파일에 이메일 환경 변수(SMTP_USER, SMTP_PASS) 추가 안내
  - [x] `server.js`에 `/api/send-email` 엔드포인트 구현
- [x] 2. 프론트엔드 연동 (`ReservationForm.jsx`)
  - [x] 기존 `mailto:` 링크 생성 및 `window.location.href` 호출 제거
  - [x] `fetch`를 사용하여 백엔드의 이메일 API 호출 로직 추가
  - [x] 예약 성공 UI에서 메일 전송 버튼 제거 및 성공 메시지 수정
- [ ] 3. 테스트 및 검증
  - [ ] 사용자 이메일 계정 환경변수 등록 후 테스트 안내
