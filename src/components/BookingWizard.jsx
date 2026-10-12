import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeQuote, INCLUDED_PASSENGERS as INC } from '../utils/pricing';
import { localizePath } from '../utils/locale';
import { track } from '@vercel/analytics';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { AIRLINES } from '../utils/airlines';
import { vehiclesFor, isOverCapacity } from '../utils/vehicles';
import './checkout/boardingPass.css';

// 예약 위저드 — "탑승권" 디자인 3단계 (일정 → 탑승객 → 확인·결제).
// 입력할 때마다 오른쪽(휴대폰은 위쪽) 탑승권이 채워지고, 금액 내역은 탑승권 아래 영수증에 표시된다.
// 저장·금액 확정·결제 이동은 기존과 같다: POST /api/reservations/:id → /submit(서버가 금액 확정) → 결제 페이지.

const libraries = ['places'];

// 화면 단계(3) → 서버 단계(6) : 서버는 단계로 상태(draft/abandoned/pending)를 정하므로 기존 의미를 유지한다
const SERVER_STEP = { 1: 1, 2: 4, 3: 6 };

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+852', flag: '🇭🇰', name: 'Hong Kong' },
  { code: '+886', flag: '🇹🇼', name: 'Taiwan' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
];

const DEFAULT_SERVICE_USD = { arrival: 250, departure: 270, transfer: 340, picketing: 140 };
const AIRPORT_NAMES = { ICN: { en: 'Seoul Incheon', ko: '인천국제공항' }, GMP: { en: 'Seoul Gimpo', ko: '김포국제공항' } };

const COPY = {
  en: {
    steps: ['Trip', 'Guests', 'Review & pay'],
    close: 'Close', back: 'Back',
    s1Title: 'Where should we meet you?',
    s1Lede: 'All times are Seoul time (KST). Your price updates on the pass as you type.',
    service: 'Service',
    services: { arrival: 'Arrival', departure: 'Departure', transfer: 'Transfer', picketing: 'Picketing' },
    airport: 'Airport', date: (dep) => `Date (${dep ? 'leaving' : 'arriving in'} Seoul)`,
    flightNo: 'Flight number', flightNoHint: 'e.g. KE082 — we recognise the airline.',
    airline: 'Airline', airlinePick: 'Select airline',
    time: (dep) => `${dep ? 'Departure' : 'Landing'} time (KST)`,
    seoulNow: (t) => `It is ${t} in Seoul now.`,
    connNo: 'Connecting flight number', connTime: 'Connecting departure (KST)', connAirline: 'Connecting airline',
    guests: 'Guests', guestsHint: `Base price covers up to ${INC} guests.`,
    bags: 'Checked bags', bagsHint: '5+ bags include a porter.',
    car: (dep) => `Private car ${dep ? 'to the airport' : 'from the airport'}`,
    noCar: 'No car', noCarNote: 'Meet & assist only',
    carNote: (c) => `Recommended ${[c.pax && `${c.pax} guests`, c.bags && `${c.bags} bags`].filter(Boolean).join(' · ')}`,
    overCap: 'Your party is larger than this car is recommended for. Consider a bigger car, or WhatsApp us and we will arrange it.',
    address: (dep) => (dep ? 'Pick-up address' : 'Drop-off address'),
    addressPh: 'Hotel name or address in Seoul',
    surchargeNote: 'Supplements apply — the reason for each one is shown on your pass.',
    included: "What's included & cancellation policy",
    s2Title: 'Who are we welcoming?',
    s2Lede: 'Lead guest only — exactly as printed in the passport. No date of birth or passport number needed.',
    given: 'Given name(s)', surname: 'Surname',
    email: 'Email for your confirmation', google: 'Fill in with Google',
    phone: 'Mobile number', phoneHint: 'Your agent contacts you on WhatsApp or by phone.',
    nameBoard: 'Name board will read',
    yourName: 'your name',
    optional: 'Optional — class of travel, wheelchair, requests, booking for someone else',
    travelClass: 'Class of travel', classes: { '': 'Not specified', first: 'First', business: 'Business', premium_economy: 'Premium Economy', economy: 'Economy' },
    assistance: 'Assistance', wheelchair: 'Wheelchair needed',
    requests: 'Special requests', requestsPh: 'Child seat, flowers, dietary needs…',
    someoneElse: 'I am booking for someone else',
    cFirst: 'Your given name', cLast: 'Your surname', cEmail: 'Your email', cPhone: 'Your mobile',
    s3Title: 'Review & pay',
    s3Lede: 'Everything is on your pass. Every fee is shown before you pay.',
    order: 'ORDER', invoice: 'INVOICE', unpaid: 'UNPAID',
    paypal: 'PayPal', paypalSub: 'International · pay in USD · includes 4% PayPal fee',
    nicepay: 'NICEPAY', nicepaySub: 'Korean-issued cards · charged in KRW · no fee',
    feeNote: 'NICEPAY (Korean cards, KRW) has no fee. The 4% applies to PayPal only.',
    trust: [['Free cancellation', 'up to 48 h before service'], ['Flight delayed?', 'We track it and wait for you'], ['Quote by email', 'sent to you right now']],
    terms: (a, b) => <>By paying you agree to our {a} and {b}.</>,
    termsWord: 'Terms', privacyWord: 'Privacy policy',
    cta: { 1: 'Continue — guest details', 2: 'Review & pay' },
    pay: (p) => `Pay ${p}`, payShort: 'Pay now', paying: 'Preparing secure payment…',
    continue: 'Continue', total: 'Total',
    missing: 'Please complete',
    payError: 'Something went wrong while saving your reservation. Please try again or contact us on WhatsApp.',
    priceDetails: (p) => `Price details · ${p}`, hideDetails: 'Hide price details',
    pass: { title: 'VIP MEET & ASSIST', draft: 'DRAFT', passenger: 'PASSENGER', guestsBags: 'GUESTS · BAGS', date: 'DATE', lands: 'LANDS KST', departs: 'DEPARTS KST', meet: 'MEET AT', gate: 'GATE', curb: 'CURB', conn: 'CONNECTING', car: 'PRIVATE CAR', contact: 'CONTACT', bookedBy: 'BOOKED BY', addMobile: 'ADD MOBILE', addConn: 'ADD CONNECTING FLIGHT', flight: 'FLIGHT', enterFlight: 'Enter flight', placeholderName: 'SURNAME / GIVEN', wheelchair: 'WHEELCHAIR', taxRefund: 'TAX REFUND ASSIST' },
    lines: {
      base: (s) => `${s} meet & assist (1–${INC} guests)`,
      car: (n) => `Car · ${n}`, carWhy: (dep, a) => `${dep ? 'Pick-up from' : 'Drop-off at'} ${a}`,
      extraPax: (n) => `Extra guests × ${n}`, extraPaxWhy: `Base price covers up to ${INC} guests`,
      extraBags: (n) => `Extra bags × ${n}`, extraBagsWhy: 'One bag per guest is included (min. 2)',
      porter: (n) => `Porter × ${n}`, porterWhy: (b) => `${b} bags — a porter carries them for you`,
      night: 'Night supplement', nightWhy: (dep, t) => `Flight ${dep ? 'departs' : 'lands'} ${t} — between 22:00 and 06:00`,
      urgent: 'Short-notice supplement', urgentWhy: (h) => `Booked within ${h} hours of the flight`,
      weekend: 'Weekend supplement', weekendWhy: 'Saturday or Sunday flight',
      paypalFee: 'PayPal fee (4%)',
      totalVia: (p) => (p ? 'PayPal, USD' : 'NICEPAY, KRW'),
      orNicepay: (k) => `or ${k} with NICEPAY`, orPaypal: (u) => `or ${u} with PayPal`,
    },
    labels: {
      transferAddress: 'Car address', airline: 'Airline', flightNumber: 'Flight number', flightTime: 'Flight time',
      transferAirline: 'Connecting airline', transferFlightNumber: 'Connecting flight number', transferFlightTime: 'Connecting flight time',
      firstName: 'Given name', lastName: 'Surname', email: 'Email', phoneLocal: 'Mobile number',
      contactFirst: 'Your given name', contactLast: 'Your surname', contactEmail: 'Your email', contactPhoneLocal: 'Your mobile',
    },
  },
  ko: {
    steps: ['일정', '탑승객', '확인·결제'],
    close: '닫기', back: '이전',
    s1Title: '어디에서 모실까요?',
    s1Lede: '모든 시간은 한국 시간(KST)입니다. 입력하는 대로 탑승권에 금액이 바로 반영됩니다.',
    service: '서비스',
    services: { arrival: '입국', departure: '출국', transfer: '환승', picketing: '피켓팅' },
    airport: '공항', date: (dep) => `날짜 (${dep ? '출국' : '도착'}일)`,
    flightNo: '항공편 번호', flightNoHint: '예: KE082 — 항공사는 자동으로 인식합니다.',
    airline: '항공사', airlinePick: '항공사 선택',
    time: (dep) => `${dep ? '출발' : '도착'} 시간 (KST)`,
    seoulNow: (t) => `지금 서울은 ${t}입니다.`,
    connNo: '연결편 번호', connTime: '연결편 출발 시간 (KST)', connAirline: '연결편 항공사',
    guests: '인원', guestsHint: `기본 요금에 ${INC}명까지 포함됩니다.`,
    bags: '위탁 수하물', bagsHint: '5개 이상이면 포터가 포함됩니다.',
    car: (dep) => (dep ? '공항까지 전용 차량' : '공항에서 전용 차량'),
    noCar: '차량 없음', noCarNote: '의전만',
    carNote: (c) => `권장 ${[c.pax && `${c.pax}명`, c.bags && `수하물 ${c.bags}개`].filter(Boolean).join(' · ')}`,
    overCap: '선택한 차량의 권장 인원·수하물보다 많습니다. 더 큰 차량을 고르시거나 WhatsApp으로 문의해 주세요.',
    address: (dep) => (dep ? '픽업 주소' : '도착지 주소'),
    addressPh: '호텔 이름 또는 서울 내 주소',
    surchargeNote: '할증이 적용됩니다 — 항목별 이유는 탑승권에 표시됩니다.',
    included: '포함 내역 및 취소 규정',
    s2Title: '어느 분을 모실까요?',
    s2Lede: '대표 탑승객 한 분만, 여권에 적힌 영문 그대로 입력해 주세요. 생년월일·여권번호는 필요 없습니다.',
    given: '이름 (영문)', surname: '성 (영문)',
    email: '확인 메일을 받을 이메일', google: 'Google 계정으로 채우기',
    phone: '휴대폰 번호', phoneHint: '담당자가 WhatsApp 또는 전화로 연락드립니다.',
    nameBoard: '피켓에 적힐 이름',
    yourName: '입력한 이름',
    optional: '선택 — 좌석 등급, 휠체어, 요청사항, 다른 분을 위한 예약',
    travelClass: '좌석 등급', classes: { '': '선택 안 함', first: '퍼스트', business: '비즈니스', premium_economy: '프리미엄 이코노미', economy: '이코노미' },
    assistance: '도움 필요', wheelchair: '휠체어 필요',
    requests: '요청사항', requestsPh: '유아 카시트, 꽃다발, 식이 제한 등',
    someoneElse: '다른 분을 위해 예약합니다',
    cFirst: '예약자 이름', cLast: '예약자 성', cEmail: '예약자 이메일', cPhone: '예약자 휴대폰',
    s3Title: '확인 및 결제',
    s3Lede: '예약 내용은 모두 탑승권에 있습니다. 모든 수수료는 결제 전에 표시됩니다.',
    order: '주문번호', invoice: '청구서', unpaid: '결제 전',
    paypal: 'PayPal', paypalSub: '해외 결제 · USD · PayPal 수수료 4% 포함',
    nicepay: 'NICEPAY', nicepaySub: '국내 발행 카드 · 원화 결제 · 수수료 없음',
    feeNote: 'NICEPAY(국내 카드, 원화)는 수수료가 없습니다. 4%는 PayPal에만 붙습니다.',
    trust: [['무료 취소', '서비스 48시간 전까지'], ['항공편 지연', '실시간 확인 후 기다립니다'], ['견적서 메일', '지금 바로 발송됩니다']],
    terms: (a, b) => <>결제하면 {a} 및 {b}에 동의하는 것으로 봅니다.</>,
    termsWord: '이용약관', privacyWord: '개인정보 처리방침',
    cta: { 1: '계속 — 탑승객 정보', 2: '확인 및 결제' },
    pay: (p) => `${p} 결제하기`, payShort: '결제하기', paying: '안전한 결제를 준비하고 있습니다…',
    continue: '계속', total: '합계',
    missing: '아래 항목을 입력해 주세요',
    payError: '예약 저장 중 문제가 발생했습니다. 잠시 후 다시 시도하시거나 WhatsApp으로 연락해 주세요.',
    priceDetails: (p) => `금액 내역 · ${p}`, hideDetails: '금액 내역 접기',
    pass: { title: 'VIP 의전', draft: '작성 중', passenger: 'PASSENGER', guestsBags: 'GUESTS · BAGS', date: 'DATE', lands: 'LANDS KST', departs: 'DEPARTS KST', meet: 'MEET AT', gate: 'GATE', curb: 'CURB', conn: 'CONNECTING', car: 'PRIVATE CAR', contact: 'CONTACT', bookedBy: 'BOOKED BY', addMobile: '휴대폰 입력', addConn: '연결편 입력', flight: 'FLIGHT', enterFlight: '항공편 입력', placeholderName: 'SURNAME / GIVEN', wheelchair: 'WHEELCHAIR', taxRefund: 'TAX REFUND' },
    lines: {
      base: (s) => `${s} 의전 (1~${INC}명)`,
      car: (n) => `차량 · ${n}`, carWhy: (dep, a) => `${dep ? '픽업' : '도착지'}: ${a}`,
      extraPax: (n) => `추가 인원 × ${n}`, extraPaxWhy: `기본 요금에 ${INC}명 포함`,
      extraBags: (n) => `추가 수하물 × ${n}`, extraBagsWhy: '1인당 1개(최소 2개) 포함',
      porter: (n) => `포터 × ${n}`, porterWhy: (b) => `수하물 ${b}개 — 포터가 옮겨 드립니다`,
      night: '야간 할증', nightWhy: (dep, t) => `${dep ? '출발' : '도착'} ${t} — 22:00~06:00 항공편`,
      urgent: '긴급 예약 할증', urgentWhy: (h) => `항공편까지 ${h}시간 이내 예약`,
      weekend: '주말 할증', weekendWhy: '토·일요일 항공편',
      paypalFee: 'PayPal 수수료 (4%)',
      totalVia: (p) => (p ? 'PayPal, USD' : 'NICEPAY, 원화'),
      orNicepay: (k) => `NICEPAY로는 ${k}`, orPaypal: (u) => `PayPal로는 ${u}`,
    },
    labels: {
      transferAddress: '차량 주소', airline: '항공사', flightNumber: '항공편 번호', flightTime: '항공편 시간',
      transferAirline: '연결편 항공사', transferFlightNumber: '연결편 번호', transferFlightTime: '연결편 시간',
      firstName: '이름(영문)', lastName: '성(영문)', email: '이메일', phoneLocal: '휴대폰 번호',
      contactFirst: '예약자 이름', contactLast: '예약자 성', contactEmail: '예약자 이메일', contactPhoneLocal: '예약자 휴대폰',
    },
  },
};

// 서비스 포함 내역 (기존 1단계 내용 요약)
const INCLUDED = {
  en: {
    arrival: ['Personal greeting at the aircraft door (air-bridge) with a name board', 'Priority guidance through immigration (Fast Track only for eligible passengers*)', 'Baggage assistance and customs escort', 'Escort all the way to your driver or pick-up point', 'Real-time flight monitoring — we wait if you are delayed', 'Service duration: 3 hours'],
    departure: ['Personal greeting on the departure floor with a name board', 'Priority guidance through check-in, security and immigration (Fast Track only for eligible passengers*)', 'Baggage assistance from your car', 'Tax refund assistance — escort to customs check and refund counters (eligibility set by Korea Customs)', 'Escort all the way to your gate', 'Service duration: 2 hours'],
    transfer: ['Personal greeting at the arrival gate with a name sign', 'Guidance through transfer procedures (Fast Track only for eligible passengers*)', 'Baggage assistance on request', 'Escort to your connecting flight'],
    picketing: ['Name-board greeting at the arrival hall', 'Guidance to your driver or pick-up point'],
    notes: ['* Incheon Airport does not officially sell Fast Track; our staff take you the most efficient route available.', 'Escort support only — immigration and customs procedures are completed by the passenger.', 'Cancellation: free up to 48 h before service · 50% within 24–48 h · no refund within 24 h.'],
  },
  ko: {
    arrival: ['항공기 탑승교(게이트)에서 이름 피켓으로 영접', '입국 심사 우선 안내 (패스트트랙은 대상 승객만*)', '수하물 수취 지원 및 세관 동행', '기사님·픽업 장소까지 동행', '실시간 항공편 확인 — 지연 시에도 기다립니다', '서비스 시간: 3시간'],
    departure: ['출국장에서 이름 피켓으로 영접', '체크인·보안검색·출국심사 우선 안내 (패스트트랙은 대상 승객만*)', '차량에서부터 수하물 지원', '택스리펀드 지원 — 세관 확인·환급 창구 동행 (환급 여부는 세관 기준)', '탑승 게이트까지 동행', '서비스 시간: 2시간'],
    transfer: ['도착 게이트에서 이름 피켓으로 영접', '환승 절차 안내 (패스트트랙은 대상 승객만*)', '요청 시 수하물 지원', '연결편 탑승구까지 동행'],
    picketing: ['입국장에서 이름 피켓으로 영접', '기사님·픽업 장소까지 안내'],
    notes: ['* 인천공항은 패스트트랙을 공식 판매하지 않습니다. 가능한 가장 빠른 경로로 안내합니다.', '동행 지원 서비스이며 출입국·세관 절차는 승객 본인이 진행합니다.', '취소 규정: 서비스 48시간 전까지 무료 · 24~48시간 전 50% · 24시간 이내 환불 불가'],
  },
};

const getTomorrowString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const usd2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const airlineFromFlight = (no) => {
  const m = String(no || '').toUpperCase().match(/^([A-Z0-9]{2})\s?\d/);
  return m ? AIRLINES.find(a => a.code === m[1]) || null : null;
};

export default function BookingWizard({ onClose, initialData, settings, t, lang = 'en' }) {
  const navigate = useNavigate();
  const isKo = lang === 'ko';
  const c = COPY[isKo ? 'ko' : 'en'];
  const [step, setStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(isKo ? 'nicepay' : 'paypal');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pops, setPops] = useState({});
  const [seoulNow, setSeoulNow] = useState('');
  const popTimer = useRef();
  const overlayRef = useRef(null);
  const hasSentProposal = useRef(false);
  const newBookingId = () => `BTG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const [bookingId, setBookingId] = useState(newBookingId);
  // 이 예약을 수정·결제할 수 있는 고객 전용 토큰 (서버가 첫 저장 시 등록)
  const [bookingToken] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    language: lang,
  });
  const autocompleteRef = useRef(null);

  const [formData, setFormData] = useState(() => ({
    airport: initialData?.airport || 'ICN',
    serviceType: initialData?.serviceType || 'arrival',
    date: initialData?.date || getTomorrowString(),
    passengers: initialData?.passengers || 1,
    email: initialData?.email || '',
    package: 'meet_greet',
    luggageCount: 0,
    addTransfer: false,
    airline: '',
    flightNumber: '',
    flightTime: '',
    transferAirline: '',
    transferFlightNumber: '',
    transferFlightTime: '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    travelClass: '',
    countryCode: isKo ? '+82' : '+1',
    phoneLocal: '',
    phone: '',
    wheelchair: false,
    sameAsPrimary: true,
    contactFirst: '',
    contactLast: '',
    contactEmail: '',
    contactCountryCode: isKo ? '+82' : '+1',
    contactPhoneLocal: '',
    contactPhone: '',
    vehicleType: 'none',
    transferAddress: '',
    specialRequests: '',
  }));

  // 입력한 칸이 탑승권에 찍히는 효과
  const updateForm = (key, value) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      // 서버에는 국가번호를 포함한 전화번호를 저장한다
      next.phone = next.phoneLocal ? `${next.countryCode} ${next.phoneLocal}`.trim() : '';
      next.contactPhone = next.contactPhoneLocal ? `${next.contactCountryCode} ${next.contactPhoneLocal}`.trim() : '';
      // 항공편 번호로 항공사 자동 인식
      if (key === 'flightNumber') { const a = airlineFromFlight(value); if (a) next.airline = a.name; }
      if (key === 'transferFlightNumber') { const a = airlineFromFlight(value); if (a) next.transferAirline = a.name; }
      if (key === 'serviceType' && value === 'transfer') next.vehicleType = 'none';
      return next;
    });
    setPops({ [key]: true });
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPops({}), 520);
  };
  const pop = (...keys) => (keys.some(k => pops[k]) ? 'pop' : '');

  useEffect(() => {
    const tick = () => setSeoulNow(new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => { clearInterval(id); clearTimeout(popTimer.current); };
  }, []);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place) return;
    if (place.name && place.formatted_address && !place.formatted_address.includes(place.name)) {
      updateForm('transferAddress', `${place.name} (${place.formatted_address})`);
    } else if (place.formatted_address || place.name) {
      updateForm('transferAddress', place.formatted_address || place.name);
    }
  };

  // 예약 진행 상황을 서버에 저장 (이탈 추적용). 상태·금액은 서버가 결정한다.
  const syncReservation = async () => {
    const res = await fetch(`/api/reservations/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: bookingToken, step: SERVER_STEP[step], formData }),
    });
    if (res.status === 409) {
      // 다른 예약과 번호가 겹친 경우 새 번호로 다시 저장
      setBookingId(newBookingId());
      return false;
    }
    return res.ok;
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        const ok = await syncReservation();
        // 결제 단계 진입 시 견적서 메일 1회 발송 (서버가 내용 생성, 중복 발송 방지)
        if (ok && step === 3 && !hasSentProposal.current && formData.email) {
          hasSentProposal.current = true;
          fetch(`/api/reservations/${bookingId}/proposal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: bookingToken }),
          }).catch(err => {
            console.error('Error sending proposal email:', err);
            hasSentProposal.current = false;
          });
        }
      } catch (e) {
        console.error('Reservation sync error:', e);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, formData, bookingId]);

  // 단계별 진입 기록 → 어느 단계에서 이탈하는지 Vercel Analytics 에서 확인
  useEffect(() => {
    track('Booking Step', { step, flow: 'pass', service: formData.serviceType, lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Price — 서버(api/index.js)와 같은 함수로 계산하고, 실제 결제 금액은 서버가 확정한다.
  const quote = computeQuote(formData, settings);
  const { surcharges } = quote;
  const paypal = selectedPayment === 'paypal';
  const krwLabel = `₩${quote.nicepayTotalKrw.toLocaleString()}`;
  const usdLabel = `USD ${usd2(quote.paypalTotalUsd)}`;
  const priceMain = paypal ? usdLabel : krwLabel;
  const priceAlt = paypal ? c.lines.orNicepay(krwLabel) : c.lines.orPaypal(usdLabel);

  const svc = formData.serviceType;
  const dep = svc === 'departure';
  const currentAirport = settings?.airports?.find(a => a.code === formData.airport) || null;
  const airportOptions = (settings?.airports || []).filter(a => a.code === 'ICN' || a.code === 'GMP');
  const airports = airportOptions.length ? airportOptions : [{ code: 'ICN' }, { code: 'GMP' }];
  const servicePrice = (id) => currentAirport?.services?.[id]?.usd ?? settings?.servicePrices?.[id]?.usd ?? DEFAULT_SERVICE_USD[id];
  const vehicles = vehiclesFor(settings, formData.airport);
  const vehicleName = vehicles.find(v => v.id === formData.vehicleType)?.name || formData.vehicleType;
  const cap = vehicles.find(v => v.id === formData.vehicleType)?.cap;
  const overCapacity = isOverCapacity(cap, formData.passengers, formData.luggageCount);

  // 기존 결제 화면의 견적 항목 (0원 항목은 숨김)
  const L = c.lines;
  const lines = [
    { label: L.base(c.services[svc]), usd: quote.baseFeeUsd },
    quote.vehicleUsd > 0 && { label: L.car(vehicleName), usd: quote.vehicleUsd, why: formData.transferAddress ? L.carWhy(dep, formData.transferAddress) : '' },
    quote.extraPassUsd > 0 && { label: L.extraPax(quote.extraPassCount), usd: quote.extraPassUsd, why: L.extraPaxWhy },
    quote.extraLugUsd > 0 && { label: L.extraBags(quote.extraBags), usd: quote.extraLugUsd, why: L.extraBagsWhy },
    quote.porterUsd > 0 && { label: L.porter(formData.luggageCount >= 9 ? 2 : 1), usd: quote.porterUsd, why: L.porterWhy(formData.luggageCount) },
    surcharges.nightFeeUsd > 0 && { label: L.night, usd: surcharges.nightFeeUsd, why: L.nightWhy(dep, formData.flightTime) },
    surcharges.urgentFeeUsd > 0 && { label: L.urgent, usd: surcharges.urgentFeeUsd, why: L.urgentWhy(surcharges.urgentWindow === '6h' ? 6 : 24) },
    surcharges.weekendFeeUsd > 0 && { label: L.weekend, usd: surcharges.weekendFeeUsd, why: L.weekendWhy },
    paypal && { label: L.paypalFee, usd: quote.paypalFeeUsd },
  ].filter(Boolean);
  const hasSurcharge = surcharges.nightFeeUsd > 0 || surcharges.urgentFeeUsd > 0 || surcharges.weekendFeeUsd > 0;

  // 빠진 칸 표시 (팝업 대신)
  const [missing, setMissing] = useState([]);
  const inv = (field) => (missing.includes(field) ? { 'aria-invalid': true } : {});
  const showMissing = (fields) => {
    setMissing(fields);
    track('Booking Validation', { step, flow: 'pass', fields: fields.join(',') });
    requestAnimationFrame(() => {
      overlayRef.current?.querySelector('.wizard-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };
  const missingOf = (fields) => fields.filter(f => !String(formData[f] ?? '').trim());
  const toTop = () => overlayRef.current?.scrollTo({ top: 0 });

  const handleNext = () => {
    if (step === 1) {
      const gaps = missingOf(['flightNumber', 'airline', 'flightTime']);
      if (svc === 'transfer') gaps.push(...missingOf(['transferFlightNumber', 'transferAirline', 'transferFlightTime']));
      if (svc !== 'transfer' && formData.vehicleType !== 'none') gaps.push(...missingOf(['transferAddress']));
      if (gaps.length) return showMissing(gaps);
    } else if (step === 2) {
      const gaps = missingOf(['firstName', 'lastName', 'email', 'phoneLocal']);
      if (!formData.sameAsPrimary) gaps.push(...missingOf(['contactFirst', 'contactLast', 'contactEmail', 'contactPhoneLocal']));
      if (gaps.length) return showMissing(gaps);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return showMissing(['email']);
    }
    setMissing([]);
    setDetailsOpen(false);
    setStep(prev => Math.min(prev + 1, 3));
    toTop();
  };
  const handleBack = () => {
    setMissing([]);
    if (step === 1) onClose();
    else { setStep(prev => prev - 1); toTop(); }
  };

  const handlePayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPayError('');
    try {
      // 최신 입력값을 먼저 저장한 뒤 서버에 결제 금액 확정을 요청
      if (!(await syncReservation())) throw new Error('sync failed');
      const res = await fetch(`/api/reservations/${bookingId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: bookingToken, method: selectedPayment }),
      });
      if (!res.ok) throw new Error(`submit failed (${res.status})`);
      const checkout = await res.json();
      track('Booking Pay Click', { method: selectedPayment, lang });
      navigate(checkout.method === 'paypal' ? '/payment/paypal' : '/payment', {
        state: { orderId: bookingId, token: bookingToken, checkout, lang }
      });
    } catch (err) {
      console.error('Reservation submit error:', err);
      setPayError(c.payError);
      setIsSubmitting(false);
    }
  };

  const fillWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user) {
        const parts = user.displayName ? user.displayName.split(' ') : [];
        if (parts[0]) updateForm('firstName', parts[0]);
        if (parts.length > 1) updateForm('lastName', parts.slice(1).join(' '));
        if (user.email) updateForm('email', user.email);
      }
    } catch (error) {
      console.error('Google sign in failed', error);
    }
  };

  const whatsappHref = `https://wa.me/${(t?.footer?.phone_val || '+821028533998').replace(/[^+\d]/g, '').replace(/^\+/, '').replace(/^820/, '82')}`;
  const stepClass = (n) => (step === n ? 'on' : step > n ? 'done' : '');
  const seg = (on) => (on ? 'on' : '');
  const P = c.pass;
  const airportName = (code) => AIRPORT_NAMES[code]?.[isKo ? 'ko' : 'en'] || currentAirport?.name || code;
  const flightNo = formData.flightNumber.toUpperCase();
  const dateShown = formData.date ? new Date(`${formData.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '—';
  const hasName = formData.firstName || formData.lastName;
  const passName = hasName ? `${formData.lastName.toUpperCase()} / ${formData.firstName.toUpperCase()}` : P.placeholderName;
  const tags = [formData.wheelchair && P.wheelchair, dep && P.taxRefund, formData.travelClass && c.classes[formData.travelClass].toUpperCase()].filter(Boolean);
  const ctaLabel = step === 3 ? (isSubmitting ? c.paying : c.pay(priceMain)) : c.cta[step];
  const onCta = step === 3 ? handlePayment : handleNext;
  // 경로: 입국·환승은 [항공편 → 공항], 출국은 [공항 → 항공편]
  const flightEnd = { code: flightNo || '···', name: formData.airline || P.enterFlight, keys: ['flightNumber', 'airline'] };
  const airportEnd = { code: formData.airport, name: airportName(formData.airport), keys: ['airport'] };
  const [left, right] = dep ? [airportEnd, flightEnd] : [flightEnd, airportEnd];

  const airlineSelect = (field, id) => (
    <select id={id} value={formData[field]} onChange={e => updateForm(field, e.target.value)} {...inv(field)}>
      <option value="">{c.airlinePick}</option>
      {AIRLINES.map(a => <option key={`${a.code}-${a.name}`} value={a.name}>{a.name} ({a.code})</option>)}
    </select>
  );

  return (
    <div className="wizard-overlay bp-overlay" ref={overlayRef}>
      <div className="bp">
        <header className="top">
          <div className="top-in">
            <button type="button" className="chip" onClick={handleBack}>← {step === 1 ? c.close : c.back}</button>
            <img src="/logo.webp" alt="Beyond the Gate" className="bp-logo" />
            <div className="top-meta">
              <span className="hide-m mono">Seoul {seoulNow} KST</span>
              <a className="hide-m bp-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <button type="button" className="chip" onClick={onClose} aria-label={c.close}>✕</button>
            </div>
          </div>
        </header>

        <div className="wrap">
          <main className="main">
            <ol className="steps">
              {c.steps.map((name, i) => <li key={name} className={stepClass(i + 1)}>{i + 1} · {name}</li>)}
            </ol>

            {missing.length > 0 && (
              <div className="wizard-errors" role="alert">
                <strong>{c.missing}:</strong> {missing.map(f => c.labels[f] || f).join(', ')}
              </div>
            )}

            {step === 1 && (
              <>
                <h1>{c.s1Title}</h1>
                <p className="lede">{c.s1Lede}</p>
                <div className="card">
                  <div className="f">
                    <label>{c.service}</label>
                    <div className="seg seg-4">
                      {['arrival', 'departure', 'transfer', 'picketing'].map(id => (
                        <button key={id} type="button" className={seg(svc === id)} onClick={() => updateForm('serviceType', id)}>
                          {c.services[id]}<span>USD {servicePrice(id)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="row">
                    <div className="f">
                      <label htmlFor="bp-airport">{c.airport}</label>
                      <select id="bp-airport" value={formData.airport} onChange={e => updateForm('airport', e.target.value)}>
                        {airports.map(a => <option key={a.code} value={a.code}>{airportName(a.code)} ({a.code})</option>)}
                      </select>
                    </div>
                    <div className="f">
                      <label htmlFor="bp-date">{c.date(dep)}</label>
                      <input id="bp-date" type="date" value={formData.date} onChange={e => updateForm('date', e.target.value)} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="f">
                      <label htmlFor="bp-flight">{c.flightNo}</label>
                      <input id="bp-flight" value={formData.flightNumber} onChange={e => updateForm('flightNumber', e.target.value.toUpperCase())} placeholder="KE082" autoComplete="off" {...inv('flightNumber')} />
                      <small>{formData.airline && airlineFromFlight(formData.flightNumber) ? `✓ ${formData.airline}` : c.flightNoHint}</small>
                    </div>
                    <div className="f">
                      <label htmlFor="bp-time">{c.time(dep)}</label>
                      <input id="bp-time" type="time" value={formData.flightTime} onChange={e => updateForm('flightTime', e.target.value)} {...inv('flightTime')} />
                      {seoulNow && <small>{c.seoulNow(seoulNow)}</small>}
                    </div>
                  </div>
                  {formData.flightNumber && !airlineFromFlight(formData.flightNumber) && (
                    <div className="f">
                      <label htmlFor="bp-airline">{c.airline}</label>
                      {airlineSelect('airline', 'bp-airline')}
                    </div>
                  )}
                  {svc === 'transfer' && (
                    <>
                      <div className="row">
                        <div className="f">
                          <label htmlFor="bp-conn">{c.connNo}</label>
                          <input id="bp-conn" value={formData.transferFlightNumber} onChange={e => updateForm('transferFlightNumber', e.target.value.toUpperCase())} placeholder="KE901" autoComplete="off" {...inv('transferFlightNumber')} />
                        </div>
                        <div className="f">
                          <label htmlFor="bp-conn-time">{c.connTime}</label>
                          <input id="bp-conn-time" type="time" value={formData.transferFlightTime} onChange={e => updateForm('transferFlightTime', e.target.value)} {...inv('transferFlightTime')} />
                        </div>
                      </div>
                      {formData.transferFlightNumber && !airlineFromFlight(formData.transferFlightNumber) && (
                        <div className="f">
                          <label htmlFor="bp-conn-airline">{c.connAirline}</label>
                          {airlineSelect('transferAirline', 'bp-conn-airline')}
                        </div>
                      )}
                    </>
                  )}
                  <div className="row">
                    <div className="f">
                      <label htmlFor="bp-guests">{c.guests}</label>
                      <select id="bp-guests" value={formData.passengers} onChange={e => updateForm('passengers', parseInt(e.target.value, 10))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <small>{c.guestsHint}</small>
                    </div>
                    <div className="f">
                      <label htmlFor="bp-bags">{c.bags}</label>
                      <select id="bp-bags" value={formData.luggageCount} onChange={e => updateForm('luggageCount', parseInt(e.target.value, 10))}>
                        {Array.from({ length: 16 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <small>{c.bagsHint}</small>
                    </div>
                  </div>
                  {svc !== 'transfer' && (
                    <>
                      <div className="f">
                        <label>{c.car(dep)}</label>
                        <div className="seg seg-4">
                          <button type="button" className={seg(formData.vehicleType === 'none')} onClick={() => updateForm('vehicleType', 'none')}>{c.noCar}<span>{c.noCarNote}</span></button>
                          {vehicles.map(v => (
                            <button key={v.id} type="button" className={seg(formData.vehicleType === v.id)} onClick={() => updateForm('vehicleType', v.id)}>
                              {v.name}<span>USD {v.usd}{v.cap ? ` · ${c.carNote(v.cap)}` : ''}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {overCapacity && <p className="note">{c.overCap}</p>}
                      {formData.vehicleType !== 'none' && (
                        <div className="f">
                          <label htmlFor="bp-address">{c.address(dep)}</label>
                          {isLoaded ? (
                            <Autocomplete onLoad={(ac) => { autocompleteRef.current = ac; }} onPlaceChanged={handlePlaceChanged}>
                              <input id="bp-address" value={formData.transferAddress} onChange={e => updateForm('transferAddress', e.target.value)} placeholder={c.addressPh} {...inv('transferAddress')} />
                            </Autocomplete>
                          ) : (
                            <input id="bp-address" value={formData.transferAddress} onChange={e => updateForm('transferAddress', e.target.value)} placeholder={c.addressPh} {...inv('transferAddress')} />
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {hasSurcharge && <p className="note"><b>{c.surchargeNote}</b></p>}
                </div>
                <details className="card more">
                  <summary>{c.included}</summary>
                  <ul className="included">
                    {(INCLUDED[isKo ? 'ko' : 'en'][svc] || []).map(x => <li key={x}>{x}</li>)}
                  </ul>
                  <ul className="included small">
                    {INCLUDED[isKo ? 'ko' : 'en'].notes.map(x => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              </>
            )}

            {step === 2 && (
              <>
                <h1>{c.s2Title}</h1>
                <p className="lede">{c.s2Lede}</p>
                <div className="card">
                  <div className="row">
                    <div className="f"><label htmlFor="bp-given">{c.given}</label><input id="bp-given" value={formData.firstName} onChange={e => updateForm('firstName', e.target.value)} autoComplete="given-name" {...inv('firstName')} /></div>
                    <div className="f"><label htmlFor="bp-sur">{c.surname}</label><input id="bp-sur" value={formData.lastName} onChange={e => updateForm('lastName', e.target.value)} autoComplete="family-name" {...inv('lastName')} /></div>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-email">{c.email}</label>
                    <input id="bp-email" type="email" value={formData.email} onChange={e => updateForm('email', e.target.value)} autoComplete="email" {...inv('email')} />
                    <button type="button" className="bp-google" onClick={fillWithGoogle}>
                      <img src="https://www.google.com/favicon.ico" alt="" width="14" height="14" /> {c.google}
                    </button>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-phone">{c.phone}</label>
                    <div className="phone-row">
                      <select aria-label="Country code" value={formData.countryCode} onChange={e => updateForm('countryCode', e.target.value)}>
                        {COUNTRY_CODES.map(cc => <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>)}
                      </select>
                      <input id="bp-phone" type="tel" value={formData.phoneLocal} onChange={e => updateForm('phoneLocal', e.target.value)} autoComplete="tel-national" {...inv('phoneLocal')} />
                    </div>
                    <small>{c.phoneHint}</small>
                  </div>
                  <p className="note">{c.nameBoard}: <b>{formData.lastName ? `${formData.firstName.toUpperCase()} ${formData.lastName.toUpperCase()}`.trim() : c.yourName}</b></p>
                </div>

                <details className="card more" open={!formData.sameAsPrimary || undefined}>
                  <summary>{c.optional}</summary>
                  <div className="row" style={{ marginTop: 16 }}>
                    <div className="f">
                      <label htmlFor="bp-class">{c.travelClass}</label>
                      <select id="bp-class" value={formData.travelClass} onChange={e => updateForm('travelClass', e.target.value)}>
                        {Object.entries(c.classes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="f">
                      <label>{c.assistance}</label>
                      <label className="check"><input type="checkbox" checked={formData.wheelchair} onChange={e => updateForm('wheelchair', e.target.checked)} /> {c.wheelchair}</label>
                    </div>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-req">{c.requests}</label>
                    <input id="bp-req" value={formData.specialRequests} onChange={e => updateForm('specialRequests', e.target.value)} placeholder={c.requestsPh} />
                  </div>
                  <label className="check"><input type="checkbox" checked={!formData.sameAsPrimary} onChange={e => updateForm('sameAsPrimary', !e.target.checked)} /> {c.someoneElse}</label>
                  {!formData.sameAsPrimary && (
                    <>
                      <div className="row" style={{ marginTop: 12 }}>
                        <div className="f"><label htmlFor="bp-cfirst">{c.cFirst}</label><input id="bp-cfirst" value={formData.contactFirst} onChange={e => updateForm('contactFirst', e.target.value)} {...inv('contactFirst')} /></div>
                        <div className="f"><label htmlFor="bp-clast">{c.cLast}</label><input id="bp-clast" value={formData.contactLast} onChange={e => updateForm('contactLast', e.target.value)} {...inv('contactLast')} /></div>
                      </div>
                      <div className="row">
                        <div className="f"><label htmlFor="bp-cemail">{c.cEmail}</label><input id="bp-cemail" type="email" value={formData.contactEmail} onChange={e => updateForm('contactEmail', e.target.value)} {...inv('contactEmail')} /></div>
                        <div className="f">
                          <label htmlFor="bp-cphone">{c.cPhone}</label>
                          <div className="phone-row">
                            <select aria-label="Country code" value={formData.contactCountryCode} onChange={e => updateForm('contactCountryCode', e.target.value)}>
                              {COUNTRY_CODES.map(cc => <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>)}
                            </select>
                            <input id="bp-cphone" type="tel" value={formData.contactPhoneLocal} onChange={e => updateForm('contactPhoneLocal', e.target.value)} {...inv('contactPhoneLocal')} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </details>
              </>
            )}

            {step === 3 && (
              <>
                <h1>{c.s3Title}</h1>
                <p className="lede">{c.s3Lede}</p>
                <div className="card">
                  <div className="order-bar">
                    <div><span className="k">{c.order}</span><b className="mono">{bookingId}</b></div>
                    <div><span className="k">{c.invoice}</span><b className="mono">INV{bookingId.substring(3)}</b></div>
                    <span className="badge-unpaid">{c.unpaid}</span>
                  </div>
                  <div className="pay">
                    <button type="button" className={`pay-opt ${seg(paypal)}`} onClick={() => setSelectedPayment('paypal')} aria-pressed={paypal}>
                      <div><b>{c.paypal}</b><span>{c.paypalSub}</span><div className="marks"><em>PayPal</em><em>USD</em></div></div>
                      <i>{usdLabel}</i>
                    </button>
                    <button type="button" className={`pay-opt ${seg(!paypal)}`} onClick={() => setSelectedPayment('nicepay')} aria-pressed={!paypal}>
                      <div><b>{c.nicepay}</b><span>{c.nicepaySub}</span><div className="marks"><em>NICEPAY</em><em>KRW</em></div></div>
                      <i>{krwLabel}</i>
                    </button>
                  </div>
                  <p className="note" style={{ marginTop: 14 }}>{c.feeNote}</p>
                  <div className="trust">
                    {c.trust.map(([a, b]) => <div key={a}><b>{a}</b>{b}</div>)}
                  </div>
                </div>
                {payError && <div className="wizard-errors" role="alert">{payError} <a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a></div>}
              </>
            )}

            <div className="desk-cta">
              <button type="button" className={`btn ${step === 3 ? 'btn-gold' : 'btn-navy'}`} onClick={onCta} disabled={isSubmitting}>{ctaLabel}</button>
              {step === 3 && (
                <p className="terms">{c.terms(
                  <a href={localizePath('/terms', lang)} target="_blank" rel="noopener noreferrer">{c.termsWord}</a>,
                  <a href={localizePath('/privacy', lang)} target="_blank" rel="noopener noreferrer">{c.privacyWord}</a>
                )}</p>
              )}
              {step > 1 && <button type="button" className="btn btn-ghost" onClick={handleBack}>← {c.back}</button>}
            </div>
          </main>

          <aside className={`side ${step === 3 || detailsOpen ? 'show-stub' : ''}`}>
            <div className="pass">
              <div className="pass-head">
                <span className="mono"><span className="hide-narrow">{P.title} · </span>{c.services[svc].toUpperCase()}</span>
                <span className="mono" style={{ color: '#B9C4D4' }}>{step === 3 ? `${bookingId} · ${c.unpaid}` : P.draft}</span>
              </div>
              <div className="pass-body">
                <div className="route">
                  <div><div className={`code ${pop(...left.keys)}`}>{left.code}</div><small>{left.name}</small></div>
                  <div className="mid">
                    <span>{svc === 'transfer' ? 'TRANSFER' : P.flight}</span>
                    <div className="line"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5C17" strokeWidth="1.6" aria-hidden="true"><path d="M2 13.5l8-1.5 5-9 2 .5-2.5 8.5 6-1 1.5 2-7.5 1.5" /></svg></div>
                    <span>{formData.flightTime ? `${formData.flightTime} KST` : ''}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}><div className={`code ${pop(...right.keys)}`}>{right.code}</div><small>{right.name}</small></div>
                </div>
                <div className="grid">
                  <div className="cell two"><div className="k">{P.passenger}</div><div className={`v ${pop('firstName', 'lastName')} ${hasName ? '' : 'empty'}`}>{passName}</div></div>
                  <div className="cell"><div className="k">{P.guestsBags}</div><div className={`v ${pop('passengers', 'luggageCount')}`}>{formData.passengers} · {formData.luggageCount}</div></div>
                  <div className="cell"><div className="k">{P.date}</div><div className={`v ${pop('date')}`}>{dateShown}</div></div>
                  <div className="cell"><div className="k">{dep ? P.departs : P.lands}</div><div className={`v ${pop('flightTime')} ${formData.flightTime ? '' : 'empty'}`}>{formData.flightTime || '--:--'}</div></div>
                  <div className="cell"><div className="k">{P.meet}</div><div className="v">{dep ? P.curb : P.gate}</div></div>
                  {svc === 'transfer' && (
                    <div className="cell wide"><div className="k">{P.conn}</div><div className={`v ${pop('transferFlightNumber', 'transferFlightTime')} ${formData.transferFlightNumber ? '' : 'empty'}`}>{formData.transferFlightNumber ? `${formData.transferFlightNumber} · ${formData.transferFlightTime || '--:--'} KST` : P.addConn}</div></div>
                  )}
                  {svc !== 'transfer' && formData.vehicleType !== 'none' && (
                    <div className="cell wide"><div className="k">{P.car}</div><div className={`v ${pop('vehicleType', 'transferAddress')}`}>{vehicleName.toUpperCase()}{formData.transferAddress ? ` → ${formData.transferAddress.toUpperCase()}` : ''}</div></div>
                  )}
                  <div className="cell wide hide-compact"><div className="k">{P.contact}</div><div className={`v ${pop('phoneLocal', 'countryCode', 'email')} ${formData.phoneLocal ? '' : 'empty'}`}>{formData.phoneLocal ? formData.phone : P.addMobile}</div></div>
                  {!formData.sameAsPrimary && formData.contactFirst && (
                    <div className="cell wide hide-compact"><div className="k">{P.bookedBy}</div><div className={`v ${pop('contactFirst', 'contactLast')}`}>{`${formData.contactFirst} ${formData.contactLast}`.toUpperCase()}</div></div>
                  )}
                </div>
                {tags.length > 0 && <div className="tags">{tags.map(x => <span key={x}>{x}</span>)}</div>}
                {formData.specialRequests && <p className="req">“{formData.specialRequests}”</p>}
              </div>
              <div className="perf" aria-hidden="true" />
              <div className="stub">
                <div className="lines">
                  {lines.map(l => (
                    <div key={l.label} className="line-item">
                      <div><span>{l.label}</span><span className="mono">USD {usd2(l.usd)}</span></div>
                      {l.why && <div className="why">{l.why}</div>}
                    </div>
                  ))}
                </div>
                <div className="total">
                  <span style={{ fontSize: 13, color: '#5E574C' }}>{c.total} · {L.totalVia(paypal)}</span>
                  <div><div className="amt">{priceMain}</div><small>{priceAlt}</small></div>
                </div>
                <div className="barcode" aria-hidden="true" />
              </div>
            </div>
            {step < 3 && (
              <button type="button" className="details-toggle" onClick={() => setDetailsOpen(o => !o)} aria-expanded={detailsOpen}>
                {detailsOpen ? c.hideDetails : c.priceDetails(priceMain)}
              </button>
            )}
          </aside>
        </div>

        <div className="mbar">
          <div className="p">{c.total}<b>{priceMain}</b></div>
          <button type="button" className="btn btn-gold" onClick={onCta} disabled={isSubmitting}>
            {step === 3 ? (isSubmitting ? c.paying : c.payShort) : `${c.continue} (${step}/3)`}
          </button>
        </div>
      </div>
    </div>
  );
}
