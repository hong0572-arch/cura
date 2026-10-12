import { lazy, Suspense, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FEATURES } from '../config/features';
import { CONTACT } from '../components/checkout/checkoutCopy';
import { journeysCopy } from '../content/journeysCopy';
import { localizePath } from '../utils/locale';
import './PrivateJourneys.css';

// 플래너는 지도·localStorage 를 쓰므로 브라우저에서만 불러온다 (사전 렌더링 HTML 에는 소개만)
const JourneyPlanner = lazy(() => import('../components/journeys/JourneyPlanner'));
const subscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false);

// Private Journeys — 기본: 입국·출국 의전 + 공항↔숙소 차량. 고객이 AI와 함께 장소를 고르고,
// 날짜별 차량·목적지별 가이드를 붙여 견적을 요청한다 (/api/journey-requests).
export default function PrivateJourneys({ lang = 'ko', settings }) {
  const c = journeysCopy[lang] || journeysCopy.ko;
  const navigate = useNavigate();
  const isClient = useIsClient();

  // 비활성화 상태: 준비 중 안내만 보여 주고 검색엔진에서 제외한다
  if (!FEATURES.privateJourneys) {
    return (
      <div className="pj-page">
        <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
        <section className="pj-hero on-navy">
          <div className="container pj-paused">
            <p className="btg-eyebrow">{c.paused.eyebrow}</p>
            <h1 className="pj-title">{c.paused.title}</h1>
            <p className="pj-intro">{c.paused.body}</p>
            <div className="pj-paused-actions">
              <a
                href={localizePath('/#hero', lang)}
                onClick={(e) => { e.preventDefault(); navigate(localizePath('/#hero', lang)); }}
                className="btg-btn btg-btn--gold btg-sheen"
              >
                {c.paused.book}
              </a>
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="btg-btn btg-btn--ghost">WhatsApp</a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pj-page">
      <section className="pj-hero on-navy">
        <div className="container pj-hero-inner">
          <div className="pj-hero-copy">
            <p className="btg-eyebrow">{c.eyebrow}</p>
            <h1 className="pj-title">{c.title}</h1>
            <p className="pj-intro">{c.intro}</p>
            <ul className="pj-points">
              {c.points.map(p => (
                <li key={p}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="pj-hero-media">
            <img src="/luggage_assistance.webp" alt="" width="640" height="480" />
          </div>
        </div>
      </section>

      <section className="container pj-how">
        <h2 className="pj-how-title">{c.howTitle}</h2>
        <ol className="pj-how-list">
          {c.how.map(([title, body], i) => (
            <li key={title}>
              <span className="pj-how-n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <p className="pj-not">{c.notIncluded}</p>
      </section>

      <section className="container pj-body" id="planner">
        {isClient ? (
          <Suspense fallback={<p className="pj-loading">{c.planner.loading}</p>}>
            <JourneyPlanner lang={lang} copy={c} settings={settings} />
          </Suspense>
        ) : (
          <p className="pj-loading">{c.planner.loading}</p>
        )}
        <p className="pj-airport">
          <a
            href={localizePath('/#hero', lang)}
            onClick={(e) => { e.preventDefault(); navigate(localizePath('/#hero', lang)); }}
            className="pj-link"
          >
            {c.airportCta} →
          </a>
        </p>
      </section>
    </div>
  );
}
