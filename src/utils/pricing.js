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
