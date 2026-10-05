// 예약 견적 계산 — 브라우저(BookingWizard)와 서버(api/index.js)가 같은 함수를 쓴다.
// 서버는 이 결과로 결제 금액을 확정하므로, 브라우저가 보낸 금액은 절대 신뢰하지 않는다.

// PayPal(해외 결제)에만 적용하는 결제 수수료율.
// NICEPAY(국내 신용카드)는 여신전문금융업법 제19조에 따라 카드 수수료를 고객에게 전가하지 않는다.
export const PAYPAL_FEE_RATE = 0.04;

// 항공편 시간은 해당 공항 현지 시각으로 입력받는다.
const AIRPORT_UTC_OFFSET = { ICN: '+09:00', GMP: '+09:00' };

const SERVICE_TYPES = ['arrival', 'departure', 'transfer', 'picketing'];
const DEFAULT_BASE_USD = { arrival: 250, departure: 270, transfer: 340, picketing: 140 };

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
  // Exception for DEP + G90 (Total should be 450. Base 270 + Vehicle 180 = 450)
  if (serviceType === 'departure' && formData.vehicleType === 'g90' && vehicleUsd === 200) {
    vehicleUsd = 180;
  }

  // Extra passengers
  const passengers = Math.max(1, parseInt(formData.passengers, 10) || 1);
  const extraPassCount = Math.max(0, passengers - 2);
  const extraPassUsd = extraPassCount * (settings?.extraPassengerFeeUsd || 120);

  // Luggage & porter
  const totalBags = Math.max(0, parseInt(formData.luggageCount, 10) || 0);
  let extraLugUsd = 0;
  let porterUsd = 0;
  let extraBags = 0;
  if (totalBags >= 9) {
    porterUsd = (settings?.porterFeeUsd || 110) * 2;
  } else if (totalBags >= 5) {
    porterUsd = settings?.porterFeeUsd || 110;
  } else {
    extraBags = Math.max(0, totalBags - Math.max(2, passengers));
    extraLugUsd = extraBags * (settings?.extraLuggageFeeUsd || 40);
  }

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
    extraPassCount,
    extraPassUsd,
    extraBags,
    extraLugUsd,
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
