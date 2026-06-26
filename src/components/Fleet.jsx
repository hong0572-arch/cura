import React from 'react';
import { Users, Briefcase, ChevronRight, Info } from 'lucide-react';

export default function Fleet({ t, onSelectVehicle, customImage }) {
  const fleetItems = [
    {
      id: 'staria',
      translationKey: 'minivan',
      iconColor: '#c5a880',
      pax: 4,
      bags: 4
    },
    {
      id: 'g90',
      translationKey: 'sedan',
      iconColor: '#d4af37',
      pax: 2,
      bags: 2
    },
    {
      id: 'sprinter',
      translationKey: 'large_van',
      iconColor: '#a68b64',
      pax: 6,
      bags: 6
    }
  ];

  const handleSelect = (vehicleId) => {
    onSelectVehicle(vehicleId);
    const element = document.getElementById('reserve');
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="fleet" className="fleet-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">{t.fleet.badge || 'Exclusive Chauffeur'}</span>
          <h2 className="font-serif text-gold">{t.fleet.title}</h2>
          <p>{t.fleet.subtitle}</p>
        </div>

        {/* Hero Visual Showcase */}
        <div className="fleet-hero-banner glass-panel">
          <div className="fleet-hero-overlay"></div>
          <div className="fleet-hero-img" style={{ backgroundImage: `url(${customImage || '/luxury_fleet.png'})` }}></div>
          <div className="fleet-hero-content">
            <h3 className="font-serif">{t.fleet.hero_title || 'The Beyond Premium Standard'}</h3>
            <p>{t.fleet.hero_desc || 'Every vehicle in our fleet is meticulously maintained and driven by professional, English-speaking VIP chauffeurs.'}</p>
          </div>
        </div>

        {/* Chauffeur Vehicle Selection Grid */}
        <div className="grid-3 fleet-grid">
          {fleetItems.map((item) => {
            const data = t.fleet.types[item.translationKey];
            return (
              <div key={item.id} className="fleet-card glass-panel">
                <div className="fleet-card-header">
                  <div className="fleet-class-badge" style={{ borderColor: item.iconColor, color: item.iconColor }}>
                    {data.class}
                  </div>
                  <h3 className="fleet-name">{data.name}</h3>
                  <div className="fleet-price-tag">
                    <span className="price-label">{t.fleet.starts_from || 'Starts from'}</span>
                    <span className="price-amount">{data.price}</span>
                  </div>
                </div>

                <p className="fleet-desc">{data.desc}</p>

                <div className="fleet-specs">
                  <div className="spec-item">
                    <Users size={16} className="spec-icon" />
                    <span>{data.capacity}</span>
                  </div>
                  <div className="spec-item">
                    <Briefcase size={16} className="spec-icon" />
                    <span>{item.bags} {t.fleet.bags_max_label || 'Checked Bags Max'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleSelect(item.id)} 
                  className="btn-select-fleet"
                >
                  <span>{t.fleet.btn_select || 'Select & Get Quote'}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Fleet Footnotes */}
        <div className="fleet-footnotes">
          <div className="footnote-item">
            <Info size={16} className="footnote-icon" />
            <span>{t.fleet.price_basis}</span>
          </div>
          <div className="footnote-item">
            <Info size={16} className="footnote-icon" />
            <span>{t.fleet.booking_notice}</span>
          </div>
        </div>
      </div>

      <style>{`
        .fleet-section {
          background: var(--bg-primary);
          position: relative;
        }

        .fleet-hero-banner {
          position: relative;
          height: 380px;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 50px;
          display: flex;
          align-items: flex-end;
          padding: 40px;
          border: 1px solid var(--border-subtle);
          transform: none !important;
        }

        .fleet-hero-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 1;
        }

        .fleet-hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to top, rgba(4, 9, 20, 0.9) 0%, rgba(4, 9, 20, 0.3) 100%);
          z-index: 2;
        }

        .fleet-hero-content {
          position: relative;
          z-index: 3;
          max-width: 600px;
        }

        .fleet-hero-content h3 {
          font-size: 2.2rem;
          color: #fff;
          margin-bottom: 12px;
        }

        .fleet-hero-content p {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.6;
        }

        .fleet-grid {
          margin-top: 30px;
        }

        .fleet-card {
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .fleet-card-header {
          margin-bottom: 20px;
        }

        .fleet-class-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: 1px solid;
          padding: 4px 10px;
          border-radius: 15px;
          margin-bottom: 12px;
        }

        .fleet-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }

        .fleet-price-tag {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .price-amount {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--gold-primary);
          font-family: var(--font-serif);
        }

        .fleet-desc {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin-bottom: 24px;
          line-height: 1.6;
          min-height: 48px;
        }

        .fleet-specs {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
          padding: 16px 0;
          margin-bottom: 24px;
        }

        .spec-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .spec-icon {
          color: var(--gold-primary);
        }

        .btn-select-fleet {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          color: #fff;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: var(--transition-smooth);
          width: 100%;
        }

        .fleet-card:hover .btn-select-fleet {
          background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold-primary) 100%);
          color: var(--bg-primary);
          border-color: transparent;
          box-shadow: 0 4px 15px var(--gold-glow);
        }

        .fleet-footnotes {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }

        .footnote-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          max-width: 800px;
          text-align: center;
        }

        .footnote-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .fleet-hero-banner {
            height: 250px;
            padding: 20px;
          }
          .fleet-hero-content h3 {
            font-size: 1.5rem;
          }
          .fleet-hero-content p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </section>
  );
}
