import { useEffect, useState } from 'react';

// 공항 출발 안내판처럼 글자가 넘어가며 바뀌는 보드.
// 사전 렌더링·첫 화면은 정렬된 상태로 그리고, 마운트 후에만 움직인다 (하이드레이션 일치).
const COL_A = 13;
const COL_B = 9;
const FRAMES = 26;
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
const settle = (set) => set.rows.map(([a, b]) => ({ a: pad(a, COL_A), b: pad(b, COL_B) }));

function scramble(text, settled) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += i < settled || c === ' ' ? c : CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

export default function FlipBoard({ copy }) {
  const sets = copy.sets;
  const [index, setIndex] = useState(0);
  const [rows, setRows] = useState(() => settle(sets[0]));

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let current = 0;
    let flipTimer;
    const cycle = setInterval(() => {
      if (document.hidden) return;
      current = (current + 1) % sets.length;
      setIndex(current);
      const target = settle(sets[current]);
      let frame = 0;
      clearInterval(flipTimer);
      flipTimer = setInterval(() => {
        frame += 1;
        if (frame >= FRAMES) {
          clearInterval(flipTimer);
          setRows(target);
          return;
        }
        // 위 줄부터 차례로 맞춰진다
        setRows(target.map((r, ri) => {
          const p = Math.max(0, Math.min(1, (frame - ri * 2) / (FRAMES - 8)));
          return { a: scramble(r.a, Math.floor(p * COL_A)), b: scramble(r.b, Math.floor(p * COL_B)) };
        }));
      }, 45);
    }, 5500);
    return () => {
      clearInterval(cycle);
      clearInterval(flipTimer);
    };
  }, [sets]);

  const current = sets[index];

  return (
    <div className="flipboard" aria-label={current.title}>
      <div className="flipboard-radar" aria-hidden="true" />
      <div className="flipboard-head">
        <span className="flipboard-title">{current.title}</span>
        <span className="flipboard-live"><span className="flipboard-dot" aria-hidden="true" />{copy.live}</span>
      </div>
      {/* 화면 낭독기는 맞춰진 내용을 읽는다 */}
      <ul className="sr-only">
        {current.rows.map(([a, b]) => <li key={a}>{a} — {b}</li>)}
      </ul>
      <div className="flipboard-rows" aria-hidden="true">
        {rows.map((row, ri) => (
          <div className="flipboard-row" key={ri}>
            <span>{row.a.split('').map((ch, i) => <span className="flip-tile" key={i}>{ch}</span>)}</span>
            <span>{row.b.split('').map((ch, i) => <span className="flip-tile flip-tile--gold" key={i}>{ch}</span>)}</span>
          </div>
        ))}
      </div>
      <p className="flipboard-caption">{copy.caption}</p>
    </div>
  );
}
