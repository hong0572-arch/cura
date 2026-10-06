import { useNavigate } from 'react-router-dom';
import { localizePath } from '../../utils/locale';

export default function ClosingCta({ copy, lang }) {
  const navigate = useNavigate();
  const go = (e, href) => {
    e.preventDefault();
    navigate(localizePath(href, lang));
  };

  return (
    <section className="closing on-navy">
      <div className="container closing-inner btg-reveal">
        <div>
          <h2 className="closing-title">{copy.title}</h2>
          <p className="closing-desc">{copy.desc}</p>
        </div>
        <div className="closing-actions">
          <a href={localizePath('/private-journeys', lang)} onClick={(e) => go(e, '/private-journeys')} className="btg-btn btg-btn--gold btg-sheen">{copy.primary}</a>
          <a href={localizePath('/#hero', lang)} onClick={(e) => go(e, '/#hero')} className="btg-btn closing-ghost">{copy.secondary}</a>
        </div>
      </div>
    </section>
  );
}
