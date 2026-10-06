import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlaneLanding, PlaneTakeoff, Calendar, Clock, Users, Luggage, User, Mail, Phone, Plane, MapPin, Building, Route as RouteIcon, AlertCircle } from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { localizePath } from '../utils/locale';
import { CONTACT } from '../components/checkout/checkoutCopy';
import { computeVehicleQuote } from '../utils/pricing';
import './VehicleReservation.css';

const libraries = ['places'];

const AIRPORTS = {
  en: [
    { id: 'Incheon International Airport (ICN)', name: "Incheon Int'l Airport (ICN)" },
    { id: 'Gimpo International Airport (GMP)', name: "Gimpo Int'l Airport (GMP)" },
    { id: 'Gimhae International Airport (PUS)', name: "Gimhae Int'l Airport (PUS)" },
    { id: 'Jeju International Airport (CJU)', name: "Jeju Int'l Airport (CJU)" }
  ],
  ko: [
    { id: 'Incheon International Airport (ICN)', name: '인천국제공항 (ICN)' },
    { id: 'Gimpo International Airport (GMP)', name: '김포국제공항 (GMP)' },
    { id: 'Gimhae International Airport (PUS)', name: '김해국제공항 (PUS)' },
    { id: 'Jeju International Airport (CJU)', name: '제주국제공항 (CJU)' }
  ]
};

// 차량별 권장 인원·수하물 (홈 차량 카드와 동일). 초과 시 안내만 하고 막지는 않는다.
const CAPACITY = {
  staria: { pax: 4, bags: 4 },
  g90: { pax: 2, bags: 2 },
  sprinter: { pax: 6, bags: 6 },
};
const MIN_LEAD_HOURS = 24;

const VEHICLES = [
  { id: 'staria', image: '/vehicles/staria-card.webp', ko: { name: '현대 스타리아', cls: '프리미엄 미니밴' }, en: { name: 'Hyundai Staria', cls: 'Premium minivan' } },
  { id: 'g90', image: '/vehicles/g90-card.webp', ko: { name: '제네시스 G90', cls: '럭셔리 세단' }, en: { name: 'Genesis G90', cls: 'Luxury sedan' } },
  { id: 'sprinter', image: '/vehicles/sprinter-card.webp', ko: { name: '벤츠 스프린터', cls: 'VIP 대형 밴' }, en: { name: 'Mercedes-Benz Sprinter', cls: 'VIP large van' } },
];

const text = {
  ko: {
    title: '공항 픽업·샌딩 차량 예약',
    subtitle: '인천·김포공항과 호텔·목적지 사이를 전문 기사가 모십니다. 요금은 거리 기준으로 바로 계산됩니다.',
    transfer: '이동 정보', arrival: '공항 → 목적지 (픽업)', departure: '목적지 → 공항 (샌딩)',
    vehicle: '차량', pickup: '출발지', dropoff: '도착지', placeHint: '호텔 이름 또는 주소',
    flight: '항공편 번호', flightHint: '예: KE082', flightArrivalNote: '항공편을 추적해 지연되어도 기다립니다.',
    when: '일정·인원', date: '날짜', time: '시간 (현지)', pax: '승객 수', bags: '수하물 수',
    contact: '예약자 정보', name: '성명 (여권 영문명)', email: '이메일', phone: '연락처 (WhatsApp 가능)',
    pay: '결제 수단', nice: '국내 카드 (원화)', niceDesc: '카드 수수료 없음', paypal: 'PayPal (USD)', paypalDesc: '해외 카드',
    summary: '요금', distance: '예상 거리', calculating: '계산 중…', rate: '차량 요금', extras: '인원·수하물 추가',
    total: '총 결제 금액', enterRoute: '출발지와 도착지를 입력하면 요금이 표시됩니다.',
    notFound: '주소를 찾지 못했습니다. 목록에서 선택하거나 호텔 이름을 정확히 입력해 주세요.',
    quoteError: '요금을 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    negotiable: '100km를 넘는 이동은 별도 견적으로 안내해 드립니다.',
    contactUs: 'WhatsApp으로 견적 문의',
    submit: '결제 진행하기', submitting: '예약 저장 중…',
    required: '표시된 항목을 모두 입력해 주세요.',
    badEmail: '이메일 주소를 확인해 주세요.',
    lead: `출발 ${MIN_LEAD_HOURS}시간 이내 예약은 차량 배정을 먼저 확인해야 합니다. WhatsApp이나 전화로 문의해 주세요.`,
    past: '지난 시간은 선택할 수 없습니다.',
    seats: (v) => `최대 ${v.pax}명 · 수하물 ${v.bags}개`,
    from: '부터',
    capacity: (v) => `선택한 차량의 권장 인원은 ${v.pax}명, 수하물 ${v.bags}개입니다. 초과 시 추가 요금이 붙으며, 더 큰 차량을 권장합니다.`,
    failed: '예약을 저장하지 못했습니다. 잠시 후 다시 시도하시거나 WhatsApp으로 연락해 주세요.',
    terms: '결제를 진행하면 이용약관 및 개인정보처리방침에 동의하는 것으로 봅니다.',
    termsLink: '이용약관', privacyLink: '개인정보처리방침',
    distanceNote: '거리는 두 지점의 좌표로 산정한 예상 주행거리입니다.',
  },
  en: {
    title: 'Airport Chauffeur Booking',
    subtitle: 'Private transfers between Incheon or Gimpo airport and your hotel, with a professional driver. Your fare is calculated instantly by distance.',
    transfer: 'Transfer', arrival: 'Airport → destination (pick-up)', departure: 'Destination → airport (drop-off)',
    vehicle: 'Vehicle', pickup: 'Pick-up', dropoff: 'Drop-off', placeHint: 'Hotel name or address',
    flight: 'Flight number', flightHint: 'e.g. KE082', flightArrivalNote: 'We track your flight and wait if it is delayed.',
    when: 'Date & party', date: 'Date', time: 'Time (local)', pax: 'Passengers', bags: 'Bags',
    contact: 'Lead guest', name: 'Full name (as in passport)', email: 'Email', phone: 'Phone (WhatsApp ok)',
    pay: 'Payment', nice: 'Korean card (KRW)', niceDesc: 'No card fee', paypal: 'PayPal (USD)', paypalDesc: 'International cards',
    summary: 'Your fare', distance: 'Estimated distance', calculating: 'calculating…', rate: 'Vehicle rate', extras: 'Extra passengers / bags',
    total: 'Total', enterRoute: 'Enter pick-up and drop-off to see your fare.',
    notFound: "We couldn't find that address. Pick a suggestion or enter the hotel name in full.",
    quoteError: "We couldn't calculate the fare. Please try again shortly.",
    negotiable: 'Transfers over 100 km are quoted individually.',
    contactUs: 'Ask for a quote on WhatsApp',
    submit: 'Proceed to payment', submitting: 'Saving your booking…',
    required: 'Please complete the highlighted fields.',
    badEmail: 'Please check your email address.',
    lead: `Bookings within ${MIN_LEAD_HOURS} hours need a quick availability check — please message us on WhatsApp or call.`,
    past: 'Please choose a future date and time.',
    seats: (v) => `Up to ${v.pax} guests · ${v.bags} bags`,
    from: 'from',
    capacity: (v) => `This vehicle comfortably seats ${v.pax} with ${v.bags} bags. Extra guests or bags are charged, and a larger vehicle is recommended.`,
    failed: "We couldn't save your booking. Please try again or contact us on WhatsApp.",
    terms: 'By proceeding to payment you agree to our Terms and Privacy Policy.',
    termsLink: 'Terms', privacyLink: 'Privacy Policy',
    distanceNote: 'Distance is an estimate based on the two locations.',
  },
};

// 서울 시각 기준 'YYYY-MM-DD'
function seoulToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}
function hoursUntil(date, time) {
  const at = Date.parse(`${date}T${time}:00+09:00`);
  return Number.isNaN(at) ? null : (at - Date.now()) / 3_600_000;
}

export default function VehicleReservation({ settings, lang = 'en' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVehicle = ['staria', 'g90', 'sprinter'].includes(searchParams.get('vehicle')) ? searchParams.get('vehicle') : 'staria';
  const isKo = lang === 'ko';
  const c = text[isKo ? 'ko' : 'en'];
  const airportsList = isKo ? AIRPORTS.ko : AIRPORTS.en;

  // 지도(주소 자동완성)는 보조 기능: 불러오지 못해도 폼은 그대로 쓸 수 있다
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    language: lang,
  });

  const [formData, setFormData] = useState({
    serviceType: 'arrival',
    vehicleType: initialVehicle,
    date: '',
    time: '',
    passengers: 1,
    luggage: 1,
    pickupLocation: airportsList[0].id,
    dropoffLocation: '',
    flightNumber: '',
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'nicepay',
  });

  const [minDate, setMinDate] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState({});
  const autocompleteRef = useRef(null);

  // 오늘 날짜는 날짜 입력란을 열 때 계산한다 (사전 렌더링 결과와 어긋나지 않도록)
  const ensureMinDate = () => { if (!minDate) setMinDate(seoulToday()); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setInvalid(prev => ({ ...prev, [name]: false }));
  };

  const handleServiceTypeChange = (type) => {
    setFormData(prev => (type === 'arrival'
      ? { ...prev, serviceType: type, pickupLocation: airportsList[0].id, dropoffLocation: '' }
      : { ...prev, serviceType: type, pickupLocation: '', dropoffLocation: airportsList[0].id }));
    setQuote(null);
    setQuoteError('');
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place) return;
    const field = formData.serviceType === 'arrival' ? 'dropoffLocation' : 'pickupLocation';
    let display = '';
    if (place.name && place.formatted_address) {
      display = place.formatted_address.includes(place.name) ? place.formatted_address : `${place.name} (${place.formatted_address})`;
    } else {
      display = place.formatted_address || place.name || '';
    }
    if (display) setFormData(prev => ({ ...prev, [field]: display }));
  };

  // 출발지·도착지·차량·인원이 바뀌면 서버에 견적 요청 (입력 중에는 잠시 대기)
  const { pickupLocation, dropoffLocation, vehicleType, passengers, luggage } = formData;
  useEffect(() => {
    if (pickupLocation.trim().length < 3 || dropoffLocation.trim().length < 3) return undefined;
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsCalculating(true);
      setQuoteError('');
      try {
        const res = await fetch('/api/vehicle-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickupLocation, dropoffLocation, vehicleType, passengers, luggage }),
        });
        if (cancelled) return;
        if (res.ok) {
          setQuote(await res.json());
        } else {
          setQuote(null);
          setQuoteError(res.status === 422 ? 'notFound' : 'error');
        }
      } catch (err) {
        console.error('Vehicle quote error:', err);
        if (!cancelled) { setQuote(null); setQuoteError('error'); }
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    }, 700);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [pickupLocation, dropoffLocation, vehicleType, passengers, luggage]);

  const exRate = quote?.exRate || settings?.exchangeRate || 1350;
  const isKrw = formData.paymentMethod === 'nicepay';
  const isNegotiable = Boolean(quote?.negotiable);
  const hasQuote = Boolean(quote) && !isNegotiable;
  const money = (usd) => (isKrw ? `₩${Math.round(usd * exRate).toLocaleString('ko-KR')}` : `USD ${usd.toFixed(2)}`);
  const total = hasQuote ? (isKrw ? `₩${quote.totalKrw.toLocaleString('ko-KR')}` : `USD ${quote.totalUsd.toFixed(2)}`) : '';

  const cap = CAPACITY[formData.vehicleType];
  const overCapacity = cap && (Number(formData.passengers) > cap.pax || Number(formData.luggage) > cap.bags);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const required = ['date', 'time', 'name', 'email', 'phone', 'pickupLocation', 'dropoffLocation'];
    const missing = Object.fromEntries(required.filter(k => !String(formData[k]).trim()).map(k => [k, true]));
    if (Object.keys(missing).length) {
      setInvalid(missing);
      setError(c.required);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setInvalid({ email: true });
      setError(c.badEmail);
      return;
    }
    const lead = hoursUntil(formData.date, formData.time);
    if (lead !== null && lead < 0) { setInvalid({ date: true, time: true }); setError(c.past); return; }
    if (lead !== null && lead < MIN_LEAD_HOURS) { setError(c.lead); return; }
    if (!hasQuote || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const orderId = `BTG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const token = crypto.randomUUID();
      // 금액은 서버가 다시 계산해 확정한다
      const res = await fetch(`/api/vehicle-reservations/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, method: formData.paymentMethod, form: formData }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const checkout = await res.json();
      navigate(checkout.method === 'paypal' ? '/payment/paypal' : '/payment', {
        state: { orderId, token, checkout, lang }
      });
    } catch (err) {
      console.error('Vehicle reservation error:', err);
      setError(c.failed);
      setIsSubmitting(false);
    }
  };

  const placeInput = (name) => {
    const input = (
      <input
        type="text"
        id={`vr-${name}`}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required
        autoComplete="off"
        placeholder={c.placeHint}
        className={`vr-input ${invalid[name] ? 'is-invalid' : ''}`}
      />
    );
    return isLoaded ? (
      <Autocomplete onLoad={(ac) => { autocompleteRef.current = ac; }} onPlaceChanged={handlePlaceChanged}>
        {input}
      </Autocomplete>
    ) : input;
  };

  const airportSelect = (name) => (
    <select id={`vr-${name}`} name={name} value={formData[name]} onChange={handleChange} className="vr-input">
      {airportsList.map(apt => <option key={apt.id} value={apt.id}>{apt.name}</option>)}
    </select>
  );

  const inputClass = (name) => `vr-input ${invalid[name] ? 'is-invalid' : ''}`;

  return (
    <div className="vr-page-wrapper">
      <div className="vr-container">
        <header className="vr-head">
          <p className="btg-eyebrow">Chauffeur · ICN · GMP</p>
          <h1 className="vr-page-title">{c.title}</h1>
          <p className="vr-page-subtitle">{c.subtitle}</p>
        </header>

        <form onSubmit={handleSubmit} className="vr-layout" noValidate>
          <div className="vr-form-card btg-card">
            {/* Transfer */}
            <fieldset className="vr-section">
              <legend className="vr-section-title">{c.transfer}</legend>
              <div className="vr-type-row" role="radiogroup" aria-label={c.transfer}>
                <button type="button" role="radio" aria-checked={formData.serviceType === 'arrival'}
                  className={`vr-type-btn ${formData.serviceType === 'arrival' ? 'active' : ''}`}
                  onClick={() => handleServiceTypeChange('arrival')}>
                  <PlaneLanding size={18} aria-hidden="true" /> {c.arrival}
                </button>
                <button type="button" role="radio" aria-checked={formData.serviceType === 'departure'}
                  className={`vr-type-btn ${formData.serviceType === 'departure' ? 'active' : ''}`}
                  onClick={() => handleServiceTypeChange('departure')}>
                  <PlaneTakeoff size={18} aria-hidden="true" /> {c.departure}
                </button>
              </div>

              <fieldset className="vr-vehicles">
                <legend className="vr-label">{c.vehicle}</legend>
                <div className="vr-vehicle-grid">
                  {VEHICLES.map(v => {
                    const info = v[isKo ? 'ko' : 'en'];
                    const selected = formData.vehicleType === v.id;
                    const fromUsd = computeVehicleQuote({ vehicleType: v.id, passengers: 1, luggage: 0 }, 1, settings).totalUsd;
                    return (
                      <label key={v.id} className={`vr-vehicle ${selected ? 'is-selected' : ''}`}>
                        <input type="radio" name="vehicleType" value={v.id} checked={selected} onChange={handleChange} />
                        <span className="vr-vehicle-media">
                          <img src={v.image} alt="" width="360" height="210" loading="lazy" />
                          {selected && (
                            <span className="vr-vehicle-check" aria-hidden="true">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                            </span>
                          )}
                        </span>
                        <span className="vr-vehicle-body">
                          <span className="vr-vehicle-cls">{info.cls}</span>
                          <span className="vr-vehicle-name">{info.name}</span>
                          <span className="vr-vehicle-meta">{c.seats(CAPACITY[v.id])}</span>
                          <span className="vr-vehicle-price">{money(fromUsd)} <small>{c.from}</small></span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="vr-grid-2">
                <div>
                  <label className="vr-label" htmlFor="vr-pickupLocation">
                    {formData.serviceType === 'arrival' ? <PlaneLanding size={16} aria-hidden="true" /> : <Building size={16} aria-hidden="true" />} {c.pickup}
                  </label>
                  {formData.serviceType === 'arrival' ? airportSelect('pickupLocation') : placeInput('pickupLocation')}
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-dropoffLocation">
                    {formData.serviceType === 'arrival' ? <MapPin size={16} aria-hidden="true" /> : <PlaneTakeoff size={16} aria-hidden="true" />} {c.dropoff}
                  </label>
                  {formData.serviceType === 'departure' ? airportSelect('dropoffLocation') : placeInput('dropoffLocation')}
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-flightNumber"><Plane size={16} aria-hidden="true" /> {c.flight}</label>
                  <input id="vr-flightNumber" name="flightNumber" value={formData.flightNumber} onChange={handleChange}
                    placeholder={c.flightHint} className="vr-input vr-mono" autoComplete="off" />
                  {formData.serviceType === 'arrival' && <p className="vr-hint">{c.flightArrivalNote}</p>}
                </div>
              </div>
            </fieldset>

            {/* When & party */}
            <fieldset className="vr-section">
              <legend className="vr-section-title">{c.when}</legend>
              <div className="vr-grid-4">
                <div>
                  <label className="vr-label" htmlFor="vr-date"><Calendar size={16} aria-hidden="true" /> {c.date}</label>
                  <input id="vr-date" type="date" name="date" min={minDate || undefined} value={formData.date} onFocus={ensureMinDate} onPointerDown={ensureMinDate} onChange={handleChange} required className={inputClass('date')} />
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-time"><Clock size={16} aria-hidden="true" /> {c.time}</label>
                  <input id="vr-time" type="time" name="time" value={formData.time} onChange={handleChange} required className={inputClass('time')} />
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-passengers"><Users size={16} aria-hidden="true" /> {c.pax}</label>
                  <input id="vr-passengers" type="number" min="1" max="50" name="passengers" value={formData.passengers} onChange={handleChange} className="vr-input" />
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-luggage"><Luggage size={16} aria-hidden="true" /> {c.bags}</label>
                  <input id="vr-luggage" type="number" min="0" max="100" name="luggage" value={formData.luggage} onChange={handleChange} className="vr-input" />
                </div>
              </div>
              {overCapacity && <p className="vr-notice"><AlertCircle size={16} aria-hidden="true" /> {c.capacity(cap)}</p>}
            </fieldset>

            {/* Contact */}
            <fieldset className="vr-section">
              <legend className="vr-section-title">{c.contact}</legend>
              <div className="vr-grid-2">
                <div className="vr-span-2">
                  <label className="vr-label" htmlFor="vr-name"><User size={16} aria-hidden="true" /> {c.name}</label>
                  <input id="vr-name" type="text" name="name" value={formData.name} onChange={handleChange} required autoComplete="name" className={inputClass('name')} />
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-email"><Mail size={16} aria-hidden="true" /> {c.email}</label>
                  <input id="vr-email" type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" className={inputClass('email')} />
                </div>
                <div>
                  <label className="vr-label" htmlFor="vr-phone"><Phone size={16} aria-hidden="true" /> {c.phone}</label>
                  <input id="vr-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} required autoComplete="tel" placeholder="+82 10 0000 0000" className={inputClass('phone')} />
                </div>
              </div>
            </fieldset>

            {/* Payment method */}
            <fieldset className="vr-section vr-section--last">
              <legend className="vr-section-title">{c.pay}</legend>
              <div className="vr-grid-2" role="radiogroup" aria-label={c.pay}>
                <button type="button" role="radio" aria-checked={isKrw}
                  className={`vr-pay-btn ${isKrw ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'nicepay' }))}>
                  <span className="vr-pay-title">{c.nice}</span>
                  <span className="vr-pay-desc">{c.niceDesc}</span>
                </button>
                <button type="button" role="radio" aria-checked={!isKrw}
                  className={`vr-pay-btn ${!isKrw ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'paypal' }))}>
                  <span className="vr-pay-title">{c.paypal}</span>
                  <span className="vr-pay-desc">{c.paypalDesc}</span>
                </button>
              </div>
            </fieldset>
          </div>

          {/* Summary */}
          <aside className="vr-summary btg-panel" aria-live="polite">
            <p className="btg-eyebrow">{c.summary}</p>
            <div className="vr-summary-row">
              <span><RouteIcon size={15} aria-hidden="true" /> {c.distance}</span>
              <span className="vr-mono">{isCalculating ? c.calculating : quote ? `${quote.distanceKm} km` : '—'}</span>
            </div>
            {hasQuote && (
              <>
                <div className="vr-summary-row"><span>{c.rate}</span><span>{money(quote.vehicleUsd)}</span></div>
                {(quote.extraPassUsd > 0 || quote.extraLugUsd > 0) && (
                  <div className="vr-summary-row"><span>{c.extras}</span><span>{money(quote.extraPassUsd + quote.extraLugUsd)}</span></div>
                )}
              </>
            )}
            <div className="vr-summary-total">
              <span>{c.total}</span>
              <strong className="vr-total-val">{hasQuote ? total : '—'}</strong>
            </div>

            {!quote && !quoteError && !isCalculating && <p className="vr-summary-note">{c.enterRoute}</p>}
            {quoteError && <p className="vr-summary-warn">{quoteError === 'notFound' ? c.notFound : c.quoteError}</p>}
            {hasQuote && <p className="vr-summary-note">{c.distanceNote}</p>}

            {error && (
              <p className="vr-error" role="alert">
                {error}
                {error === c.lead && <> <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a> · <a href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a></>}
              </p>
            )}

            {isNegotiable ? (
              <>
                <p className="vr-summary-warn">{c.negotiable}</p>
                <a className="btg-btn btg-btn--gold" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">{c.contactUs}</a>
              </>
            ) : (
              <button type="submit" className="btg-btn btg-btn--gold btg-sheen vr-submit" disabled={isSubmitting || !hasQuote}>
                {isSubmitting ? c.submitting : hasQuote ? `${c.submit} · ${total}` : c.submit}
              </button>
            )}
            <p className="vr-terms">
              {c.terms} <a href={localizePath('/terms', lang)} target="_blank" rel="noopener noreferrer">{c.termsLink}</a> · <a href={localizePath('/privacy', lang)} target="_blank" rel="noopener noreferrer">{c.privacyLink}</a>
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
