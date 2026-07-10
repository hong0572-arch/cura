import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

export default function Hero({ t, customImage }) {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
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
    <section id="hero" className="hero-section">
      {/* Background Image Layer */}
      <div className="hero-bg-image" style={{ backgroundImage: `url(${customImage || '/luxury_airport_vip.png'})` }}></div>
      <div className="hero-overlay"></div>

      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="gold-star">✦</span> {t.brand_sub}
          </div>
          
          <h1 className="hero-title font-serif">
            {(t?.hero?.title || '').split('\n').map((line, idx) => (
              <span key={idx} className="title-line">
                {line}
                {idx === 0 && <br />}
              </span>
            ))}
          </h1>
          
          <p className="hero-subtitle">
            {t.hero.subtitle}
          </p>

          <div className="hero-buttons">
            <button 
              onClick={() => scrollToSection('reserve')} 
              className="btn-premium primary"
            >
              {t.hero.cta_reserve}
              <ArrowRight size={16} style={{ marginLeft: '8px' }} />
            </button>
            <button 
              onClick={() => scrollToSection('services')} 
              className="btn-premium secondary"
            >
              {t.hero.cta_explore}
            </button>
          </div>
        </div>

        {/* Quick Stats Overlay (Luxurious Look) */}
        <div className="hero-stats-panel glass-panel">
          <div className="stat-item">
            <span className="stat-number">{t.hero.stats?.support_num || '24/7'}</span>
            <span className="stat-label">{t.hero.stats?.support_lbl || 'Support'}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{t.hero.stats?.privacy_num || '100%'}</span>
            <span className="stat-label">{t.hero.stats?.privacy_lbl || 'Privacy'}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{t.hero.stats?.standard_num || 'VIP'}</span>
            <span className="stat-label">{t.hero.stats?.standard_lbl || 'Standard'}</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="scroll-indicator-wrap" onClick={() => scrollToSection('values')}>
          <span className="scroll-text">{t.hero.scroll_down_text || 'SCROLL DOWN'}</span>
          <ChevronDown size={18} className="scroll-arrow" />
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 100px;
          padding-bottom: 120px;
          overflow: hidden;
        }

        .hero-bg-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          transform: scale(1.05);
          animation: slow-zoom 20s infinite alternate;
          z-index: 1;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(4, 9, 20, 0.4) 0%,
            rgba(4, 9, 20, 0.85) 75%,
            rgba(4, 9, 20, 1) 100%
          ),
          linear-gradient(
            to right,
            rgba(4, 9, 20, 0.75) 0%,
            rgba(4, 9, 20, 0.2) 50%,
            rgba(4, 9, 20, 0.8) 100%
          );
          z-index: 2;
        }

        .hero-container {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          height: 100%;
        }

        .hero-content {
          max-width: 850px;
          margin-top: 60px;
          margin-bottom: 60px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: 30px;
          background: rgba(197, 168, 128, 0.08);
          border: 1px solid var(--border-subtle);
          color: var(--gold-primary);
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 30px;
          animation: fade-in 1.2s ease-out;
        }

        .gold-star {
          font-size: 1.1rem;
          color: var(--gold-light);
        }

        .hero-title {
          font-size: 4rem;
          line-height: 1.2;
          color: #fff;
          margin-bottom: 24px;
          letter-spacing: -0.01em;
          font-weight: 700;
        }

        .title-line {
          display: inline-block;
          background: linear-gradient(to right, #fff 30%, var(--gold-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: var(--text-secondary);
          margin-bottom: 40px;
          line-height: 1.8;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 300;
          animation: fade-in-delayed 1.5s ease-out forwards;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          animation: fade-in-delayed 1.8s ease-out forwards;
        }

        /* Stats Panel Overlay */
        .hero-stats-panel {
          display: flex;
          align-items: center;
          justify-content: space-around;
          width: 100%;
          max-width: 600px;
          padding: 20px 30px;
          margin-top: 40px;
          border-radius: 20px;
          animation: fade-in-delayed 2s ease-out forwards;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-number {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--gold-primary);
          font-family: var(--font-serif);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 4px;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: var(--border-subtle);
        }

        /* Scroll Down Indicator */
        .scroll-indicator-wrap {
          position: absolute;
          bottom: -40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          color: var(--text-muted);
          transition: var(--transition-fast);
          animation: bounce 2s infinite;
        }

        .scroll-indicator-wrap:hover {
          color: var(--gold-primary);
        }

        .scroll-text {
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .scroll-arrow {
          color: var(--gold-primary);
        }

        /* Keyframes */
        @keyframes slow-zoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.08);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-delayed {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
          60% {
            transform: translateY(-4px);
          }
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.2rem;
            word-break: keep-all;
          }
          .hero-subtitle {
            font-size: 1rem;
            word-break: keep-all;
          }
          .hero-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 320px;
          }
          .hero-stats-panel {
            flex-direction: column;
            gap: 16px;
            padding: 20px;
            width: 100%;
            max-width: 100%;
          }
          .stat-divider {
            width: 60%;
            height: 1px;
            background: var(--border-subtle);
          }
          .stat-number {
            font-size: 1.6rem;
          }
          .scroll-indicator-wrap {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.7rem;
          }
        }
      `}</style>
    </section>
  );
}
