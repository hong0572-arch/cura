import { useNavigate } from 'react-router-dom';
import { localizePath } from '../../utils/locale';

// 세 갈래: Private Journeys(사전 상담) · 공항 의전 & 차량(바로 예약) · 단체 & 기업(제안 요청)
export default function ThreeWays({ copy, lang }) {
  const navigate = useNavigate();
  const go = (e, href) => {
    e.preventDefault();
    navigate(localizePath(href, lang));
  };

  return (
    <section id="ways" className="home-section">
      <div className="container">
        <div className="home-head btg-reveal">
          <p className="btg-eyebrow">{copy.eyebrow}</p>
          <h2 className="home-title">{copy.title}</h2>
        </div>
        <div className="ways-grid">
          {copy.items.map(item => (
            <article key={item.id} id={`way-${item.id}`} className="way-card btg-card btg-reveal">
              <div className="way-media">
                <img src={item.image} alt={item.alt} loading="lazy" width="640" height="400" />
              </div>
              <div className="way-body">
                <p className="btg-eyebrow">{item.tag}</p>
                <h3 className="way-title">{item.title}</h3>
                <p className="way-desc">{item.desc}</p>
                <a
                  href={localizePath(item.href, lang)}
                  onClick={(e) => go(e, item.href)}
                  className={`btg-btn ${item.id === 'groups' ? 'btg-btn--ghost' : 'btg-btn--primary btg-sheen'} way-cta`}
                >
                  {item.cta}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
