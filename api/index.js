import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleGenAI } from "@google/genai";
import { computeQuote, computeVehicleQuote, haversineKm, VEHICLE_ROAD_FACTOR, VEHICLE_TYPES } from '../src/utils/pricing.js';
import { generateProposalHtml } from '../src/utils/emailTemplate.js';

dotenv.config();

// --- Firebase Admin ---
// 서버는 서비스 계정으로 Firestore에 접근한다(보안 규칙의 영향을 받지 않음).
// Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT 에 서비스 계정 JSON 전체를 넣는다.
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  initializeApp(serviceAccount
    ? { credential: cert(serviceAccount) }
    : { projectId: 'cura-1969a' });
}
const db = getFirestore();

const app = express();
const port = process.env.PORT || 4242;

const ALLOWED_ORIGINS = [
  'https://beyondthegate.kr',
  'https://www.beyondthegate.kr',
  'https://servicebycura.com',
  'https://www.servicebycura.com',
];
app.use(cors({
  origin: (origin, callback) => {
    // 같은 출처 요청(origin 없음), 운영 도메인, 로컬/Vercel 프리뷰만 허용
    if (!origin || ALLOWED_ORIGINS.includes(origin)
      || /^http:\/\/localhost:\d+$/.test(origin)
      || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
}));
// URL-encoded body parser is required because Nicepay POSTs form data
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

// --- Helpers ---
const STATUS_DRAFT = '작성 중';
const STATUS_ABANDONED = '중도 중단됨 (이탈)';
const STATUS_PENDING = '결제 대기중';
const STATUS_PAID = '결제 완료';
const STATUS_REVIEW = '결제 확인 필요';

const BOOKING_ID_RE = /^BTG-\d{4}-\d{6}$/;
const TOKEN_RE = /^[A-Za-z0-9-]{20,64}$/;

let settingsCache = { value: null, at: 0 };
async function loadSettings() {
  if (settingsCache.value && Date.now() - settingsCache.at < 60_000) return settingsCache.value;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT && process.env.NODE_ENV !== 'production') {
    // 로컬 개발: Firestore 에 접근할 수 없으므로 코드 기본값으로 계산 (운영에서는 사용 안 함)
    return {};
  }
  const snap = await db.doc('siteData/main').get();
  const settings = snap.exists ? (snap.data().settings || {}) : {};
  settingsCache = { value: settings, at: Date.now() };
  return settings;
}

function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// 예약 문서를 읽고 고객 토큰을 검증한다(token을 넘긴 경우). 실패하면 { error, code } 반환.
async function loadReservation(id, token) {
  if (!BOOKING_ID_RE.test(id || '')) return { error: 'Invalid reservation id', code: 400 };
  const ref = db.collection('reservations').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { error: 'Reservation not found', code: 404 };
  const data = snap.data();
  if (token !== undefined && !tokensMatch(token, data.accessToken)) {
    return { error: 'Forbidden', code: 403 };
  }
  return { ref, data };
}

// 고객이 입력할 수 있는 필드만 허용 (status, 금액, 결제정보 등은 서버만 기록)
const STRING_FIELDS = {
  airport: 10, serviceType: 20, date: 10, email: 200, package: 30,
  airline: 100, flightNumber: 20, flightTime: 5,
  transferAirline: 100, transferFlightNumber: 20, transferFlightTime: 5,
  firstName: 100, lastName: 100, dobMonth: 2, dobDay: 2, dobYear: 4,
  travelClass: 30, phone: 40,
  contactFirst: 100, contactLast: 100, contactEmail: 200, contactPhone: 40,
  vehicleType: 30, transferAddress: 500, specialRequests: 2000,
};
const BOOLEAN_FIELDS = ['addTransfer', 'wheelchair', 'sameAsPrimary'];

function sanitizeFormData(input = {}) {
  const out = {};
  for (const [key, max] of Object.entries(STRING_FIELDS)) {
    if (input[key] !== undefined && input[key] !== null) out[key] = String(input[key]).slice(0, max);
  }
  for (const key of BOOLEAN_FIELDS) {
    if (input[key] !== undefined) out[key] = Boolean(input[key]);
  }
  if (input.passengers !== undefined) out.passengers = Math.min(50, Math.max(1, parseInt(input.passengers, 10) || 1));
  if (input.luggageCount !== undefined) out.luggageCount = Math.min(100, Math.max(0, parseInt(input.luggageCount, 10) || 0));
  return out;
}

function draftStatus(step) {
  if (step === 6) return STATUS_PENDING;
  if (step > 3) return STATUS_ABANDONED;
  return STATUS_DRAFT;
}

function checkoutPayload(id, data) {
  return {
    orderId: id,
    method: data.paymentMethod,
    amount: data.amount,
    currency: data.currency,
    orderName: data.orderName || `VIP ${data.serviceType || 'service'} in ${data.airport || 'ICN'}`,
    customerName: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
    customerEmail: data.email || '',
    customerMobilePhone: data.phone || '',
    status: data.status,
  };
}

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP credentials are not configured');
  return { user, transporter: nodemailer.createTransport({ service: 'gmail', auth: { user, pass } }) };
}

async function adminRecipients() {
  const settings = await loadSettings().catch(() => ({}));
  const list = [
    settings.companyEmail,
    ...(process.env.ADMIN_EMAILS || '').split(','),
    'cura@beyondthegate.kr',
  ].map(e => (e || '').trim().toLowerCase()).filter(Boolean);
  return { primary: list[0], allowed: new Set(list) };
}

async function sendAdminMail(subject, text, to) {
  const { user, transporter } = getTransporter();
  await transporter.sendMail({
    from: `"BTG System" <${user}>`,
    to,
    subject: `[Admin] ${subject}`,
    text,
  });
}

// 관리자 알림 메일 API — 수신자는 서버가 허용한 관리자 주소로만 제한한다.
// (이전에는 임의의 수신자·HTML을 받아 스팸/피싱 발송에 악용될 수 있었음)
app.post('/api/send-email', async (req, res) => {
  const subject = String(req.body.subject || '').slice(0, 200);
  const text = String(req.body.text || '').slice(0, 10000);
  if (!subject || !text) return res.status(400).json({ error: 'subject and text are required' });

  try {
    const { primary, allowed } = await adminRecipients();
    const requested = String(req.body.adminEmail || '').trim().toLowerCase();
    const to = allowed.has(requested) ? requested : primary;
    await sendAdminMail(subject, text, to);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// --- Reservations ---

// 예약 위저드 진행 상황 저장 (이탈 추적용). 첫 저장 시 고객 토큰을 등록한다.
app.post('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const { token, step, formData } = req.body;
  if (!BOOKING_ID_RE.test(id) || !TOKEN_RE.test(token || '')) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const stepNum = Math.min(6, Math.max(1, parseInt(step, 10) || 1));

  try {
    const ref = db.collection('reservations').doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const data = snap.data();
        if (!tokensMatch(token, data.accessToken) || data.status === STATUS_PAID) {
          const err = new Error('conflict'); err.code = 409; throw err;
        }
      }
      tx.set(ref, {
        id,
        ...sanitizeFormData(formData),
        step: stepNum,
        status: draftStatus(stepNum),
        updatedAt: new Date().toISOString(),
        ...(snap.exists ? {} : {
          accessToken: token,
          dateSubmitted: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        }),
      }, { merge: true });
    });
    res.status(200).json({ success: true });
  } catch (error) {
    if (error.code === 409) return res.status(409).json({ error: 'Reservation id conflict' });
    console.error('Reservation sync failed:', error);
    res.status(500).json({ error: 'Failed to save reservation' });
  }
});

// 결제 단계 진입 시 고객에게 견적서 메일 1회 발송 (내용은 서버가 생성)
app.post('/api/reservations/:id/proposal', async (req, res) => {
  try {
    const r = await loadReservation(req.params.id, String(req.body.token || ''));
    if (r.error) return res.status(r.code).json({ error: r.error });
    if (r.data.proposalSentAt) return res.status(200).json({ success: true, alreadySent: true });
    if (!r.data.email) return res.status(400).json({ error: 'Missing email' });

    const settings = await loadSettings();
    const quote = computeQuote(r.data, settings);
    const { user, transporter } = getTransporter();
    await transporter.sendMail({
      from: `"Beyond The Gate" <${user}>`,
      to: r.data.email,
      subject: '[Beyond The Gate] Your personalised VIP airport service proposal',
      html: generateProposalHtml(r.data, quote, req.params.id),
      text: 'Your personalised VIP airport service proposal has been generated.\n\nPlease view this email in an HTML compatible client to see the full proposal details.',
    });
    await r.ref.update({ proposalSentAt: new Date().toISOString() });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Proposal email failed:', error);
    res.status(500).json({ error: 'Failed to send proposal' });
  }
});

// 결제 요청: 서버가 금액을 계산·확정(lock)하고 결제 페이지에 필요한 정보를 돌려준다.
app.post('/api/reservations/:id/submit', async (req, res) => {
  const method = req.body.method === 'paypal' ? 'paypal' : 'nicepay';
  try {
    const r = await loadReservation(req.params.id, String(req.body.token || ''));
    if (r.error) return res.status(r.code).json({ error: r.error });
    if (r.data.status === STATUS_PAID) return res.status(409).json({ error: 'Already paid' });

    const settings = await loadSettings();
    const quote = computeQuote(r.data, settings);
    const amount = method === 'paypal' ? quote.paypalTotalUsd : quote.nicepayTotalKrw;
    const currency = method === 'paypal' ? 'USD' : 'KRW';

    const update = {
      quote: { ...quote, lockedAt: new Date().toISOString() },
      paymentMethod: method,
      amount,
      currency,
      totalUsd: quote.paypalTotalUsd,
      totalKrw: quote.nicepayTotalKrw,
      name: `${r.data.firstName || ''} ${r.data.lastName || ''}`.trim(),
      flight: `${r.data.airline || ''} ${r.data.flightNumber || ''}`.trim(),
      status: STATUS_PENDING,
      step: 6,
      updatedAt: new Date().toISOString(),
    };
    await r.ref.update(update);
    const data = { ...r.data, ...update };

    // 관리자 알림 (실패해도 결제 진행은 막지 않음)
    const s = quote.surcharges;
    const text = `A new reservation request has been submitted with the details below:

[Reservation Details]
- Reference Ticket ID: ${req.params.id}
- Airport: ${data.airport}
- Service Date & Time: ${data.date} ${data.flightTime || ''}
- Service Type: ${String(data.serviceType || '').toUpperCase()}
- Flight: ${data.airline || ''} ${data.flightNumber || ''}

[Client Info]
- Name: ${data.firstName || ''} ${data.lastName || ''}
- Email: ${data.email || ''}
- Phone: ${data.phone || ''}
- Special Requests: ${data.specialRequests || 'None'}

[Service Configuration]
- Selected Chauffeur Vehicle: ${String(data.vehicleType || 'none').toUpperCase()}
${data.vehicleType && data.vehicleType !== 'none' ? `- Transfer Address: ${data.transferAddress || 'Not provided'}\n` : ''}- Passengers Count: ${data.passengers}
- Checked Luggage Count: ${data.luggageCount}

[Pricing Breakdown]
- Base Assist Fee: $${quote.baseFeeUsd}
- Chauffeur Vehicle Fee: $${quote.vehicleUsd}
- Extra Passenger Surcharge: $${quote.extraPassUsd}
- Extra Baggage Surcharge: $${quote.extraLugUsd}
${quote.porterUsd > 0 ? `- Porter Service: $${quote.porterUsd}\n` : ''}${s.nightFeeUsd > 0 ? `- Night Service Surcharge: $${s.nightFeeUsd}\n` : ''}${s.urgentFeeUsd > 0 ? `- Urgent Request Surcharge: $${s.urgentFeeUsd}\n` : ''}${s.weekendFeeUsd > 0 ? `- Weekend/Holiday Surcharge: $${s.weekendFeeUsd}\n` : ''}--------------------------------------------------
- Payment Method: ${method === 'paypal' ? 'PayPal (USD, incl. 4% fee)' : 'NICEPAY (KRW, no card fee)'}
- Amount to Charge: ${currency === 'USD' ? `$${amount.toFixed(2)} USD` : `₩${amount.toLocaleString()}`}

Sincerely,
Beyond the Gate Automated System`;
    adminRecipients()
      .then(({ primary }) => sendAdminMail(`New Reservation Request - ${req.params.id}`, text, primary))
      .catch(err => console.error('Admin notification failed:', err));

    res.status(200).json(checkoutPayload(req.params.id, data));
  } catch (error) {
    console.error('Reservation submit failed:', error);
    res.status(500).json({ error: 'Failed to submit reservation' });
  }
});

// 결제 페이지 새로고침 시 확정된 결제 정보 재조회
app.get('/api/reservations/:id/checkout', async (req, res) => {
  try {
    const r = await loadReservation(req.params.id, String(req.query.token || ''));
    if (r.error) return res.status(r.code).json({ error: r.error });
    if (!r.data.amount) return res.status(400).json({ error: 'Reservation not submitted' });
    res.status(200).json(checkoutPayload(req.params.id, r.data));
  } catch (error) {
    console.error('Checkout lookup failed:', error);
    res.status(500).json({ error: 'Failed to load checkout' });
  }
});

// 결제 완료 페이지용 상태 조회 (개인정보 없이 상태·금액만 반환)
app.get('/api/reservations/:id/status', async (req, res) => {
  try {
    const r = await loadReservation(req.params.id);
    if (r.error) return res.status(r.code).json({ error: r.error });
    res.status(200).json({
      status: r.data.status,
      paid: r.data.status === STATUS_PAID,
      amount: r.data.payment?.amount ?? r.data.amount ?? null,
      currency: r.data.payment?.currency ?? r.data.currency ?? null,
    });
  } catch (error) {
    console.error('Status lookup failed:', error);
    res.status(500).json({ error: 'Failed to load status' });
  }
});

async function markPaid(ref, payment) {
  await ref.update({
    status: STATUS_PAID,
    payment: { ...payment, paidAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  });
}

// --- Vehicle-only reservations (/book-vehicle) ---
// 거리는 서버가 Google Places 좌표로 계산한다(한국은 Google 자동차 경로 미지원).
const MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
const placeCache = new Map();

async function placeLocation(text) {
  const key = text.trim().toLowerCase();
  if (placeCache.has(key)) return placeCache.get(key);
  if (!MAPS_SERVER_KEY) throw new Error('Maps key is not configured');
  const params = new URLSearchParams({
    input: text, inputtype: 'textquery', fields: 'geometry', key: MAPS_SERVER_KEY,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`);
  const data = await res.json();
  const loc = data.candidates?.[0]?.geometry?.location || null;
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places error: ${data.status}`);
  }
  if (placeCache.size > 500) placeCache.clear();
  placeCache.set(key, loc);
  return loc;
}

function sanitizeVehicleForm(input = {}) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  return {
    serviceType: input.serviceType === 'departure' ? 'departure' : 'arrival',
    vehicleType: VEHICLE_TYPES.includes(input.vehicleType) ? input.vehicleType : 'staria',
    pickupLocation: str(input.pickupLocation, 300),
    dropoffLocation: str(input.dropoffLocation, 300),
    date: str(input.date, 10),
    time: str(input.time, 5),
    passengers: Math.min(50, Math.max(1, parseInt(input.passengers, 10) || 1)),
    luggage: Math.min(100, Math.max(0, parseInt(input.luggage, 10) || 0)),
    name: str(input.name, 100),
    email: str(input.email, 200),
    phone: str(input.phone, 40),
    flightNumber: str(input.flightNumber, 20).toUpperCase(),
  };
}

async function quoteVehicle(form) {
  if (!form.pickupLocation || !form.dropoffLocation) return { error: 'Missing locations', code: 400 };
  const [from, to] = await Promise.all([placeLocation(form.pickupLocation), placeLocation(form.dropoffLocation)]);
  if (!from || !to) return { error: 'Location not found', code: 422 };
  const distanceKm = haversineKm(from, to) * VEHICLE_ROAD_FACTOR;
  const settings = await loadSettings();
  return { quote: computeVehicleQuote(form, distanceKm, settings) };
}

// 화면 표시용 견적 (예약 생성 없음)
app.post('/api/vehicle-quote', async (req, res) => {
  try {
    const result = await quoteVehicle(sanitizeVehicleForm(req.body));
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.status(200).json(result.quote);
  } catch (error) {
    console.error('Vehicle quote failed:', error);
    res.status(500).json({ error: 'Failed to calculate quote' });
  }
});

// 차량 예약 생성 + 결제 금액 확정
app.post('/api/vehicle-reservations/:id', async (req, res) => {
  const { id } = req.params;
  const { token } = req.body;
  const method = req.body.method === 'paypal' ? 'paypal' : 'nicepay';
  if (!BOOKING_ID_RE.test(id) || !TOKEN_RE.test(token || '')) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const form = sanitizeVehicleForm(req.body.form);
  if (!form.date || !form.time || !form.name || !form.email || !form.phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await quoteVehicle(form);
    if (result.error) return res.status(result.code).json({ error: result.error });
    const quote = result.quote;
    if (quote.negotiable) return res.status(400).json({ error: 'Custom quote required', negotiable: true });

    const amount = method === 'paypal' ? quote.totalUsd : quote.totalKrw;
    const currency = method === 'paypal' ? 'USD' : 'KRW';
    const now = new Date().toISOString();
    const orderName = `Vehicle ${form.vehicleType.toUpperCase()} (${quote.distanceKm}km)`;
    const data = {
      id,
      kind: 'vehicle',
      ...form,
      date: `${form.date}T${form.time}`,
      luggageCount: form.luggage,
      flight: form.flightNumber,
      transferAddress: form.serviceType === 'arrival' ? form.dropoffLocation : form.pickupLocation,
      orderName,
      quote: { ...quote, lockedAt: now },
      paymentMethod: method,
      amount,
      currency,
      totalUsd: quote.totalUsd,
      totalKrw: quote.totalKrw,
      status: STATUS_PENDING,
      step: 6,
      accessToken: token,
      dateSubmitted: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      updatedAt: now,
    };

    const ref = db.collection('reservations').doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const err = new Error('conflict'); err.code = 409; throw err;
      }
      tx.set(ref, data);
    });

    const text = `A new vehicle reservation has been submitted:

- Reference Ticket ID: ${id}
- Service: ${form.serviceType.toUpperCase()} / ${form.vehicleType.toUpperCase()}
- Date & Time: ${form.date} ${form.time}
- Pickup: ${form.pickupLocation}
- Drop-off: ${form.dropoffLocation}
- Flight: ${form.flightNumber || '-'}
- Estimated Distance: ${quote.distanceKm} km
- Passengers / Luggage: ${form.passengers} / ${form.luggage}

- Name: ${form.name}
- Email: ${form.email}
- Phone: ${form.phone}

- Vehicle Rate: $${quote.vehicleUsd}
- Extra Pax/Luggage: $${quote.extraPassUsd + quote.extraLugUsd}
- Payment Method: ${method === 'paypal' ? 'PayPal (USD)' : 'NICEPAY (KRW)'}
- Amount to Charge: ${currency === 'USD' ? `$${amount.toFixed(2)} USD` : `₩${amount.toLocaleString()}`}

Beyond the Gate Automated System`;
    adminRecipients()
      .then(({ primary }) => sendAdminMail(`New Vehicle Reservation - ${id}`, text, primary))
      .catch(err => console.error('Admin notification failed:', err));

    res.status(200).json(checkoutPayload(id, data));
  } catch (error) {
    if (error.code === 409) return res.status(409).json({ error: 'Reservation id conflict' });
    console.error('Vehicle reservation failed:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// --- Private Journeys enquiries ---
// 맞춤 여행 사전 상담 문의: 관리자 메일로 전송하고, 가능하면 Firestore 에도 기록한다.
const ENQUIRY_LIMIT = 5;               // IP당 시간당 최대 접수 건수 (인스턴스 단위의 간단한 제한)
const enquiryHits = new Map();

function tooManyEnquiries(ip) {
  const now = Date.now();
  const recent = (enquiryHits.get(ip) || []).filter(t => now - t < 3_600_000);
  recent.push(now);
  enquiryHits.set(ip, recent);
  if (enquiryHits.size > 2000) enquiryHits.clear();
  return recent.length > ENQUIRY_LIMIT;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pickList = (value, allowed) => (Array.isArray(value) ? value : [])
  .map(v => String(v)).filter(v => allowed.includes(v)).slice(0, allowed.length);

const STYLES = ['culture', 'food', 'shopping', 'nature', 'wellness', 'kculture', 'family', 'occasion'];
const PLACES = ['seoul', 'jeju', 'busan', 'gyeongju', 'gangwon', 'unsure'];
const NEEDS = ['airport', 'chauffeur', 'hotel', 'guide', 'dining', 'interpreter'];
const BUDGETS = ['b1', 'b2', 'b3', 'b4', 'unsure'];
const CONTACTS = ['email', 'whatsapp', 'phone'];

app.post('/api/journey-enquiries', async (req, res) => {
  const b = req.body || {};
  // 봇 차단용 숨김 필드: 사람은 비워 둔다
  if (b.company) return res.status(200).json({ success: true });

  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const enquiry = {
    lang: b.lang === 'en' ? 'en' : 'ko',
    name: str(b.name, 100),
    email: str(b.email, 200),
    phone: str(b.phone, 40),
    country: str(b.country, 60),
    arrival: str(b.arrival, 10),
    departure: str(b.departure, 10),
    flexible: Boolean(b.flexible),
    adults: Math.min(50, Math.max(1, parseInt(b.adults, 10) || 1)),
    children: Math.min(50, Math.max(0, parseInt(b.children, 10) || 0)),
    styles: pickList(b.styles, STYLES),
    places: pickList(b.places, PLACES),
    needs: pickList(b.needs, NEEDS),
    budget: BUDGETS.includes(b.budget) ? b.budget : 'unsure',
    contact: CONTACTS.includes(b.contact) ? b.contact : 'email',
    message: str(b.message, 3000),
    consent: b.consent === true,
  };

  if (!enquiry.name || !EMAIL_RE.test(enquiry.email)) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }
  if (!enquiry.consent) return res.status(400).json({ error: 'Consent is required' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (tooManyEnquiries(ip)) return res.status(429).json({ error: 'Too many requests' });

  const id = `PJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const createdAt = new Date().toISOString();

  // Firestore 기록은 실패해도 메일 전송은 진행한다
  try {
    await db.collection('journeyEnquiries').doc(id).set({ ...enquiry, id, createdAt, status: 'new' });
  } catch (error) {
    console.error('Enquiry save failed:', error.message);
  }

  const text = `New Private Journeys enquiry — ${id}

[Guest]
- Name: ${enquiry.name}
- Email: ${enquiry.email}
- Phone / WhatsApp: ${enquiry.phone || '-'}
- Country: ${enquiry.country || '-'}
- Preferred contact: ${enquiry.contact}
- Page language: ${enquiry.lang}

[Trip]
- Dates: ${enquiry.arrival || '?'} → ${enquiry.departure || '?'}${enquiry.flexible ? ' (flexible)' : ''}
- Travellers: ${enquiry.adults} adults, ${enquiry.children} children
- Interests: ${enquiry.styles.join(', ') || '-'}
- Destinations: ${enquiry.places.join(', ') || '-'}
- Services needed: ${enquiry.needs.join(', ') || '-'}
- Budget per person (excl. flights): ${enquiry.budget}

[Message]
${enquiry.message || '-'}

Received ${createdAt} · consent to personal data collection: yes
Reply to this email to answer the guest directly.`;

  try {
    const { primary } = await adminRecipients();
    const { user, transporter } = getTransporter();
    await transporter.sendMail({
      from: `"BTG Private Journeys" <${user}>`,
      to: primary,
      replyTo: enquiry.email,
      subject: `[Private Journeys] ${enquiry.name} · ${enquiry.adults + enquiry.children} pax · ${enquiry.arrival || 'dates TBC'}`,
      text,
    });
    res.status(200).json({ success: true, id });
  } catch (error) {
    console.error('Enquiry email failed:', error);
    res.status(500).json({ error: 'Failed to send enquiry' });
  }
});

// --- Nicepay Integration ---
// 테스트 시 NICEPAY_API_BASE=https://sandbox-api.nicepay.co.kr
const NICEPAY_API_BASE = process.env.NICEPAY_API_BASE || 'https://api.nicepay.co.kr';
// 금액은 서버가 확정한 예약 금액(KRW)만 사용한다.
// 카드 수수료는 고객에게 부과하지 않는다(여신전문금융업법 제19조).
app.post('/api/nicepay-return', async (req, res) => {
  const { authResultCode, authResultMsg, tid, txTid, authToken, orderId, amount, signature, clientId } = req.body;
  const transactionId = tid || txTid; // Nicepay V2 uses 'tid'
  const secretKey = process.env.NICEPAY_SECRET_KEY;
  const nicepayClientId = process.env.NICEPAY_CLIENT_ID || process.env.VITE_NICEPAY_CLIENT_KEY;
  const fail = (message) => res.redirect(`/fail?orderId=${encodeURIComponent(orderId || '')}&message=${encodeURIComponent(message)}`);

  if (!secretKey || !nicepayClientId) return fail('Nicepay keys are missing');

  // authResultCode '0000' means authentication succeeded
  if (authResultCode !== '0000') return fail(authResultMsg || 'Authentication failed');

  // 인증 응답 위변조 검증: sha256(authToken + clientId + amount + secretKey)
  const expectedSignature = crypto.createHash('sha256')
    .update(`${authToken}${nicepayClientId}${amount}${secretKey}`).digest('hex');
  if (clientId !== nicepayClientId || signature !== expectedSignature) {
    console.error('Nicepay signature mismatch', { orderId });
    return fail('Payment verification failed');
  }

  try {
    const r = await loadReservation(orderId);
    if (r.error) return fail('Reservation not found');
    if (r.data.status === STATUS_PAID) {
      return res.redirect(`/success?gateway=nicepay&orderId=${encodeURIComponent(orderId)}`);
    }
    const expectedAmount = r.data.amount;
    if (r.data.paymentMethod !== 'nicepay' || parseInt(amount, 10) !== expectedAmount) {
      console.error('Nicepay amount mismatch', { orderId, amount, expectedAmount });
      return fail('Payment amount mismatch');
    }

    const encryptedSecretKey = Buffer.from(`${nicepayClientId}:${secretKey}`).toString('base64');
    const response = await fetch(`${NICEPAY_API_BASE}/v1/payments/${encodeURIComponent(transactionId)}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: expectedAmount }),
    });
    const data = await response.json();

    // resultCode '0000' means capture succeeded
    if (!response.ok || data.resultCode !== '0000') {
      console.error("Nicepay Capture Failed:", data);
      return fail(data.resultMsg || 'Capture failed');
    }
    if (Number(data.amount) !== expectedAmount || data.orderId !== orderId) {
      console.error('Nicepay approval mismatch', { orderId, data });
      await r.ref.update({ status: STATUS_REVIEW, updatedAt: new Date().toISOString() });
      return fail('Payment verification failed. Please contact support.');
    }

    await markPaid(r.ref, {
      gateway: 'nicepay',
      transactionId: data.tid || transactionId,
      amount: expectedAmount,
      currency: 'KRW',
    });
    res.redirect(`/success?gateway=nicepay&orderId=${encodeURIComponent(orderId)}`);
  } catch (error) {
    console.error('Nicepay Capture Error:', error);
    fail('Payment capture process failed');
  }
});

// --- PayPal Integration ---
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"; // Use sandbox by default

async function generatePaypalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("Missing PayPal Client ID or Secret in .env");
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal Auth Error: ${data.error_description || response.statusText}`);
  }
  return data.access_token;
}

// PayPal 주문 생성 — 금액은 서버가 확정한 예약 금액(USD)만 사용
app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, token } = req.body;
    const r = await loadReservation(orderId, String(token || ''));
    if (r.error) return res.status(r.code).json({ error: r.error });
    if (r.data.status === STATUS_PAID) return res.status(409).json({ error: 'Already paid' });
    if (r.data.paymentMethod !== 'paypal' || r.data.currency !== 'USD') {
      return res.status(400).json({ error: 'Reservation is not set up for PayPal' });
    }

    const accessToken = await generatePaypalAccessToken();
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          custom_id: orderId,
          description: (r.data.orderName || `VIP ${r.data.serviceType || 'service'} in ${r.data.airport || 'ICN'}`).slice(0, 127),
          amount: {
            currency_code: "USD",
            value: r.data.amount.toFixed(2),
          },
        },
      ],
    };
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (response.ok && data.id) {
      await r.ref.update({ paypalOrderId: data.id, updatedAt: new Date().toISOString() });
    }
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

app.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const { orderId, token } = req.body;
    const r = await loadReservation(orderId, String(token || ''));
    if (r.error) return res.status(r.code).json({ error: r.error });
    if (r.data.paypalOrderId !== orderID) return res.status(400).json({ error: 'PayPal order mismatch' });

    const accessToken = await generatePaypalAccessToken();
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();

    const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
    if (response.ok && capture?.status === 'COMPLETED') {
      const paidValue = capture.amount?.value;
      if (capture.amount?.currency_code === 'USD' && paidValue === r.data.amount.toFixed(2)) {
        await markPaid(r.ref, {
          gateway: 'paypal',
          transactionId: capture.id,
          paypalOrderId: orderID,
          amount: r.data.amount,
          currency: 'USD',
        });
      } else {
        console.error('PayPal amount mismatch', { orderId, paidValue, expected: r.data.amount });
        await r.ref.update({ status: STATUS_REVIEW, updatedAt: new Date().toISOString() });
      }
    }
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Failed to capture order:", error);
    res.status(500).json({ error: error.message || "Failed to capture order" });
  }
});

// --- Chatbot ---
// Gemini API 키는 서버 환경변수(GEMINI_API_KEY)에만 둔다. 브라우저/Firestore에 노출하지 않는다.
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Chatbot is not configured' });

  const history = Array.isArray(req.body.messages) ? req.body.messages.slice(-20) : [];
  const contents = history
    .filter(m => m && typeof m.text === 'string' && m.text.trim())
    .map(m => ({ role: m.isBot ? 'model' : 'user', parts: [{ text: m.text.slice(0, 1000) }] }));
  if (!contents.length || contents[contents.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  try {
    const settings = await loadSettings();
    const chatbotConfig = settings.chatbot || {};
    const systemInstruction = `
Your name is 'Q'. Always refer to yourself as 'Q' when interacting with users.
${chatbotConfig.systemPrompt || 'You are a VIP concierge for Beyond The Gate, a premium airport meet & assist and chauffeur service in Korea. Be polite and helpful.'}
IMPORTANT: Always reply in the exact language the user uses (e.g., if the user asks in English, reply in English; if Korean, reply in Korean).

IMPORTANT GUIDANCE:
1. ALWAYS keep your responses very concise and short (1-2 sentences max). Avoid long paragraphs.
2. If the user asks about booking, making a reservation, or pricing, naturally guide them to use our reservation page by providing this link formatted exactly as markdown: "[Book](/)" (or "[예약하기](/)" if in Korean).
3. ALWAYS try to answer the user's questions using the Knowledge Base.

Here is the company Knowledge Base to use for answering questions:
${chatbotConfig.knowledgeBase || ''}
    `.trim();

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents,
      config: { systemInstruction, maxOutputTokens: 400 },
    });
    res.status(200).json({ reply: response.text || '' });
  } catch (error) {
    console.error('Chatbot failed:', error);
    res.status(500).json({ error: 'Chatbot request failed' });
  }
});

// --- Blog images ---
// Imagen 은 종료되어 Gemini 이미지 모델(Nano Banana)을 쓴다. 생성한 이미지는 Firebase Storage 에
// 파일로 저장하고 글에는 주소만 기록한다 (Firestore 문서 1MB 한도).
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite';
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'cura-1969a.firebasestorage.app';

// 글 내용에 맞는 장면 설명 두 개(커버·본문)와 대체 텍스트를 만든다
async function planBlogImages(ai, title, content) {
  const prompt = `You are the photo editor for "Beyond the Gate", a premium airport VIP meet & assist and chauffeur service at Incheon (ICN) and Gimpo (GMP) airports in Korea.
Read the blog post below and write two different photo briefs that illustrate it.

Rules for every brief:
- Photorealistic editorial travel photography, natural light, premium and calm mood, 16:9 composition.
- Settings: Korean airport terminals, arrival or departure halls, curbside pick-up, a black Genesis G90 sedan, Hyundai Staria or Mercedes Sprinter van, hotel entrances in Seoul, or Korean travel scenes when the post is about travel.
- Staff wear dark navy uniforms. Guests are business travellers or families.
- No text, letters, signage words, logos, watermarks, license plates or brand names visible. No celebrities or identifiable real people.

Return JSON only, no markdown:
{"cover": {"prompt": "...", "alt_ko": "...", "alt_en": "..."}, "inline": {"prompt": "...", "alt_ko": "...", "alt_en": "..."}}

Title: ${title}
Post:
${content.slice(0, 2500)}`;

  const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: prompt });
  const raw = (response.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const plan = JSON.parse(raw);
  if (!plan?.cover?.prompt || !plan?.inline?.prompt) throw new Error('Image plan is incomplete');
  return plan;
}

// 이미지 모델 호출 → base64 JPEG/PNG
async function generateImageBytes(ai, prompt) {
  const fullPrompt = `${prompt}\nAvoid any visible text, logos or license plates.`;
  if (ai.interactions?.create) {
    const interaction = await ai.interactions.create({
      model: IMAGE_MODEL,
      input: fullPrompt,
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '16:9', image_size: '1K' },
    });
    const image = interaction.output_image || interaction.outputImage
      || (interaction.outputs || []).find(o => o?.data && /image/.test(o.mime_type || o.mimeType || 'image'));
    if (image?.data) return { data: image.data, mimeType: image.mime_type || image.mimeType || 'image/jpeg' };
  }
  // 구 방식(generateContent) 대체 경로
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: fullPrompt,
    config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
  });
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) throw new Error('No image returned');
  return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
}

// Storage 에 저장하고 다운로드 토큰 주소를 돌려준다
async function saveBlogImage(postId, slot, image) {
  const ext = image.mimeType.includes('png') ? 'png' : 'jpg';
  const path = `blog/${postId}/${slot}.${ext}`;
  const token = crypto.randomUUID();
  await getStorage().bucket(STORAGE_BUCKET).file(path).save(Buffer.from(image.data, 'base64'), {
    resumable: false,
    contentType: image.mimeType,
    metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

// 글 하나에 커버·본문 이미지를 만들어 붙인다. 실패해도 예외를 던지지 않는다.
async function attachBlogImages(ai, postId, title, content) {
  try {
    const plan = await planBlogImages(ai, title, content);
    const [cover, inline] = await Promise.allSettled([
      generateImageBytes(ai, plan.cover.prompt).then(img => saveBlogImage(postId, 'cover', img)),
      generateImageBytes(ai, plan.inline.prompt).then(img => saveBlogImage(postId, 'inline', img)),
    ]);
    const update = {};
    if (cover.status === 'fulfilled') {
      Object.assign(update, { mainImageUrl: cover.value, mainImageAlt: plan.cover.alt_ko || '', mainImageAltEn: plan.cover.alt_en || '' });
    } else {
      console.error('Cover image failed:', cover.reason?.message || cover.reason);
    }
    if (inline.status === 'fulfilled') {
      Object.assign(update, { subImageUrl: inline.value, subImageAlt: plan.inline.alt_ko || '', subImageAltEn: plan.inline.alt_en || '' });
    } else {
      console.error('Inline image failed:', inline.reason?.message || inline.reason);
    }
    if (Object.keys(update).length) {
      await db.collection('blog_posts').doc(postId).update({ ...update, imageModel: IMAGE_MODEL });
    }
    return update;
  } catch (error) {
    console.error('Blog image generation failed:', error.message || error);
    return {};
  }
}

// 기존 글에 이미지 채우기 (한 번에 몇 개씩). CRON_SECRET 필요.
//   curl -X POST "https://beyondthegate.kr/api/blog/backfill-images?limit=3" -H "Authorization: Bearer <CRON_SECRET>"
app.post('/api/blog/backfill-images', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const max = Math.min(5, Math.max(1, parseInt(req.query.limit, 10) || 3));
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const snap = await db.collection('blog_posts').orderBy('createdAt', 'desc').get();
    const targets = snap.docs.filter(d => !d.data().mainImageUrl).slice(0, max);
    const results = [];
    for (const d of targets) {
      const data = d.data();
      const update = await attachBlogImages(ai, d.id, data.title || '', data.content || '');
      results.push({ id: d.id, cover: Boolean(update.mainImageUrl), inline: Boolean(update.subImageUrl) });
    }
    const remaining = snap.docs.filter(d => !d.data().mainImageUrl).length - results.filter(r => r.cover).length;
    res.status(200).json({ processed: results, remaining });
  } catch (error) {
    console.error('Backfill failed:', error);
    res.status(500).json({ error: 'Backfill failed' });
  }
});

// --- Threads Integration ---
async function postToThreads(text) {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  const threadsUserId = process.env.THREADS_USER_ID;

  if (!accessToken || !threadsUserId) {
    console.warn("Threads credentials not found. Skipping Threads post.");
    return null;
  }

  try {
    // 1. 미디어 컨테이너 생성 (TEXT 타입)
    const createContainerUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    const createParams = new URLSearchParams({
      media_type: 'TEXT',
      text: text,
      access_token: accessToken
    });

    const createResp = await fetch(`${createContainerUrl}?${createParams.toString()}`, { method: 'POST' });
    const createData = await createResp.json();

    if (!createResp.ok) {
      throw new Error(`Threads Container Error: ${JSON.stringify(createData)}`);
    }

    const creationId = createData.id;

    // 2. 미디어 컨테이너 발행
    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });

    const publishResp = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    const publishData = await publishResp.json();

    if (!publishResp.ok) {
      throw new Error(`Threads Publish Error: ${JSON.stringify(publishData)}`);
    }

    console.log("Successfully posted to Threads:", publishData.id);
    return publishData.id;
  } catch (error) {
    console.error("Threads post failed:", error);
    return null;
  }
}

// 블로그 포스팅 자동 발행 (Vercel Cron)
app.get('/api/cron', async (req, res) => {
  // Vercel Cron은 CRON_SECRET 환경변수가 있으면 Authorization 헤더에 담아 호출한다.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // beyondthegate.kr SEO/GEO 최적화를 위한 공항 의전 서비스 주제의 블로그 글 생성
    const prompt = `당신은 프리미엄 공항 의전 및 블랙카 서비스 전문가입니다.
목적: 'beyondthegate.kr' 웹사이트가 '인천공항 의전 서비스', 'VIP 공항 픽업', '인천공항 콜밴', '프리미엄 리무진', '김포/제주 등 국내 공항 의전', '중국 공항 픽업 및 글로벌 의전', '외국인 바이어 의전' 등의 키워드 검색 결과(SEO/GEO)에서 최상단에 노출되도록 하는 것입니다.
위 목적을 달성하기 위해, 독자에게 유용하고 흥미로우며 전문적인 정보가 담긴 블로그 포스팅을 1개 작성해주세요.

다음 조건들을 반드시 지켜주세요:
1. 제목은 첫 줄에 '#'을 사용하여 가장 매력적이고 검색에 유리한 문구로 작성하세요.
2. 현재 메인 서비스인 '인천공항'을 중심으로 강조하되, 김포/제주 등 다른 국내 공항과 향후 확장될 '중국 주요 공항'에서의 VIP 의전 서비스에 대한 기대감이나 정보도 자연스럽게 언급하세요.
3. 'Beyond The Gate' 브랜드 이름과 공식 사이트 주소(beyondthegate.kr)를 포함하여 신뢰감 있게 언급하세요.
4. 타겟 독자는 중요한 비즈니스 출장자, VIP, 안전하고 편안한 이동을 원하는 가족 단위 여행객입니다.
5. 본문은 Markdown 형식(소제목, 글머리 기호, 굵은 글씨 등 활용)으로 가독성 좋게 작성하세요.
6. 단순히 홍보만 하는 것이 아니라 실제 공항 이용 팁, 국가별/공항별 의전 서비스의 필요성 등 가치 있는 정보를 포함하세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    const content = response.text;

    // 제목 추출 (첫 번째 # 또는 ## 라인을 제목으로 사용)
    const titleMatch = content.match(/^#+\s+(.*)$/m);
    const title = titleMatch ? titleMatch[1] : `프리미엄 공항 의전 서비스 가이드 - ${new Date().toLocaleDateString()}`;

    // 영어 번역 추가
    let titleEn = '';
    let contentEn = '';
    try {
      const enPrompt = `Translate the following blog post into professional English. Keep the markdown formatting exactly as it is.\n\nTitle: ${title}\n\nContent:\n${content}`;
      const enResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: enPrompt,
      });
      const enContentFull = enResponse.text;
      const enTitleMatch = enContentFull.match(/^#+\s+(.*)$/m) || enContentFull.match(/Title:\s*(.*)/i);
      titleEn = enTitleMatch ? enTitleMatch[1].trim() : `Premium Airport VIP Service Guide - ${new Date().toLocaleDateString()}`;
      contentEn = enContentFull.replace(/^#+\s+(.*)$/m, '').replace(/Title:\s*(.*)/i, '').trim();
    } catch (translateError) {
      console.error('Translation failed:', translateError);
    }

    // Firestore에 저장 (이미지는 아래에서 만들어 붙인다)
    const docRef = await db.collection("blog_posts").add({
      title,
      content,
      titleEn,
      contentEn,
      createdAt: FieldValue.serverTimestamp(),
      author: "Gemini AI",
      published: true
    });

    // 글 내용에 맞는 커버·본문 이미지 생성 → Storage 저장 → 글에 주소 기록 (실패해도 발행은 유지)
    const images = await attachBlogImages(ai, docRef.id, title, content);

    // --- Threads 자동 포스팅 ---
    try {
      const threadsPrompt = `다음은 방금 작성된 블로그 포스팅 내용입니다. 이 내용을 바탕으로 Threads(스레드)에 올릴 짧고 매력적인 홍보글을 작성해주세요.
필수 조건:
1. 300자 이내로 핵심만 간결하게 작성
2. 관련된 해시태그 3~5개 포함
3. 마지막에 '자세한 내용은 beyondthegate.kr 에서 확인하세요!' 라는 문구 추가

블로그 제목: ${title}
블로그 내용 일부:
${content.substring(0, 500)}...`;

      const threadsResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: threadsPrompt,
      });

      const threadsText = threadsResponse.text;
      await postToThreads(threadsText);
    } catch (threadsError) {
      console.error('Threads generation or posting failed:', threadsError);
    }

    res.status(200).json({ success: true, message: 'Blog post published and sent to Threads', postId: docRef.id, images: { cover: Boolean(images.mainImageUrl), inline: Boolean(images.subImageUrl) } });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ error: 'Failed to generate and publish blog post', details: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Payment server running on http://localhost:${port}`);
  });
}

export default app;
