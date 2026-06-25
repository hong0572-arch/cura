import React, { useState, useEffect } from 'react';
import { Menu, X, Globe } from 'lucide-react';

export default function Navbar({ lang, setLang, t }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLang(lang === 'ko' ? 'en' : 'ko');
  };

  const navItems = [
    { id: 'hero', label: t.nav.home },
    { id: 'values', label: t.nav.values },
    { id: 'services', label: t.nav.services },
    { id: 'fleet', label: t.nav.fleet },
    { id: 'cas', label: t.nav.cas },
    { id: 'faq', label: t.nav.faq },
    { id: 'reserve', label: t.nav.reserve }
  ];

  const handleNavClick = (id) => {
    setMobileMenuOpen(false);
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
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="nav-brand" onClick={() => handleNavClick('hero')}>
          <img src="/logo.png" alt="Beyond the Gate Logo" className="brand-logo-img" />
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="nav-link-btn"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Action Controls (Lang Toggle & CTA) */}
        <div className="nav-actions-desktop">
          <button className="lang-toggle-btn" onClick={toggleLanguage} aria-label="Toggle Language">
            <Globe size={18} className="lang-icon" />
            <span className="lang-text">{lang === 'ko' ? 'EN' : 'KO'}</span>
          </button>
          
          <button onClick={() => handleNavClick('reserve')} className="btn-nav-reserve">
            {t.hero.cta_reserve}
          </button>
        </div>

        {/* Mobile Toggle Buttons */}
        <div className="nav-actions-mobile">
          <button className="lang-toggle-btn-mobile" onClick={toggleLanguage} aria-label="Toggle Language">
            <Globe size={18} />
            <span className="lang-text-mobile">{lang === 'ko' ? 'EN' : 'KO'}</span>
          </button>
          
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div className={`nav-menu-mobile ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-links-container">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="mobile-nav-link-btn"
            >
              {item.label}
            </button>
          ))}
          <button 
            onClick={() => handleNavClick('reserve')} 
            className="btn-premium primary mobile-cta"
          >
            {t.hero.cta_reserve}
          </button>
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 1000;
          transition: var(--transition-smooth);
          border-bottom: 1px solid transparent;
        }
        
        .navbar.scrolled {
          background: rgba(4, 9, 20, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          height: 70px;
          border-bottom: 1px solid var(--border-subtle);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }

        .navbar-container {
          max-width: 1240px;
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .brand-logo-img {
          height: 38px;
          width: auto;
          object-fit: contain;
          transition: var(--transition-smooth);
        }

        .navbar.scrolled .brand-logo-img {
          height: 32px;
        }

        .brand-logo-icon {
          font-size: 1.8rem;
          color: var(--gold-primary);
          text-shadow: 0 0 10px var(--gold-glow);
          animation: pulse-glow 3s infinite alternate;
        }

        .brand-text-group {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-family: var(--font-serif);
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #fff;
        }

        .brand-subname {
          font-size: 0.6rem;
          letter-spacing: 0.25em;
          color: var(--gold-primary);
          font-weight: 600;
          margin-top: -2px;
        }

        .nav-links-desktop {
          display: flex;
          gap: 28px;
        }

        .nav-link-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-fast);
          padding: 8px 4px;
          position: relative;
        }

        .nav-link-btn::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 1px;
          background: var(--gold-primary);
          transition: var(--transition-fast);
        }

        .nav-link-btn:hover {
          color: var(--gold-primary);
        }

        .nav-link-btn:hover::after {
          width: 100%;
        }

        .nav-actions-desktop {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .lang-toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(197, 168, 128, 0.08);
          border: 1px solid var(--border-subtle);
          color: var(--gold-primary);
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: var(--transition-fast);
        }

        .lang-toggle-btn:hover {
          background: rgba(197, 168, 128, 0.15);
          border-color: var(--gold-primary);
        }

        .btn-nav-reserve {
          background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold-primary) 100%);
          color: var(--bg-primary);
          border: none;
          border-radius: 20px;
          padding: 8px 20px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-nav-reserve:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px var(--gold-glow);
        }

        /* Mobile Styles */
        .nav-actions-mobile {
          display: none;
          align-items: center;
          gap: 12px;
        }

        .lang-toggle-btn-mobile {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--gold-primary);
          padding: 6px 10px;
          border-radius: 15px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .mobile-menu-toggle {
          background: transparent;
          border: none;
          color: #fff;
          cursor: pointer;
        }

        .nav-menu-mobile {
          position: fixed;
          top: 80px;
          left: 0;
          right: 0;
          background: rgba(4, 9, 20, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-subtle);
          padding: 24px;
          transform: translateY(-120%);
          transition: var(--transition-smooth);
          z-index: 999;
          opacity: 0;
          pointer-events: none;
        }

        .navbar.scrolled + .nav-menu-mobile {
          top: 70px;
        }

        .nav-menu-mobile.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-links-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mobile-nav-link-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 1.1rem;
          text-align: left;
          padding: 8px 0;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-cta {
          margin-top: 10px;
          width: 100%;
        }

        @media (max-width: 1024px) {
          .nav-links-desktop, .nav-actions-desktop {
            display: none;
          }
          .nav-actions-mobile {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
