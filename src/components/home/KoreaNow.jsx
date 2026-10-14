import { useEffect, useState, useSyncExternalStore } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudDrizzle, MapPin, CalendarDays } from 'lucide-react';

// "Korea this month" — 영어 홈 전용. 공공데이터(기상청 단기예보, 한국관광공사 영문 TourAPI)를
// 서버(/api/korea/*)가 캐시해 내려 주고, 브라우저에서만 불러온다(사전 렌더링 HTML 에는 제목만).
// 고객이 홈 검색창에서 여행 날짜를 고르면(btg:trip-date 이벤트) 그 달의 축제·명소로 바뀐다.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// 달마다 짧은 소개 (계절감 — 사실 위주, 날짜 단정 없음)
const MONTH_NOTE = {
  1: 'Crisp, dry winter days — ski slopes, palace walks and warm Korean food.',
  2: 'The coldest weeks give way to clear skies; ski season continues.',
  3: 'Early spring: plum and camellia blossoms start in the south.',
  4: 'Cherry blossom season sweeps north across the country.',
  5: 'Mild and green — gardens, festivals and long evenings outdoors.',
  6: 'Early summer warmth; the rainy season (jangma) usually begins late in the month.',
  7: 'Hot and humid with monsoon showers — beaches, islands and cool valleys.',
  8: 'Peak summer heat; beach towns and mountain valleys are busiest.',
  9: 'Clear autumn skies arrive; Chuseok holiday falls in September or October.',
  10: 'Autumn foliage begins in the mountains — one of the best months to visit.',
  11: 'Late foliage in the south and cool, crisp days in Seoul.',
  12: 'Winter lights, Christmas markets and the start of ski season.',
};

const SKY = (sky, pty) => {
  if (pty === 1 || pty === 4) return { Icon: CloudRain, label: 'Rain' };
  if (pty === 2) return { Icon: CloudDrizzle, label: 'Rain / snow' };
  if (pty === 3) return { Icon: CloudSnow, label: 'Snow' };
  if (sky === 1) return { Icon: Sun, label: 'Clear' };
  if (sky === 3) return { Icon: CloudSun, label: 'Partly cloudy' };
  if (sky === 4) return { Icon: Cloud, label: 'Cloudy' };
  return { Icon: CloudSun, label: '—' };
};
const PACK = (max) => (max == null ? '' : max >= 28 ? 'Light, breathable clothes and sun protection' : max >= 20 ? 'Light layers; a thin jacket for the evening' : max >= 10 ? 'A warm jacket and layers' : 'A heavy coat, gloves and a hat');

const noSubscribe = () => () => {};
const kstMonth = () => new Date(Date.now() + 9 * 3600_000).getUTCMonth() + 1;
const useCurrentMonth = () => useSyncExternalStore(noSubscribe, kstMonth, () => 0);

const fmtRange = (start, end) => {
  const f = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (!start) return '';
  return end && end !== start ? `${f(start)} – ${f(end)}` : f(start);
};
const mapLink = (c) => (c.lat && c.lng ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.title} Korea`)}`);

const previewFlag = () => (new URLSearchParams(window.location.search).get('korea') === '1' ? 'on' : '');
const usePreview = () => useSyncExternalStore(noSubscribe, previewFlag, () => '');

export default function KoreaNow({ onBook, enabled = true }) {
  const preview = usePreview();
  const show = enabled || preview === 'on';
  const thisMonth = useCurrentMonth();
  const [tripMonth, setTripMonth] = useState(0);
  const month = tripMonth || thisMonth;
  const [unit, setUnit] = useState('C');
  const [weather, setWeather] = useState({ status: 'loading', cities: [] });
  const [tour, setTour] = useState({ status: 'loading', month: 0, festivals: [], spots: [], usual: false });

  // 홈 검색창에서 여행 날짜를 고르면 그 달로 바꾼다
  useEffect(() => {
    const onDate = (e) => { const m = Number(String(e.detail || '').slice(5, 7)); if (m >= 1 && m <= 12) setTripMonth(m); };
    window.addEventListener('btg:trip-date', onDate);
    return () => window.removeEventListener('btg:trip-date', onDate);
  }, []);

  useEffect(() => {
    if (!show) return undefined;
    let alive = true;
    fetch('/api/korea/weather').then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => alive && setWeather({ status: 'ok', cities: d.cities || [] }))
      .catch(() => alive && setWeather({ status: 'error', cities: [] }));
    return () => { alive = false; };
  }, [show]);

  useEffect(() => {
    if (!month || !show) return undefined;
    let alive = true;
    fetch(`/api/korea/highlights?month=${month}`).then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => alive && setTour({ status: 'ok', month, festivals: d.festivals || [], spots: d.spots || [], usual: Boolean(d.usual) }))
      .catch(() => alive && setTour(t => ({ ...t, status: 'error' })));
    return () => { alive = false; };
  }, [month, show]);

  const temp = (c) => (c == null ? '–' : unit === 'C' ? `${Math.round(c)}°` : `${Math.round(c * 9 / 5 + 32)}°`);
  const cards = [...tour.festivals.map(f => ({ ...f, kind: 'Festival' })), ...tour.spots.map(s => ({ ...s, kind: 'Place to see' }))];
  const hasTour = tour.status === 'ok' && cards.length > 0;
  const hasWeather = weather.status === 'ok' && weather.cities.length > 0;
  // 공공데이터 키가 아직 없거나 둘 다 실패하면 섹션을 숨긴다
  if (!show || (weather.status === 'error' && tour.status === 'error')) return null;

  return (
    <section id="korea-now" className="home-section kn" aria-labelledby="kn-title">
      <div className="container">
        <div className="home-head">
          <p className="btg-eyebrow">Korea this month</p>
          <h2 className="home-title" id="kn-title">{month ? `${MONTHS[month - 1]} in Korea` : 'Korea, right now'}</h2>
          {month > 0 && <p className="kn-note">{MONTH_NOTE[month]}{tripMonth ? ' (based on your travel date)' : ''}</p>}
        </div>

        <div className="kn-grid">
          <div className="kn-weather btg-panel on-navy">
            <div className="kn-weather-head">
              <span className="kn-k">Weather now</span>
              <div className="kn-unit" role="group" aria-label="Temperature unit">
                {['C', 'F'].map(u => <button key={u} type="button" aria-pressed={unit === u} className={unit === u ? 'is-on' : ''} onClick={() => setUnit(u)}>°{u}</button>)}
              </div>
            </div>
            {weather.status === 'loading' && <p className="kn-muted">Loading forecast…</p>}
            {weather.status === 'error' && <p className="kn-muted">Forecast is unavailable right now.</p>}
            {hasWeather && weather.cities.map(c => {
              const today = c.days?.[0] || {};
              const { Icon, label } = SKY(today.sky, today.pty);
              return (
                <div key={c.id} className="kn-city">
                  <div className="kn-city-main">
                    <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
                    <div>
                      <b>{c.name}</b>
                      <span>{label} · {temp(today.min)} / {temp(today.max)}</span>
                    </div>
                    <strong className="kn-now">{temp(c.now)}</strong>
                  </div>
                  <ol className="kn-days">
                    {(c.days || []).slice(1, 4).map(d => {
                      const s = SKY(d.sky, d.pty);
                      return (
                        <li key={d.date}>
                          <span>{new Date(`${d.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                          <s.Icon size={16} strokeWidth={1.6} aria-label={s.label} />
                          <span>{temp(d.min)}/{temp(d.max)}</span>
                          {d.pop >= 30 && <em>{d.pop}%</em>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
            {hasWeather && <p className="kn-pack"><b>What to pack:</b> {PACK(weather.cities[0]?.days?.[0]?.max)}</p>}
            <p className="kn-source">Source: Korea Meteorological Administration (data.go.kr)</p>
          </div>

          <div className="kn-tour">
            {tour.status === 'loading' && <p className="kn-muted">Finding festivals and places…</p>}
            {tour.status === 'error' && <p className="kn-muted">Seasonal highlights are unavailable right now.</p>}
            {tour.status === 'ok' && !cards.length && <p className="kn-muted">No listed festivals for this month yet.</p>}
            {hasTour && (
              <div className={`kn-cards ${Math.min(cards.length, 6) === 4 ? 'kn-cards--4' : ''}`}>
                {cards.slice(0, 6).map(card => (
                  <article key={`${card.kind}-${card.id}`} className="kn-card">
                    {card.image
                      ? <img src={card.image} alt="" loading="lazy" width="480" height="320" referrerPolicy="no-referrer" />
                      : <div className="kn-card-ph" aria-hidden="true"><MapPin size={26} /></div>}
                    <div className="kn-card-body">
                      <span className="kn-tag">{card.kind}</span>
                      <h3>{card.title}</h3>
                      {card.start && <p className="kn-date"><CalendarDays size={14} aria-hidden="true" /> {fmtRange(card.start, card.end)}</p>}
                      {!card.start && card.kind === 'Festival' && tour.usual && <p className="kn-date"><CalendarDays size={14} aria-hidden="true" /> Usually in {MONTHS[month - 1]}</p>}
                      {card.address && <p className="kn-addr">{card.address}</p>}
                      <a href={mapLink(card)} target="_blank" rel="noopener noreferrer">View on map ↗</a>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="kn-foot">
              <p className="kn-source">Festival and place information: Korea Tourism Organization (TourAPI). Photos: KOGL Type 1, Korea Tourism Organization. Dates can change — please check with organisers.</p>
              <button type="button" className="btg-btn btg-btn--gold btg-sheen" onClick={onBook}>Book airport VIP for your trip</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
