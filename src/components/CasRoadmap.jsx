import React from 'react';
import { Package, ShieldAlert, Users, CheckCircle2 } from 'lucide-react';

export default function CasRoadmap({ t }) {
  const casIcons = [
    <Package size={28} strokeWidth={1.5} />,
    <ShieldAlert size={28} strokeWidth={1.5} />,
    <Users size={28} strokeWidth={1.5} />
  ];

  return (
    <section id="cas" className="cas-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">CAS Aviation Portfolio</span>
          <h2 className="font-serif text-gold">{t.cas.title}</h2>
          <p>{t.cas.subtitle}</p>
        </div>

        <div className="grid-3 cas-grid">
          {t.cas.services.map((service, idx) => (
            <div key={idx} className="cas-card glass-panel">
              <div className="cas-card-header">
                <div className="cas-icon-wrap">
                  {casIcons[idx]}
                </div>
                <div className="cas-badge-upcoming">
                  <span className="glow-dot"></span>
                  {t.cas.upcoming}
                </div>
              </div>

              <div className="cas-card-body">
                <h3 className="cas-title">{service.title}</h3>
                <p className="cas-desc">{service.desc}</p>
                
                <div className="cas-divider"></div>
                
                <ul className="cas-details-list">
                  {service.details.map((detail, dIdx) => (
                    <li key={dIdx} className="cas-detail-item">
                      <CheckCircle2 size={14} className="detail-check-icon" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .cas-section {
          background: var(--bg-secondary);
          position: relative;
        }

        .cas-grid {
          margin-top: 40px;
        }

        .cas-card {
          padding: 30px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px dashed var(--border-subtle);
        }

        .cas-card:hover {
          border-style: solid;
          border-color: var(--gold-primary);
        }

        .cas-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .cas-icon-wrap {
          color: var(--gold-primary);
          background: rgba(197, 168, 128, 0.05);
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          display: inline-flex;
        }

        .cas-badge-upcoming {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--gold-primary);
          background: rgba(197, 168, 128, 0.08);
          border: 1px solid var(--border-subtle);
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .glow-dot {
          width: 6px;
          height: 6px;
          background: var(--gold-primary);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--gold-primary);
          animation: pulse-dot 1.5s infinite;
        }

        .cas-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }

        .cas-desc {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .cas-divider {
          height: 1px;
          background: linear-gradient(to right, var(--border-subtle), transparent);
          margin-bottom: 20px;
        }

        .cas-details-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cas-detail-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .detail-check-icon {
          color: var(--gold-primary);
          margin-top: 2px;
          flex-shrink: 0;
        }

        @keyframes pulse-dot {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </section>
  );
}
