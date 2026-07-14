import { Award, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

export default function Team({ t }) {
  // We can map unique icons to each member to add premium details
  const memberIcons = [
    <Award size={18} className="member-icon" />,
    <ShieldCheck size={18} className="member-icon" />,
    <TrendingUp size={18} className="member-icon" />,
    <Sparkles size={18} className="member-icon" />
  ];

  // Map local image paths to the index
  const memberImages = [
    '/team_ceo.png',
    '/team_coo.png',
    '/team_cso.png',
    '/team_gm.png'
  ];

  if (!t.team) return null;

  return (
    <section id="team" className="team-section section-padding">
      <div className="container">
        <div className="section-header animate-fade-in">
          <span className="badge-gold">{t.team.badge || 'Executive Board'}</span>
          <h2 className="font-serif text-gold">{t.team.title}</h2>
          <p>{t.team.subtitle}</p>
        </div>

        <div className="team-grid">
          {t.team.members.map((member, idx) => (
            <div key={idx} className="team-card glass-panel">
              <div className="team-card-inner">
                {/* Profile Image with Zoom & Hover Overlay */}
                <div className="team-image-container">
                  <div 
                    className="team-image"
                    style={{ backgroundImage: `url(${memberImages[idx]})` }}
                    role="img"
                    aria-label={member.name}
                  ></div>
                  <div className="team-image-overlay">
                    <div className="team-image-glow"></div>
                  </div>
                </div>

                {/* Member Info */}
                <div className="team-info">
                  <div className="team-meta">
                    <span className="team-role-badge">{member.role}</span>
                    <div className="team-icon-box">
                      {memberIcons[idx]}
                    </div>
                  </div>
                  <h3 className="team-name">{member.name}</h3>
                  <div className="team-divider"></div>
                  <p className="team-bio">{member.bio}</p>
                </div>
              </div>
              
              {/* Outer Card Glow Border */}
              <div className="card-border-glow"></div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .team-section {
          background: linear-gradient(to bottom, rgba(4, 9, 20, 1) 0%, rgba(10, 17, 34, 0.6) 50%, rgba(4, 9, 20, 1) 100%);
          position: relative;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
          margin-top: 50px;
        }

        @media (max-width: 1200px) {
          .team-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }

        @media (max-width: 640px) {
          .team-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        .team-card {
          position: relative;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          cursor: default;
          transition: var(--transition-smooth);
        }

        .team-card-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .team-image-container {
          position: relative;
          width: 100%;
          padding-top: 110%; /* 4:3 or slightly taller aspect ratio */
          overflow: hidden;
          background-color: rgba(6, 11, 23, 0.4);
          border-bottom: 1px solid var(--border-subtle);
        }

        .team-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center top;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .team-card:hover .team-image {
          transform: scale(1.05);
        }

        .team-image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, rgba(6, 11, 23, 0) 60%, rgba(6, 11, 23, 0.8) 100%);
          pointer-events: none;
        }

        .team-info {
          padding: 24px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .team-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .team-role-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--gold-primary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(252, 185, 51, 0.08);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid rgba(252, 185, 51, 0.15);
        }

        .team-icon-box {
          color: var(--text-secondary);
          opacity: 0.7;
          transition: var(--transition-fast);
        }

        .team-card:hover .team-icon-box {
          color: var(--gold-primary);
          opacity: 1;
          transform: translateY(-2px);
        }

        .team-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
          transition: var(--transition-fast);
        }

        .team-card:hover .team-name {
          color: var(--gold-primary);
        }

        .team-divider {
          width: 40px;
          height: 2px;
          background: var(--gold-dark);
          margin-bottom: 16px;
          transition: var(--transition-smooth);
        }

        .team-card:hover .team-divider {
          width: 70px;
          background: var(--gold-primary);
        }

        .team-bio {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          font-weight: 300;
          margin-top: auto;
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

        .team-card:hover .card-border-glow {
          border-color: var(--gold-primary);
          box-shadow: inset 0 0 15px rgba(252, 185, 51, 0.05);
        }
      `}</style>
    </section>
  );
}
