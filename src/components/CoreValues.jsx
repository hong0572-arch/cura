import { Award, ShieldCheck, Zap, Globe, Coins, HeartHandshake } from 'lucide-react';

// 6가지 가치 — 큰 사진 카드 대신 간결한 목록 (모바일 길이 단축)
const icons = [Award, ShieldCheck, Zap, Globe, Coins, HeartHandshake];

export default function CoreValues({ t }) {
  return (
    <section id="values" className="home-section">
      <div className="container">
        <div className="home-head btg-reveal">
          <p className="btg-eyebrow">{t.values.badge || 'Our promise'}</p>
          <h2 className="home-title">{t.values.title}</h2>
          {t.values.subtitle && <p className="home-lead" style={{ marginTop: '14px' }}>{t.values.subtitle}</p>}
        </div>

        <div className="promise-grid btg-reveal">
          {t.values.items.map((item, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <div key={item.title} className="promise-item">
                <Icon className="promise-icon" size={26} strokeWidth={1.5} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
