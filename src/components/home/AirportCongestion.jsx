import { useEffect, useState, useSyncExternalStore } from 'react';

// 인천공항 시간대별 예상 승객 수 (공공데이터: 인천국제공항공사_승객예고-출·입국장별) — 테스트(비공개)
// FEATURES.congestion 이 false 이면 주소에 ?congestion=1 을 붙였을 때만 보인다.
// 혼잡 단계는 그날 최대값 대비 상대값이며(공식 기준 아님), 공개 전 안내 문구를 공사와 협의해야 한다.

const COPY = {
  ko: {
    eyebrow: 'INCHEON AIRPORT · 예상 혼잡도',
    title: '오늘 인천공항, 언제 붐빌까요?',
    desc: '인천국제공항공사가 예고한 시간대별 예상 승객 수입니다. 붐비는 시간에도 전담 에스코트가 가장 빠른 동선으로 안내합니다.',
    terminal: '터미널', kind: '구분', day: '날짜',
    departure: '출국장', arrival: '입국장', today: '오늘', tomorrow: '내일',
    now: '지금', people: '명', hourRange: (h) => `${String(h).padStart(2, '0')}~${String((h + 1) % 24).padStart(2, '0')}시`,
    peak: (r, n) => `가장 붐비는 시간: ${r} (약 ${n.toLocaleString()}명)`,
    current: (r, n, lvl) => `지금(${r}) 예상 ${n.toLocaleString()}명 · ${lvl}`,
    levels: ['여유', '보통', '혼잡', '매우 혼잡'],
    levelNote: '혼잡 단계는 그날 가장 붐비는 시간 대비 상대 비교입니다.',
    gates: '출국장별 예상 (선택한 시간)',
    gate: (g) => `출국장 ${g}`,
    table: '시간대별 표로 보기',
    loading: '혼잡도 정보를 불러오는 중…',
    error: '지금은 혼잡도 정보를 불러올 수 없습니다.',
    source: '자료: 인천국제공항공사 승객 예고(공공데이터포털). 예상치이며 실제와 다를 수 있습니다.',
    test: '테스트 화면 — 방문자에게는 보이지 않습니다',
  },
  en: {
    eyebrow: 'INCHEON AIRPORT · EXPECTED CROWDS',
    title: 'When is Incheon busiest today?',
    desc: 'Hourly passenger forecasts published by Incheon International Airport Corporation. Even at peak times, your escort takes you the fastest way through.',
    terminal: 'Terminal', kind: 'Area', day: 'Day',
    departure: 'Departures', arrival: 'Arrivals', today: 'Today', tomorrow: 'Tomorrow',
    now: 'Now', people: '', hourRange: (h) => `${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`,
    peak: (r, n) => `Busiest: ${r} (about ${n.toLocaleString()} people)`,
    current: (r, n, lvl) => `Now (${r}): about ${n.toLocaleString()} people · ${lvl}`,
    levels: ['Quiet', 'Moderate', 'Busy', 'Very busy'],
    levelNote: 'Levels compare each hour with the busiest hour of the same day.',
    gates: 'By departure hall (selected hour)',
    gate: (g) => `Hall ${g}`,
    table: 'View as table',
    loading: 'Loading crowd forecast…',
    error: 'The crowd forecast is not available right now.',
    source: 'Source: Incheon International Airport Corporation passenger forecast (data.go.kr). Forecasts may differ from actual conditions.',
    test: 'Test view — not shown to visitors',
  },
};

const noSubscribe = () => () => {};
const previewFlag = () => (new URLSearchParams(window.location.search).get('congestion') === '1' ? 'on' : '');
const kstHour = () => String(new Date(Date.now() + 9 * 3600_000).getUTCHours());
const levelOf = (v, max) => (!max ? 0 : v / max < 0.4 ? 0 : v / max < 0.65 ? 1 : v / max < 0.85 ? 2 : 3);

export default function AirportCongestion({ lang = 'ko', enabled = false }) {
  const c = COPY[lang === 'en' ? 'en' : 'ko'];
  const preview = useSyncExternalStore(noSubscribe, previewFlag, () => '');
  const hourNow = Number(useSyncExternalStore(noSubscribe, kstHour, () => '-1'));
  const show = enabled || preview === 'on';
  const [day, setDay] = useState(0);
  const [terminal, setTerminal] = useState('t1');
  const [kind, setKind] = useState('departure');
  const [data, setData] = useState({ status: 'loading', hours: [], key: '' });
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (!show) return undefined;
    let alive = true;
    fetch(`/api/incheon/congestion?day=${day}`).then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => alive && setData({ status: 'ok', hours: d.hours || [], key: `${day}` }))
      .catch(() => alive && setData({ status: 'error', hours: [], key: `${day}` }));
    return () => { alive = false; };
  }, [day, show]);

  if (!show) return null;

  const series = data.hours.map(h => ({ hour: h.hour, value: h[terminal]?.[kind] ?? 0, gates: Array.isArray(h[terminal]?.gates) ? h[terminal].gates : Object.entries(h[terminal]?.gates || {}) }));
  const max = Math.max(1, ...series.map(s => s.value));
  const peak = series.reduce((a, b) => (b.value > (a?.value ?? -1) ? b : a), null);
  const nowRow = day === 0 ? series.find(s => s.hour === hourNow) : null;
  const sel = series.find(s => s.hour === picked) || nowRow || peak;
  const seg = (on) => (on ? 'is-on' : '');

  return (
    <section id="congestion" className="home-section" aria-labelledby="ac-title">
      <div className="container">
        <div className="ac btg-panel on-navy">
          {!enabled && <p className="ac-test">{c.test}</p>}
          <div className="ac-head">
            <div>
              <p className="btg-eyebrow">{c.eyebrow}</p>
              <h2 className="ac-title" id="ac-title">{c.title}</h2>
              <p className="ac-desc">{c.desc}</p>
            </div>
            <div className="ac-controls">
              <div className="ac-seg" role="group" aria-label={c.terminal}>
                {['t1', 't2'].map(t => <button key={t} type="button" className={seg(terminal === t)} aria-pressed={terminal === t} onClick={() => { setTerminal(t); setPicked(null); }}>{t.toUpperCase()}</button>)}
              </div>
              <div className="ac-seg" role="group" aria-label={c.kind}>
                {['departure', 'arrival'].map(k => <button key={k} type="button" className={seg(kind === k)} aria-pressed={kind === k} onClick={() => { setKind(k); setPicked(null); }}>{c[k]}</button>)}
              </div>
              <div className="ac-seg" role="group" aria-label={c.day}>
                {[0, 1].map(d => <button key={d} type="button" className={seg(day === d)} aria-pressed={day === d} onClick={() => { setDay(d); setPicked(null); }}>{d ? c.tomorrow : c.today}</button>)}
              </div>
            </div>
          </div>

          {data.status === 'loading' && <p className="ac-muted">{c.loading}</p>}
          {data.status === 'error' && <p className="ac-muted">{c.error}</p>}
          {data.status === 'ok' && series.length > 0 && (
            <>
              <div className="ac-summary">
                {nowRow && <p><b>{c.current(c.hourRange(nowRow.hour), nowRow.value, c.levels[levelOf(nowRow.value, max)])}</b></p>}
                {peak && <p>{c.peak(c.hourRange(peak.hour), peak.value)}</p>}
              </div>
              <div className="ac-chart" role="img" aria-label={series.map(s => `${c.hourRange(s.hour)} ${s.value}`).join(', ')}>
                {series.map(s => (
                  <button
                    key={s.hour}
                    type="button"
                    className={`ac-bar ${s.hour === nowRow?.hour ? 'is-now' : ''} ${s.hour === sel?.hour ? 'is-sel' : ''}`}
                    style={{ '--h': `${Math.max(2, (s.value / max) * 100)}%` }}
                    onClick={() => setPicked(s.hour)}
                    onMouseEnter={() => setPicked(s.hour)}
                    aria-label={`${c.hourRange(s.hour)} ${s.value}${c.people}`}
                  >
                    <span className="ac-fill" />
                    <span className="ac-tip">{c.hourRange(s.hour)}<br />{s.value.toLocaleString()}{c.people}</span>
                    {(s.hour % 3 === 0) && <span className="ac-x">{String(s.hour).padStart(2, '0')}</span>}
                    {s.hour === nowRow?.hour && <span className="ac-now">{c.now}</span>}
                  </button>
                ))}
              </div>
              <p className="ac-note">{c.levelNote}</p>
              {kind === 'departure' && sel && (
                <div className="ac-gates">
                  <p className="ac-k">{c.gates} · {c.hourRange(sel.hour)}</p>
                  <ul>
                    {sel.gates.filter(([, v]) => v != null).map(([g, v]) => (
                      <li key={g}><span>{c.gate(g)}</span><b>{Number(v).toLocaleString()}{c.people}</b></li>
                    ))}
                  </ul>
                </div>
              )}
              <details className="ac-table">
                <summary>{c.table}</summary>
                <table>
                  <tbody>
                    {series.map(s => <tr key={s.hour}><th scope="row">{c.hourRange(s.hour)}</th><td>{s.value.toLocaleString()}{c.people}</td><td>{c.levels[levelOf(s.value, max)]}</td></tr>)}
                  </tbody>
                </table>
              </details>
            </>
          )}
          <p className="ac-source">{c.source}</p>
        </div>
      </div>
    </section>
  );
}
