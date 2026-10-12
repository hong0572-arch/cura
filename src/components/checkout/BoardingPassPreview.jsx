import { useEffect, useRef, useState } from 'react';
import { PAYPAL_FEE_RATE } from '../../utils/pricing';
import './boardingPass.css';

// 탑승권 결제 시안 — 개발 전용 미리보기 (/preview/boarding-pass). 실제 예약·결제는 하지 않는다.
// 금액은 데모 값이며, 실제 적용 시 computeQuote 결과와 서버 확정 금액으로 바꾼다.
const PRICES = { arrival: 250, departure: 270, transit: 340 };
const NAMES = { arrival: 'Arrival', departure: 'Departure', transit: 'Transit' };
const NIGHT_USD = 20;
const KRW = 1340;
// 데모용 항공편 조회표 — 실제 적용 시 항공편 일정 API로 대체
const FLIGHTS = {
  KE082: { city: 'New York', from: 'JFK', fromName: 'New York JFK', to: 'ICN', toName: 'Seoul Incheon', dur: '14H 35M', home: 'America/New_York' },
  BA017: { city: 'London', from: 'LHR', fromName: 'London Heathrow', to: 'ICN', toName: 'Seoul Incheon', dur: '13H 50M', home: 'Europe/London' },
  SQ600: { city: 'Singapore', from: 'SIN', fromName: 'Singapore', to: 'ICN', toName: 'Seoul Incheon', dur: '6H 25M', home: 'Asia/Singapore' },
  OZ102: { city: 'Tokyo', from: 'NRT', fromName: 'Tokyo Narita', to: 'ICN', toName: 'Seoul Incheon', dur: '2H 30M', home: 'Asia/Tokyo' },
};
const CHANNELS = { wa: 'WhatsApp', kakao: 'KakaoTalk', sms: 'SMS' };
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
    service: 'arrival', flight: 'KE082', date: dateIn(9), time: '05:20', guests: 2,
    given: '', surname: '', email: '', phone: '', channel: 'wa', pay: 'paypal',
  }));
  const [pops, setPops] = useState({});
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
  const hour = parseInt(time.slice(0, 2), 10);
  const night = hour >= 22 || hour < 6;
  const baseUsd = PRICES[service] * guests;
  const subtotalUsd = baseUsd + (night ? NIGHT_USD : 0);
  const paypal = form.pay === 'paypal';
  const feeUsd = Math.round(subtotalUsd * PAYPAL_FEE_RATE * 100) / 100;
  const paypalUsd = subtotalUsd + feeUsd;
  const krw = subtotalUsd * KRW;
  const priceMain = paypal ? `USD ${usd2(paypalUsd)}` : `₩${money(krw)}`;
  const priceAlt = paypal ? `or ₩${money(krw)} with NICEPAY` : `or USD ${usd2(paypalUsd)} with PayPal`;

  const flight = FLIGHTS[form.flight.toUpperCase().replace(/\s/g, '')];
  const dep = service === 'departure';
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
  const ctaLabel = { 1: 'Continue — add guest details', 2: 'Continue to payment', 3: `Issue pass · ${priceMain}` }[step];
  const next = () => { setStep(s => Math.min(s + 1, 4)); window.scrollTo({ top: 0 }); };
  const stepClass = (n) => (step === n ? 'on' : step > n ? 'done' : '');
  const seg = (on) => (on ? 'on' : '');

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
            <li className={stepClass(1)}>1 · Your flight</li>
            <li className={stepClass(2)}>2 · Guests</li>
            <li className={stepClass(3)}>3 · Pay</li>
          </ol>

          {step === 1 && (
            <>
              <h1>Where should we meet you?</h1>
              <p className="lede">All times are Seoul time. Your price updates on the pass as you type.</p>
              <div className="card">
                <div className="f">
                  <label>Service</label>
                  <div className="seg">
                    {Object.keys(PRICES).map(k => (
                      <button key={k} type="button" className={seg(service === k)} onClick={() => set('service', k, ['from', 'to'])}>
                        {NAMES[k]}<span>USD {PRICES[k]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="row">
                  <div className="f">
                    <label htmlFor="bp-flight">Flight number</label>
                    <input id="bp-flight" value={form.flight} onChange={e => set('flight', e.target.value.toUpperCase(), ['from', 'to'])} placeholder="e.g. KE082" autoComplete="off" />
                    <small>Try KE082, BA017, SQ600 or OZ102 — we fill in the route for you.</small>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-date">Date ({dep ? 'leaving' : 'arriving in'} Seoul)</label>
                    <input id="bp-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                </div>
                <div className="row">
                  <div className="f">
                    <label htmlFor="bp-time">{dep ? 'Departure time' : 'Landing time'} (KST)</label>
                    <input id="bp-time" type="time" value={time} onChange={e => set('time', e.target.value)} />
                    <small>{homeTimeHint}</small>
                  </div>
                  <div className="f">
                    <label htmlFor="bp-guests">Guests</label>
                    <select id="bp-guests" value={guests} onChange={e => set('guests', parseInt(e.target.value, 10))}>
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
                {night && (
                  <p className="note"><b>{dep ? 'Late or early departure.' : 'Early-morning arrival.'}</b> A USD {NIGHT_USD} night supplement applies for flights between 22:00 and 06:00 — our team is on duty for you.</p>
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
            </>
          )}

          {step === 3 && (
            <>
              <h1>Issue your pass</h1>
              <p className="lede">Choose how to pay. Every fee is shown before you confirm.</p>
              <div className="card">
                <div className="pay">
                  <button type="button" className={`pay-opt ${seg(paypal)}`} onClick={() => set('pay', 'paypal')}>
                    <div><b>PayPal</b><span>Pay in USD · includes 4% PayPal fee</span>
                      <div className="marks"><em>PayPal</em><em>USD</em></div></div>
                    <i>USD {usd2(paypalUsd)}</i>
                  </button>
                  <button type="button" className={`pay-opt ${seg(!paypal)}`} onClick={() => set('pay', 'nicepay')}>
                    <div><b>NICEPAY</b><span>Korean-issued cards · charged in KRW · no fee</span>
                      <div className="marks"><em>NICEPAY</em><em>KRW</em></div></div>
                    <i>₩{money(krw)}</i>
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
              <p className="lede">Your pass is issued and a copy is in your inbox. Your agent will message you on {channel} 24 hours before landing.</p>
              <div className="card">
                <div className="lines">
                  <div><span>Booking reference</span><b className="mono">BTG-7Q4K</b></div>
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
              {step > 1 && <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
            </div>
          )}
        </main>

        <aside className={`side ${done ? 'issued' : ''} ${step === 3 ? 'show-stub' : ''}`}>
          <div className="pass">
            <div className="pass-head">
              <span className="mono">VIP MEET &amp; ASSIST · {NAMES[service].toUpperCase()}</span>
              <span className="mono" style={{ color: '#B9C4D4' }}>{done ? 'BTG-7Q4K' : 'DRAFT'}</span>
            </div>
            <div className="pass-body">
              <div className="route">
                <div><div className={`code ${pop('from')}`}>{flight ? (dep ? flight.to : flight.from) : '···'}</div><small>{flight ? (dep ? flight.toName : flight.fromName) : 'Enter flight'}</small></div>
                <div className="mid">
                  <span>{flight ? form.flight.toUpperCase() : 'FLIGHT'}</span>
                  <div className="line"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5C17" strokeWidth="1.6" aria-hidden="true"><path d="M2 13.5l8-1.5 5-9 2 .5-2.5 8.5 6-1 1.5 2-7.5 1.5" /></svg></div>
                  <span>{flight ? flight.dur : ''}</span>
                </div>
                <div style={{ textAlign: 'right' }}><div className={`code ${pop('to')}`}>{flight ? (dep ? flight.from : flight.to) : 'ICN'}</div><small>{flight ? (dep ? flight.fromName : flight.toName) : 'Seoul Incheon'}</small></div>
              </div>
              <div className="grid">
                <div className="cell two"><div className="k">PASSENGER</div><div className={`v ${pop('given', 'surname')} ${hasName ? '' : 'empty'}`}>{passName}</div></div>
                <div className="cell"><div className="k">GUESTS</div><div className={`v ${pop('guests')}`}>{guests}</div></div>
                <div className="cell"><div className="k">DATE</div><div className={`v ${pop('date')}`}>{dateShown}</div></div>
                <div className="cell"><div className="k">{dep ? 'DEPARTS' : 'LANDS'} KST</div><div className={`v ${pop('time')}`}>{time}</div></div>
                <div className="cell"><div className="k">MEET AT</div><div className="v">{dep ? 'CURB' : 'GATE'}</div></div>
                <div className="cell wide hide-compact"><div className="k">AGENT CONTACT</div><div className={`v ${pop('phone', 'channel')} ${form.phone ? '' : 'empty'}`}>{form.phone ? `${channel.toUpperCase()} ${form.phone}` : 'WHATSAPP · ADD MOBILE'}</div></div>
              </div>
            </div>
            <div className="perf" aria-hidden="true" />
            <div className="stub">
              <div className="lines">
                <div><span>{NAMES[service]} × {guests}</span><span className="mono">USD {money(baseUsd)}</span></div>
                {night && (
                  <>
                    <div><span>Night supplement</span><span className="mono">USD {NIGHT_USD}</span></div>
                    <div className="why">Flight {dep ? 'departs' : 'lands'} {time} — between 22:00 and 06:00</div>
                  </>
                )}
                {paypal && <div className={pop('pay')}><span>PayPal fee (4%)</span><span className="mono">USD {usd2(feeUsd)}</span></div>}
              </div>
              <div className="total">
                <span style={{ fontSize: 13, color: '#5E574C' }}>Total · {paypal ? 'PayPal, USD' : 'NICEPAY, KRW'}</span>
                <div><div className={`amt ${pop('pay')}`}>{priceMain}</div><small>{priceAlt}</small></div>
              </div>
              <div className="barcode" aria-hidden="true" />
            </div>
            <div className="stamp">CONFIRMED</div>
          </div>
          {done && (
            <div className="after">
              <button type="button">Add to calendar</button>
              <button type="button">Share with family</button>
              <button type="button">Save pass</button>
            </div>
          )}
          <p className="caption">Preview only — no booking or payment is made.</p>
        </aside>
      </div>

      {!done && (
        <div className="mbar">
          <div className="p">Total<b>{priceMain}</b></div>
          <button type="button" className="btn btn-gold" onClick={next}>{step === 3 ? 'Issue pass' : `Continue (${step}/3)`}</button>
        </div>
      )}
    </div>
  );
}
