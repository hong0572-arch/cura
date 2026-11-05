import { useNavigate, useParams } from 'react-router-dom';
import { localizePath } from '../utils/locale';
import { MARKET_SLUGS, marketCopy, arrivalFromUsd } from '../content/marketsCopy';
import './TravelFrom.css';

const WHATSAPP_URL = 'https://wa.me/821028533998';

// 해외 손님 안내 — /travel-from (목록), /travel-from/:market (국가별)
// 사전 렌더링되므로 렌더 중에 브라우저 API를 쓰지 않는다.
export default function TravelFrom({ lang, settings }) {
  const { market } = useParams();
  const navigate = useNavigate();
  const copy = marketCopy(lang);
  const { ui } = copy;
  const page = market ? copy.markets[market] : null;
  const price = arrivalFromUsd(settings);

  const go = (e, path) => {
    e.preventDefault();
    navigate(localizePath(path, lang));
  };
  const link = (path, label, className) => (
    <a className={className} href={localizePath(path, lang)} onClick={(e) => go(e, path)}>{label}</a>
  );

  if (market && !page) {
    return (
      <div className="tf-page">
        <div className="container tf-missing">
          <h1>{ui.notFound}</h1>
          {link('/travel-from', ui.hubCrumb, 'btg-btn btg-btn--primary')}
        </div>
      </div>
    );
  }

  const hero = page || copy.hub;
  const faq = page ? [...page.faq, ...copy.commonFaq] : copy.commonFaq;
  const others = MARKET_SLUGS.filter(slug => slug !== market);

  return (
    <div className="tf-page">
      <header className="tf-hero on-navy">
        <div className="container">
          <nav className="tf-crumbs" aria-label="Breadcrumb">
            {link('/', ui.breadcrumbHome)}
            <span aria-hidden="true">/</span>
            {page ? link('/travel-from', ui.hubCrumb) : <span aria-current="page">{ui.hubCrumb}</span>}
            {page && <><span aria-hidden="true">/</span><span aria-current="page">{page.eyebrow}</span></>}
          </nav>
          <p className="btg-eyebrow">{hero.eyebrow}</p>
          <h1 className="tf-title">{hero.h1}</h1>
          <p className="tf-intro">{hero.intro}</p>
          <div className="tf-actions">
            {link('/#hero', ui.book, 'btg-btn btg-btn--gold btg-sheen')}
            {link('/business', ui.groups, 'btg-btn tf-ghost')}
          </div>
        </div>
      </header>

      <div className="container tf-body">
        <section className="tf-facts btg-card" aria-labelledby="tf-facts-title">
          <h2 id="tf-facts-title" className="tf-facts-title">{ui.factsTitle}</h2>
          <dl>
            {price && <div><dt>{ui.fromPrice}</dt><dd>{ui.priceNote(price)}</dd></div>}
            {page && <div><dt>{lang === 'en' ? 'Time difference' : '시차'}</dt><dd>{page.timeDiff}</dd></div>}
            <div><dt>{ui.airportsLabel}</dt><dd>{ui.airportsValue}</dd></div>
            <div><dt>{ui.languagesLabel}</dt><dd>{ui.languagesValue}</dd></div>
          </dl>
        </section>

        {page ? (
          <>
            <section className="tf-section">
              <h2 className="tf-h2">{ui.highlightsTitle}</h2>
              <div className="tf-grid">
                {page.highlights.map(item => (
                  <article key={item.title} className="tf-card btg-card">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="tf-section">
              <h2 className="tf-h2">{ui.tipsTitle}</h2>
              <ul className="tf-tips">
                {page.tips.map(tip => <li key={tip}>{tip}</li>)}
              </ul>
            </section>

            {page.native && (
              <section className="tf-native btg-card" lang={page.native.lang} dir={page.native.dir}>
                <h2 className="tf-h3">{page.native.heading}</h2>
                <p>{page.native.text}</p>
              </section>
            )}
          </>
        ) : (
          <section className="tf-section">
            <h2 className="tf-h2">{copy.hub.marketsTitle}</h2>
            <div className="tf-grid">
              {MARKET_SLUGS.map(slug => {
                const item = copy.markets[slug];
                return (
                  <a key={slug} className="tf-card tf-card--link btg-card" href={localizePath(`/travel-from/${slug}`, lang)} onClick={(e) => go(e, `/travel-from/${slug}`)}>
                    <span className="tf-card-eyebrow">{item.eyebrow}</span>
                    <span className="tf-card-title">{item.h1}</span>
                    <span className="tf-card-more">{ui.readMore} →</span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <section className="tf-section" id="faq">
          <h2 className="tf-h2">{ui.faqTitle}</h2>
          <div className="tf-faq">
            {faq.map(item => (
              <details key={item.q} className="btg-card">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {page && (
          <section className="tf-section">
            <h2 className="tf-h3">{ui.otherMarkets}</h2>
            <ul className="tf-others">
              {others.map(slug => (
                <li key={slug}>{link(`/travel-from/${slug}`, copy.markets[slug].eyebrow)}</li>
              ))}
            </ul>
          </section>
        )}

        <aside className="tf-closing btg-panel">
          <div>
            <h2 className="tf-closing-title">{ui.closingTitle}</h2>
            <p>{ui.closingText}</p>
          </div>
          <div className="tf-actions">
            {link('/#hero', ui.book, 'btg-btn btg-btn--gold btg-sheen')}
            <a className="btg-btn tf-ghost" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{ui.whatsapp}</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
