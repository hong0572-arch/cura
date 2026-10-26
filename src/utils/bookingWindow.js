// 예약 가능 기간 — 브라우저와 서버(api/index.js)가 함께 쓴다.
// PG(NICEPAY) 입점 기준: 사전예약은 60일 이내, 서비스 제공기간 3개월 초과 상품은 판매 불가(2026-10).
// 모든 서비스는 예약한 이용일 당일 1회 제공한다.
export const MAX_ADVANCE_DAYS = 60;

// 서울 시각 기준 'YYYY-MM-DD'
export const seoulToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);

export const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// 예약할 수 있는 마지막 이용일 (오늘 + 60일)
export const maxBookingDate = (now = new Date()) => addDays(seoulToday(now), MAX_ADVANCE_DAYS);

// 이용일이 오늘~60일 이내인지 ('YYYY-MM-DD' 또는 'YYYY-MM-DDTHH:mm')
export const isBookableDate = (value, now = new Date()) => {
  const ymd = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  return ymd >= seoulToday(now) && ymd <= maxBookingDate(now);
};
