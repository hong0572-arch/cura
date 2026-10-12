import { useEffect, useRef, useState } from 'react';
import { computeQuote } from '../../utils/pricing';
import './boardingPass.css';

// 탑승권 결제 시안 — 개발 전용 미리보기 (/preview/boarding-pass). 실제 예약·결제는 하지 않는다.
// 금액은 실제 위저드와 같은 computeQuote 로 계산한다(설정값만 데모). 실제 적용 시 서버가 금액을 확정한다.
const DEMO_SETTINGS = { exchangeRate: 1340, nightSurchargeUsd: 20 };
const SERVICES = { arrival: 'Arrival', departure: 'Departure', transfer: 'Transfer' };
const AIRPORTS = { ICN: 'Seoul Incheon', GMP: 'Seoul Gimpo' };
const CARS = {
  none: { name: 'No car', note: 'Meet & assist only' },
  staria: { name: 'Hyundai Staria', note: 'Up to 6 guests · 6 bags' },
  g90: { name: 'Genesis G90', note: 'Up to 3 guests · 3 bags' },
  sprinter: { name: 'Mercedes Sprinter', note: 'Up to 11 guests · 11 bags' },
};
const CLASSES = { '': 'Not specified', economy: 'Economy', business: 'Business', first: 'First' };
// 데모용 항공편 조회표 — 실제 적용 시 항공편 일정 API로 대체
const FLIGHTS = {
  KE082: { city: 'New York', from: 'JFK', fromName: 'New York JFK', dur: '14H 35M', home: 'America/New_York' },
  BA017: { city: 'London', from: 'LHR', fromName: 'London Heathrow', dur: '13H 50M', home: 'Europe/London' },
  SQ600: { city: 'Singapore', from: 'SIN', fromName: 'Singapore', dur: '6H 25M', home: 'Asia/Singapore' },
  OZ102: { city: 'Tokyo', from: 'NRT', fromName: 'Tokyo Narita', dur: '2H 30M', home: 'Asia/Tokyo' },
};
const CHANNELS = { wa: 'WhatsApp', kakao: 'KakaoTalk', sms: 'SMS' };
const ORDER_ID = 'BTG-7Q4K2';
const money = (n) => n.toLocaleString('en-US');
const usd2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n) => String(n).padStart(2, '0');
const dateIn = (days) => {
  const d = new Date(Date.now() + 86400000 * days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function BoardingPassPreview() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    service: 'arrival', airport: 'ICN', flight: 'KE082', date: dateIn(9), time: '05:20', guests: 2,
    connFlight: '', connTime: '', car: 'none', address: '', bags: 2,
    given: '', surname: '', email: '', phone: '', channel: 'wa', travelClass: '', wheelchair: false, requests: '',
    forSomeoneElse: false, contactName: '', contactEmail: '', pay: 'paypal',
  }));
  const [pops, setPops] = useState({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [seoul, setSeoul] = useState('--:--');
  const popTimer = useRef();

  useEffect(() => {
    const tick = () => setSeoul(new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => { clearInterval(id); clearTimeout(popTimer.current); };
  }, []);

  // 입력한 칸이 탑승권에 찍히는 효과
  const set = (field, value, also = []) => {
    setForm(f => ({ ...f, [field]: value }));
    setPops(Object.fromEntries([field, ...also].map(k => [k, true])));
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPops({}), 520);
  };
  const pop = (...keys) => (keys.some(k => pops[k]) ? 'pop' : '');

  const { service, guests, time } = form;
  const dep = service === 'departure';
  const quote = computeQuote({
    serviceType: service, airport: form.airport, date: form.date, flightTime: time,
    passengers: guests, luggageCount: form.bags, vehicleType: form.car,
  }, DEMO_SETTINGS);
  const { surcharges } = quote;
  const paypal = form.pay === 'paypal';
  const priceMain = paypal ? `USD ${usd2(quote.paypalTotalUsd)}` : `₩${money(quote.nicepayTotalKrw)}`;
  const priceAlt = paypal ? `or ₩${money(quote.nicepayTotalKrw)} with NICEPAY` : `or USD ${usd2(quote.paypalTotalUsd)} with PayPal`;

  // 기존 결제 화면의 견적 항목을 그대로 옮긴다 (0원 항목은 숨김)
  const lines = [
    { label: `${SERVICES[service]} meet & assist (1–2 guests)`, usd: quote.baseFeeUsd },
    quote.vehicleUsd > 0 && { label: `Car · ${CARS[form.car].name}`, usd: quote.vehicleUsd, why: form.address ? `${dep ? 'Pick-up from' : 'Drop-off at'} ${form.address}` : '' },
    quote.extraPassUsd > 0 && { label: `Extra guests × ${quote.extraPassCount}`, usd: quote.extraPassUsd, why: 'Base price covers 2 guests' },
    quote.extraLugUsd > 0 && { label: `Extra bags × ${quote.extraBags}`, usd: quote.extraLugUsd, why: `One bag per guest is included (min. 2)` },
    quote.porterUsd > 0 && { label: `Porter × ${form.bags >= 9 ? 2 : 1}`, usd: quote.porterUsd, why: `${form.bags} bags — a porter carries them for you` },
    surcharges.nightFeeUsd > 0 && { label: 'Night supplement', usd: surcharges.nightFeeUsd, why: `Flight ${dep ? 'departs' : 'lands'} ${time} — between 22:00 and 06:00` },
    surcharges.urgentFeeUsd > 0 && { label: 'Short-notice supplement', usd: surcharges.urgentFeeUsd, why: `Booked within ${surcharges.urgentWindow === '6h' ? 6 : 24} hours of the flight` },
    surcharges.weekendFeeUsd > 0 && { label: 'Weekend supplement', usd: surcharges.weekendFeeUsd, why: 'Saturday or Sunday flight' },
    paypal && { label: 'PayPal fee (4%)', usd: quote.paypalFeeUsd, fee: true },
  ].filter(Boolean);

  const flight = FLIGHTS[form.flight.toUpperCase().replace(/\s/g, '')];
  let homeTimeHint = 'Tell us your flight and we convert time zones for you.';
  if (flight && form.date && /^\d\d:\d\d$/.test(time)) {
    const at = new Date(`${form.date}T${time}:00+09:00`);
    if (!isNaN(at)) homeTimeHint = `That is ${at.toLocaleString('en-GB', { timeZone: flight.home, weekday: 'short', hour: '2-digit', minute: '2-digit' })} in ${flight.city}.`;
  }
  const dateShown = form.date ? new Date(`${form.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : '—';
  const hasName = form.surname || form.given;
  const passName = hasName ? `${form.surname.toUpperCase()} / ${form.given.toUpperCase()}` : 'SURNAME / GIVEN';
  const channel = CHANNELS[form.channel];
  const done = step === 4;
  const ctaLabel = { 1: 'Continue — add guest details', 2: 'Review & pay', 3: `Pay & issue pass · ${priceMain}` }[step];
  const next = () => { setStep(s => Math.min(s + 1, 4)); window.scrollTo({ top: 0 }); };
  const stepClass = (n) => (step === n ? 'on' : step > n ? 'done' : '');
  const seg = (on) => (on ? 'on' : '');
  const extras = [
    form.wheelchair && 'WHEELCHAIR',
    dep && 'TAX REFUND ASSIST',
    form.travelClass && CLASSES[form.travelClass].toUpperCase(),
  ].filter(Boolean);

  return (
    <div className={`bp ${done ? 'issued' : ''}`}>
      <header className="top">
        <div className="top-in">
          <img src="/logo.webp" alt="Beyond the Gate" style={{ height: 30, width: 'auto', display: 'block' }} />
          <div className="top-meta">
            <span className="hide-m mono">Seoul {seoul} KST</span>
            <button className="chip" type="button" onClick={() => set('pay', paypal ? 'nicepay' : 'paypal')}>{paypal ? 'USD' : 'KRW'} ▾</button>
            <button className="chip" type="button">EN ▾</button>
            <span className="hide-m">WhatsApp +82 10-2853-3998</span>
          </div>
        </div>
      </header>

      <div className="wrap">
        <main className="main">
          <ol className="steps">
            <li className={stepClass(1)}>1 · Trip</li>
            <li className={stepClass(2)}>2 · Guests</li>
            <li className={stepClass(3)}>3 · Review &amp; pay</li>
          </ol>

          {step === 1 && (
            <>
              <h1>Where should we meet you?</h1>
              <p className="lede">All times are Seoul time. Your price updates on the pass as you type.</p>
              <div className="card">
                <div className="f">
                  <label>Service</label>
                  <div className="seg">
                    {Object.entries(SERVICES).map(([k, v]) => (
                      <button key={k} type="button" className={seg(service === k)} onClick={() => set('service', k, ['from', 'to'])}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="row">
                  <div className="f">
                    <label htmlFor="bp-airport">Airport</label>
                    <select id="bp-airport" value={form.airport} onChange={e => set('airport', e.target.value, ['to', 'from'])}>
                      <option value="ICN">Incheon (ICN)</option>
                      <option value="GMP">Gimpo (GMP)</option>
                    </select>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-date">Date ({dep ? 'leaving' : 'arriving in'} Seoul)</label>
                    <input id="bp-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                </div>
                <div className="row">
                  <div className="f">
                    <label htmlFor="bp-flight">Flight number</label>
                    <input id="bp-flight" value={form.flight} onChange={e => set('flight', e.target.value.toUpperCase(), ['from', 'to'])} placeholder="e.g. KE082" autoComplete="off" />
                    <small>Try KE082, BA017, SQ600 or OZ102.</small>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-time">{dep ? 'Departure time' : 'Landing time'} (KST)</label>
                    <input id="bp-time" type="time" value={time} onChange={e => set('time', e.target.value)} />
                    <small>{homeTimeHint}</small>
                  </div>
                </div>
                {service === 'transfer' && (
                  <div className="row">
                    <div className="f">
                      <label htmlFor="bp-conn">Connecting flight</label>
                      <input id="bp-conn" value={form.connFlight} onChange={e => set('connFlight', e.target.value.toUpperCase())} placeholder="e.g. KE901" />
                    </div>
                    <div className="f">
                      <label htmlFor="bp-conn-time">Connecting departure (KST)</label>
                      <input id="bp-conn-time" type="time" value={form.connTime} onChange={e => set('connTime', e.target.value)} />
                    </div>
                  </div>
                )}
                <div className="row">
                  <div className="f">
                    <label htmlFor="bp-guests">Guests</label>
                    <select id="bp-guests" value={guests} onChange={e => set('guests', parseInt(e.target.value, 10))}>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                    </select>
                    <small>Base price covers 2 guests.</small>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-bags">Checked bags</label>
                    <select id="bp-bags" value={form.bags} onChange={e => set('bags', parseInt(e.target.value, 10))}>
                      {Array.from({ length: 13 }, (_, n) => <option key={n} value={n}>{n} bag{n === 1 ? '' : 's'}</option>)}
                    </select>
                    <small>5+ bags include a porter.</small>
                  </div>
                </div>
                <div className="f">
                  <label>Private car {dep ? 'to the airport' : 'from the airport'}</label>
                  <div className="seg seg-4">
                    {Object.entries(CARS).map(([k, v]) => (
                      <button key={k} type="button" className={seg(form.car === k)} onClick={() => set('car', k)}>{v.name}<span>{v.note}</span></button>
                    ))}
                  </div>
                </div>
                {form.car !== 'none' && (
                  <div className="f">
                    <label htmlFor="bp-address">{dep ? 'Pick-up address' : 'Drop-off address'}</label>
                    <input id="bp-address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Hotel name or address in Seoul" />
                  </div>
                )}
                {(surcharges.nightFeeUsd > 0 || surcharges.urgentFeeUsd > 0 || surcharges.weekendFeeUsd > 0) && (
                  <p className="note"><b>Supplements apply.</b> See the reason for each one on your pass — our team is on duty for you at any hour.</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1>Who are we welcoming?</h1>
              <p className="lede">Lead guest only — exactly as printed in the passport. No date of birth or passport number needed.</p>
              <div className="card">
                <div className="row">
                  <div className="f"><label htmlFor="bp-given">Given name(s)</label><input id="bp-given" value={form.given} onChange={e => set('given', e.target.value)} autoComplete="given-name" /></div>
                  <div className="f"><label htmlFor="bp-sur">Surname</label><input id="bp-sur" value={form.surname} onChange={e => set('surname', e.target.value)} autoComplete="family-name" /></div>
                </div>
                <div className="f"><label htmlFor="bp-email">Email for your confirmation</label><input id="bp-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" /></div>
                <div className="row">
                  <div className="f">
                    <label htmlFor="bp-phone">Mobile with country code</label>
                    <input id="bp-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 212 555 0100" autoComplete="tel" />
                  </div>
                  <div className="f">
                    <label>Your agent will message you on</label>
                    <div className="seg">
                      {Object.entries(CHANNELS).map(([k, v]) => (
                        <button key={k} type="button" className={seg(form.channel === k)} onClick={() => set('channel', k)}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="note">Name board will read <b>{form.surname ? `${form.given.toUpperCase()} ${form.surname.toUpperCase()}`.trim() : 'your name'}</b>. Your agent sends their photo and phone number the day before.</p>
              </div>

              <details className="card more">
                <summary>Optional — class of travel, wheelchair, requests, booking for someone else</summary>
                <div className="row" style={{ marginTop: 16 }}>
                  <div className="f">
                    <label htmlFor="bp-class">Class of travel</label>
                    <select id="bp-class" value={form.travelClass} onChange={e => set('travelClass', e.target.value)}>
                      {Object.entries(CLASSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="f">
                    <label>Assistance</label>
                    <label className="check"><input type="checkbox" checked={form.wheelchair} onChange={e => set('wheelchair', e.target.checked)} /> Wheelchair needed</label>
                  </div>
                </div>
                <div className="f">
                  <label htmlFor="bp-req">Special requests</label>
                  <input id="bp-req" value={form.requests} onChange={e => set('requests', e.target.value)} placeholder="Child seat, flowers, dietary needs…" />
                </div>
                <label className="check"><input type="checkbox" checked={form.forSomeoneElse} onChange={e => set('forSomeoneElse', e.target.checked)} /> I am booking for someone else</label>
                {form.forSomeoneElse && (
                  <div className="row" style={{ marginTop: 12 }}>
                    <div className="f"><label htmlFor="bp-cname">Your name</label><input id="bp-cname" value={form.contactName} onChange={e => set('contactName', e.target.value)} /></div>
                    <div className="f"><label htmlFor="bp-cemail">Your email (copy of the pass)</label><input id="bp-cemail" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></div>
                  </div>
                )}
              </details>
            </>
          )}

          {step === 3 && (
            <>
              <h1>Review &amp; pay</h1>
              <p className="lede">Everything is on your pass. Every fee is shown before you pay.</p>
              <div className="card">
                <div className="order-bar">
                  <div><span className="k">ORDER</span><b className="mono">{ORDER_ID}</b></div>
                  <div><span className="k">INVOICE</span><b className="mono">INV-{ORDER_ID.slice(4)}</b></div>
                  <span className="badge-unpaid">UNPAID</span>
                </div>
                <div className="pay">
                  <button type="button" className={`pay-opt ${seg(paypal)}`} onClick={() => set('pay', 'paypal')}>
                    <div><b>PayPal</b><span>International · pay in USD · includes 4% PayPal fee</span>
                      <div className="marks"><em>PayPal</em><em>USD</em></div></div>
                    <i>USD {usd2(quote.paypalTotalUsd)}</i>
                  </button>
                  <button type="button" className={`pay-opt ${seg(!paypal)}`} onClick={() => set('pay', 'nicepay')}>
                    <div><b>NICEPAY</b><span>Korean-issued cards · charged in KRW · no fee</span>
                      <div className="marks"><em>NICEPAY</em><em>KRW</em></div></div>
                    <i>₩{money(quote.nicepayTotalKrw)}</i>
                  </button>
                </div>
                <p className="note" style={{ marginTop: 14 }}>NICEPAY (Korean cards, KRW) has no fee. The 4% applies to PayPal only.</p>
                <div className="trust">
                  <div><b>Free cancellation</b>until 24 h before your flight</div>
                  <div><b>Flight delayed?</b>We track it and re-time at no cost</div>
                  <div><b>English invoice</b>sent instantly for expenses</div>
                </div>
              </div>
            </>
          )}

          {done && (
            <>
              <h1>See you in Seoul, {form.given ? form.given.split(' ')[0] : 'friend'}.</h1>
              <p className="lede">Your pass is issued and a copy is in your inbox. Your agent will message you on {channel} 24 hours before {dep ? 'your departure' : 'landing'}.</p>
              <div className="card">
                <div className="lines">
                  <div><span>Booking reference</span><b className="mono">{ORDER_ID}</b></div>
                  <div><span>Invoice</span><b className="mono">INV-{ORDER_ID.slice(4)} · PAID</b></div>
                  <div><span>Meeting point</span><b>{dep ? 'Departure curb · name board' : 'Aircraft door · name board'}</b></div>
                  <div><span>Need anything?</span><b>WhatsApp +82 10-2853-3998</b></div>
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>↺ Replay preview</button>
            </>
          )}

          {!done && (
            <div className="desk-cta">
              <button type="button" className={`btn ${step === 3 ? 'btn-gold' : 'btn-navy'}`} onClick={next}>{ctaLabel}</button>
              {step === 3 && <p className="terms">By paying you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy policy</a>, including free cancellation up to 24 h before the flight.</p>}
              {step > 1 && <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
            </div>
          )}
        </main>

        <aside className={`side ${done ? 'issued' : ''} ${step === 3 || detailsOpen ? 'show-stub' : ''}`}>
          <div className="pass">
            <div className="pass-head">
              <span className="mono">VIP MEET &amp; ASSIST · {SERVICES[service].toUpperCase()}</span>
              <span className="mono" style={{ color: '#B9C4D4' }}>{step >= 3 ? `${ORDER_ID} · ${done ? 'PAID' : 'UNPAID'}` : 'DRAFT'}</span>
            </div>
            <div className="pass-body">
              <div className="route">
                <div><div className={`code ${pop('from')}`}>{dep ? form.airport : flight ? flight.from : '···'}</div><small>{dep ? AIRPORTS[form.airport] : flight ? flight.fromName : 'Enter flight'}</small></div>
                <div className="mid">
                  <span>{flight ? form.flight.toUpperCase() : form.flight || 'FLIGHT'}</span>
                  <div className="line"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5C17" strokeWidth="1.6" aria-hidden="true"><path d="M2 13.5l8-1.5 5-9 2 .5-2.5 8.5 6-1 1.5 2-7.5 1.5" /></svg></div>
                  <span>{flight ? flight.dur : ''}</span>
                </div>
                <div style={{ textAlign: 'right' }}><div className={`code ${pop('to')}`}>{dep ? (flight ? flight.from : '···') : form.airport}</div><small>{dep ? (flight ? flight.fromName : 'Enter flight') : AIRPORTS[form.airport]}</small></div>
              </div>
              <div className="grid">
                <div className="cell two"><div className="k">PASSENGER</div><div className={`v ${pop('given', 'surname')} ${hasName ? '' : 'empty'}`}>{passName}</div></div>
                <div className="cell"><div className="k">GUESTS · BAGS</div><div className={`v ${pop('guests', 'bags')}`}>{guests} · {form.bags}</div></div>
                <div className="cell"><div className="k">DATE</div><div className={`v ${pop('date')}`}>{dateShown}</div></div>
                <div className="cell"><div className="k">{dep ? 'DEPARTS' : 'LANDS'} KST</div><div className={`v ${pop('time')}`}>{time}</div></div>
                <div className="cell"><div className="k">MEET AT</div><div className="v">{dep ? 'CURB' : 'GATE'}</div></div>
                {service === 'transfer' && (
                  <div className="cell wide"><div className="k">CONNECTING</div><div className={`v ${pop('connFlight', 'connTime')} ${form.connFlight ? '' : 'empty'}`}>{form.connFlight ? `${form.connFlight} · ${form.connTime || '--:--'} KST` : 'ADD CONNECTING FLIGHT'}</div></div>
                )}
                {form.car !== 'none' && (
                  <div className="cell wide"><div className="k">PRIVATE CAR</div><div className={`v ${pop('car', 'address')}`}>{CARS[form.car].name.toUpperCase()}{form.address ? ` → ${form.address.toUpperCase()}` : ''}</div></div>
                )}
                <div className="cell wide hide-compact"><div className="k">AGENT CONTACT</div><div className={`v ${pop('phone', 'channel')} ${form.phone ? '' : 'empty'}`}>{form.phone ? `${channel.toUpperCase()} ${form.phone}` : 'WHATSAPP · ADD MOBILE'}</div></div>
                {form.forSomeoneElse && form.contactName && (
                  <div className="cell wide hide-compact"><div className="k">BOOKED BY</div><div className={`v ${pop('contactName')}`}>{form.contactName.toUpperCase()}</div></div>
                )}
              </div>
              {extras.length > 0 && (
                <div className="tags">{extras.map(x => <span key={x} className={pop('wheelchair', 'travelClass')}>{x}</span>)}</div>
              )}
              {form.requests && <p className="req">“{form.requests}”</p>}
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
                <span style={{ fontSize: 13, color: '#5E574C' }}>Total · {paypal ? 'PayPal, USD' : 'NICEPAY, KRW'}</span>
                <div><div className={`amt ${pop('pay')}`}>{priceMain}</div><small>{priceAlt}</small></div>
              </div>
              <div className="barcode" aria-hidden="true" />
            </div>
            <div className="stamp">CONFIRMED</div>
          </div>
          {step < 3 && (
            <button type="button" className="details-toggle" onClick={() => setDetailsOpen(o => !o)} aria-expanded={detailsOpen}>
              {detailsOpen ? 'Hide price details' : `Price details · ${priceMain}`}
            </button>
          )}
          {done && (
            <div className="after">
              <button type="button">Add to calendar</button>
              <button type="button">Share with family</button>
              <button type="button">Download invoice</button>
            </div>
          )}
          <p className="caption">Preview only — no booking or payment is made.</p>
        </aside>
      </div>

      {!done && (
        <div className="mbar">
          <div className="p">Total<b>{priceMain}</b></div>
          <button type="button" className={`btn ${step === 3 ? 'btn-gold' : 'btn-navy'}`} onClick={next}>{step === 3 ? ctaLabel : 'Continue'}</button>
        </div>
      )}
    </div>
  );
}
