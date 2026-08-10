import React, { useState } from 'react';
import { 
  PlaneLanding, PlaneTakeoff, RefreshCw, 
  MapPin, Compass, FileCheck, Briefcase, 
  ShieldAlert, Car, Mail, Ticket, ShoppingBag, 
  Bell, Plane, CalendarClock
} from 'lucide-react';

export default function Services({ t }) {
  const services = [
    {
      id: 'arrival',
      title: t.services.arrival.title,
      desc: t.services.arrival.desc,
      bg: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800'
    },
    {
      id: 'departure',
      title: t.services.departure.title,
      desc: t.services.departure.desc,
      bg: 'https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=800'
    },
    {
      id: 'transfer',
      title: t.services.transfer.title,
      desc: t.services.transfer.desc,
      bg: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800'
    }
  ];

  return (
    <section id="services" className="services-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">{t.services.badge || 'Meet & Assist'}</span>
          <h2 className="font-serif">{t.services.title}</h2>
          <p>{t.services.subtitle}</p>
        </div>

        {/* Services Grid (Image Cards) */}
        <div className="grid-3">
          {services.map((svc) => (
            <div 
              key={svc.id}
              className="image-card"
              style={{ backgroundImage: `url(${svc.bg})` }}
            >
              <div className="image-card-overlay"></div>
              <div className="image-card-content">
                <h3 className="image-card-title">{svc.title}</h3>
                <p className="image-card-desc">{svc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .services-section {
          background: transparent;
          position: relative;
        }
      `}</style>
    </section>
  );
}
