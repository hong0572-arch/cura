import React, { useState } from 'react';
import { 
  PlaneLanding, PlaneTakeoff, RefreshCw, 
  MapPin, Compass, FileCheck, Briefcase, 
  ShieldAlert, Car, Mail, Ticket, ShoppingBag, 
  Bell, Plane, CalendarClock
} from 'lucide-react';

export default function Services({ t }) {
  const [activeTab, setActiveTab] = useState('arrival');

  // Helper to map arrival steps to icons
  const arrivalIcons = [
    <MapPin size={20} />,
    <Compass size={20} />,
    <FileCheck size={20} />,
    <Briefcase size={20} />,
    <ShieldAlert size={20} />,
    <Car size={20} />,
    <Mail size={20} />
  ];

  // Helper to map departure steps to icons
  const departureIcons = [
    <MapPin size={20} />,
    <Ticket size={20} />,
    <FileCheck size={20} />,
    <ShoppingBag size={20} />,
    <Bell size={20} />,
    <Plane size={20} />,
    <Mail size={20} />
  ];

  // Helper to map transfer steps to icons
  const transferIcons = [
    <CalendarClock size={20} />,
    <MapPin size={20} />,
    <RefreshCw size={20} />,
    <Plane size={20} />
  ];

  const getServiceData = () => {
    switch (activeTab) {
      case 'departure':
        return {
          title: t.services.departure.title,
          desc: t.services.departure.desc,
          steps: t.services.departure.steps,
          icons: departureIcons
        };
      case 'transfer':
        return {
          title: t.services.transfer.title,
          desc: t.services.transfer.desc,
          steps: t.services.transfer.steps,
          icons: transferIcons
        };
      case 'arrival':
      default:
        return {
          title: t.services.arrival.title,
          desc: t.services.arrival.desc,
          steps: t.services.arrival.steps,
          icons: arrivalIcons
        };
    }
  };

  const currentService = getServiceData();

  return (
    <section id="services" className="services-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">Meet & Assist</span>
          <h2 className="font-serif text-gold">{t.services.title}</h2>
          <p>{t.services.subtitle}</p>
        </div>

        {/* Base Pricing Glass Banner */}
        <div className="price-banner glass-panel">
          <div className="price-banner-inner">
            <span className="price-tag">$200</span>
            <div className="price-info">
              <h4 className="price-title">{t?.services?.base_price_info}</h4>
              <p className="price-desc">
                {(t?.faq?.items?.[5]?.a || '').substring(0, 120)}...
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="services-tabs-container">
          <div className="services-tabs">
            <button 
              className={`service-tab-btn ${activeTab === 'arrival' ? 'active' : ''}`}
              onClick={() => setActiveTab('arrival')}
            >
              <PlaneLanding size={18} className="tab-icon" />
              <span>{t.services.tabs.arrival}</span>
            </button>
            <button 
              className={`service-tab-btn ${activeTab === 'departure' ? 'active' : ''}`}
              onClick={() => setActiveTab('departure')}
            >
              <PlaneTakeoff size={18} className="tab-icon" />
              <span>{t.services.tabs.departure}</span>
            </button>
            <button 
              className={`service-tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              <RefreshCw size={18} className="tab-icon" />
              <span>{t.services.tabs.transfer}</span>
            </button>
          </div>
        </div>

        {/* Active Service Content & Timeline */}
        <div className="active-service-content">
          <div className="service-intro">
            <h3 className="font-serif">{currentService.title}</h3>
            <p>{currentService.desc}</p>
          </div>

          <div className="timeline-container">
            {currentService.steps.map((step, idx) => (
              <div 
                key={idx} 
                className="timeline-item"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="timeline-dot">
                  <div className="timeline-icon-wrapper">
                    {currentService.icons[idx]}
                  </div>
                </div>
                <div className="timeline-content">
                  <span className="timeline-step">Step {idx + 1}</span>
                  <h4 className="timeline-title">{step.title}</h4>
                  <p className="timeline-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .services-section {
          background: var(--bg-secondary);
          position: relative;
        }

        .price-banner {
          max-width: 900px;
          margin: 0 auto 50px;
          padding: 24px 30px;
          border-left: 4px solid var(--gold-primary);
          border-radius: 0 16px 16px 0;
          transform: none !important; /* disable hover translation on this element */
        }

        .price-banner-inner {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .price-tag {
          font-family: var(--font-serif);
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--gold-primary);
          line-height: 1;
        }

        .price-info {
          flex: 1;
        }

        .price-title {
          font-size: 1.1rem;
          color: #fff;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .price-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .services-tabs-container {
          display: flex;
          justify-content: center;
          margin-bottom: 50px;
        }

        .services-tabs {
          display: flex;
          background: rgba(4, 9, 20, 0.6);
          padding: 6px;
          border-radius: 40px;
          border: 1px solid var(--border-subtle);
          max-width: 100%;
          overflow-x: auto;
        }

        .service-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 10px 24px;
          border-radius: 30px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition-fast);
        }

        .service-tab-btn.active {
          background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold-primary) 100%);
          color: var(--bg-primary);
          box-shadow: 0 4px 15px var(--gold-glow);
        }

        .tab-icon {
          transition: var(--transition-fast);
        }

        .service-tab-btn:hover:not(.active) {
          color: var(--gold-primary);
        }

        .active-service-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .service-intro {
          text-align: center;
          margin-bottom: 40px;
        }

        .service-intro h3 {
          font-size: 1.8rem;
          color: #fff;
          margin-bottom: 8px;
        }

        .service-intro p {
          color: var(--gold-primary);
          font-size: 1rem;
          font-weight: 300;
        }

        /* Timeline Icons placement override */
        .timeline-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px !important;
          height: 32px !important;
          left: -37px !important;
          top: 0px !important;
          background: var(--bg-secondary) !important;
        }

        .timeline-icon-wrapper {
          color: var(--gold-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .timeline-item:hover .timeline-icon-wrapper {
          color: var(--bg-primary);
        }

        @media (max-width: 768px) {
          .price-banner-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .price-tag {
            font-size: 2rem;
          }
          .services-tabs {
            border-radius: 12px;
            flex-direction: column;
            width: 100%;
            padding: 10px;
          }
          .service-tab-btn {
            border-radius: 8px;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
