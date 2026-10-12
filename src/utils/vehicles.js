// 차량 목록·권장 인원 (예약 위저드와 Private Journeys 플래너가 함께 쓴다)
export const DEFAULT_VEHICLE_USD = { staria: 130, g90: 200, sprinter: 200 };
// 차량 권장 인원·수하물 기본값 (차량 예약 페이지와 같은 기준)
export const CAPACITY = { staria: { pax: 4, bags: 4 }, g90: { pax: 2, bags: 2 }, sprinter: { pax: 6, bags: 6 } };
export const VEHICLE_NAMES = { staria: 'Hyundai Staria', g90: 'Genesis G90', sprinter: 'Mercedes Sprinter' };

// 관리자 화면에 입력된 차량 이름의 오타 보정 (기존 위저드와 같은 처리)
export const cleanVehicleName = (name) => String(name).replace(/Merces/i, 'Mercedes').replace(/Venz/i, 'Benz').replace(/Toyata/i, 'Toyota');

// 차량 권장 인원·수하물: 관리자 화면 입력값(maxPax/maxBags) 우선, 없으면 차종 이름으로 기본값
export const vehicleCapacity = (v) => {
  if (Number(v.maxPax) > 0 || Number(v.maxBags) > 0) return { pax: Number(v.maxPax) || 0, bags: Number(v.maxBags) || 0 };
  const key = CAPACITY[v.id] ? v.id : /staria/i.test(v.name) ? 'staria' : /g90/i.test(v.name) ? 'g90' : /sprinter/i.test(v.name) ? 'sprinter' : null;
  return key ? CAPACITY[key] : null;
};

// 공항별 차량 목록 (관리자 "Airports & Pricing" 차량 → 없으면 기본 3종)
export function vehiclesFor(settings, airportCode) {
  const airport = settings?.airports?.find(a => a.code === airportCode) || null;
  return airport?.vehicles?.length
    ? airport.vehicles.map(v => ({ id: v.id, name: cleanVehicleName(v.name || VEHICLE_NAMES[v.id] || v.id), usd: settings?.vehiclePricesUsd?.[v.id] || Number(v.priceUsd) || 0, cap: vehicleCapacity(v) }))
    : Object.keys(DEFAULT_VEHICLE_USD).map(id => ({ id, name: VEHICLE_NAMES[id], usd: settings?.vehiclePricesUsd?.[id] || DEFAULT_VEHICLE_USD[id], cap: CAPACITY[id] }));
}

export const isOverCapacity = (cap, passengers, bags) =>
  Boolean(cap && ((cap.pax && Number(passengers) > cap.pax) || (cap.bags && Number(bags) > cap.bags)));
