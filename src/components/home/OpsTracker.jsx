import { useEffect, useRef, useState } from 'react';

// 항공편 추적 데모: 비행기가 이동하고 단계가 차례로 켜진다.
// 첫 화면(사전 렌더링)과 '동작 줄이기' 사용자는 완료 상태를 정지 화면으로 본다.
const CYCLE = 10000;
const COMPLETE = CYCLE * 0.95;

function phaseOf(elapsed) {
  if (elapsed < CYCLE * 0.6) return 0;
  if (elapsed < CYCLE * 0.72) return 1;
  if (elapsed < CYCLE * 0.86) return 2;
  return 3;
}

export default function OpsTracker({ copy }) {
  const ref = useRef(null);
  const [elapsed, setElapsed] = useState(COMPLETE);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame;
    let start;
    let last = 0;
    let visible = false;

    const tick = (now) => {
      if (start === undefined) start = now;
      // 화면에 보일 때만, 초당 약 16번 갱신
      if (visible && now - last > 60) {
        last = now;
        setElapsed((now - start) % CYCLE);
      }
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const phase = phaseOf(elapsed);
  const progress = Math.min(1, elapsed / (CYCLE * 0.6)) * 100;

  return (
    <section id="how-we-work" className="home-section" ref={ref}>
      <div className="container">
        <div className="home-head home-head--split btg-reveal">
          <div>
            <p className="btg-eyebrow">{copy.eyebrow}</p>
            <h2 className="home-title">{copy.title}</h2>
          </div>
          <p className="home-lead">{copy.desc}</p>
        </div>

        <div className="tracker btg-panel btg-reveal">
          <div className="tracker-top">
            <span>{copy.tracking} <strong>KE012 · LAX → ICN</strong> ({copy.sample})</span>
            <span className="tracker-phase" aria-live="off">{copy.phases[phase]}</span>
          </div>
          <div className="tracker-route" aria-hidden="true">
            <strong>LAX</strong>
            <div className="tracker-line">
              <div className="tracker-fill" style={{ width: `${progress}%` }} />
              <svg className="tracker-plane" style={{ left: `${progress}%` }} width="26" height="26" viewBox="0 0 24 24">
                <path d="M2 13.5l8-1.5 5-9 2 .5-2.5 8.5 6-1 1.5 2-7.5 3.5-2 6-2-.5.5-5.5-8 1.5z" fill="currentColor" transform="rotate(45 12 12)" />
              </svg>
            </div>
            <strong>ICN</strong>
          </div>
          <ol className="tracker-steps">
            {copy.steps.map((step, i) => (
              <li key={step.time} className={i <= phase ? (i === phase ? 'is-current' : 'is-done') : ''}>
                <span className="tracker-time">{step.time}</span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
