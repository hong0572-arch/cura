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

  const bgImages = [
    'https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=600',
    'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=600',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600',
    'https://images.unsplash.com/photo-1620614136976-79db04b732fb?auto=format&fit=crop&w=600',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?auto=format&fit=crop&w=600'
  ];

  return (
    <section id="values" className="values-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">{t.values.badge || 'Value Proposition'}</span>
          <h2 className="font-serif text-gold">{t.values.title}</h2>
          <p>{t.values.subtitle}</p>
        </div>

        <div className="grid-3 values-grid">
          {t.values.items.map((item, idx) => (
            <div 
              key={idx} 
              className="image-card"
              style={{ backgroundImage: `url(${bgImages[idx % bgImages.length]})` }}
            >
              <div className="image-card-overlay"></div>
              <div className="image-card-content">
                <div style={{ color: 'var(--gold-light)', marginBottom: '16px' }}>
                  {icons[idx]}
                </div>
                <h3 className="image-card-title">{item.title}</h3>
                <p className="image-card-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .values-section {
          background: transparent;
          position: relative;
        }

        .values-grid {
          margin-top: 50px;
        }
      `}</style>
    </section>
  );
}
