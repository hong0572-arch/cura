import { useEffect, useMemo, useRef, useState } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { track } from '@vercel/analytics';
import { computeJourneyQuote, journeySettings } from '../../utils/pricing';
import { vehiclesFor, isOverCapacity } from '../../utils/vehicles';
import { localizePath } from '../../utils/locale';
import { CONTACT } from '../checkout/checkoutCopy';
import './journeyPlanner.css';

// Private Journeys 플래너 — 브라우저에서만 렌더링한다(지도·localStorage 사용).
// 기본: 입국·출국 의전 + 공항↔숙소 차량. 날짜별 반일·종일 차량, 목적지별 가이드는 선택.
// 금액은 computeJourneyQuote(서버와 같은 함수)로 보여 주는 "예상"이며, 확정은 관리자가 회신한다.

const libraries = ['places'];
const STORAGE_KEY = 'btg_journey_plan_v1';
const MAX_DAYS = 30;

const emptyPlan = () => ({
  airport: 'ICN',
  arrival: { date: '', time: '', flight: '' },
  departure: { date: '', time: '', flight: '' },
  adults: 2, children: 0, bags: 2,
  vehicleId: '', hotel: null, guideLanguage: 'en',
  days: [],
});

const loadPlan = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved && saved.arrival && Array.isArray(saved.days) ? { ...emptyPlan(), ...saved } : emptyPlan();
  } catch { return emptyPlan(); }
};

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// 도착일~출발일 날짜 목록 (기존에 입력한 날짜별 내용은 유지)
function buildDays(arrival, departure, prev) {
  if (!arrival || !departure || departure < arrival) return [];
  const out = [];
  for (let d = arrival, i = 0; d <= departure && i < MAX_DAYS; d = addDays(d, 1), i++) {
    const old = prev.find(x => x.date === d);
    const edge = d === arrival || d === departure;
    out.push(old || { date: d, mode: edge ? 'free' : 'full', stops: [], note: '' });
  }
  return out;
}
const fmtDay = (date, lang) => new Date(`${date}T12:00:00`).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const usd = (n) => `USD ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const placeFrom = (p) => ({
  name: p.name || p.formatted_address || '',
  address: p.formatted_address || '',
  placeId: p.place_id || '',
  ...(p.geometry?.location ? { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() } : {}),
});

// 구글 지도 장소 검색 입력 (자동완성) — 지도 스크립트가 없으면 일반 입력으로 동작
function PlaceInput({ isLoaded, placeholder, onPick, id }) {
  const ref = useRef(null);
  const [text, setText] = useState('');
  const pick = () => {
    const p = ref.current?.getPlace();
    if (p && (p.name || p.formatted_address)) { onPick(placeFrom(p)); setText(''); }
  };
  const input = (
    <input id={id} value={text} onChange={e => setText(e.target.value)} placeholder={placeholder}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!isLoaded && text.trim()) { onPick({ name: text.trim(), address: '' }); setText(''); } } }} />
  );
  if (!isLoaded) return input;
  return (
    <Autocomplete onLoad={ac => { ref.current = ac; }} onPlaceChanged={pick}
      options={{ componentRestrictions: { country: 'kr' }, fields: ['name', 'formatted_address', 'geometry', 'place_id'] }}>
      {input}
    </Autocomplete>
  );
}

export default function JourneyPlanner({ lang = 'en', copy, settings }) {
  const c = copy.planner;
  const isKo = lang === 'ko';
  const [plan, setPlan] = useState(loadPlan);
  const [aiForm, setAiForm] = useState({ interests: '', area: '', day: '' });
  const [ai, setAi] = useState({ status: 'idle', places: [], error: '' });
  const [added, setAdded] = useState({});
  const [contact, setContact] = useState({ name: '', email: '', phone: '', country: '', message: '', consent: false, company: '' });
  const [send, setSend] = useState({ status: 'idle', message: '', id: '' });
  const formRef = useRef(null);
  const placesSvc = useRef(null);

  const { isLoaded } = useLoadScript({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, libraries, language: lang });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch { /* 저장 실패는 무시 */ }
  }, [plan]);

  const update = (patch) => setPlan(p => {
    const next = { ...p, ...patch };
    if ('arrival' in patch || 'departure' in patch) next.days = buildDays(next.arrival.date, next.departure.date, p.days);
    return next;
  });
  const updateDay = (date, fn) => setPlan(p => ({ ...p, days: p.days.map(d => (d.date === date ? fn(d) : d)) }));
  const addStop = (date, place) => updateDay(date, d => (d.stops.some(s => s.name === place.name) ? d : { ...d, stops: [...d.stops, { ...place, guide: false }] }));
  const moveStop = (date, i, dir) => updateDay(date, d => {
    const stops = [...d.stops];
    const j = i + dir;
    if (j < 0 || j >= stops.length) return d;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    return { ...d, stops };
  });

  const vehicles = vehiclesFor(settings, plan.airport);
  const vehicle = vehicles.find(v => v.id === plan.vehicleId);
  const passengers = Number(plan.adults) + Number(plan.children);
  const overCap = isOverCapacity(vehicle?.cap, passengers, plan.bags);
  const hours = journeySettings(settings);
  const quote = useMemo(() => computeJourneyQuote(plan, settings), [plan, settings]);
  const exRate = settings?.exchangeRate || 1350;
  const krw = (n) => `₩${Math.round(n * exRate).toLocaleString()}`;
  const dayIndex = (date) => plan.days.findIndex(d => d.date === date);
  const aiDay = aiForm.day || plan.days.find(d => d.mode !== 'free')?.date || plan.days[0]?.date || '';

  // AI 추천 → 구글 지도 텍스트 검색으로 실제 장소 확인(주소·좌표·사진·평점)
  const resolvePlace = (s) => new Promise((resolve) => {
    if (!isLoaded || !window.google?.maps?.places) return resolve(null);
    placesSvc.current = placesSvc.current || new window.google.maps.places.PlacesService(document.createElement('div'));
    placesSvc.current.textSearch({ query: s.search || s.name, region: 'kr' }, (results, status) => {
      if (status !== 'OK' || !results?.length) return resolve(null);
      const r = results[0];
      resolve({
        ...placeFrom(r),
        rating: r.rating || null,
        photo: r.photos?.[0]?.getUrl({ maxWidth: 480, maxHeight: 320 }) || '',
      });
    });
  });

  const askAi = async (e) => {
    e?.preventDefault();
    if (!aiForm.interests.trim() && !aiForm.area.trim()) return;
    setAi({ status: 'loading', places: [], error: '' });
    track('Journey AI Suggest', { lang });
    try {
      const res = await fetch('/api/journeys/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang, interests: aiForm.interests, area: aiForm.area, date: aiDay,
          party: `${plan.adults} adults${Number(plan.children) ? `, ${plan.children} children` : ''}`,
          already: plan.days.flatMap(d => d.stops.map(s => s.name)).slice(0, 15),
        }),
      });
      if (res.status === 429) throw Object.assign(new Error('rate'), { code: 429 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const resolved = await Promise.all((data.places || []).map(async (s) => ({ ...s, map: await resolvePlace(s) })));
      setAi({ status: 'done', places: resolved, error: resolved.length ? '' : c.ai.empty });
    } catch (err) {
      console.error('AI suggest failed:', err);
      setAi({ status: 'error', places: [], error: err.code === 429 ? c.ai.tooMany : c.ai.error });
    }
  };

  const addSuggestion = (s) => {
    if (!aiDay) return;
    const place = s.map || { name: s.name, address: s.region };
    addStop(aiDay, { ...place, name: place.name || s.name });
    setAdded(a => ({ ...a, [s.name]: aiDay }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!plan.arrival.date || !plan.departure.date) return setSend({ status: 'error', message: c.contact.needDates, id: '' });
    if (!plan.vehicleId) return setSend({ status: 'error', message: c.contact.needCar, id: '' });
    if (!contact.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || !contact.consent) {
      return setSend({ status: 'error', message: c.contact.required, id: '' });
    }
    setSend({ status: 'sending', message: '', id: '' });
    try {
      const res = await fetch('/api/journey-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, lang, plan: { ...plan, vehicleName: vehicle?.name || '' } }),
      });
      if (res.status === 429) throw Object.assign(new Error('rate'), { code: 429 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSend({ status: 'sent', message: '', id: data.id || '' });
      track('Journey Request', { days: plan.days.length, total: Math.round(quote.totalUsd) });
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Journey request failed:', err);
      setSend({ status: 'error', message: err.code === 429 ? c.contact.tooMany : c.contact.error, id: '' });
    }
  };

  const E = c.estimate;
  const tripLines = quote.days.flatMap((q, i) => {
    const d = plan.days[i];
    if (!d) return [];
    const label = `${c.day(i + 1)} · ${fmtDay(d.date, lang)}`;
    const rows = [];
    if (q.mode !== 'free') rows.push({ k: `${d.date}-car`, label: `${label} · ${q.jeju ? E.jeju : E.car[q.mode]}`, usd: q.vehicleUsd });
    if (q.longDistance) rows.push({ k: `${d.date}-long`, label: E.long(q.farKm), usd: q.longUsd, sub: true });
    if (q.guides) rows.push({ k: `${d.date}-guide`, label: E.guides(q.guides), usd: q.guideUsd, sub: true });
    if (q.overnightAway) rows.push({ k: `${d.date}-night`, label: E.overnight, usd: q.overnightUsd, sub: true });
    return rows;
  });

  if (send.status === 'sent') {
    return (
      <div className="jp-sent btg-card" role="status" ref={formRef}>
        <h2>{c.contact.sentTitle}</h2>
        <p>{c.contact.sentBody}</p>
        {send.id && <p className="jp-ref">{c.contact.reference} · <span>{send.id}</span></p>}
        <div className="jp-sent-actions">
          <a className="btg-btn btg-btn--primary" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <button type="button" className="btg-btn btg-btn--ghost" onClick={() => setSend({ status: 'idle', message: '', id: '' })}>{c.contact.edit}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jp">
      <div className="jp-main">
        {/* 1. 여행 일정 */}
        <section className="jp-card">
          <h2 className="jp-h">{c.trip}</h2>
          <div className="jp-grid">
            <label className="jp-f">{c.airport}
              <select value={plan.airport} onChange={e => update({ airport: e.target.value, vehicleId: '' })}>
                <option value="ICN">{isKo ? '인천국제공항' : 'Seoul Incheon'} (ICN)</option>
                <option value="GMP">{isKo ? '김포국제공항' : 'Seoul Gimpo'} (GMP)</option>
              </select>
            </label>
            <label className="jp-f">{c.guideLang}
              <select value={plan.guideLanguage} onChange={e => update({ guideLanguage: e.target.value })}>
                {Object.entries(c.langs).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          {['arrival', 'departure'].map(kind => (
            <fieldset key={kind} className="jp-flight">
              <legend>{c[kind]}</legend>
              <div className="jp-grid jp-grid--3">
                <label className="jp-f">{c.date}
                  <input type="date" value={plan[kind].date} min={kind === 'departure' ? (plan.arrival.date || todayString()) : todayString()}
                    onChange={e => update({ [kind]: { ...plan[kind], date: e.target.value } })} />
                </label>
                <label className="jp-f"><span>{c.time} <em>{c.optional}</em></span>
                  <input type="time" value={plan[kind].time} onChange={e => update({ [kind]: { ...plan[kind], time: e.target.value } })} />
                </label>
                <label className="jp-f"><span>{c.flight} <em>{c.optional}</em></span>
                  <input value={plan[kind].flight} placeholder="KE082" onChange={e => update({ [kind]: { ...plan[kind], flight: e.target.value.toUpperCase() } })} />
                </label>
              </div>
            </fieldset>
          ))}
          <div className="jp-grid jp-grid--3">
            <label className="jp-f">{c.adults}
              <select value={plan.adults} onChange={e => update({ adults: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="jp-f">{c.children}
              <select value={plan.children} onChange={e => update({ children: Number(e.target.value) })}>
                {Array.from({ length: 9 }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="jp-f">{c.bags}
              <select value={plan.bags} onChange={e => update({ bags: Number(e.target.value) })}>
                {Array.from({ length: 21 }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <p className="jp-label">{c.vehicle}</p>
          <div className="jp-cars">
            {vehicles.map(v => (
              <button key={v.id} type="button" className={`jp-car ${plan.vehicleId === v.id ? 'is-on' : ''}`} onClick={() => update({ vehicleId: v.id })} aria-pressed={plan.vehicleId === v.id}>
                <b>{v.name}</b>
                <span>{c.perTransfer(v.usd)}</span>
                {v.cap && <span>{c.capacity(v.cap)}</span>}
              </button>
            ))}
          </div>
          {overCap && <p className="jp-warn">{c.overCap}</p>}

          <div className="jp-f jp-f--full">
            <span>{c.hotel}</span>
            {plan.hotel ? (
              <div className="jp-picked"><b>{plan.hotel.name}</b><small>{plan.hotel.address}</small><button type="button" onClick={() => update({ hotel: null })}>{c.clear}</button></div>
            ) : (
              <PlaceInput isLoaded={isLoaded} placeholder={c.hotelPh} onPick={p => update({ hotel: p })} />
            )}
            <small>{c.hotelHint}</small>
          </div>
        </section>

        {/* 2. AI 장소 추천 */}
        <section className="jp-card jp-ai">
          <h2 className="jp-h">{c.ai.title}</h2>
          <p className="jp-lede">{c.ai.lede}</p>
          <form onSubmit={askAi}>
            <label className="jp-f jp-f--full">{c.ai.interests}
              <textarea rows="2" value={aiForm.interests} placeholder={c.ai.interestsPh} maxLength={300} onChange={e => setAiForm(f => ({ ...f, interests: e.target.value }))} />
            </label>
            <div className="jp-chips">
              {c.ai.chips.map(chip => (
                <button key={chip} type="button" className="jp-chip" onClick={() => setAiForm(f => ({ ...f, interests: f.interests ? `${f.interests}, ${chip}` : chip }))}>+ {chip}</button>
              ))}
            </div>
            <div className="jp-grid">
              <label className="jp-f">{c.ai.area}
                <input value={aiForm.area} placeholder={c.ai.areaPh} maxLength={80} onChange={e => setAiForm(f => ({ ...f, area: e.target.value }))} />
              </label>
              <label className="jp-f">{c.ai.forDay}
                <select value={aiDay} onChange={e => setAiForm(f => ({ ...f, day: e.target.value }))} disabled={!plan.days.length}>
                  {!plan.days.length && <option value="">—</option>}
                  {plan.days.map((d, i) => <option key={d.date} value={d.date}>{c.day(i + 1)} · {fmtDay(d.date, lang)}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" className="btg-btn btg-btn--primary" disabled={ai.status === 'loading' || (!aiForm.interests.trim() && !aiForm.area.trim())}>
              {ai.status === 'loading' ? c.ai.asking : c.ai.ask}
            </button>
          </form>
          {ai.error && <p className="jp-warn" role="alert">{ai.error}</p>}
          {ai.places.length > 0 && (
            <>
              <div className="jp-suggest">
                {ai.places.map(s => (
                  <article key={s.name} className="jp-sg">
                    {s.map?.photo ? <img src={s.map.photo} alt="" loading="lazy" /> : <div className="jp-sg-ph" aria-hidden="true" />}
                    <div className="jp-sg-body">
                      <h3>{isKo && s.nameKo ? s.nameKo : s.name}</h3>
                      <p className="jp-sg-meta">{[s.region, c.ai.hours(s.hours), s.map?.rating && `★ ${s.map.rating}`].filter(Boolean).join(' · ')}</p>
                      <p>{s.why}</p>
                      {s.tip && <p className="jp-sg-tip">{s.tip}</p>}
                      <div className="jp-sg-actions">
                        <button type="button" className="btg-btn btg-btn--gold" onClick={() => addSuggestion(s)} disabled={!aiDay || added[s.name] === aiDay}>
                          {added[s.name] === aiDay ? `✓ ${c.ai.added}` : `${c.ai.add} → ${aiDay ? c.day(dayIndex(aiDay) + 1) : ''}`}
                        </button>
                        {s.map?.placeId && (
                          <a href={`https://www.google.com/maps/place/?q=place_id:${s.map.placeId}`} target="_blank" rel="noopener noreferrer">{c.ai.map} ↗</a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="jp-small">{c.ai.disclaimer}</p>
            </>
          )}
        </section>

        {/* 3. 날짜별 일정 */}
        <section className="jp-card">
          <h2 className="jp-h">{c.days}</h2>
          {!plan.days.length && <p className="jp-lede">{c.daysEmpty}</p>}
          <ol className="jp-days">
            {plan.days.map((d, i) => {
              const q = quote.days[i] || {};
              const first = i === 0;
              const last = i === plan.days.length - 1;
              return (
                <li key={d.date} className="jp-day">
                  <div className="jp-day-head">
                    <span className="jp-day-n">{c.day(i + 1)}</span>
                    <b>{fmtDay(d.date, lang)}</b>
                  </div>
                  {(first || last) && <p className="jp-included">✓ {first ? c.arrivalDay : c.departureDay}{first && last ? ` · ${c.departureDay}` : ''}</p>}
                  <div className="jp-modes" role="radiogroup">
                    {['free', 'half', 'full'].map(m => (
                      <button key={m} type="button" role="radio" aria-checked={d.mode === m} className={`jp-mode ${d.mode === m ? 'is-on' : ''}`} onClick={() => updateDay(d.date, x => ({ ...x, mode: m }))}>
                        {c.modes[m]}<span>{c.modeHint({ half: hours.halfDayHours, full: hours.fullDayHours })[m]}</span>
                      </button>
                    ))}
                  </div>
                  {d.stops.length === 0 ? <p className="jp-small">{c.noStops}</p> : (
                    <ul className="jp-stops">
                      {d.stops.map((s, si) => (
                        <li key={`${s.name}-${si}`} className="jp-stop">
                          <div className="jp-stop-txt"><b>{s.name}</b>{s.address && <small>{s.address}</small>}</div>
                          <label className="jp-guide"><input type="checkbox" checked={s.guide} onChange={e => updateDay(d.date, x => ({ ...x, stops: x.stops.map((y, yi) => (yi === si ? { ...y, guide: e.target.checked } : y)) }))} /> {c.guide}</label>
                          <div className="jp-stop-btns">
                            <button type="button" onClick={() => moveStop(d.date, si, -1)} aria-label={c.up} disabled={si === 0}>↑</button>
                            <button type="button" onClick={() => moveStop(d.date, si, 1)} aria-label={c.down} disabled={si === d.stops.length - 1}>↓</button>
                            <button type="button" onClick={() => updateDay(d.date, x => ({ ...x, stops: x.stops.filter((_, yi) => yi !== si) }))} aria-label={c.remove}>✕</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.jeju && <p className="jp-warn">{c.jejuNote}</p>}
                  {!q.jeju && d.mode !== 'free' && q.longDistance && <p className="jp-small">{c.farNote(q.farKm)}</p>}
                  <div className="jp-day-tools">
                    <label className="jp-f">{c.search}
                      <PlaceInput isLoaded={isLoaded} placeholder={c.searchPh} onPick={p => addStop(d.date, p)} />
                    </label>
                    <details className="jp-more">
                      <summary>{c.hotelTonight}{d.hotel ? ` · ${d.hotel.name}` : ''}</summary>
                      {d.hotel ? (
                        <div className="jp-picked"><b>{d.hotel.name}</b><small>{d.hotel.address}</small><button type="button" onClick={() => updateDay(d.date, x => ({ ...x, hotel: undefined }))}>{c.clear}</button></div>
                      ) : (
                        <PlaceInput isLoaded={isLoaded} placeholder={c.hotelTonightPh} onPick={p => updateDay(d.date, x => ({ ...x, hotel: p }))} />
                      )}
                      <label className="jp-f">{c.note}
                        <input value={d.note || ''} maxLength={500} placeholder={c.notePh} onChange={e => updateDay(d.date, x => ({ ...x, note: e.target.value }))} />
                      </label>
                    </details>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 4. 요청 보내기 */}
        <form className="jp-card jp-contact" onSubmit={submit} noValidate ref={formRef}>
          <h2 className="jp-h">{c.contact.title}</h2>
          <div className="jp-hp" aria-hidden="true"><label>Company<input tabIndex={-1} autoComplete="off" value={contact.company} onChange={e => setContact(x => ({ ...x, company: e.target.value }))} /></label></div>
          <div className="jp-grid">
            <label className="jp-f">{c.contact.name} *<input value={contact.name} autoComplete="name" onChange={e => setContact(x => ({ ...x, name: e.target.value }))} /></label>
            <label className="jp-f">{c.contact.email} *<input type="email" value={contact.email} autoComplete="email" onChange={e => setContact(x => ({ ...x, email: e.target.value }))} /></label>
            <label className="jp-f"><span>{c.contact.phone} <em>{c.optional}</em></span><input type="tel" value={contact.phone} autoComplete="tel" placeholder="+1 212 555 0100" onChange={e => setContact(x => ({ ...x, phone: e.target.value }))} /></label>
            <label className="jp-f"><span>{c.contact.country} <em>{c.optional}</em></span><input value={contact.country} autoComplete="country-name" onChange={e => setContact(x => ({ ...x, country: e.target.value }))} /></label>
          </div>
          <label className="jp-f jp-f--full">{c.contact.message}
            <textarea rows="3" value={contact.message} placeholder={c.contact.messagePh} maxLength={3000} onChange={e => setContact(x => ({ ...x, message: e.target.value }))} />
          </label>
          <div className="jp-consent">
            <label className="jp-check"><input type="checkbox" checked={contact.consent} onChange={e => setContact(x => ({ ...x, consent: e.target.checked }))} /> <strong>{c.contact.consentLabel}</strong></label>
            <p>{c.contact.consentDetail} <a href={localizePath('/privacy', lang)} target="_blank" rel="noopener noreferrer">{c.contact.privacyLink}</a></p>
          </div>
          {send.status === 'error' && <p className="jp-warn" role="alert">{send.message}</p>}
          <button type="submit" className="btg-btn btg-btn--gold btg-sheen jp-submit" disabled={send.status === 'sending'}>
            {send.status === 'sending' ? c.contact.sending : `${c.contact.submit} · ${usd(quote.totalUsd)}`}
          </button>
        </form>
      </div>

      {/* 예상 금액 */}
      <aside className="jp-side">
        <div className="jp-est">
          <h2 className="jp-h">{E.title}</h2>
          <p className="jp-est-sub">{E.package}</p>
          <div className="jp-row"><span>{E.arrivalLine}</span><b>{usd(quote.arrival.subtotalUsd)}</b></div>
          <div className="jp-row"><span>{E.departureLine}</span><b>{usd(quote.departure.subtotalUsd)}</b></div>
          {quote.discountUsd > 0 && <div className="jp-row jp-row--disc"><span>{E.discount(quote.discountPct)}</span><b>−{usd(quote.discountUsd)}</b></div>}
          <div className="jp-divider" />
          {tripLines.length === 0 ? <p className="jp-small">{E.noTrip}</p> : tripLines.map(r => (
            <div key={r.k} className={`jp-row ${r.sub ? 'jp-row--sub' : ''}`}><span>{r.label}</span><b>{r.usd === null ? E.quoted : usd(r.usd)}</b></div>
          ))}
          <div className="jp-total">
            <span>{E.total}</span>
            <div><b>{usd(quote.totalUsd)}</b><small>{E.approx(krw(quote.totalUsd))}</small></div>
          </div>
          {quote.pending.length > 0 && <p className="jp-small">{E.pending}</p>}
          {quote.overtimeUsd > 0 && <p className="jp-small">{E.overtime(quote.overtimeUsd)}</p>}
          <p className="jp-small">{E.note}</p>
          <button type="button" className="btg-btn btg-btn--gold jp-side-cta" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{c.contact.submit}</button>
        </div>
      </aside>

      <div className="jp-mbar">
        <div><small>{E.total}</small><b>{usd(quote.totalUsd)}</b></div>
        <button type="button" className="btg-btn btg-btn--gold" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{c.contact.submit}</button>
      </div>
    </div>
  );
}
