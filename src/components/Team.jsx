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

        <div className="ceo-message-container glass-panel animate-fade-in">
          <div className="ceo-image-wrapper">
            <div 
              className="ceo-image"
              style={{ backgroundImage: `url('/team_ceo.png')` }}
              role="img"
              aria-label={ceo.name}
            ></div>
            <div className="ceo-image-overlay">
              <div className="ceo-image-glow"></div>
            </div>
          </div>
          
          <div className="ceo-content">
            <div className="ceo-meta">
              <span className="ceo-role-badge">{ceo.role}</span>
              <Award size={24} className="ceo-icon" />
            </div>
            <h3 className="ceo-name">{ceo.name}</h3>
            <div className="ceo-divider"></div>
            <p className="ceo-bio">{ceo.bio}</p>
            
            <div className="ceo-signature">
              <span className="signature-font">{ceo.name}</span>
            </div>
          </div>
          
          {/* Outer Card Glow Border */}
          <div className="card-border-glow"></div>
        </div>
      </div>

      <style>{`
        .team-section {
          background: linear-gradient(to bottom, rgba(4, 9, 20, 1) 0%, rgba(10, 17, 34, 0.6) 50%, rgba(4, 9, 20, 1) 100%);
          position: relative;
        }

        .ceo-message-container {
          display: flex;
          flex-direction: row;
          max-width: 900px;
          margin: 50px auto 0;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          background: rgba(10, 17, 34, 0.6);
        }

        @media (max-width: 768px) {
          .ceo-message-container {
            flex-direction: column;
          }
        }

        .ceo-image-wrapper {
          flex: 0 0 40%;
          position: relative;
          min-height: 400px;
          background-color: rgba(6, 11, 23, 0.4);
        }
        
        @media (max-width: 768px) {
          .ceo-image-wrapper {
            min-height: 350px;
          }
        }

        .ceo-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center top;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ceo-message-container:hover .ceo-image {
          transform: scale(1.05);
        }

        .ceo-image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, rgba(6, 11, 23, 0) 70%, rgba(10, 17, 34, 0.8) 100%);
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .ceo-image-overlay {
             background: linear-gradient(to bottom, rgba(6, 11, 23, 0) 70%, rgba(10, 17, 34, 0.8) 100%);
          }
        }

        .ceo-content {
          flex: 1;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        @media (max-width: 640px) {
          .ceo-content {
            padding: 30px 20px;
          }
        }

        .ceo-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
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

        .ceo-icon {
          color: var(--gold-primary);
          opacity: 0.9;
        }

        .ceo-name {
          font-size: 1.8rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 12px;
        }

        .ceo-divider {
          width: 50px;
          height: 2px;
          background: var(--gold-dark);
          margin-bottom: 24px;
          transition: var(--transition-smooth);
        }

        .ceo-message-container:hover .ceo-divider {
          width: 80px;
          background: var(--gold-primary);
        }

        .ceo-bio {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.8;
          font-weight: 300;
          margin-bottom: 30px;
        }
        
        .ceo-signature {
          margin-top: auto;
          text-align: right;
        }
        
        .signature-font {
          font-family: 'Great Vibes', cursive, serif;
          font-size: 2rem;
          color: var(--gold-light);
          opacity: 0.8;
          font-style: italic;
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

        .ceo-message-container:hover .card-border-glow {
          border-color: rgba(252, 185, 51, 0.3);
          box-shadow: inset 0 0 20px rgba(252, 185, 51, 0.05);
        }
      `}</style>
    </section>
  );
}
