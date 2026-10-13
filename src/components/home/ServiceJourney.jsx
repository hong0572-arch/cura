import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  PlaneLanding, PlaneTakeoff, UserCheck, BaggageClaim, FileCheck, Car, MapPin, Ticket,
  Receipt, Shield, Compass, CheckCircle2, CalendarClock, RefreshCw, Pause, Play, Plane,
} from 'lucide-react';

// 입국·출국·환승 "공항 동선" 모션 그래픽.
// 지도 위에서 고객(아이보리)과 전담 에스코트(골드)가 단계별 지점을 함께 이동하고,
// 지나온 길이 금색으로 채워지며 현재 단계의 설명이 말풍선·목록으로 강조된다.
// - PC: 가로 지도 + 말풍선 + 단계 카드 / 휴대폰(640px 이하): 세로 지도에 단계 설명을 함께 표시
// - 사전 렌더링: 가로·첫 단계 상태로 그려지고 단계 목록(HTML)은 그대로 검색엔진에 노출된다.
// - 화면에 보일 때만 자동 재생, 단계를 누르면 그 단계로 이동 후 일시정지.
// - prefers-reduced-motion: 자동 재생하지 않고 이동 효과 없이 단계만 바뀐다.

const ICONS = {
  arrival: [PlaneLanding, UserCheck, BaggageClaim, FileCheck, Car],
  departure: [MapPin, Ticket, Receipt, Shield, Compass, CheckCircle2],
  departureNoTax: [MapPin, Ticket, Shield, Compass, CheckCircle2],
  transfer: [CalendarClock, MapPin, RefreshCw, PlaneTakeoff],
};

const ZONES = {
  ko: { airside: '보안구역 (AIRSIDE)', landside: '일반구역 (LANDSIDE)', inbound: '도착 항공편', outbound: '출발 항공편', guest: '고객', agent: '전담 에스코트', play: '재생', pause: '일시정지', step: '단계' },
  en: { airside: 'AIRSIDE', landside: 'LANDSIDE', inbound: 'Inbound flight', outbound: 'Outbound flight', guest: 'You', agent: 'Your escort', play: 'Play', pause: 'Pause', step: 'Step' },
};

const STEP_MS = 3400;   // 한 단계 머무는 시간(이동 포함)
const MOVE_MS = 1500;   // 지점 사이 이동 시간 (CSS 와 같게)
const V_GAP = 108;      // 세로 지도 단계 간격

// 휴대폰 여부 — 서버·하이드레이션 때는 가로(false)로 그린 뒤 브라우저에서 바뀐다
const NARROW = '(max-width: 640px)';
const subscribeNarrow = (cb) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useNarrow = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);

// 지도 크기와 지점 좌표
function layout(vertical, n, kind) {
  if (!vertical) {
    const W = 1000, H = 300, left = 170, right = W - 150;
    return {
      W, H,
      pts: Array.from({ length: n }, (_, i) => ({
        x: Math.round(left + ((right - left) * i) / Math.max(1, n - 1)),
        y: i % 2 === 0 ? 168 : 128,
      })),
    };
  }
  const top = kind === 'departure' ? 70 : 140;
  const bottom = kind === 'arrival' ? 70 : 140;
  return {
    W: 360,
    H: top + (n - 1) * V_GAP + bottom,
    pts: Array.from({ length: n }, (_, i) => ({ x: i % 2 === 0 ? 92 : 104, y: top + i * V_GAP })),
  };
}

// 보안구역/일반구역 경계: 입국은 세관 다음, 출국은 보안검색 앞, 환승은 전 구간 보안구역
function boundaryFor(kind, n) {
  if (kind === 'arrival') return { after: n - 2, airsideFirst: true };
  if (kind === 'departure') return { after: n === 6 ? 2 : 1, airsideFirst: false };
  return null;
}

export default function ServiceJourney({ kind, steps, lang = 'ko', active = true }) {
  const z = ZONES[lang === 'en' ? 'en' : 'ko'];
  const icons = kind === 'departure' && steps.length === 5 ? ICONS.departureNoTax : ICONS[kind];
  const n = steps.length;
  const v = useNarrow();
  const { W, H, pts } = layout(v, n, kind);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [instant, setInstant] = useState(false);
  const rootRef = useRef(null);

  // 경로 길이 (지나온 길을 금색으로 채우는 데 사용)
  const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = seg.reduce((a, b) => a + b, 0);
  const done = seg.slice(0, step).reduce((a, b) => a + b, 0);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

  // 화면에 보일 때만 재생
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // 움직임 줄이기 설정이면 자동 재생하지 않는다
    if (!active || !visible || !playing || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const last = step >= n - 1;
    const id = setTimeout(() => {
      if (last) {
        // 끝까지 가면 이동 효과 없이 처음으로 돌아가 다시 시작
        setInstant(true);
        setStep(0);
      } else {
        setInstant(false);
        setStep(s => s + 1);
      }
    }, last ? STEP_MS + 1200 : STEP_MS);
    return () => clearTimeout(id);
  }, [active, visible, playing, step, n]);

  const jump = (i) => { setInstant(false); setStep(i); setPlaying(false); };
  const cur = pts[step];
  const b = boundaryFor(kind, n);
  const split = b ? Math.round(v ? (pts[b.after].y + pts[b.after + 1].y) / 2 : (pts[b.after].x + pts[b.after + 1].x) / 2) : null;
  const firstZone = b ? (b.airsideFirst ? z.airside : z.landside) : '';
  const secondZone = b ? (b.airsideFirst ? z.landside : z.airside) : '';
  const first = pts[0];
  const last = pts[n - 1];
  // 고객·에스코트 위치 (가로: 지점 위, 세로: 지점 왼쪽)
  const agentAt = v ? [cur.x - 54, cur.y - 12] : [cur.x + 4, cur.y - 50];
  const guestAt = v ? [cur.x - 54, cur.y + 12] : [cur.x + 26, cur.y - 44];

  return (
    <div ref={rootRef} className={`sj ${v ? 'sj--v' : ''} ${instant ? 'sj--instant' : ''}`} style={{ '--sj-move': `${MOVE_MS}ms` }}>
      <div className="sj-status" aria-live="polite">
        <span className="sj-status-k">{z.step} {step + 1}/{n}</span>
        <span className="sj-status-v" key={step}>{steps[step]?.title}</span>
        <button type="button" className="sj-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? z.pause : z.play}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      <svg className="sj-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={steps.map((s, i) => `${i + 1}. ${s.title}`).join(', ')}>
        <defs>
          <pattern id={`sj-dots-${kind}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(220,227,238,0.10)" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#sj-dots-${kind})`} />

        {/* 구역 표시 */}
        {b && !v && (
          <g className="sj-zones">
            <rect x="0" y="0" width={split} height={H} className={b.airsideFirst ? 'sj-zone-air' : 'sj-zone-land'} />
            <rect x={split} y="0" width={W - split} height={H} className={b.airsideFirst ? 'sj-zone-land' : 'sj-zone-air'} />
            <line x1={split} y1="18" x2={split} y2={H - 18} className="sj-boundary" />
            <text x={split - 14} y={H - 18} textAnchor="end" className="sj-zone-label">{firstZone}</text>
            <text x={split + 14} y={H - 18} className="sj-zone-label">{secondZone}</text>
          </g>
        )}
        {b && v && (
          <g className="sj-zones">
            <rect x="0" y="0" width={W} height={split} className={b.airsideFirst ? 'sj-zone-air' : 'sj-zone-land'} />
            <rect x="0" y={split} width={W} height={H - split} className={b.airsideFirst ? 'sj-zone-land' : 'sj-zone-air'} />
            <line x1="12" y1={split} x2={W - 12} y2={split} className="sj-boundary" />
            <text x={W - 14} y={split - 10} textAnchor="end" className="sj-zone-label">{firstZone} ↑</text>
            <text x={W - 14} y={split + 22} textAnchor="end" className="sj-zone-label">{secondZone} ↓</text>
          </g>
        )}
        {!b && (
          <g className="sj-zones">
            <rect x="0" y="0" width={W} height={H} className="sj-zone-air" />
            <text x={v ? W - 14 : W / 2} y={v ? 24 : H - 18} textAnchor={v ? 'end' : 'middle'} className="sj-zone-label">{z.airside}</text>
          </g>
        )}

        {/* 항공기: 입국은 출발점, 출국은 도착점, 환승은 양쪽 */}
        {(kind === 'arrival' || kind === 'transfer') && (
          <g className="sj-aircraft">
            {v ? (
              <>
                <line x1={first.x} y1="96" x2={first.x} y2={first.y - 34} className="sj-bridge" />
                <g transform={`translate(${first.x} 50) rotate(135)`}>
                  <g className="sj-plane-float"><Plane x={-30} y={-30} width={60} height={60} strokeWidth={1.2} className="sj-plane" aria-hidden="true" /></g>
                </g>
              </>
            ) : (
              <>
                <line x1="100" y1={first.y} x2={first.x - 34} y2={first.y} className="sj-bridge" />
                <g transform={`translate(62 ${first.y}) rotate(45)`}>
                  <g className="sj-plane-float"><Plane x={-34} y={-34} width={68} height={68} strokeWidth={1.2} className="sj-plane" aria-hidden="true" /></g>
                </g>
              </>
            )}
          </g>
        )}
        {(kind === 'departure' || kind === 'transfer') && (
          <g className="sj-aircraft">
            {v ? (
              <>
                <line x1={last.x} y1={last.y + 34} x2={last.x} y2={H - 96} className="sj-bridge" />
                <g transform={`translate(${last.x} ${H - 50}) rotate(135)`}>
                  <Plane x={-30} y={-30} width={60} height={60} strokeWidth={1.2} className="sj-plane" aria-hidden="true" />
                </g>
              </>
            ) : (
              <>
                <line x1={last.x + 34} y1={last.y} x2={W - 88} y2={last.y} className="sj-bridge" />
                <g transform={`translate(${W - 50} ${last.y}) rotate(-45)`}>
                  <Plane x={-34} y={-34} width={68} height={68} strokeWidth={1.2} className="sj-plane" aria-hidden="true" />
                </g>
              </>
            )}
          </g>
        )}

        {/* 동선 */}
        <path d={path} className="sj-route" />
        <path d={path} className="sj-route-done" style={{ strokeDasharray: total, strokeDashoffset: total - done }} />

        {/* 단계 지점 */}
        {pts.map((p, i) => {
          const Icon = icons[i] || CheckCircle2;
          const state = i < step ? 'is-done' : i === step ? 'is-current' : '';
          return (
            <g key={i} className={`sj-station ${state}`} transform={`translate(${p.x} ${p.y})`} onClick={() => jump(i)}>
              <circle r="40" className="sj-pulse" />
              <circle r="31" className="sj-pad" />
              <Icon x={-14} y={-14} width={28} height={28} strokeWidth={1.6} className="sj-icon" aria-hidden="true" />
              <g transform="translate(-26 -26)">
                <circle r="11" className="sj-num-bg" />
                <text y="4" textAnchor="middle" className="sj-num">{i + 1}</text>
              </g>
              {v ? (
                <>
                  <text x="48" y="-2" className="sj-label sj-label--v">{steps[i]?.title}</text>
                  <text x="48" y="20" className="sj-desc-v">{steps[i]?.desc}</text>
                </>
              ) : (
                <text y="62" textAnchor="middle" className="sj-label">{steps[i]?.title}</text>
              )}
            </g>
          );
        })}

        {/* 고객과 전담 에스코트 */}
        <g className="sj-mover sj-mover--agent" style={{ transform: `translate(${agentAt[0]}px, ${agentAt[1]}px)` }}>
          <circle r="9" className="sj-agent" />
        </g>
        <g className="sj-mover sj-mover--guest" style={{ transform: `translate(${guestAt[0]}px, ${guestAt[1]}px)` }}>
          <circle r="9" className="sj-guest" />
        </g>

        {/* 현재 단계 설명 말풍선 (가로 지도) */}
        {!v && steps[step]?.desc && (() => {
          const text = steps[step].desc;
          const bw = Math.min(320, Math.max(130, text.length * (lang === 'en' ? 7.6 : 13.5) + 32));
          const bxp = Math.min(W - bw - 8, Math.max(8, cur.x - bw / 2));
          return (
            <g key={`b-${step}`} transform={`translate(${bxp} ${cur.y - 108})`}>
              <g className="sj-bubble">
                <rect width={bw} height="34" rx="17" />
                <path d={`M${cur.x - bxp - 7} 34 L${cur.x - bxp} 43 L${cur.x - bxp + 7} 34 Z`} />
                <text x={bw / 2} y="22" textAnchor="middle">{text}</text>
              </g>
            </g>
          );
        })()}
      </svg>

      <ul className="sj-legend" aria-hidden="true">
        <li><i className="sj-dot sj-dot--guest" />{z.guest}</li>
        <li><i className="sj-dot sj-dot--agent" />{z.agent}</li>
      </ul>

      <ol className="sj-steps" style={{ '--sj-n': n }}>
        {steps.map((s, i) => (
          <li key={i} className={i < step ? 'is-done' : i === step ? 'is-current' : ''}>
            <button type="button" onClick={() => jump(i)} aria-current={i === step ? 'step' : undefined}>
              <span className="sj-step-n">{String(i + 1).padStart(2, '0')}</span>
              <b>{s.title}</b>
              <span>{s.desc}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
