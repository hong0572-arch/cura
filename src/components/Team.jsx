import React from 'react';
import { Award } from 'lucide-react';

export default function Team({ t }) {
  if (!t.team || !t.team.members || t.team.members.length === 0) return null;
  const ceo = t.team.members[0];

  return (
    <section id="team" className="team-section section-padding">
      <div className="container">
        <div className="section-header animate-fade-in">
          <span className="badge-gold">{t.team.badge || 'CEO MESSAGE'}</span>
          <h2 className="font-serif text-gold">{t.team.title}</h2>
          <p>{t.team.subtitle}</p>
        </div>

        <div className="image-card" style={{ backgroundImage: `url('/team_ceo.png')`, minHeight: '500px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="image-card-overlay"></div>
          
          <div className="image-card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end' }}>
            <div className="ceo-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="ceo-role-badge">{ceo.role}</span>
              <Award size={24} style={{ color: 'var(--gold-primary)' }} />
            </div>
            <h3 className="image-card-title" style={{ fontSize: '2rem' }}>{ceo.name}</h3>
            <div style={{ width: '50px', height: '2px', background: 'var(--gold-primary)', marginBottom: '24px' }}></div>
            <p className="image-card-desc" style={{ fontSize: '1.1rem', marginBottom: '30px' }}>{ceo.bio}</p>
            
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: '"Great Vibes", cursive, serif', fontSize: '2rem', color: 'var(--gold-light)', fontStyle: 'italic' }}>{ceo.name}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .team-section {
          background: transparent;
          position: relative;
        }

        .ceo-role-badge {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--gold-primary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(252, 185, 51, 0.08);
          padding: 6px 14px;
          border-radius: 12px;
          border: 1px solid rgba(252, 185, 51, 0.15);
        }
      `}</style>
    </section>
  );
}
