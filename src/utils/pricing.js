// 예약 견적 계산 — 브라우저(BookingWizard)와 서버(api/index.js)가 같은 함수를 쓴다.
// 서버는 이 결과로 결제 금액을 확정하므로, 브라우저가 보낸 금액은 절대 신뢰하지 않는다.

// PayPal(해외 결제)에만 적용하는 결제 수수료율.
// NICEPAY(국내 신용카드)는 여신전문금융업법 제19조에 따라 카드 수수료를 고객에게 전가하지 않는다.
export const PAYPAL_FEE_RATE = 0.04;

// 항공편 시간은 해당 공항 현지 시각으로 입력받는다.
const AIRPORT_UTC_OFFSET = { ICN: '+09:00', GMP: '+09:00' };

const SERVICE_TYPES = ['arrival', 'departure', 'transfer', 'picketing'];
const DEFAULT_BASE_USD = { arrival: 250, departure: 270, transfer: 340, picketing: 140 };

// 의전 기본 요금에 포함되는 인원 (그 이상은 1인당 extraPassengerFeeUsd)
export const INCLUDED_PASSENGERS = 3;
// 의전 직원 1명이 맡는 손님 수·수하물 수 (2026-10): 손님 3명마다 직원 1명, 직원 1명당 수하물 4개 포함
export const GUESTS_PER_STAFF = 3;
export const BAGS_PER_STAFF = 4;
// 한도를 넘는 수하물은 포터 1명당 4개
export const BAGS_PER_PORTER = 4;

const round2 = (n) => Math.round(n * 100) / 100;

function parseFlightDate(date, time, airport) {
  if (!date || !time) return null;
  const offset = AIRPORT_UTC_OFFSET[airport] || '';
  const d = new Date(`${date}T${time}${time.length === 5 ? ':00' : ''}${offset}`);
  return Number.isNaN(d.getTime()) ? null : d; 
}

export function computeQuote(formData, settings, now = new Date()) {
  const exRate = settings?.exchangeRate || 1350;
  const serviceType = SERVICE_TYPES.includes(formData.serviceType) ? formData.serviceType : 'arrival';
  const currentAirport = settings?.airports?.find(a => a.code === formData.airport) || null;

  const baseFeeUsd = currentAirport?.services?.[serviceType]?.usd
    ?? settings?.servicePrices?.[serviceType]?.usd
    ?? DEFAULT_BASE_USD[serviceType];

  // Vehicle
  let vehicleUsd = 0;
  const currentVehicle = currentAirport?.vehicles?.find(v => v.id === formData.vehicleType) || null;
  if (formData.vehicleType === 'staria') {
    vehicleUsd = settings?.vehiclePricesUsd?.staria || 130;
  } else if (formData.vehicleType === 'g90') {
    vehicleUsd = settings?.vehiclePricesUsd?.g90 || 200;
  } else if (formData.vehicleType === 'sprinter') {
    vehicleUsd = settings?.vehiclePricesUsd?.sprinter || 200;
  } else if (currentVehicle) {
    vehicleUsd = Number(currentVehicle.priceUsd) || 0;
  }
  // 차량을 골랐는데 가격표에 없는 ID (서버는 이 경우 결제를 막는다)
  const vehicleUnknown = Boolean(formData.vehicleType) && formData.vehicleType !== 'none'
    && !['staria', 'g90', 'sprinter'].includes(formData.vehicleType) && !currentVehicle;
  // Exception for DEP + G90 (Total should be 450. Base 270 + Vehicle 180 = 450)
  if (serviceType === 'departure' && formData.vehicleType === 'g90' && vehicleUsd === 200) {
    vehicleUsd = 180;
  }

  // Extra passengers
  const passengers = Math.max(1, parseInt(formData.passengers, 10) || 1);
  const extraPassCount = Math.max(0, passengers - INCLUDED_PASSENGERS);
  const extraPassUsd = extraPassCount * (settings?.extraPassengerFeeUsd || 120);

  // Staff, luggage & porter
  // 추가 인원 요금으로 직원이 늘어나므로 수하물 한도도 직원 수만큼 늘어난다 (예: 4명·8개 → 직원 2명·한도 8개 → 포터 없음)
  const staffCount = Math.ceil(passengers / GUESTS_PER_STAFF);
  const bagAllowance = staffCount * BAGS_PER_STAFF;
  const totalBags = Math.max(0, parseInt(formData.luggageCount, 10) || 0);
  const overBags = Math.max(0, totalBags - bagAllowance);
  const porterCount = Math.ceil(overBags / BAGS_PER_PORTER);
  const porterUsd = porterCount * (settings?.porterFeeUsd || 110);
  // 개당 추가 수하물 요금은 의전에서 받지 않는다 (예전 견적·메일 호환용으로 0을 둔다)
  const extraBags = 0;
  const extraLugUsd = 0;

  // Surcharges
  let nightFeeUsd = 0, urgentFeeUsd = 0, weekendFeeUsd = 0;
  let urgentWindow = null;
  const flightDate = parseFlightDate(formData.date, formData.flightTime, formData.airport);
  if (flightDate) {
    const hour = parseInt(formData.flightTime.split(':')[0], 10);
    if (hour >= 22 || hour < 6) {
      nightFeeUsd = settings?.nightSurchargeUsd || 40;
    }

    const diffHours = (flightDate - now) / (1000 * 60 * 60);
    if (diffHours >= 0 && diffHours <= 6) {
      urgentFeeUsd = settings?.urgentSurcharge6hUsd || 48;
      urgentWindow = '6h';
    } else if (diffHours > 6 && diffHours <= 24) {
      urgentFeeUsd = settings?.urgentSurcharge24hUsd || 40;
      urgentWindow = '24h';
    }

    // 요일은 입력된 현지 날짜 기준
    const [y, m, d] = formData.date.split('-').map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (day === 0 || day === 6) {
      weekendFeeUsd = settings?.weekendSurchargeUsd || 40;
    }
  }

  const subtotalUsd = baseFeeUsd + vehicleUsd + extraPassUsd + extraLugUsd + porterUsd
    + nightFeeUsd + urgentFeeUsd + weekendFeeUsd;
  const subtotalKrw = Math.round(subtotalUsd * exRate);

  const paypalFeeUsd = round2(subtotalUsd * PAYPAL_FEE_RATE);

  return {
    exRate,
    serviceType,
    baseFeeUsd,
    vehicleUsd,
    vehicleUnknown,
    extraPassCount,
    extraPassUsd,
    staffCount,
    bagAllowance,
    extraBags,
    extraLugUsd,
    porterCount,
    porterUsd,
    surcharges: { nightFeeUsd, urgentFeeUsd, weekendFeeUsd, urgentWindow },
    subtotalUsd: round2(subtotalUsd),
    subtotalKrw,
    paypalFeeUsd,
    // 결제 수단별 최종 결제 금액
    paypalTotalUsd: round2(subtotalUsd + paypalFeeUsd),
    nicepayTotalKrw: subtotalKrw,
  };
}

// --- 차량 단독 예약(/book-vehicle) ---
// Google 지도는 한국 내 자동차 경로를 제공하지 않으므로, 두 지점의 직선거리에
// 도로 보정 계수를 곱해 예상 주행거리를 구한다(서버가 Places API 좌표로 계산).
export const VEHICLE_ROAD_FACTOR = 1.25;
export const VEHICLE_TYPES = ['staria', 'g90', 'sprinter'];

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 100km 초과는 별도 협의(null)
function vehicleRateUsd(type, distanceKm) {
  if (distanceKm > 100) return null;
  const tiers = {
    staria: [110, 130, 140, 140],
    g90: [200, 220, 240, 260],
    sprinter: [200, 240, 260, 280],
  }[type] || [110, 110, 110, 110];
  if (distanceKm <= 50) return tiers[0];
  if (distanceKm <= 70) return tiers[1];
  if (distanceKm <= 90) return tiers[2];
  return tiers[3];
}

export function computeVehicleQuote(form, distanceKm, settings) {
  const exRate = settings?.exchangeRate || 1350;
  const km = Math.ceil(distanceKm);
  const vehicleUsd = vehicleRateUsd(form.vehicleType, km);
  const passengers = Math.max(1, parseInt(form.passengers, 10) || 1);
  const luggage = Math.max(0, parseInt(form.luggage, 10) || 0);
  const extraPassCount = Math.max(0, passengers - 4);
  const extraPassUsd = extraPassCount * (settings?.extraPassengerFeeUsd || 50);
  const extraLugCount = Math.max(0, luggage - 4);
  const extraLugUsd = extraLugCount * (settings?.extraLuggageFeeUsd || 20);

  if (vehicleUsd === null) {
    return { exRate, distanceKm: km, negotiable: true };
  }
  const totalUsd = round2(vehicleUsd + extraPassUsd + extraLugUsd);
  return {
    exRate,
    distanceKm: km,
    negotiable: false,
    vehicleUsd,
    extraPassCount,
    extraPassUsd,
    extraLugCount,
    extraLugUsd,
    totalUsd,
    totalKrw: Math.round(totalUsd * exRate),
  };
}

// --- Private Journeys (맞춤 여행) 예상 견적 ---
// 기본 패키지 = 입국 의전 + 출국 의전 + 공항↔숙소 차량 왕복(각 의전에 차량 1회 포함) − 패키지 할인.
// 여행 중 차량은 날짜별 반일·종일 대절, 가이드는 목적지별 동행 옵션. 금액은 관리자 settings.journeys 에서 관리한다.
// 고객에게는 "예상 금액"으로만 보여 주고, 확정 금액은 관리자가 차량·가이드 배정을 확인한 뒤 정한다.
export const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };
export const JOURNEY_DEFAULTS = {
  packageDiscountPct: 0,
  halfDayHours: 5,
  fullDayHours: 10,
  longDistanceKm: 80,
  longDistanceUsd: 0,
  driverOvernightUsd: 0,
  guidePerStopUsd: 0,
  vehicleRates: {},
};
export const JOURNEY_MODES = ['free', 'half', 'full'];

export function journeySettings(settings) {
  return { ...JOURNEY_DEFAULTS, ...(settings?.journeys || {}) };
}

const hasCoords = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
const kmFromSeoul = (p) => (hasCoords(p) ? haversineKm(SEOUL_CENTER, { lat: Number(p.lat), lng: Number(p.lng) }) : 0);
// 제주도는 차량으로 갈 수 없어 별도 견적 (위도 33.1~33.6, 경도 126.1~127)
export const isJeju = (p) => hasCoords(p) && Number(p.lat) < 33.65 && Number(p.lat) > 33.0 && Number(p.lng) > 126.0 && Number(p.lng) < 127.1;

export function computeJourneyQuote(plan, settings, now = new Date()) {
  const j = journeySettings(settings);
  const exRate = settings?.exchangeRate || 1350;
  const passengers = Math.max(1, (parseInt(plan.adults, 10) || 1) + (parseInt(plan.children, 10) || 0));
  const common = { airport: plan.airport || 'ICN', passengers, luggageCount: plan.bags || 0, vehicleType: plan.vehicleId || 'none' };
  const arrival = computeQuote({ ...common, serviceType: 'arrival', date: plan.arrival?.date, flightTime: plan.arrival?.time }, settings, now);
  const departure = computeQuote({ ...common, serviceType: 'departure', date: plan.departure?.date, flightTime: plan.departure?.time }, settings, now);
  const packageUsd = round2(arrival.subtotalUsd + departure.subtotalUsd);
  const discountUsd = round2(packageUsd * (Number(j.packageDiscountPct) || 0) / 100);

  const rates = j.vehicleRates?.[plan.vehicleId] || {};
  const pending = [];
  const days = (plan.days || []).map((day) => {
    const stops = day.stops || [];
    const mode = JOURNEY_MODES.includes(day.mode) ? day.mode : 'free';
    const jeju = stops.some(isJeju);
    const farKm = Math.max(0, ...stops.map(kmFromSeoul));
    const longDistance = mode !== 'free' && !jeju && farKm > (Number(j.longDistanceKm) || 80);
    let vehicleUsd = 0;
    if (mode !== 'free') {
      const rate = Number(mode === 'half' ? rates.halfDayUsd : rates.fullDayUsd) || 0;
      if (jeju || !rate) { vehicleUsd = null; pending.push(jeju ? 'jeju' : 'vehicleRate'); } else vehicleUsd = rate;
    }
    const longUsd = longDistance ? (Number(j.longDistanceUsd) || null) : 0;
    if (longUsd === null) pending.push('longDistance');
    const guides = stops.filter(s => s.guide).length;
    const guideUsd = guides ? (Number(j.guidePerStopUsd) ? guides * Number(j.guidePerStopUsd) : null) : 0;
    if (guideUsd === null) pending.push('guide');
    // 그날 밤 숙소가 수도권 밖이면 기사 숙박비
    const overnightAway = mode !== 'free' && hasCoords(day.hotel) && kmFromSeoul(day.hotel) > (Number(j.longDistanceKm) || 80);
    const overnightUsd = overnightAway ? (Number(j.driverOvernightUsd) || null) : 0;
    if (overnightUsd === null) pending.push('overnight');
    return { date: day.date, mode, jeju, longDistance, farKm: Math.round(farKm), guides, vehicleUsd, longUsd, guideUsd, overnightAway, overnightUsd };
  });

  const sum = (key) => days.reduce((t, d) => t + (Number(d[key]) || 0), 0);
  const tripUsd = round2(sum('vehicleUsd') + sum('longUsd') + sum('guideUsd') + sum('overnightUsd'));
  const totalUsd = round2(packageUsd - discountUsd + tripUsd);
  return {
    exRate,
    passengers,
    arrival,
    departure,
    packageUsd,
    discountPct: Number(j.packageDiscountPct) || 0,
    discountUsd,
    days,
    tripUsd,
    totalUsd,
    totalKrw: Math.round(totalUsd * exRate),
    pending: [...new Set(pending)],
    hours: { half: j.halfDayHours, full: j.fullDayHours },
    overtimeUsd: Number(rates.overtimeUsd) || 0,
  };
}
