import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, PlaneLanding, PlaneTakeoff, ArrowRightLeft, Calendar, Users, Minus, Plus, Plane } from 'lucide-react';

const DEFAULT_AIRPORTS = [
  { city: 'Seoul', name: 'Incheon Intl', code: 'ICN' }, 
  { city: 'Paris', name: 'Paris Charles de', code: 'CDG' },
  { city: 'Milan', name: 'Milano Malpensa', code: 'MXP' },
  { city: 'Rome', name: 'Rome - Leonardo da', code: 'FCO' },
  { city: 'Cancun', name: 'Cancun', code: 'CUN' },
  { city: 'Amsterdam', name: 'Amsterdam', code: 'AMS' },
];

const SERVICES = [
  { id: 'arrival', label: 'Arrival', icon: PlaneLanding },
  { id: 'departure', label: 'Departure', icon: PlaneTakeoff },
  { id: 'transfer', label: 'Connection', icon: ArrowRightLeft },
];

const getInitialDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
};

export default function Hero({ t, customImage, onOpenWizard, settings }) {
  const [formData, setFormData] = useState({
    airport: 'ICN',
    serviceType: 'arrival',
    date: getInitialDate(),
    adults: 1,
    children: 0,
    email: 'joonkiehong@gmail.com'
  });
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const barRef = useRef(null);

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCheckPrice = () => {
    onOpenWizard({
      ...formData,
      passengers: formData.adults + formData.children
    });
  };

  const activeAirports = settings?.airports && settings.airports.length > 0 ? settings.airports : DEFAULT_AIRPORTS;
  const selectedAirport = activeAirports.find(a => a.code === formData.airport) || activeAirports[0];
  const selectedService = SERVICES.find(s => s.id === formData.serviceType) || SERVICES[0];

  const minDate = getInitialDate();

  useEffect(() => {
    if (!formData.date || formData.date < minDate) {
      updateForm('date', minDate);
    }
  }, []);

  return (
    <section id="hero" className="hero-section">
      <div className="hero-bg-image" style={{ backgroundImage: `url(${customImage || '/luxury_airport_vip.png'})` }}></div>
      <div className="hero-overlay"></div>

      <div className="container hero-container">
        <div className="hero-content" style={{ maxWidth: '900px', width: '100%' }}>
          
          {t?.brand_sub && (
            <div className="hero-badge">
              <span className="gold-star">✦</span> {t.brand_sub}
            </div>
          )}

          <h1 className="hero-title font-sans">
            {(t?.hero?.title || '').split('\n').map((line, idx) => (
              <span key={idx} className="title-line">
                {line}
                {idx === 0 && <br />}
              </span>
            ))}
          </h1>

          {t?.hero?.subtitle && (
            <p className="hero-subtitle">
              {t.hero.subtitle}
            </p>
          )}

          {/* Custom Search Bar */}
          <div className="custom-search-bar-wrap" ref={barRef}>
            <div className="search-inputs-row">
              {/* 1. Airport */}
              <div 
                className={`search-input-box ${activeDropdown === 'airport' ? 'active' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'airport' ? null : 'airport')}
              >
                <Plane className="input-icon plane-icon-rotate" size={18} />
                <div className="input-text-area">
                  <span className="main-text">{selectedAirport.city} {selectedAirport.name ? '' : selectedAirport.code}</span>
                </div>
                {selectedAirport.name && <span className="side-text text-muted">{selectedAirport.code}</span>}
                
                {activeDropdown === 'airport' && (
                  <div className="dropdown-popover airport-popover">
                    {activeAirports.map(a => (
                      <div 
                        key={a.code} 
                        className="dropdown-item airport-item"
                        onClick={(e) => { e.stopPropagation(); updateForm('airport', a.code); setActiveDropdown(null); }}
                      >
                        <div className="airport-name-wrap">
                          <span className="city-name">{a.city}</span>
                          {a.name && <span className="full-name">{a.name}</span>}
                        </div>
                        <span className="code">{a.code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Service Type */}
              <div 
                className={`search-input-box ${activeDropdown === 'service' ? 'active' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'service' ? null : 'service')}
              >
                <div className="input-text-area">
                  <span className="main-text" style={{color: '#555'}}>{activeDropdown === 'service' ? 'Service type' : selectedService.label}</span>
                </div>
                <ChevronDown className="input-icon chevron" size={16} />
                
                {activeDropdown === 'service' && (
                  <div className="dropdown-popover service-popover">
                    {SERVICES.map(s => {
                      const Icon = s.icon;
                      return (
                        <div 
                          key={s.id} 
                          className="dropdown-item"
                          onClick={(e) => { e.stopPropagation(); updateForm('serviceType', s.id); setActiveDropdown(null); }}
                        >
                          <Icon size={18} className="mr-12 text-muted icon-lucide" /> {s.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Date */}
              <div 
                className="search-input-box"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input[type="date"]');
                  if(input) input.showPicker();
                }}
              >
                <div className="input-text-area">
                  <span className="main-text">
                    {new Date(formData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <Calendar className="input-icon" size={16} />
                <input 
                  type="date"
                  value={formData.date}
                  min={minDate}
                  onChange={(e) => updateForm('date', e.target.value)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* 4. Passengers */}
              <div 
                className={`search-input-box ${activeDropdown === 'passengers' ? 'active' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'passengers' ? null : 'passengers')}
              >
                <div className="input-text-area">
                  <span className="main-text">
                    {formData.adults} adult • {formData.children === 0 ? 'no children' : `${formData.children} child${formData.children > 1 ? 'ren' : ''}`}
                  </span>
                </div>
                <Users className="input-icon" size={16} />
                
                {activeDropdown === 'passengers' && (
                  <div className="dropdown-popover passengers-popover" onClick={e => e.stopPropagation()}>
                    <div className="pax-row">
                      <div className="pax-info">
                        <div className="pax-title">Adults</div>
                        <div className="pax-sub">Over 7 yrs old</div>
                      </div>
                      <div className="pax-controls">
                        <button onClick={() => updateForm('adults', Math.max(1, formData.adults - 1))}><Minus size={14}/></button>
                        <span>{formData.adults}</span>
                        <button onClick={() => updateForm('adults', formData.adults + 1)}><Plus size={14}/></button>
                      </div>
                    </div>
                    <div className="pax-row mt-16">
                      <div className="pax-info">
                        <div className="pax-title">Children</div>
                        <div className="pax-sub">0-7 yrs old</div>
                      </div>
                      <div className="pax-controls">
                        <button onClick={() => updateForm('children', Math.max(0, formData.children - 1))}><Minus size={14}/></button>
                        <span>{formData.children}</span>
                        <button onClick={() => updateForm('children', formData.children + 1)}><Plus size={14}/></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Email */}
              <div className="search-input-box no-border" style={{ cursor: 'text' }}>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => updateForm('email', e.target.value)} 
                  placeholder="Email address"
                  className="hero-email-input"
                />
              </div>
            </div>
            
            <button onClick={handleCheckPrice} className="btn-hero-submit">
              Check Price
            </button>
            <p className="text-muted text-sm mt-12 mb-0" style={{color: 'rgba(255,255,255,0.7)'}}>By clicking "Check Price" you agree to receive email notifications.</p>
          </div>
          
        </div>

        {/* Quick Stats Overlay (Luxurious Look) */}
        <div className="hero-stats-panel glass-panel">
          <div className="stat-item">
            <span className="stat-number">{t?.hero?.stats?.support_num || '24/7'}</span>
            <span className="stat-label">{t?.hero?.stats?.support_lbl || 'Support'}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{t?.hero?.stats?.privacy_num || '100%'}</span>
            <span className="stat-label">{t?.hero?.stats?.privacy_lbl || 'Privacy'}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">{t?.hero?.stats?.standard_num || 'VIP'}</span>
            <span className="stat-label">{t?.hero?.stats?.standard_lbl || 'Standard'}</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="scroll-indicator-wrap" onClick={() => scrollToSection('values')}>
          <span className="scroll-text">{t?.hero?.scroll_down_text || 'SCROLL DOWN'}</span>
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
          padding-bottom: 240px;
          overflow-x: hidden;
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
          width: 100%;
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
          margin-bottom: 24px;
          animation: fade-in 1.2s ease-out;
        }

        .gold-star {
          font-size: 1.1rem;
          color: var(--gold-light);
        }

        .hero-title {
          font-size: 3.5rem;
          line-height: 1.25;
          color: #fff;
          margin-bottom: 24px;
          letter-spacing: -0.01em;
          font-weight: 700;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .title-line {
          display: inline-block;
          background: linear-gradient(to right, #fff 30%, var(--gold-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .hero-subtitle {
          font-size: 1.15rem;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 36px;
          line-height: 1.7;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 400;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          animation: fade-in-delayed 1.5s ease-out forwards;
        }

        .custom-search-bar-wrap {
          width: 100%;
          margin: 0 auto;
          position: relative;
        }

        .search-inputs-row {
          display: flex;
          background: #fff;
          border-radius: 8px;
          height: 60px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .search-input-box {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 16px;
          border-right: 1px solid #e0e0e0;
          position: relative;
          cursor: pointer;
          color: #333;
          font-size: 0.95rem;
        }
        
        .search-input-box.no-border {
          border-right: none;
        }

        .search-input-box.active {
          box-shadow: inset 0 0 0 2px #3b5bdb;
          border-radius: inherit;
          z-index: 10;
        }

        .input-icon {
          color: #666;
        }
        .plane-icon-rotate {
          transform: rotate(45deg);
          margin-right: 12px;
        }
        .chevron {
          margin-left: 8px;
        }
        .search-input-box .input-icon:not(.plane-icon-rotate):not(.chevron) {
          margin-left: 8px;
        }

        .input-text-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .main-text {
          font-weight: 500;
          color: #111;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .side-text {
          font-size: 0.85rem;
          margin-left: 8px;
        }

        .hero-email-input {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.95rem;
          color: #111;
        }

        .btn-hero-submit {
          width: 100%;
          background: #3b5bdb;
          color: #fff;
          border: none;
          padding: 16px;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 8px;
          margin-top: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-hero-submit:hover {
          background: #364fc7;
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
          font-family: var(--font-sans);
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
          bottom: -80px;
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

        /* Popovers */
        .dropdown-popover {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          padding: 8px 0;
          z-index: 100;
          min-width: 240px;
          border: 1px solid #eee;
          text-align: left;
        }

        .dropdown-item {
          padding: 12px 20px;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .dropdown-item:hover {
          background: #f8f9fa;
        }
        
        .mr-12 {
          margin-right: 12px;
        }

        .airport-popover {
          width: 320px;
          max-height: 400px;
          overflow-y: auto;
        }
        .airport-item {
          justify-content: space-between;
        }
        .airport-name-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .airport-name-wrap .city-name {
          font-weight: 500;
          color: #111;
        }
        .airport-name-wrap .full-name {
          font-size: 0.8rem;
          color: #888;
        }
        .airport-item .code {
          font-size: 0.85rem;
          color: #666;
          font-weight: 600;
        }

        .service-popover {
          width: 200px;
        }

        .passengers-popover {
          width: 280px;
          padding: 20px;
        }
        .pax-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pax-title {
          font-weight: 500;
          color: #111;
        }
        .pax-sub {
          font-size: 0.8rem;
          color: #888;
        }
        .pax-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pax-controls button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f1f3f5;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #333;
        }
        .pax-controls button:hover {
          background: #e9ecef;
        }

        /* Calendar */
        .date-popover {
          padding: 16px;
          width: 300px;
        }
        .cal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .cal-nav {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cal-month {
          font-weight: 500;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          text-align: center;
        }
        .cal-day-name {
          font-size: 0.75rem;
          color: #888;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .cal-day {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .cal-day:hover:not(.muted) {
          background: #f1f3f5;
        }
        .cal-day.muted {
          color: #ccc;
          cursor: default;
        }
        .cal-day.today {
          border: 1px solid #3b5bdb;
          color: #3b5bdb;
        }
        .cal-day.selected {
          background: #3b5bdb;
          color: #fff;
          border: none;
        }

        @media (max-width: 900px) {
          .search-inputs-row {
            flex-direction: column;
            height: auto;
          }
          .search-input-box {
            height: 60px;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
          }
          .search-input-box.no-border {
            border-bottom: none;
          }
          .dropdown-popover {
            position: relative;
            top: 0;
            box-shadow: none;
            border: none;
            border-bottom: 1px solid #eee;
            border-radius: 0;
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
