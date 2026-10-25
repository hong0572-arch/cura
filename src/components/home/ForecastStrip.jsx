import { useEffect, useRef, useState } from 'react';

// 인천공항 시간대별 예상 승객 수 (공공데이터: 인천국제공항공사_승객예고-출·입국장별, 이용허락범위 제한 없음)
// ArrivalsLive 아래에 붙는 '오늘 남은 시간 예상' — 데이터를 받은 뒤 브라우저에서만 그린다.
// 24시간 시계 다이얼: 시간대마다 바깥으로 뻗는 칸(길이 = 예상 인원), 바늘 = 지금 시각(KST).
// 화면에 보이면 칸이 가운데서 차례로 피어나고 바늘이 지금 시각까지 돈다(prefers-reduced-motion 이면 정지).
// 붐빔 단계는 그날 가장 붐비는 시간 대비 상대값이다(공식 기준 아님).

const levelOf = (v, max) => (!max || !v ? 0 : v / max < 0.4 ? 0 : v / max < 0.65 ? 1 : v / max < 0.85 ? 2 : 3);
// 다이얼 치수 (viewBox 320×320)
const C = 160, R0 = 62, RMAX = 132, RLABEL = 148;
const polar = (r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
const wedge = (r1, r2, a1, a2) => {
  const [x1, y1] = polar(r1, a1), [x2, y2] = polar(r2, a1), [x3, y3] = polar(r2, a2), [x4, y4] = polar(r1, a2);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r2} ${r2} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)}L${x4.toFixed(1)} ${y4.toFixed(1)}A${r1} ${r1} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`;
};
const s1 = (r) => r.replace(/:00/g, '');
const range = (h) => `${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`;

export default function ForecastStrip({ c, terminal }) {
  const ref = useRef(null);
  const [play, setPlay] = useState(false);
  const [day, setDay] = useState(0);
  const [kind, setKind] = useState('arrival');
  const [picked, setPicked] = useState(null);
  const [minNow, setMinNow] = useState(-1); // KST 자정 이후 분
  const [data, setData] = useState({ status: 'loading', hours: [] });

  useEffect(() => {
    const tick = () => { const d = new Date(Date.now() + 9 * 3600_000); setMinNow(d.getUTCHours() * 60 + d.getUTCMinutes()); }; // KST
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/incheon/congestion?day=${day}`).then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => alive && setData({ status: 'ok', hours: d.hours || [] }))
      .catch(() => alive && setData({ status: 'error', hours: [] }));
    return () => { alive = false; };
  }, [day]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setPlay(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPlay(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [data.status]);

  // 데이터를 못 받으면 이 부분만 숨긴다 (실시간 화면은 그대로)
  if (data.status === 'error') return null;

  const hourNow = minNow < 0 ? -1 : Math.floor(minNow / 60);
  const t = terminal === 'T2' ? 't2' : 't1';
  const series = data.hours.map(h => ({
    hour: h.hour,
    value: h[t]?.[kind] ?? 0,
    parts: (kind === 'arrival' ? h[t]?.arrivalHalls : h[t]?.gates) || [],
  }));
  const max = Math.max(1, ...series.map(s => s.value));
  const isToday = day === 0;
  const upcoming = series.filter(s => !isToday || s.hour >= hourNow);
  const peak = (upcoming.length ? upcoming : series).reduce((a, b) => (b.value > (a?.value ?? -1) ? b : a), null);
  const nowRow = isToday ? series.find(s => s.hour === hourNow) : null;
  const sel = series.find(s => s.hour === picked) || nowRow || peak;
  const partMax = Math.max(1, ...(sel?.parts || []).map(([, v]) => v || 0));
  const partLabel = (name) => (kind === 'arrival' ? c.fcHall(name) : c.fcGate(name));
  const seg = (on) => (on ? 'is-on' : '');
  const handDeg = isToday && minNow >= 0 ? (minNow / 1440) * 360 : 0;
  const choose = (h) => setPicked(h);
  const onKey = (h) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(h); } };

  return (
    <div className="fc" ref={ref} data-play={play || undefined}>
      <div className="fc-head">
        <div>
          <p className="ac-k">{c.fcEyebrow}</p>
          <h3 className="fc-title">{c.fcTitle}</h3>
        </div>
        <div className="ac-controls">
          <div className="ac-seg" role="group" aria-label={c.fcKind}>
            {['arrival', 'departure'].map(k => <button key={k} type="button" className={seg(kind === k)} aria-pressed={kind === k} onClick={() => { setKind(k); setPicked(null); }}>{c.fcKinds[k]}</button>)}
          </div>
          <div className="ac-seg" role="group" aria-label={c.fcDay}>
            {[0, 1].map(d => <button key={d} type="button" className={seg(day === d)} aria-pressed={day === d} onClick={() => { setDay(d); setPicked(null); }}>{d ? c.fcTomorrow : c.fcToday}</button>)}
          </div>
        </div>
      </div>

      {data.status === 'loading' && <p className="ac-muted">{c.fcLoading}</p>}
      {data.status === 'ok' && series.length > 0 && (
        <>
          {peak && (
            <p className="fc-peak">
              {nowRow && <span>{c.fcNow(range(nowRow.hour), nowRow.value, c.fcLevels[levelOf(nowRow.value, max)])}</span>}
              <span>{(isToday ? c.fcPeakLeft : c.fcPeakDay)(range(peak.hour), peak.value)}</span>
            </p>
          )}
          <div className="fc-body">
            <svg className="fc-dial" viewBox="0 0 320 320" role="group" aria-label={c.fcTitle}>
              <circle className="fc-ring" cx={C} cy={C} r={R0 - 6} />
              <circle className="fc-ring fc-ring-outer" cx={C} cy={C} r={RMAX + 2} />
              {[0, 3, 6, 9, 12, 15, 18, 21].map(h => {
                const [x, y] = polar(RLABEL, h * 15 + 7.5);
                return <text key={h} className="fc-hr" x={x} y={y} textAnchor="middle" dominantBaseline="central">{String(h).padStart(2, '0')}</text>;
              })}
              {series.map((s, i) => {
                const lv = levelOf(s.value, max);
                const past = isToday && hourNow >= 0 && s.hour < hourNow;
                const r2 = R0 + Math.max(3, (s.value / max) * (RMAX - R0));
                const cls = `fc-seg fc-lv${lv}${past ? ' is-past' : ''}${s.hour === nowRow?.hour ? ' is-now' : ''}${s.hour === sel?.hour ? ' is-sel' : ''}`;
                return (
                  <path
                    key={s.hour}
                    className={cls}
                    d={wedge(R0, r2, s.hour * 15 + 1.2, s.hour * 15 + 13.8)}
                    style={{ '--i': i }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={s.hour === sel?.hour}
                    aria-label={`${range(s.hour)} ${c.fcPeople(s.value)} · ${c.fcLevels[lv]}`}
                    onClick={() => choose(s.hour)}
                    onMouseEnter={() => choose(s.hour)}
                    onKeyDown={onKey(s.hour)}
                  />
                );
              })}
              {peak && (() => {
                const [x, y] = polar(R0 + (peak.value / max) * (RMAX - R0) + 7, peak.hour * 15 + 7.5);
                return <circle className="fc-peak-dot" cx={x} cy={y} r="3" />;
              })()}
              {isToday && minNow >= 0 && (
                <g className="fc-hand" style={{ '--deg': `${handDeg}deg` }} aria-hidden="true">
                  <path className="fc-sweep" d={wedge(R0 - 4, RMAX + 2, -28, 0)} />
                  <line x1={C} y1={C} x2={C} y2={C - RMAX - 6} />
                  <circle cx={C} cy={C - RMAX - 6} r="3.5" />
                </g>
              )}
              <circle className="fc-hub" cx={C} cy={C} r={R0 - 10} />
              {sel && (
                <>
                  <text className="fc-c1" x={C} y={C - 20} textAnchor="middle">{s1(range(sel.hour))}</text>
                  <text className="fc-c2" x={C} y={C + 6} textAnchor="middle">{sel.value.toLocaleString()}</text>
                  <text className={`fc-c3 fc-lv${levelOf(sel.value, max)}`} x={C} y={C + 26} textAnchor="middle">{c.fcLevels[levelOf(sel.value, max)]}</text>
                </>
              )}
            </svg>
          {sel && (
            <div className="fc-detail" aria-live="polite">
              <p className="fc-detail-head">
                <b>{range(sel.hour)}</b>
                <span>{c.fcPeople(sel.value)}</span>
                <span className={`fc-badge fc-lv${levelOf(sel.value, max)}`}>{c.fcLevels[levelOf(sel.value, max)]}</span>
              </p>
              <ul className="fc-parts">
                {sel.parts.filter(([, v]) => v != null).map(([name, v]) => (
                  <li key={name}>
                    <span>{partLabel(name)}</span>
                    <i style={{ '--w': `${Math.max(3, ((v || 0) / partMax) * 100)}%` }} aria-hidden="true" />
                    <b>{(v || 0).toLocaleString()}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
          <p className="ac-note">{c.fcNote}</p>
        </>
      )}
    </div>
  );
}
