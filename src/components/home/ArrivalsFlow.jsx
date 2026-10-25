import { useEffect, useRef, useState } from 'react';

// 인천공항 입국장 실시간 — 모션 그래픽 (ArrivalsLive 안에서만 쓰인다, 데이터를 받은 뒤 브라우저에서만 렌더링)
// 1) 도착 레이더: 앞뒤 2시간 도착편이 '지금' 선으로 다가온다(실제 시간에 맞춰 이동, 크기 = 승객 수)
// 2) 입국장 흐름: 승객(점)이 탑승교 → 입국심사 → 수하물 → 입국장으로 흐른다.
//    붐비는 입국장은 입국심사 구간에서 점이 머물고, 금색 에스코트 점은 머물지 않고 지나간다(연출, 소요 시간 보장 아님).
// 화면에 보일 때만 움직이고, prefers-reduced-motion 이면 멈춘 그림으로 보여 준다(home.css .af).

const HALLS = { T1: ['A', 'B', 'C', 'D', 'E', 'F'], T2: ['A', 'B'] };
const WINDOW_MIN = 120; // 앞뒤 2시간
const MAX_DOTS = 22;

const kst = (ms) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
// 같은 입력이면 같은 값 (점 위치가 새로고침마다 흔들리지 않게)
const jitter = (seed) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

function Plane() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12.6 9.5 11 13 3.5h2.2L13.6 11l5.6-.6 1.9-2.4h1.4l-.8 4 .8 4h-1.4l-1.9-2.4-5.6-.6 1.6 7.5H13L9.5 13 2 11.4z" transform="rotate(180 12 12)" />
    </svg>
  );
}

export default function ArrivalsFlow({ c, flights, terminal, updatedAt, highlightHall, highlightFlight, onPick }) {
  const ref = useRef(null);
  const [play, setPlay] = useState(false);
  const [now, setNow] = useState(() => (updatedAt ? new Date(updatedAt).getTime() : 0));

  // 실제 시간에 맞춰 비행기를 움직인다 (30초마다, CSS transition 으로 부드럽게)
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // 화면에 보일 때만 재생
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setPlay(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const list = flights.filter(f => f.terminal === terminal);
  const halls = [...new Set([...(HALLS[terminal] || []), ...list.map(f => f.hall).filter(Boolean)])].sort();
  const byHall = halls.map(h => {
    const fs = list.filter(f => f.hall === h);
    return { hall: h, flights: fs.length, pax: fs.reduce((t, f) => t + f.korean + f.foreign, 0) };
  });
  const maxPax = Math.max(1, ...byHall.map(h => h.pax));
  const level = (p) => (!p ? 0 : p / maxPax < 0.4 ? 0 : p / maxPax < 0.75 ? 1 : 2);
  const busiest = byHall.reduce((a, b) => (b.pax > (a?.pax ?? 0) ? b : a), null);
  const escortHall = highlightHall || busiest?.hall;

  // 레이더: 지금 기준 x 위치(%) + 겹치지 않게 3줄로 나눈다
  const start = now - WINDOW_MIN * 60_000;
  const span = WINDOW_MIN * 2 * 60_000;
  const lanes = [-Infinity, -Infinity, -Infinity];
  const planes = list
    .map(f => ({ ...f, t: new Date(f.estimated).getTime(), pax: f.korean + f.foreign }))
    .filter(f => Number.isFinite(f.t))
    .map(f => ({ ...f, x: Math.min(97, Math.max(3, ((f.t - start) / span) * 100)) }))
    .sort((a, b) => a.x - b.x)
    .map(f => {
      let lane = lanes.findIndex(last => f.x - last >= 5);
      if (lane < 0) lane = lanes.indexOf(Math.min(...lanes));
      lanes[lane] = f.x;
      return { ...f, lane };
    });
  const maxPlanePax = Math.max(1, ...planes.map(p => p.pax));

  return (
    <div className="af" ref={ref} data-play={play || undefined}>
      {/* 1) 도착 레이더 */}
      <div className="af-radar" aria-label={c.radar}>
        <p className="ac-k">{c.radar}</p>
        <div className="af-sky">
          <span className="af-now" style={{ left: '50%' }}><em>{c.now} {now ? kst(now) : ''}</em></span>
          {planes.map(p => {
            const mins = Math.round((p.t - now) / 60_000);
            const state = mins < -5 ? 'landed' : mins <= 15 ? 'landing' : 'inbound';
            return (
              <button
                key={`${p.flight}-${p.scheduled}`}
                type="button"
                className={`af-plane is-${state}${highlightFlight && p.flight === highlightFlight ? ' is-hl' : ''}`}
                style={{ left: `${p.x}%`, '--lane': p.lane, '--s': (0.75 + 0.6 * Math.sqrt(p.pax / maxPlanePax)).toFixed(2) }}
                onClick={() => onPick(p.flight)}
                aria-label={c.planeLabel(p.flight, p.from, kst(p.t), p.hall, p.pax)}
                title={c.planeLabel(p.flight, p.from, kst(p.t), p.hall, p.pax)}
              >
                <Plane />
                <span className="af-tag">{p.flight}</span>
              </button>
            );
          })}
        </div>
        <div className="af-axis" aria-hidden="true">
          <span>−2h</span><span>−1h</span><span className="is-now">{c.now}</span><span>+1h</span><span>+2h</span>
        </div>
      </div>

      {/* 2) 입국장 흐름 */}
      <p className="ac-k">{c.flowTitle}</p>
      <div className="af-flow" style={{ '--cols': byHall.length }}>
        <div className="af-stages" aria-hidden="true">
          {c.stages.map(s => <span key={s}>{s}</span>)}
        </div>
        <ul className="af-cols">
          {byHall.map((h, hi) => {
            const lv = level(h.pax);
            const n = h.pax ? Math.min(MAX_DOTS, Math.max(2, Math.ceil(h.pax / 45))) : 0;
            const dur = lv === 2 ? 7 : lv === 1 ? 5.5 : 4.5;
            const isEscort = h.hall === escortHall && h.pax > 0;
            return (
              <li key={h.hall} className={`af-col af-lv${lv}${h.hall === highlightHall ? ' is-hl' : ''}`}>
                <div className="af-track" aria-hidden="true">
                  {Array.from({ length: n }, (_, i) => (
                    <i
                      key={i}
                      className="af-dot"
                      style={{ '--x': `${12 + jitter(hi * 31 + i) * 76}%`, '--d': `${(-dur * i) / n}s`, '--t': `${dur}s`, '--p': (i / n).toFixed(3) }}
                    />
                  ))}
                  {isEscort && <i className="af-dot af-escort" style={{ '--x': '50%', '--d': '-1.2s', '--t': '3.2s', '--p': '0.8' }} />}
                </div>
                <div className="af-door">
                  <span className="af-fill" style={{ '--h': `${Math.max(h.pax ? 8 : 0, (h.pax / maxPax) * 100)}%` }} aria-hidden="true" />
                  <b>{h.hall}</b>
                </div>
                <div className="af-meta">
                  <strong>{c.pax(h.pax)}</strong>
                  <span>{c.flights(h.flights)}</span>
                  <span className="af-level">{h.pax ? c.levels[lv] : c.none}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="af-legend">
        <span><i className="af-key" />{c.legendDot}</span>
        <span><i className="af-key af-key-escort" />{c.legendEscort}</span>
      </p>
    </div>
  );
}
