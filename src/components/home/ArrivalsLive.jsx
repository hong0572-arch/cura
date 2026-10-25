import { useEffect, useState, useSyncExternalStore } from 'react';
import ArrivalsFlow from './ArrivalsFlow';
import ForecastStrip from './ForecastStrip';

// 인천공항 입국장 실시간 현황 (공공데이터: 인천국제공항공사_입국장현황 정보 서비스) — 테스트(비공개)
// FEATURES.congestion 이 false 이면 주소에 ?congestion=1 을 붙였을 때만 보인다.
// 입국장별 붐빔 정도는 같은 시간대 다른 입국장과의 상대 비교다(공식 기준 아님).

const COPY = {
  ko: {
    eyebrow: 'INCHEON AIRPORT · 입국장 실시간',
    title: '지금 인천공항 입국장은?',
    desc: '앞뒤 2시간 사이 도착하는 항공편과 입국장별 승객 수입니다. 붐비는 입국장이어도 전담 에스코트가 탑승교에서부터 가장 빠른 동선으로 모십니다.',
    find: '항공편 번호로 찾기', findPh: '예: KE082',
    notFound: '앞뒤 2시간 안에 도착하는 해당 항공편이 없습니다.',
    hall: (h) => `입국장 ${h}`,
    flights: (n) => `도착 ${n}편`,
    pax: (n) => `${n.toLocaleString()}명`,
    levels: ['여유', '보통', '붐빔'],
    upcoming: '도착 예정 항공편',
    cols: ['도착', '편명', '출발', '입국장', '게이트', '승객'],
    delayed: '변경',
    yourFlight: '찾은 항공편',
    arrive: '도착 예정', gate: '게이트', from: '출발',
    loading: '입국장 정보를 불러오는 중…',
    error: '지금은 입국장 정보를 불러올 수 없습니다.',
    updated: (t) => `${t} 기준`,
    note: '입국장 붐빔 정도는 같은 시간 다른 입국장과 비교한 값입니다. 승객 수는 공항공사 집계 기준이며 실제와 다를 수 있습니다.',
    source: '자료: 인천국제공항공사 입국장현황 정보·승객예고(공공데이터포털)',
    test: '테스트 화면 — 방문자에게는 보이지 않습니다',
    empty: '이 터미널에는 지금 앞뒤 2시간 사이 도착편이 없습니다.',
    radar: '도착 레이더 · 앞뒤 2시간',
    now: '지금',
    planeLabel: (f, from, t, hall, pax) => `${f} · ${from} 출발 · ${t} 도착 · 입국장 ${hall || '-'} · ${pax.toLocaleString()}명`,
    flowTitle: '입국장별 승객 흐름',
    stages: ['탑승교', '입국심사', '수하물', '입국장'],
    none: '도착편 없음',
    legendDot: '점이 많을수록 승객이 많고, 붐비는 입국장은 입국심사에서 머뭅니다',
    legendEscort: '전담 에스코트 — 가장 빠른 동선으로 안내',
    fcEyebrow: '시간대별 예상 · 인천국제공항공사 예고',
    fcTitle: '오늘 남은 시간, 언제 붐빌까요?',
    fcKind: '구분', fcDay: '날짜',
    fcKinds: { arrival: '입국장', departure: '출국장' },
    fcToday: '오늘', fcTomorrow: '내일',
    fcLoading: '예상 승객 수를 불러오는 중…',
    fcPeople: (n) => `예상 ${n.toLocaleString()}명`,
    fcNow: (r, n, lvl) => `지금(${r}) 예상 ${n.toLocaleString()}명 · ${lvl}`,
    fcPeakLeft: (r, n) => `남은 시간 중 가장 붐빔: ${r} (약 ${n.toLocaleString()}명)`,
    fcPeakDay: (r, n) => `가장 붐비는 시간: ${r} (약 ${n.toLocaleString()}명)`,
    fcLevels: ['여유', '보통', '혼잡', '매우 혼잡'],
    fcHall: (h) => `입국장 ${h}`,
    fcGate: (g) => `출국장 ${g}`,
    fcNote: '인천국제공항공사가 예고한 예상치이며 실제와 다를 수 있습니다. 붐빔 단계는 그날 가장 붐비는 시간과 비교한 값입니다.',
  },
  en: {
    eyebrow: 'INCHEON AIRPORT · ARRIVALS LIVE',
    title: 'Incheon arrival halls, right now',
    desc: 'Flights landing within two hours either side of now, with passengers by arrival hall. Whichever hall is busy, your escort meets you at the aircraft door and takes the fastest way through.',
    find: 'Find your flight', findPh: 'e.g. KE082',
    notFound: 'That flight is not landing within two hours of now.',
    hall: (h) => `Hall ${h}`,
    flights: (n) => `${n} flight${n === 1 ? '' : 's'}`,
    pax: (n) => `${n.toLocaleString()} pax`,
    levels: ['Quiet', 'Moderate', 'Busy'],
    upcoming: 'Arriving flights',
    cols: ['Arrives', 'Flight', 'From', 'Hall', 'Gate', 'Pax'],
    delayed: 'changed',
    yourFlight: 'Your flight',
    arrive: 'Arrives', gate: 'Gate', from: 'From',
    loading: 'Loading arrival halls…',
    error: 'Arrival information is not available right now.',
    updated: (t) => `as of ${t} KST`,
    note: 'Hall levels compare each hall with the others at the same time. Passenger numbers come from the airport and may differ from actual conditions.',
    source: 'Source: Incheon International Airport Corporation arrival hall status and passenger forecast (data.go.kr)',
    test: 'Test view — not shown to visitors',
    empty: 'No flights landing at this terminal within two hours of now.',
    radar: 'Arrivals radar · two hours either side',
    now: 'Now',
    planeLabel: (f, from, t, hall, pax) => `${f} from ${from} · lands ${t} · Hall ${hall || '-'} · ${pax.toLocaleString()} pax`,
    flowTitle: 'Passenger flow by arrival hall',
    stages: ['Gate', 'Immigration', 'Baggage', 'Arrival hall'],
    none: 'No flights',
    legendDot: 'More dots, more passengers — busy halls slow down at immigration',
    legendEscort: 'Your escort — the fastest way through',
    fcEyebrow: 'Hourly forecast · published by the airport',
    fcTitle: 'When will Incheon be busy today?',
    fcKind: 'Area', fcDay: 'Day',
    fcKinds: { arrival: 'Arrivals', departure: 'Departures' },
    fcToday: 'Today', fcTomorrow: 'Tomorrow',
    fcLoading: 'Loading the passenger forecast…',
    fcPeople: (n) => `about ${n.toLocaleString()} people`,
    fcNow: (r, n, lvl) => `Now (${r}): about ${n.toLocaleString()} people · ${lvl}`,
    fcPeakLeft: (r, n) => `Busiest for the rest of today: ${r} (about ${n.toLocaleString()})`,
    fcPeakDay: (r, n) => `Busiest: ${r} (about ${n.toLocaleString()})`,
    fcLevels: ['Quiet', 'Moderate', 'Busy', 'Very busy'],
    fcHall: (h) => `Hall ${h}`,
    fcGate: (g) => `Departure area ${g}`,
    fcNote: 'Forecasts published by Incheon International Airport Corporation; actual numbers may differ. Levels compare each hour with the busiest hour of the same day.',
  },
};

const noSubscribe = () => () => {};
const previewFlag = () => (new URLSearchParams(window.location.search).get('congestion') === '1' ? 'on' : '');
const kst = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : '--:--');
const norm = (v) => String(v || '').toUpperCase().replace(/[\s-]/g, '');

export default function ArrivalsLive({ lang = 'ko', enabled = false }) {
  const c = COPY[lang === 'en' ? 'en' : 'ko'];
  const preview = useSyncExternalStore(noSubscribe, previewFlag, () => '');
  const show = enabled || preview === 'on';
  const [terminal, setTerminal] = useState('T1');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ status: 'loading', flights: [], updatedAt: '' });

  useEffect(() => {
    if (!show) return undefined;
    let alive = true;
    const load = () => fetch('/api/incheon/arrivals').then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => alive && setData({ status: 'ok', flights: d.flights || [], updatedAt: d.updatedAt || '' }))
      .catch(() => alive && setData(prev => ({ ...prev, status: prev.flights.length ? 'ok' : 'error' })));
    load();
    const id = setInterval(load, 2 * 60_000); // 2분마다 새로고침
    return () => { alive = false; clearInterval(id); };
  }, [show]);

  if (!show) return null;

  const list = data.flights.filter(f => f.terminal === terminal);
  // 도착 예정: 15분 전부터 (이미 내린 편은 빼고), 시간순
  const since = data.updatedAt ? new Date(data.updatedAt).getTime() - 15 * 60_000 : 0;
  const upcoming = [...list].filter(f => !since || new Date(f.estimated).getTime() >= since)
    .sort((a, b) => a.estimated.localeCompare(b.estimated)).slice(0, 14);
  const q = norm(query);
  const found = q.length >= 3 ? data.flights.find(f => norm(f.flight) === q) || data.flights.find(f => norm(f.flight).includes(q)) : null;

  return (
    <section id="arrivals-live" className="home-section" aria-labelledby="al-title">
      <div className="container">
        <div className="ac btg-panel on-navy">
          {!enabled && <p className="ac-test">{c.test}</p>}
          <div className="ac-head">
            <div>
              <p className="btg-eyebrow">{c.eyebrow}</p>
              <h2 className="ac-title" id="al-title">{c.title}</h2>
              <p className="ac-desc">{c.desc}</p>
            </div>
            <div className="ac-controls">
              <div className="ac-seg" role="group" aria-label="Terminal">
                {['T1', 'T2'].map(t => <button key={t} type="button" className={terminal === t ? 'is-on' : ''} aria-pressed={terminal === t} onClick={() => setTerminal(t)}>{t}</button>)}
              </div>
            </div>
          </div>

          <label className="al-find">
            <span>{c.find}</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={c.findPh} autoComplete="off" />
          </label>
          {q.length >= 3 && data.status === 'ok' && (
            found ? (
              <div className="al-found" role="status">
                <span className="ac-k">{c.yourFlight}</span>
                <b>{found.flight}</b>
                <span>{c.from} {found.from}</span>
                <span>{c.arrive} {kst(found.estimated)}{found.estimated !== found.scheduled ? ` (${c.delayed} · ${kst(found.scheduled)})` : ''}</span>
                <span>{found.terminal} · {c.hall(found.hall)} · {c.gate} {found.gate}</span>
              </div>
            ) : <p className="ac-muted">{c.notFound}</p>
          )}

          {data.status === 'loading' && <p className="ac-muted">{c.loading}</p>}
          {data.status === 'error' && <p className="ac-muted">{c.error}</p>}
          {data.status === 'ok' && (
            list.length === 0 ? <p className="ac-muted">{c.empty}</p> : (
              <>
                <ArrivalsFlow
                  c={c}
                  flights={data.flights}
                  terminal={terminal}
                  updatedAt={data.updatedAt}
                  highlightHall={found && found.terminal === terminal ? found.hall : ''} highlightFlight={found ? found.flight : ''}
                  onPick={(f) => setQuery(f)}
                />
                <p className="ac-note">{c.note}</p>
                <p className="ac-k">{c.upcoming}</p>
                {upcoming.length === 0 && <p className="ac-muted">{c.empty}</p>}
                <div className="al-table-wrap">
                  <table className="al-table">
                    <thead><tr>{c.cols.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
                    <tbody>
                      {upcoming.map(f => (
                        <tr key={`${f.flight}-${f.scheduled}`}>
                          <td className="mono">{kst(f.estimated)}{f.estimated !== f.scheduled && <s>{kst(f.scheduled)}</s>}</td>
                          <td className="mono">{f.flight}</td>
                          <td className="mono">{f.from}</td>
                          <td>{f.hall}</td>
                          <td className="mono">{f.gate}</td>
                          <td className="mono">{(f.korean + f.foreign).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
          <ForecastStrip c={c} terminal={terminal} />
          <p className="ac-source">{c.source}{data.updatedAt ? ` · ${c.updated(kst(data.updatedAt))}` : ''}</p>
        </div>
      </div>
    </section>
  );
}
