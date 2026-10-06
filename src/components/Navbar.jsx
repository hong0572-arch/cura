import { useState, useEffect } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { localizePath, stripLocale } from '../utils/locale';

export default function Navbar({ lang, setLang, t }) {
  const navigate = useNavigate();
  const location = useLocation();
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
    { id: 'ways', label: lang === 'ko' ? '서비스' : 'Services', path: '/' },
    { id: 'services', label: lang === 'ko' ? '공항 의전' : (t.nav.services || 'Airport VIP'), path: '/' },
    { id: 'fleet', label: t.nav.fleet, path: '/' },
    { id: 'faq', label: t.nav.faq, path: '/' },
    { id: 'blog', label: lang === 'ko' ? '블로그' : 'Blog', path: '/blog' },
    { id: 'about', label: 'About Us', path: '/about' },
    { id: 'business', label: t.nav.business || (lang === 'ko' ? '제휴 제안' : 'Business Proposal'), path: '/business' },
    { id: 'hero', label: lang === 'ko' ? '예약하기' : (t.nav.reserve || 'Book'), path: '/' }
  ];

  const handleNavClick = (item) => {
    setMobileMenuOpen(false);

    // Default to '/' if no path is provided
    const targetPath = item.path || '/';

    if (stripLocale(location.pathname) !== targetPath) {
      // If we are on a different page, navigate first
      navigate(localizePath(`${targetPath}#${item.id}`, lang));
    } else {
      // If we are already on the target page, scroll to element
      const element = document.getElementById(item.id);
      if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand Logo */}
        <a
          href={localizePath('/', lang)}
          className="nav-brand"
          onClick={(e) => { e.preventDefault(); navigate(localizePath('/', lang)); }}
        >
          <img src="/logo.webp" alt="Beyond the Gate" className="brand-logo-img" width="160" height="48" />
        </a>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={localizePath(item.path === '/' ? `/#${item.id}` : item.path, lang)}
              onClick={(e) => { e.preventDefault(); handleNavClick(item); }}
              className="nav-link-btn"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Action Controls (Lang Toggle & CTA) */}
        <div className="nav-actions-desktop">
          <button className="lang-toggle-btn" onClick={toggleLanguage} aria-label="Toggle Language">
            <Globe size={18} className="lang-icon" />
            <span className="lang-text">{lang === 'ko' ? 'EN' : 'KO'}</span>
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
            <a
              key={item.id}
              href={localizePath(item.path === '/' ? `/#${item.id}` : item.path, lang)}
              onClick={(e) => { e.preventDefault(); handleNavClick(item); }}
              className="mobile-nav-link-btn"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <style>{`
        a.nav-link-btn, a.mobile-nav-link-btn, a.nav-brand {
          text-decoration: none;
          display: inline-block;
        }
        a.mobile-nav-link-btn {
          display: block;
        }
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          z-index: 1000;
          background: var(--navy);
          transition: var(--transition-smooth);
          border-bottom: 1px solid var(--navy-line);
        }

        .navbar.scrolled {
          background: rgba(11, 27, 51, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          height: 70px;
          box-shadow: 0 6px 24px rgba(7, 18, 31, 0.35);
        }

        .navbar-container {
          width: 100% !important;
          max-width: 1240px;
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px !important;
        }

        @media (min-width: 768px) {
          .navbar-container {
            padding: 0 20px !important;
          }
        }

        @media (min-width: 1024px) {
          .navbar-container {
            padding: 0 24px !important;
          }
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
          font-family: var(--font-sans);
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
          color: var(--on-navy);
          font-family: var(--font-sans);
          font-size: 0.92rem;
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
          background: var(--gold);
          transition: var(--transition-fast);
        }

        .nav-link-btn:hover {
          color: var(--gold);
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
          background: transparent;
          border: 1px solid var(--navy-line);
          color: var(--on-navy);
          padding: 8px 12px;
          border-radius: var(--radius);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: 500;
          transition: var(--transition-fast);
        }

        .lang-toggle-btn:hover {
          border-color: var(--gold);
          color: var(--gold);
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
          border: 1px solid var(--navy-line);
          color: var(--on-navy);
          font-family: var(--font-mono);
          padding: 8px 10px;
          min-height: 40px;
          border-radius: var(--radius);
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .mobile-menu-toggle {
          background: transparent;
          border: none;
          color: var(--on-navy);
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
        }

        .nav-menu-mobile {
          position: absolute;
          top: 80px;
          left: 0;
          right: 0;
          background: var(--navy-deep);
          border-bottom: 1px solid var(--navy-line);
          padding: 24px;
          transform: translateY(-120%);
          transition: var(--transition-smooth);
          z-index: 999;
          opacity: 0;
          pointer-events: none;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }

        .navbar.scrolled .nav-menu-mobile {
          top: 70px;
          max-height: calc(100vh - 70px);
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
          color: var(--on-navy);
          font-family: var(--font-serif);
          font-size: 1.45rem;
          text-align: left;
          padding: 12px 0;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 1px solid var(--navy-line);
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

        @media (max-width: 480px) {
          .brand-logo-img {
            height: 28px;
          }
          .navbar.scrolled .brand-logo-img {
            height: 24px;
          }
          .lang-toggle-btn-mobile {
            padding: 4px 8px;
            font-size: 0.7rem;
          }
        }

      `}</style>
    </nav>
  );
}
