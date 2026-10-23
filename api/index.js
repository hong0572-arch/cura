import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleGenAI } from "@google/genai";
import { computeQuote, computeVehicleQuote, computeJourneyQuote, haversineKm, VEHICLE_ROAD_FACTOR, VEHICLE_TYPES } from '../src/utils/pricing.js';
import { generateProposalHtml } from '../src/utils/emailTemplate.js';
import { FEATURES } from '../src/config/features.js';

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

// NICEPAY buyerTel 은 숫자만 받는다. 한국 번호는 국내 형식(010…)으로 바꾼다
function nicepayTel(phone) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+82') || (digits.startsWith('82') && digits.length >= 11)) {
    const rest = digits.slice(2);
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  return digits.slice(0, 20);
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
    customerMobilePhone: data.paymentMethod === 'nicepay' ? nicepayTel(data.phone) : (data.phone || ''),
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
    await mailBeforeResponse(async () => sendAdminMail(`New Reservation Request - ${req.params.id}`, text, (await adminRecipients()).primary), 'Admin notification');

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
app.post('/api/reservations/:id/payment-error', async (req, res) => {
  try {
    const r = await loadReservation(req.params.id, String(req.body.token || ''));
    if (r.error) return res.status(r.code).json({ error: r.error });
    if (r.data.status === STATUS_PAID) return res.status(200).json({ ok: true });
    await recordPaymentError(r.ref, req.params.id, {
      gateway: req.body.gateway === 'paypal' ? 'paypal' : 'nicepay',
      stage: 'payment window',
      message: String(req.body.message || '').slice(0, 300),
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Payment error record failed:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

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
    paymentError: FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  });
  // 메일은 실패해도 결제 처리에는 영향을 주지 않는다 (단, 응답 전에 보낸다)
  await mailBeforeResponse(async () => sendPaidMails(ref.id, (await ref.get()).data() || {}, payment), 'Paid mail');
}

// 서버리스(Vercel)는 응답을 보낸 뒤의 작업이 중단될 수 있다 → 메일은 응답 전에 보내고, 최대 8초만 기다린다
async function mailBeforeResponse(task, label) {
  try {
    await Promise.race([task(), new Promise((_, reject) => setTimeout(() => reject(new Error('mail timeout')), 8000))]);
  } catch (err) {
    console.error(`${label} failed:`, err.message);
  }
}

const fmtPaid = (amount, currency) => (currency === 'USD' ? `USD ${Number(amount).toFixed(2)}` : `₩${Number(amount).toLocaleString('ko-KR')}`);

async function sendPaidMails(id, d, payment) {
  const { user, transporter } = getTransporter();
  const { primary } = await adminRecipients();
  const amount = fmtPaid(payment.amount, payment.currency);
  const gateway = payment.gateway === 'paypal' ? 'PayPal' : 'NICEPAY';
  const name = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || '-';
  const mails = [transporter.sendMail({
    from: `"BTG System" <${user}>`,
    to: primary,
    subject: `[Admin] 결제 완료 (${gateway}) - ${id} · ${amount}`,
    text: `결제가 완료되었습니다.

- 예약번호: ${id}
- 결제수단: ${gateway} · 거래번호 ${payment.transactionId || '-'}
- 결제금액: ${amount}
- 고객: ${name} · ${d.email || '-'} · ${d.phone || '-'}
- 서비스: ${String(d.serviceType || '').toUpperCase()} · ${d.airport || ''} · ${d.date || ''} ${d.flightTime || ''}
- 항공편: ${d.airline || ''} ${d.flightNumber || ''}
- 차량: ${d.vehicleType || 'none'}${d.transferAddress ? ` → ${d.transferAddress}` : ''}`,
  })];
  if (d.email) {
    mails.push(transporter.sendMail({
      from: `"Beyond the Gate" <${user}>`,
      to: d.email,
      replyTo: primary,
      subject: `[Beyond the Gate] 결제 완료 · Payment confirmed (${id})`,
      text: `${name}님, 결제가 완료되어 예약이 확정되었습니다.
Dear ${name}, your payment is confirmed and your booking is secured.

예약번호 / Reference: ${id}
결제금액 / Amount: ${amount} (${gateway})
일정 / Date: ${d.date || ''} ${d.flightTime || ''} · ${d.airport || ''}

담당자가 서비스 하루 전 연락드립니다. / Your agent will contact you the day before.
문의 / Questions: WhatsApp +82 10-2853-3998 · cura@beyondthegate.kr`,
    }));
  }
  // 관리자·고객 메일을 동시에 보낸다
  await Promise.all(mails);
}

// 결제 실패·오류 기록 — 관리자 화면에서 원인을 보고, 관리자에게 알린다
async function recordPaymentError(ref, id, info) {
  const at = new Date().toISOString();
  await ref.update({ paymentError: { ...info, at }, updatedAt: at }).catch(() => {});
  try {
    const { primary } = await adminRecipients();
    const snap = await ref.get();
    const d = snap.data() || {};
    await sendAdminMail(`결제 실패 (${info.gateway}) - ${id}`, `고객이 결제를 시도했지만 완료되지 않았습니다.

- 예약번호: ${id}
- 단계: ${info.stage}
- 사유: ${info.message || '-'}
- 고객: ${`${d.firstName || ''} ${d.lastName || ''}`.trim() || '-'} · ${d.email || '-'} · ${d.phone || '-'}
- 금액: ${d.amount ? fmtPaid(d.amount, d.currency) : '-'}

고객에게 연락해 결제를 도와주세요.`, primary);
  } catch (err) {
    console.error('Payment error mail failed:', err.message);
  }
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
    await mailBeforeResponse(async () => sendAdminMail(`New Vehicle Reservation - ${id}`, text, (await adminRecipients()).primary), 'Admin notification');

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

// --- Private Journeys planner ---
// 고객이 날짜별로 가고 싶은 곳을 고르면(AI 추천 + 구글 지도) 차량·가이드 예상 견적과 함께 요청을 받는다.
// 숙소·식당 예약은 하지 않는다. 확정 금액은 관리자가 배정 확인 후 회신한다.

const suggestHits = new Map();
const SUGGEST_LIMIT = 30; // IP당 시간당 AI 추천 횟수
function tooManySuggests(ip) {
  const now = Date.now();
  const recent = (suggestHits.get(ip) || []).filter(t => now - t < 3_600_000);
  recent.push(now);
  suggestHits.set(ip, recent);
  if (suggestHits.size > 5000) suggestHits.clear();
  return recent.length > SUGGEST_LIMIT;
}
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

// AI 장소 추천: 개인정보 없이 관심사·지역·이미 고른 장소만 보낸다
app.post('/api/journeys/suggest', async (req, res) => {
  if (!FEATURES.privateJourneys) return res.status(503).json({ error: 'Private Journeys is not available yet' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI is not configured' });
  if (tooManySuggests(clientIp(req))) return res.status(429).json({ error: 'Too many requests' });

  const str = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
  const lang = req.body.lang === 'ko' ? 'ko' : 'en';
  const interests = str(req.body.interests, 300);
  const area = str(req.body.area, 80);
  const date = str(req.body.date, 10);
  const party = str(req.body.party, 60);
  const already = (Array.isArray(req.body.already) ? req.body.already : []).slice(0, 15).map(v => str(v, 80)).filter(Boolean);
  if (!interests && !area) return res.status(400).json({ error: 'Tell us what you would like to do' });

  const prompt = `You help international travellers plan a private chauffeured day trip anywhere in South Korea.
Suggest up to 6 real, currently operating places that match the request. Prefer well-known, verifiable places that a private car can reach.
Rules:
- Places to visit: sights, neighbourhoods, markets, museums, nature, experiences, food streets. Do NOT suggest hotels.
- We do NOT book restaurants or hotels; if you suggest a food place, it must be a market or food street that needs no reservation.
- Group nearby places so the day makes sense by car.${area ? `\n- Focus area: ${area}.` : ''}${date ? `\n- Travel date: ${date} (consider season and that many palaces/museums close one weekday).` : ''}${party ? `\n- Party: ${party}.` : ''}${already.length ? `\n- Already chosen (do not repeat): ${already.join('; ')}.` : ''}
- Write "why" and "tip" in ${lang === 'ko' ? 'Korean' : 'English'}; keep "name" as the official English name and "name_ko" in Korean.
Return JSON only, no markdown:
{"places":[{"name":"","name_ko":"","search":"query for Google Maps, include city","region":"city or province in English","why":"one sentence","hours":1.5,"tip":"short practical tip"}]}

Request: ${interests || 'Highlights'}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        // 응답 형식을 고정한다 (모델이 다른 키·구조로 답하는 것을 막음)
        responseSchema: {
          type: 'OBJECT',
          properties: {
            places: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' }, name_ko: { type: 'STRING' }, search: { type: 'STRING' }, region: { type: 'STRING' },
                  why: { type: 'STRING' }, hours: { type: 'NUMBER' }, tip: { type: 'STRING' },
                },
                required: ['name', 'search', 'why'],
              },
            },
          },
          required: ['places'],
        },
        maxOutputTokens: 2000,
        temperature: 0.6,
      },
    });
    const raw = (response.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(raw);
    // 모델이 배열만 돌려주거나 다른 키를 쓰는 경우도 받아 준다
    const list = Array.isArray(parsed) ? parsed
      : Array.isArray(parsed?.places) ? parsed.places
      : Object.values(parsed || {}).find(Array.isArray) || [];
    if (!list.length) console.warn('Journey suggest: empty list', raw.slice(0, 300));
    const places = list.slice(0, 6).map(p => ({
      name: str(p.name || p.name_en || p.title, 100),
      nameKo: str(p.name_ko || p.nameKo, 100),
      search: str(p.search || p.name, 140),
      region: str(p.region, 60),
      why: str(p.why, 220),
      tip: str(p.tip, 160),
      hours: Math.min(8, Math.max(0.5, Number(p.hours) || 1.5)),
    })).filter(p => p.name);
    res.status(200).json({ places });
  } catch (error) {
    console.error('Journey suggest failed:', error);
    res.status(500).json({ error: 'Suggestion failed' });
  }
});

function sanitizePlace(p = {}) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const lat = Number(p.lat), lng = Number(p.lng);
  return {
    name: str(p.name, 120),
    address: str(p.address, 300),
    placeId: str(p.placeId, 200),
    ...(Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : {}),
  };
}

function sanitizeJourneyPlan(b = {}) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
  const time = (v) => (/^\d{2}:\d{2}$/.test(String(v || '')) ? String(v) : '');
  const flight = (f = {}) => ({ date: date(f.date), time: time(f.time), flight: str(f.flight, 20).toUpperCase() });
  const days = (Array.isArray(b.days) ? b.days : []).slice(0, 30).map(d => ({
    date: date(d.date),
    mode: ['free', 'half', 'full'].includes(d.mode) ? d.mode : 'free',
    ...(d.hotel && d.hotel.name ? { hotel: sanitizePlace(d.hotel) } : {}),
    note: str(d.note, 500),
    stops: (Array.isArray(d.stops) ? d.stops : []).slice(0, 12).map(s => ({ ...sanitizePlace(s), guide: Boolean(s.guide) })).filter(s => s.name),
  }));
  return {
    airport: ['ICN', 'GMP'].includes(b.airport) ? b.airport : 'ICN',
    arrival: flight(b.arrival),
    departure: flight(b.departure),
    adults: Math.min(30, Math.max(1, parseInt(b.adults, 10) || 1)),
    children: Math.min(30, Math.max(0, parseInt(b.children, 10) || 0)),
    bags: Math.min(60, Math.max(0, parseInt(b.bags, 10) || 0)),
    vehicleId: str(b.vehicleId, 120),
    vehicleName: str(b.vehicleName, 120),
    hotel: b.hotel ? sanitizePlace(b.hotel) : null,
    guideLanguage: ['en', 'ja', 'zh', 'es', 'fr', 'de', 'other'].includes(b.guideLanguage) ? b.guideLanguage : 'en',
    days,
  };
}

const money = (n) => (n === null || n === undefined ? 'to be quoted' : `USD ${Number(n).toFixed(2)}`);

app.post('/api/journey-requests', async (req, res) => {
  if (!FEATURES.privateJourneys) return res.status(503).json({ error: 'Private Journeys is not available yet' });
  const b = req.body || {};
  if (b.company) return res.status(200).json({ success: true, id: 'PJ-OK' }); // 숨김 필드 → 봇
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const contact = {
    lang: b.lang === 'ko' ? 'ko' : 'en',
    name: str(b.name, 100),
    email: str(b.email, 200),
    phone: str(b.phone, 40),
    country: str(b.country, 60),
    message: str(b.message, 3000),
    consent: b.consent === true,
  };
  if (!contact.name || !EMAIL_RE.test(contact.email)) return res.status(400).json({ error: 'Name and a valid email are required' });
  if (!contact.consent) return res.status(400).json({ error: 'Consent is required' });
  const plan = sanitizeJourneyPlan(b.plan);
  if (!plan.arrival.date || !plan.departure.date || plan.departure.date < plan.arrival.date) {
    return res.status(400).json({ error: 'Arrival and departure dates are required' });
  }
  if (tooManyEnquiries(clientIp(req))) return res.status(429).json({ error: 'Too many requests' });

  const settings = await loadSettings().catch(() => ({}));
  const quote = computeJourneyQuote(plan, settings);
  const id = `PJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const createdAt = new Date().toISOString();

  try {
    await db.collection('journeyRequests').doc(id).set({
      id, ...contact, plan,
      estimate: { totalUsd: quote.totalUsd, totalKrw: quote.totalKrw, packageUsd: quote.packageUsd, discountUsd: quote.discountUsd, tripUsd: quote.tripUsd, pending: quote.pending },
      createdAt, status: 'new',
    });
  } catch (error) {
    console.error('Journey request save failed:', error.message);
  }

  const dayLines = plan.days.map((d, i) => {
    const q = quote.days[i] || {};
    const stops = d.stops.map(s => `    · ${s.name}${s.guide ? ' [GUIDE]' : ''}${s.address ? ` — ${s.address}` : ''}`).join('\n') || '    · (no stops)';
    return `- ${d.date} · ${d.mode === 'free' ? 'FREE DAY (no car)' : d.mode === 'half' ? 'HALF-DAY CAR' : 'FULL-DAY CAR'}${q.jeju ? ' · JEJU (custom quote)' : ''}${q.longDistance ? ` · LONG DISTANCE ~${q.farKm} km` : ''}${d.hotel ? ` · hotel tonight: ${d.hotel.name}` : ''}
${stops}${d.note ? `\n    note: ${d.note}` : ''}
    car ${money(q.vehicleUsd)} · long-distance ${money(q.longUsd)} · guides ${money(q.guideUsd)} · driver overnight ${money(q.overnightUsd)}`;
  }).join('\n');

  const text = `New Private Journey request — ${id}

[Guest]
- Name: ${contact.name}
- Email: ${contact.email}
- Phone / WhatsApp: ${contact.phone || '-'}
- Country: ${contact.country || '-'}
- Page language: ${contact.lang}

[Trip]
- Airport: ${plan.airport}
- Arrival: ${plan.arrival.date} ${plan.arrival.time || ''} ${plan.arrival.flight || ''}
- Departure: ${plan.departure.date} ${plan.departure.time || ''} ${plan.departure.flight || ''}
- Travellers: ${plan.adults} adults, ${plan.children} children · bags ${plan.bags}
- Vehicle: ${plan.vehicleName || plan.vehicleId || '-'}
- Hotel: ${plan.hotel ? `${plan.hotel.name} — ${plan.hotel.address}` : 'not decided'}
- Guide language: ${plan.guideLanguage}

[Days]
${dayLines || '-'}

[Estimate shown to the guest]
- Package (arrival + departure meet & assist, airport↔hotel car): USD ${quote.packageUsd.toFixed(2)}
- Package discount (${quote.discountPct}%): -USD ${quote.discountUsd.toFixed(2)}
- Cars, guides and distance during the trip: USD ${quote.tripUsd.toFixed(2)}
- Estimated total: USD ${quote.totalUsd.toFixed(2)} (≈ ₩${quote.totalKrw.toLocaleString()})
- Items to quote manually: ${quote.pending.join(', ') || 'none'}

[Message]
${contact.message || '-'}

Received ${createdAt} · consent to personal data collection: yes
Reply to this email to answer the guest directly.`;

  try {
    const { primary } = await adminRecipients();
    const { user, transporter } = getTransporter();
    await transporter.sendMail({
      from: `"BTG Private Journeys" <${user}>`,
      to: primary,
      replyTo: contact.email,
      subject: `[Private Journeys] ${contact.name} · ${plan.arrival.date} → ${plan.departure.date} · est. USD ${quote.totalUsd.toFixed(0)}`,
      text,
    });
    // 고객 접수 확인 메일 (실패해도 접수는 완료)
    const ko = contact.lang === 'ko';
    await transporter.sendMail({
      from: `"Beyond the Gate" <${user}>`,
      to: contact.email,
      replyTo: primary,
      subject: ko ? `[Beyond the Gate] 맞춤 여행 요청이 접수되었습니다 (${id})` : `[Beyond the Gate] We received your Private Journey request (${id})`,
      text: ko
        ? `${contact.name}님, 맞춤 여행 요청을 보내 주셔서 감사합니다.\n\n접수 번호: ${id}\n일정: ${plan.arrival.date} ~ ${plan.departure.date}\n예상 금액: USD ${quote.totalUsd.toFixed(2)} (약 ₩${quote.totalKrw.toLocaleString()})\n\n담당자가 차량·가이드 배정을 확인한 뒤 확정 금액과 결제 안내를 보내드립니다. 숙소·식당 예약은 포함되지 않습니다.\n급한 문의: WhatsApp +82 10-2853-3998 / cura@beyondthegate.kr`
        : `Dear ${contact.name},\n\nThank you for your Private Journey request.\n\nReference: ${id}\nDates: ${plan.arrival.date} – ${plan.departure.date}\nEstimate: USD ${quote.totalUsd.toFixed(2)}\n\nOur team will confirm car and guide availability and send your final price with a secure payment link. Hotel and restaurant bookings are not included.\nUrgent questions: WhatsApp +82 10-2853-3998 / cura@beyondthegate.kr`,
    }).catch(err => console.error('Journey confirmation mail failed:', err.message));
    res.status(200).json({ success: true, id, estimate: { totalUsd: quote.totalUsd, totalKrw: quote.totalKrw } });
  } catch (error) {
    console.error('Journey request email failed:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// --- Korea this month (공공데이터: 한국관광공사 영문 관광정보 TourAPI, 기상청 단기예보) ---
// 키: DATA_GO_KR_KEY (공공데이터포털 "일반 인증키(Decoding)"). 브라우저에는 노출하지 않는다.
// 호출량 보호: Vercel CDN 캐시(s-maxage) + 인스턴스 메모리 캐시. 개발계정 TourAPI 1,000건/일.
const DATA_GO_KR = 'https://apis.data.go.kr';
const memo = new Map();
async function cached(key, ttlMs, fn) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  memo.set(key, { value, at: Date.now() });
  if (memo.size > 200) memo.clear();
  return value;
}

async function dataGoKr(path, params) {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) { const e = new Error('DATA_GO_KR_KEY missing'); e.code = 503; throw e; }
  const qs = new URLSearchParams({ ...params, serviceKey: key });
  const res = await fetch(`${DATA_GO_KR}${path}?${qs}`, { signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    // 키 오류 등은 XML 로 온다
    throw new Error(`data.go.kr ${path}: ${text.slice(0, 160)}`);
  }
  // 공공데이터포털 게이트웨이 오류 형식 (미승인 키·잘못된 서비스 주소·호출 한도 등)
  const gw = json?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (gw) throw new Error(`data.go.kr ${path}: ${gw.returnReasonCode || ''} ${gw.returnAuthMsg || gw.errMsg || ''}`.trim());
  const header = json?.response?.header;
  if (header && header.resultCode !== '0000' && header.resultCode !== '00') throw new Error(`data.go.kr ${path}: ${header.resultCode} ${header.resultMsg}`);
  // 응답 모양이 기관마다 조금씩 다르다: body.items.item / body.items(배열) / items
  const body = json?.response?.body ?? json?.body ?? json;
  const items = body?.items?.item ?? body?.items ?? body?.item ?? [];
  return Array.isArray(items) ? items : items && typeof items === 'object' ? [items] : [];
}

// 오류 원인(결과 코드·메시지)만 돌려준다 — 인증키는 절대 포함하지 않는다
const safeDetail = (e) => String(e?.message || '').replace(/serviceKey=[^&\s]+/gi, 'serviceKey=***').slice(0, 200);

// 날씨 — 기상청 단기예보 (격자 좌표)
const WEATHER_CITIES = [
  { id: 'seoul', name: 'Seoul', nx: 60, ny: 127 },
  { id: 'busan', name: 'Busan', nx: 98, ny: 76 },
  { id: 'jeju', name: 'Jeju', nx: 53, ny: 38 },
];
// 가장 최근 발표 시각 (02·05·08·11·14·17·20·23시, 발표 후 15분 여유)
function kmaBase(now = new Date(), stepsBack = 0) {
  const kst = new Date(now.getTime() + 9 * 3600_000 - 15 * 60_000 - stepsBack * 3 * 3600_000);
  const hours = [23, 20, 17, 14, 11, 8, 5, 2];
  let h = hours.find(x => kst.getUTCHours() >= x);
  if (h === undefined) { kst.setUTCDate(kst.getUTCDate() - 1); h = 23; }
  const d = kst.toISOString().slice(0, 10).replace(/-/g, '');
  return { base_date: d, base_time: `${String(h).padStart(2, '0')}00` };
}
function summarizeForecast(items, now = new Date()) {
  const kstNow = new Date(now.getTime() + 9 * 3600_000);
  const nowKey = `${kstNow.toISOString().slice(0, 10).replace(/-/g, '')}${String(kstNow.getUTCHours()).padStart(2, '0')}00`;
  const byDate = new Map();
  let current = null;
  for (const it of items) {
    const d = it.fcstDate;
    if (!byDate.has(d)) byDate.set(d, { tmp: [], tmn: null, tmx: null, pop: 0, noon: {} });
    const day = byDate.get(d);
    const v = it.fcstValue;
    if (it.category === 'TMP') {
      day.tmp.push(Number(v));
      // 지금 시각 이전의 가장 최근 예보값 (없으면 가장 이른 값)
      const k = `${it.fcstDate}${it.fcstTime}`;
      if (!current || (k <= nowKey && (current.key > nowKey || k > current.key)) || (current.key > nowKey && k < current.key)) current = { key: k, temp: Number(v) };
    }
    if (it.category === 'TMN') day.tmn = Number(v);
    if (it.category === 'TMX') day.tmx = Number(v);
    if (it.category === 'POP') day.pop = Math.max(day.pop, Number(v) || 0);
    if (it.fcstTime === '1200' && (it.category === 'SKY' || it.category === 'PTY')) day.noon[it.category] = Number(v);
  }
  const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 4).map(([date, d]) => ({
    date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    min: d.tmn ?? (d.tmp.length ? Math.min(...d.tmp) : null),
    max: d.tmx ?? (d.tmp.length ? Math.max(...d.tmp) : null),
    sky: d.noon.SKY ?? null,   // 1 맑음, 3 구름많음, 4 흐림
    pty: d.noon.PTY ?? 0,      // 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기
    pop: d.pop,
  }));
  return { now: current?.temp ?? days[0]?.max ?? null, days };
}

app.get('/api/korea/weather', async (req, res) => {
  try {
    // 최신 발표분이 아직 없으면(03 NO_DATA) 이전 발표 시각으로 최대 3번까지 거슬러 간다
    let base = kmaBase();
    const fetchCity = async (c) => {
      for (let back = 0; back < 4; back++) {
        const b = kmaBase(new Date(), back);
        try {
          const items = await dataGoKr('/1360000/VilageFcstInfoService_2.0/getVilageFcst', {
            pageNo: '1', numOfRows: '1000', dataType: 'JSON', ...b, nx: String(c.nx), ny: String(c.ny),
          });
          if (items.length) { base = b; return { id: c.id, name: c.name, ...summarizeForecast(items) }; }
        } catch (e) {
          if (!/NO_DATA|03/.test(e.message) || back === 3) throw e;
        }
      }
      throw new Error('KMA: no forecast data');
    };
    const data = await cached(`wx-${base.base_date}${base.base_time}`, 30 * 60_000, () => Promise.all(WEATHER_CITIES.map(fetchCity)));
    res.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({ cities: data, issued: base, source: 'Korea Meteorological Administration (KMA) via data.go.kr' });
  } catch (error) {
    console.error('Korea weather failed:', error.message);
    res.status(error.code === 503 ? 503 : 502).json({ error: 'Weather unavailable', detail: safeDetail(error) });
  }
});

// 관광 — 한국관광공사 영문 관광정보 서비스 (축제 + 이달의 테마 명소)
// 명소는 달마다 영문 키워드로 찾는다 (TourAPI 에는 계절 정보가 없어 키워드를 코드로 관리)
const MONTH_KEYWORDS = {
  1: ['Ski Resort', 'Palace'], 2: ['Ski Resort', 'Hot Spring'], 3: ['Plum', 'Camellia'], 4: ['Cherry Blossom', 'Park'],
  5: ['Rose', 'Garden'], 6: ['Beach', 'Valley'], 7: ['Beach', 'Island'], 8: ['Beach', 'Valley'],
  9: ['Palace', 'Hanok Village'], 10: ['Seoraksan', 'Naejangsan'], 11: ['Temple', 'Arboretum'], 12: ['Ski Resort', 'Palace'],
};
// 관광지가 아닌 결과(병원·숙소·상점 등) 제외
const NOT_SIGHTS = /clinic|dermatolog|hospital|medical|dental|hotel|motel|hostel|guesthouse|residence|store|shop|mall|outlet|restaurant|cafe/i;
const MAX_FESTIVAL_DAYS = 45; // 1년 내내 하는 공연 등은 '이달의 축제'에서 뺀다
const httpsImg = (u) => (u ? String(u).replace(/^http:\/\//, 'https://') : '');
const tourDate = (s) => (s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '');
// 영문 서비스 제목의 "(한글)" 부분을 뗀다
const cleanTitle = (t) => String(t || '').replace(/\s*\((?=[^()]*[가-힣]).*$/, '').trim();
// 공공누리 1유형만 사진을 쓴다 (출처 표시, 변형 허용). 3유형은 변형 금지라 잘라 쓰지 않도록 제외
const isType1 = (code) => String(code || '').toLowerCase() === 'type1';
const isType3 = (code) => String(code || '').toLowerCase() === 'type3';
const toCard = (it) => {
  const ok = isType1(it.cpyrhtDivCd) || isType3(it.cpyrhtDivCd);
  const image = ok ? httpsImg(it.firstimage || it.firstimage2) : '';
  return {
    id: String(it.contentid || ''),
    title: cleanTitle(it.title),
    address: String(it.addr1 || '').trim(),
    start: tourDate(it.eventstartdate),
    end: tourDate(it.eventenddate),
    image,
    imageFit: image && isType3(it.cpyrhtDivCd) ? 'contain' : 'cover',
    lat: Number(it.mapy) || null,
    lng: Number(it.mapx) || null,
  };
};
const TOUR_COMMON = { MobileOS: 'ETC', MobileApp: 'BeyondTheGate', _type: 'json' };
const days = (a, b) => (a && b ? (Date.parse(b) - Date.parse(a)) / 86400000 : 0);

// 사진 라이선스를 목록에서 확인할 수 없으면 상세 이미지 정보(공공누리 유형 포함)에서 1유형 사진을 찾는다
async function licensedPhoto(contentId) {
  const imgs = await dataGoKr('/B551011/EngService2/detailImage2', { ...TOUR_COMMON, contentId, imageYN: 'Y', numOfRows: '5', pageNo: '1' }).catch(() => []);
  const usable = imgs.filter(i => i.originimgurl || i.smallimageurl);
  const hit = usable.find(i => isType1(i.cpyrhtDivCd)) || usable.find(i => isType3(i.cpyrhtDivCd));
  return hit ? { url: httpsImg(hit.originimgurl || hit.smallimageurl), fit: isType1(hit.cpyrhtDivCd) ? 'cover' : 'contain' } : null;
}

async function festivalsFor(year, month, onlyUpcoming = true) {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${year}-${mm}-01`, to = `${year}-${mm}-${lastDay}`;
  const todayKst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const list = (await dataGoKr('/B551011/EngService2/searchFestival2', {
    ...TOUR_COMMON, numOfRows: '60', pageNo: '1', arrange: 'Q',
    // 이번 달이면 오늘부터(진행 중 행사 포함), 아니면 그 달 1일부터
    eventStartDate: (onlyUpcoming && todayKst > from ? todayKst : from).replace(/-/g, ''),
  })).map(toCard)
    // 그 달에 열리고, 기간이 짧은(진짜 축제·행사) 것만
    .filter(f => f.title && f.start && f.start <= to && (!f.end || f.end >= from) && days(f.start, f.end) <= MAX_FESTIVAL_DAYS)
    // 이번 달이면 이미 끝난 행사는 뺀다 (진행 중이거나 다가올 행사만)
    .filter(f => !onlyUpcoming || (f.end || f.start) >= todayKst)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);
  await Promise.all(list.map(async (f) => { if (!f.image && f.id) { const p = await licensedPhoto(f.id); if (p) { f.image = p.url; f.imageFit = p.fit; } } }));
  return list.sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)));
}

app.get('/api/korea/highlights', async (req, res) => {
  const nowKst = new Date(Date.now() + 9 * 3600_000);
  const month = Math.min(12, Math.max(1, parseInt(req.query.month, 10) || (nowKst.getUTCMonth() + 1)));
  // 고른 달이 이미 지났으면 내년
  const year = month < nowKst.getUTCMonth() + 1 ? nowKst.getUTCFullYear() + 1 : nowKst.getUTCFullYear();
  try {
    const data = await cached(`tour-${year}-${month}`, 6 * 3600_000, async () => {
      let festivals = await festivalsFor(year, month);
      let usual = false;
      // 내년 행사는 아직 등록 전인 경우가 많다 → 올해 같은 달 행사를 "보통 이맘때"로 보여 준다
      if (!festivals.length) {
        festivals = (await festivalsFor(year - 1, month, false)).map(f => ({ ...f, start: '', end: '' }));
        usual = festivals.length > 0;
      }
      const spotLists = await Promise.all(MONTH_KEYWORDS[month].map(keyword => dataGoKr('/B551011/EngService2/searchKeyword2', {
        ...TOUR_COMMON, numOfRows: '20', pageNo: '1', arrange: 'Q', keyword, contentTypeId: '76',
      }).catch(() => [])));
      const seen = new Set();
      const spots = spotLists.flat().map(toCard)
        .filter(s => s.title && !NOT_SIGHTS.test(s.title) && !seen.has(s.id) && seen.add(s.id))
        .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)))
        .slice(0, 4);
      return { festivals, usual, spots };
    });
    res.set('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.json({ month, year, ...data, source: 'Korea Tourism Organization (TourAPI) via data.go.kr' });
  } catch (error) {
    console.error('Korea highlights failed:', error.message);
    res.status(error.code === 503 ? 503 : 502).json({ error: 'Highlights unavailable', detail: safeDetail(error) });
  }
});

// --- 인천공항 시간대별 예상 승객 수 (공공데이터: 인천국제공항공사_승객예고-출·입국장별) ---
// 조회일(D+0)·다음날(D+1) 시간대별 예상 승객 수. 매일 17시 갱신 → 30분 캐시.
// ※ 예상 혼잡도를 대민 서비스로 공개할 때는 안내 문구를 공사 인프라DX팀과 협의해야 한다(이용 조건). 현재 테스트(비공개).
const CONGESTION_PATH = '/B551177/PassengerNoticeKR/getfPassengerNoticeIKR';
// 응답 항목(활용가이드 기준): adate 표출일자, atime 시간대("00_01"),
// t1sum1 입국장 동편(A,B) · t1sum2 입국장 서편(E,F) · t1sum3 입국심사(C) · t1sum4 입국심사(D) · t1sumset1 입국장 합계
// t1sum5 출국장1,2 · t1sum6 출국장3 · t1sum7 출국장4 · t1sum8 출국장5,6 · t1sumset2 출국장 합계
// t2sum1 입국장1 · t2sum2 입국장2 · t2sumset1 입국장 합계 · t2sum3 출국장1 · t2sum4 출국장2 · t2sumset2 출국장 합계
const num = (v) => { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n) : null; };

app.get('/api/incheon/congestion', async (req, res) => {
  const day = req.query.day === '1' ? '1' : '0';
  try {
    const data = await cached(`icn-congestion-${day}`, 30 * 60_000, async () => {
      const items = await dataGoKr(CONGESTION_PATH, { selectdate: day, type: 'json', numOfRows: '50', pageNo: '1' });
      // 비어 있으면 캐시하지 않고 오류로 돌려준다 (활용 승인 전·응답 형식 변경 확인용)
      if (!items.length) {
        // 응답 구조(키 이름·결과 코드)만 확인용으로 돌려준다 — 값·인증키는 포함하지 않는다
        const key = process.env.DATA_GO_KR_KEY;
        const qs = new URLSearchParams({ selectdate: day, type: 'json', numOfRows: '50', pageNo: '1', serviceKey: key });
        const raw = await (await fetch(`${DATA_GO_KR}${CONGESTION_PATH}?${qs}`, { signal: AbortSignal.timeout(8000) })).text();
        let shape = raw.slice(0, 120).replace(/serviceKey=[^&\s"]+/gi, '');
        try {
          const j = JSON.parse(raw);
          const keysOf = (o) => (o && typeof o === 'object' ? Object.keys(o).slice(0, 12).join(',') : typeof o);
          shape = `top:${keysOf(j)} | response:${keysOf(j.response)} | header:${JSON.stringify(j.response?.header || j.header || {}).slice(0, 120)} | body:${keysOf(j.response?.body || j.body)} | items:${keysOf(j.response?.body?.items || j.body?.items)}`;
        } catch { /* XML 등 */ }
        throw new Error(`KIAC passenger notice: empty response (${shape})`);
      }
      const rows = items
        .map(it => {
          const hour = parseInt(String(it.atime || '').slice(0, 2), 10);
          return {
            hour,
            t1: {
              arrival: num(it.t1sumset1), departure: num(it.t1sumset2),
              immigration: (num(it.t1sum3) ?? 0) + (num(it.t1sum4) ?? 0),
              gates: [['1·2', num(it.t1sum5)], ['3', num(it.t1sum6)], ['4', num(it.t1sum7)], ['5·6', num(it.t1sum8)]], // 순서 유지를 위해 배열
            },
            t2: {
              arrival: num(it.t2sumset1), departure: num(it.t2sumset2),
              gates: [['1', num(it.t2sum3)], ['2', num(it.t2sum4)]],
            },
          };
        })
        .filter(r => Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23)
        .sort((a, b) => a.hour - b.hour);
      return {
        date: String(items[0]?.adate || ''),
        hours: rows,
        // 항목 이름이 바뀌었는지 확인용 (값 없이 이름만)
        fields: items[0] ? Object.keys(items[0]).sort() : [],
      };
    });
    res.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({ day: Number(day), ...data, source: 'Incheon International Airport Corporation (passenger forecast) via data.go.kr' });
  } catch (error) {
    console.error('Incheon congestion failed:', error.message);
    res.status(error.code === 503 ? 503 : 502).json({ error: 'Congestion data unavailable', detail: safeDetail(error) });
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

  // 예약이 있으면 실패 사유를 기록한다 (관리자 화면·메일)
  const failWith = async (stage, message) => {
    try {
      const r0 = await loadReservation(orderId);
      if (!r0.error && r0.data.status !== STATUS_PAID) await recordPaymentError(r0.ref, orderId, { gateway: 'nicepay', stage, message });
    } catch { /* 기록 실패는 무시 */ }
    console.error('Nicepay failed', { orderId, stage, message });
    return fail(message);
  };

  if (!secretKey || !nicepayClientId) return failWith('server config', 'Nicepay keys are missing');

  // authResultCode '0000' means authentication succeeded
  if (authResultCode !== '0000') return failWith('card authentication', `${authResultCode || ''} ${authResultMsg || 'Authentication failed'}`.trim());

  // 인증 응답 위변조 검증: sha256(authToken + clientId + amount + secretKey)
  const expectedSignature = crypto.createHash('sha256')
    .update(`${authToken}${nicepayClientId}${amount}${secretKey}`).digest('hex');
  if (clientId !== nicepayClientId || signature !== expectedSignature) {
    return failWith('signature check', clientId !== nicepayClientId ? 'Payment verification failed (client id mismatch)' : 'Payment verification failed (signature mismatch)');
  }

  try {
    const r = await loadReservation(orderId);
    if (r.error) return fail('Reservation not found');
    if (r.data.status === STATUS_PAID) {
      return res.redirect(`/success?gateway=nicepay&orderId=${encodeURIComponent(orderId)}`);
    }
    const expectedAmount = r.data.amount;
    if (r.data.paymentMethod !== 'nicepay' || parseInt(amount, 10) !== expectedAmount) {
      return failWith('amount check', `Payment amount mismatch (${amount} vs ${expectedAmount})`);
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
      return failWith('approval', `${data.resultCode || response.status} ${data.resultMsg || 'Capture failed'}`);
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
    failWith('server error', `Payment capture process failed: ${String(error.message || '').slice(0, 120)}`);
  }
});

// NICEPAY 설정 점검 (관리자 전용, Bearer CRON_SECRET) — 실제 결제 없이 키·승인 주소가 맞는지 확인한다.
// 없는 주문번호로 거래 조회를 보내, 인증 실패(키 오류)인지 '거래 없음'(키 정상)인지만 돌려준다. 키 값은 노출하지 않는다.
app.get('/api/nicepay/health', async (req, res) => {
  const auth = String(req.headers.authorization || '');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  const secretKey = process.env.NICEPAY_SECRET_KEY;
  const clientId = process.env.NICEPAY_CLIENT_ID || process.env.VITE_NICEPAY_CLIENT_KEY;
  const out = {
    apiBase: NICEPAY_API_BASE,
    clientIdMode: clientId ? (clientId.startsWith('R') ? 'live (R…)' : clientId.startsWith('S') ? 'test (S…)' : 'unknown') : 'missing',
    browserKeyMatchesServer: Boolean(clientId) && clientId === process.env.VITE_NICEPAY_CLIENT_KEY,
    secretKeyPresent: Boolean(secretKey),
  };
  try {
    const basic = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
    const r = await fetch(`${NICEPAY_API_BASE}/v1/payments/find/BTG-2026-000000`, { headers: { Authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(8000) });
    const d = await r.json().catch(() => ({}));
    out.lookup = { httpStatus: r.status, resultCode: d.resultCode, resultMsg: d.resultMsg };
  } catch (e) {
    out.lookup = { error: String(e.message).slice(0, 120) };
  }
  res.json(out);
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
