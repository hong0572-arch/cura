import React from 'react';
import { Award, ShieldCheck, Zap, Globe, Coins, HeartHandshake } from 'lucide-react';

export default function CoreValues({ t }) {
  // Map icons to the values
  const icons = [
    <Award size={32} strokeWidth={1.5} />,
    <ShieldCheck size={32} strokeWidth={1.5} />,
    <Zap size={32} strokeWidth={1.5} />,
    <Globe size={32} strokeWidth={1.5} />,
    <Coins size={32} strokeWidth={1.5} />,
    <HeartHandshake size={32} strokeWidth={1.5} />
  ];

  return (
    <section id="values" className="values-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">Value Proposition</span>
          <h2 className="font-serif text-gold">{t.values.title}</h2>
          <p>{t.values.subtitle}</p>
        </div>

        <div className="grid-3 values-grid">
          {t.values.items.map((item, idx) => (
            <div key={idx} className="value-card glass-panel">
              <div className="value-card-inner">
                <div className="value-header">
                  <div className="value-icon-box">
                    {icons[idx]}
                  </div>
                  <span className="value-badge">{item.badge}</span>
                </div>
                
                <h3 className="value-title">{item.title}</h3>
                <p className="value-desc">{item.desc}</p>
              </div>
              <div className="card-border-glow"></div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .values-section {
          background: linear-gradient(to bottom, rgba(4, 9, 20, 1) 0%, rgba(10, 17, 34, 0.8) 50%, rgba(4, 9, 20, 1) 100%);
          position: relative;
        }

        .values-grid {
          margin-top: 50px;
        }

        .value-card {
          position: relative;
          height: 100%;
          overflow: hidden;
          padding: 30px;
          cursor: default;
        }

        .value-card-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .value-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .value-icon-box {
          color: var(--gold-primary);
          background: rgba(197, 168, 128, 0.05);
          border: 1px solid var(--border-subtle);
          padding: 12px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .value-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.03);
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .value-card:hover .value-icon-box {
          color: var(--bg-primary);
          background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold-primary) 100%);
          border-color: transparent;
          box-shadow: 0 0 15px var(--gold-glow);
          transform: rotate(5deg) scale(1.05);
        }

        .value-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 12px;
          transition: var(--transition-fast);
        }

        .value-card:hover .value-title {
          color: var(--gold-primary);
        }

        .value-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
          font-weight: 300;
        }

        /* Glowing Border effect */
        .card-border-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 1px solid transparent;
          border-radius: 16px;
          pointer-events: none;
          z-index: 1;
          transition: var(--transition-smooth);
        }

        .value-card:hover .card-border-glow {
          border-color: var(--gold-primary);
          box-shadow: inset 0 0 15px rgba(197, 168, 128, 0.05);
        }
      `}</style>
    </section>
  );
}
