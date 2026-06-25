import React from 'react';
import { Mail, Phone, ArrowUp, ExternalLink, Lock } from 'lucide-react';

export default function Footer({ t, onOpenTerms }) {
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleLinkClick = (id) => {
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
    <footer className="footer-panel">
      <div className="container footer-container">
        
        {/* Top Info row */}
        <div className="footer-main-grid">
          
          {/* Brand Col */}
          <div className="footer-brand-col">
            <div className="footer-brand" onClick={scrollToTop}>
              <img src="/logo.png" alt="Beyond the Gate Logo" className="footer-logo-img" />
            </div>
            <p className="brand-motto">
              Elevating the luxury standard of global airport hospitality and premium transport.
            </p>
          </div>

          {/* Quick Links Col */}
          <div className="footer-links-col">
            <h4>Quick Links</h4>
            <ul className="footer-links-list">
              <li><button onClick={() => handleLinkClick('hero')}>{t.nav.home}</button></li>
              <li><button onClick={() => handleLinkClick('values')}>{t.nav.values}</button></li>
              <li><button onClick={() => handleLinkClick('services')}>{t.nav.services}</button></li>
              <li><button onClick={() => handleLinkClick('fleet')}>{t.nav.fleet}</button></li>
              <li><button onClick={() => handleLinkClick('cas')}>{t.nav.cas}</button></li>
              <li><button onClick={() => handleLinkClick('faq')}>{t.nav.faq}</button></li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="footer-contact-col">
            <h4>{t.contact.title}</h4>
            <p className="contact-desc">{t.contact.desc}</p>
            <div className="contact-details">
              <div className="contact-item">
                <Mail size={16} className="contact-icon" />
                <div className="contact-text-wrap">
                  <span className="contact-label">{t.form.email}</span>
                  <a href="mailto:support@beyondthegate.vip" className="contact-link">
                    support@beyondthegate.vip
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <Phone size={16} className="contact-icon" />
                <div className="contact-text-wrap">
                  <span className="contact-label">{t.contact.phone_lbl}</span>
                  <a href="tel:+82212345678" className="contact-link">
                    +82 (0)2-1234-5678
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="footer-divider"></div>

        {/* Bottom row */}
        <div className="footer-bottom-row">
          <div className="copyright-box">
            <span>© 2026 {t.brand}. All rights reserved. Under CAS Aviation Portfolio.</span>
          </div>

          <div className="legal-links-box">
            <button onClick={onOpenTerms} className="legal-btn">
              <span>{t.terms.title}</span>
              <ExternalLink size={12} className="legal-icon" />
            </button>

            <a href="#admin" className="legal-btn admin-link-btn" title="Admin Portal" style={{ color: 'rgba(197, 168, 128, 0.45)', marginLeft: '4px' }}>
              <Lock size={12} />
            </a>
            
            <button onClick={scrollToTop} className="btn-to-top" aria-label="Scroll to top">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>

      </div>

      <style>{`
        .footer-panel {
          background: #02060f;
          border-top: 1px solid var(--border-subtle);
          padding: 80px 0 40px;
          position: relative;
        }

        .footer-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 2fr;
          gap: 60px;
          margin-bottom: 60px;
        }

        .footer-brand-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .footer-logo-img {
          height: 48px;
          width: auto;
          object-fit: contain;
        }

        .brand-motto {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          max-width: 320px;
          font-weight: 300;
        }

        .footer-links-col h4,
        .footer-contact-col h4 {
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .footer-links-list {
          list-style: none;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .footer-links-list button {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          cursor: pointer;
          transition: var(--transition-fast);
          text-align: left;
          padding: 0;
        }

        .footer-links-list button:hover {
          color: var(--gold-primary);
          transform: translateX(4px);
        }

        .contact-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contact-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .contact-icon {
          color: var(--gold-primary);
          margin-top: 4px;
        }

        .contact-text-wrap {
          display: flex;
          flex-direction: column;
        }

        .contact-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .contact-link {
          font-size: 0.95rem;
          color: #fff;
          text-decoration: none;
          font-weight: 500;
          transition: var(--transition-fast);
        }

        .contact-link:hover {
          color: var(--gold-primary);
        }

        .footer-divider {
          height: 1px;
          background: var(--border-subtle);
          margin-bottom: 30px;
        }

        .footer-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .copyright-box {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .legal-links-box {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .legal-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: var(--transition-fast);
          padding: 6px 0;
        }

        .legal-btn:hover {
          color: var(--gold-primary);
        }

        .btn-to-top {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(197, 168, 128, 0.08);
          border: 1px solid var(--border-subtle);
          color: var(--gold-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .btn-to-top:hover {
          background: var(--gold-primary);
          color: var(--bg-primary);
          border-color: transparent;
          transform: translateY(-4px);
        }

        @media (max-width: 1024px) {
          .footer-main-grid {
            grid-template-columns: 1fr 1fr;
          }
          .footer-brand-col {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .footer-main-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .footer-brand-col {
            grid-column: span 1;
          }
          .footer-links-list {
            grid-template-columns: 1fr;
          }
          .footer-bottom-row {
            flex-direction: column-reverse;
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
}
