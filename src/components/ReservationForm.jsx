import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, ShieldCheck, CreditCard, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReservationForm({ t, lang, selectedVehicle, setSelectedVehicle, settings }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('arrival');
  const [bookingStarted, setBookingStarted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: 'arrival',
    date: '',
    flight: '',
    passengers: 1,
    luggage: 0,
    msg: ''
  });

  const [prices, setPrices] = useState({
    base: settings?.servicePrices?.arrival?.usd || 250,
    baseKrw: settings?.servicePrices?.arrival?.krw || 310000,
    vehicle: 0,
    extraPass: 0,
    extraLug: 0,
    totalUsd: settings?.servicePrices?.arrival?.usd || 250,
    totalKrw: settings?.servicePrices?.arrival?.krw || 310000
  });

  const [status, setStatus] = useState('idle'); // idle | submitting | success
  const [bookingId, setBookingId] = useState('');

  // Exchange rate constant
  const EX_RATE = settings?.exchangeRate || 1350;

  // Handle vehicle type prop updates from Fleet component selection
  useEffect(() => {
    if (selectedVehicle) {
      setFormData(prev => ({ ...prev, vehicleType: selectedVehicle }));
    }
  }, [selectedVehicle]);

  // Handle local state for Chauffeur selection
  const [vehicleType, setLocalVehicleType] = useState('none');

  useEffect(() => {
    if (selectedVehicle) {
      setLocalVehicleType(selectedVehicle);
    }
  }, [selectedVehicle]);

  const handleVehicleChange = (val) => {
    setLocalVehicleType(val);
    setSelectedVehicle(val);
  };
  
  useEffect(() => {
    setFormData(prev => ({ ...prev, serviceType: activeTab }));
  }, [activeTab]);

  // Recalculate prices in real-time
  useEffect(() => {
    const serviceType = formData.serviceType || 'arrival';
    const baseFeeUsd = settings?.servicePrices?.[serviceType]?.usd ?? 250;
    const baseFeeKrw = settings?.servicePrices?.[serviceType]?.krw ?? 310000;
    const currentExRate = settings?.exchangeRate || 1350;
    
    // Vehicle pricing in KRW
    let vehicleKrw = 0;
    if (vehicleType === 'staria') vehicleKrw = settings?.vehiclePricesKrw?.staria || 140000;
    else if (vehicleType === 'g90') vehicleKrw = settings?.vehiclePricesKrw?.g90 || 240000;
    else if (vehicleType === 'sprinter') vehicleKrw = settings?.vehiclePricesKrw?.sprinter || 240000;

    const vehicleUsd = Math.round(vehicleKrw / currentExRate);

    // Extra passenger charges ($50 USD per person beyond 4)
    const extraPassCount = Math.max(0, formData.passengers - 4);
    const extraPassUsd = extraPassCount * (settings?.extraPassengerFeeUsd || 50);

    // Extra luggage charges ($20 USD per bag beyond 4)
    const extraLugCount = Math.max(0, formData.luggage - 4);
    const extraLugUsd = extraLugCount * (settings?.extraLuggageFeeUsd || 20);

    const totalUsd = baseFeeUsd + vehicleUsd + extraPassUsd + extraLugUsd;
    const totalKrw = baseFeeKrw + vehicleKrw + Math.round((extraPassUsd + extraLugUsd) * currentExRate);

    setPrices({
      base: baseFeeUsd,
      baseKrw: baseFeeKrw,
      vehicle: vehicleUsd,
      extraPass: extraPassUsd,
      extraLug: extraLugUsd,
      totalUsd,
      totalKrw
    });
  }, [formData.passengers, formData.luggage, formData.serviceType, vehicleType, settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumChange = (name, val) => {
    setFormData(prev => ({ ...prev, [name]: Math.max(0, val) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.date) {
      alert('Please fill in all required fields.');
      return;
    }

    setStatus('submitting');

    setTimeout(() => {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      const newBookingId = `BTG-2026-${randNum}`;
      setBookingId(newBookingId);

      // Save to localStorage
      const dateSubmitted = new Date().toLocaleString();
      const newReservation = {
        id: newBookingId,
        dateSubmitted,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        serviceType: formData.serviceType,
        date: formData.date,
        flight: formData.flight,
        vehicleType,
        passengers: formData.passengers,
        luggage: formData.luggage,
        msg: formData.msg,
        totalUsd: prices.totalUsd,
        totalKrw: prices.totalKrw
      };

      const existingRes = localStorage.getItem('btg_reservations');
      const resList = existingRes ? JSON.parse(existingRes) : [];
      resList.unshift(newReservation);
      localStorage.setItem('btg_reservations', JSON.stringify(resList));

      // Construct email content
      const targetEmail = settings?.companyEmail || 'support@beyondthegate.vip';
      const emailSubject = `New Reservation Request - ${newBookingId}`;
      const emailBody = `A new reservation request has been submitted with the details below:

[Reservation Details]
- Reference Ticket ID: ${newBookingId}
- Service Date & Time: ${formData.date.replace('T', ' ')}
- Service Type: ${formData.serviceType.toUpperCase()}
- Flight Number: ${formData.flight || 'N/A'}

[Client Info]
- Name: ${formData.name}
- Email: ${formData.email}
- Phone: ${formData.phone}

[Service Configuration]
- Selected Chauffeur Vehicle: ${vehicleType.toUpperCase()}
- Passengers Count: ${formData.passengers}
- Checked Luggage Count: ${formData.luggage}

[Pricing Breakdown]
- Base Assist Fee: $${prices.base}
- Chauffeur Vehicle Fee: $${prices.vehicle}
- Extra Passenger Surcharge: $${prices.extraPass}
- Extra Baggage Surcharge: $${prices.extraLug}
--------------------------------------------------
- Estimated Total Cost: $${prices.totalUsd} (≈ ${prices.totalKrw.toLocaleString()} KRW)

[Client Message / Special Requests]
${formData.msg || 'No special requests.'}

Sincerely,
Beyond the Gate Automated System`;

      // 백엔드 이메일 API 호출
      fetch('http://localhost:4242/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: targetEmail,
          customerEmail: formData.email,
          subject: emailSubject,
          text: emailBody
        })
      }).catch(err => console.error("Email send error:", err));

      setStatus('success');
    }, 2000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      serviceType: 'arrival',
      date: '',
      flight: '',
      passengers: 1,
      luggage: 0,
      msg: ''
    });
    setLocalVehicleType('none');
    setSelectedVehicle('none');
    setStatus('idle');
    setBookingStarted(false);
  };

  const startBooking = () => {
    setBookingStarted(true);
    // Scroll to form smoothly
    setTimeout(() => {
      document.getElementById('detailed-booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const featuresList = activeTab === 'arrival' 
    ? (t.form.features_arrival || [])
    : (t.form.features_departure || []);
    
  const imageUrl = activeTab === 'arrival' 
    ? '/arrival_service_sunset.png' 
    : '/departure_service_wing.png';

  return (
    <section id="reserve" className="reserve-section section-padding">
      <div className="container">
        <div className="section-header">
          <span className="badge-gold">{t.form.badge || 'Reservation Portal'}</span>
          <h2 className="font-serif text-gold">{t.form.title}</h2>
          <p>{t.form.subtitle}</p>
        </div>

        <div className="reserve-wrapper">
          {status !== 'success' ? (
            <div className="reserve-main-content">
              {/* Tabs */}
              <div className="service-tabs">
                <button 
                  className={`service-tab ${activeTab === 'arrival' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('arrival'); setBookingStarted(false); }}
                >
                  {t.form.tabs?.arrival || 'ICN Arrival Services'}
                </button>
                <button 
                  className={`service-tab ${activeTab === 'departure' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('departure'); setBookingStarted(false); }}
                >
                  {t.form.tabs?.departure || 'ICN Departure Services'}
                </button>
              </div>

              {/* 3-Column Layout */}
              <div className="reserve-grid-new">
                {/* Column 1: Image */}
                <div className="res-col res-image-col">
                  <div className="res-image-wrapper">
                    <img src={imageUrl} alt={activeTab} className="res-image" />
                    <div className="res-image-overlay">
                      <h3>{activeTab === 'arrival' ? 'Arrival Services' : 'Departure Services'}</h3>
                    </div>
                  </div>
                </div>

                {/* Column 2: Features */}
                <div className="res-col res-features-col glass-panel">
                  <h3 className="features-title font-serif">{t.form.features_title || 'Features:'}</h3>
                  <ul className="features-list">
                    {featuresList.map((feat, idx) => (
                      <li key={idx} className="feature-item">
                        <Check className="feature-icon" size={18} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  {t.form.features_footnote && (
                    <p className="features-footnote">{t.form.features_footnote}</p>
                  )}
                </div>

                {/* Column 3: Price & Actions */}
                <div className="res-col res-price-col glass-panel">
                  <div className="price-top">
                    <span className="price-label">{t.form.price_lbl || 'Price:'}</span>
                    <div className="base-price">
                      <span className="usd-val">${prices.base}</span>
                      <span className="krw-val">≈ {prices.baseKrw.toLocaleString()} {t.form.approx_currency || 'KRW'}</span>
                    </div>
                  </div>
                  
                  <div className="calc-divider"></div>

                  <div className="pax-selector">
                    <label>{t.form.select_pax_lbl || 'Select number of people:'}</label>
                    <div className="counter-controls">
                      <button type="button" onClick={() => handleNumChange('passengers', formData.passengers - 1)}>-</button>
                      <span>{formData.passengers}</span>
                      <button type="button" onClick={() => handleNumChange('passengers', formData.passengers + 1)}>+</button>
                    </div>
                  </div>

                  <div className="calc-divider"></div>

                  <div className="total-display">
                    <span className="total-label">{t.form.total_lbl || 'Total:'}</span>
                    <div className="total-price-group">
                      <span className="total-price-usd">${prices.totalUsd}</span>
                      <span className="total-price-krw">≈ {prices.totalKrw.toLocaleString()} {t.form.approx_currency || 'KRW'}</span>
                    </div>
                  </div>

                  {!bookingStarted && (
                    <button onClick={startBooking} className="btn-premium primary btn-add-booking mt-auto">
                      {t.form.add_to_booking || 'Add to Booking'}
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Form (Revealed upon 'Add to Booking') */}
              {bookingStarted && (
                <div id="detailed-booking-form" className="detailed-form-wrapper glass-panel mt-40">
                  <h3 className="font-serif text-gold mb-24">Complete Your Reservation</h3>
                  <form onSubmit={handleSubmit} className="reserve-form-panel">
                    <div className="form-group-row">
                      <div className="form-item">
                        <label htmlFor="name" className="required">{t.form.name}</label>
                        <input 
                          type="text" 
                          id="name"
                          name="name" 
                          value={formData.name} 
                          onChange={handleChange}
                          placeholder={t.form.placeholder_name || 'e.g. John Doe'}
                          required
                        />
                      </div>
                      <div className="form-item">
                        <label htmlFor="email" className="required">{t.form.email}</label>
                        <input 
                          type="email" 
                          id="email"
                          name="email" 
                          value={formData.email} 
                          onChange={handleChange}
                          placeholder={t.form.placeholder_email || 'name@example.com'}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-item">
                        <label htmlFor="phone" className="required">{t.form.phone}</label>
                        <input 
                          type="tel" 
                          id="phone"
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleChange}
                          placeholder={t.form.placeholder_phone || '+82 10-0000-0000'}
                          required
                        />
                      </div>
                      <div className="form-item">
                        <label htmlFor="date" className="required">{t.form.date}</label>
                        <input 
                          type="datetime-local" 
                          id="date"
                          name="date" 
                          value={formData.date} 
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-item">
                        <label htmlFor="vehicleType">{t.form.vehicle_type}</label>
                        <select 
                          id="vehicleType"
                          value={vehicleType} 
                          onChange={(e) => handleVehicleChange(e.target.value)}
                        >
                          <option value="none">{t.form.none}</option>
                          <option value="staria">{t.form.staria}</option>
                          <option value="g90">{t.form.g90}</option>
                          <option value="sprinter">{t.form.sprinter}</option>
                        </select>
                      </div>
                      <div className="form-item">
                        <label htmlFor="flight">{t.form.flight}</label>
                        <input 
                          type="text" 
                          id="flight"
                          name="flight" 
                          value={formData.flight} 
                          onChange={handleChange}
                          placeholder={t.form.placeholder_flight || 'e.g. KE182'}
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-item-counters">
                        <div className="counter-box">
                          <label>{t.form.luggage}</label>
                          <div className="counter-controls">
                            <button type="button" onClick={() => handleNumChange('luggage', formData.luggage - 1)}>-</button>
                            <span>{formData.luggage}</span>
                            <button type="button" onClick={() => handleNumChange('luggage', formData.luggage + 1)}>+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-item full-width mt-16">
                      <label htmlFor="msg">{t.form.msg}</label>
                      <textarea 
                        id="msg"
                        name="msg" 
                        value={formData.msg} 
                        onChange={handleChange}
                        rows="3"
                        placeholder={t.form.placeholder_msg || 'Provide airline details, special dietary, or child seats requested...'}
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-premium primary btn-submit-reserve mt-24" 
                      disabled={status === 'submitting'}
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 size={18} className="spinner-icon animate-spin" />
                          <span>{t.form.submitting}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} style={{ marginRight: '8px' }} />
                          <span>{t.form.submit}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* Success confirmation card */
            <div className="booking-success-card glass-panel">
              <CheckCircle2 size={64} className="success-check-icon animate-bounce-slow" />
              <h3 className="font-serif">{t.form.success_title}</h3>
              <p className="success-desc">{t.form.success_desc}</p>
              
              <div className="ticket-summary">
                <div className="ticket-header">
                  <span className="ticket-brand">{t.brand}</span>
                  <span className="ticket-id-label">{t.form.success_id}</span>
                </div>
                <div className="ticket-id">{bookingId}</div>
                <div className="ticket-divider"></div>
                <div className="ticket-body">
                  <div className="ticket-info-row">
                    <span>{t.form.ticket_lbl_client || 'Client:'}</span> <strong>{formData.name}</strong>
                  </div>
                  <div className="ticket-info-row">
                    <span>{t.form.ticket_lbl_service || 'Service:'}</span> <strong>{formData.serviceType.toUpperCase()}</strong>
                  </div>
                  <div className="ticket-info-row">
                    <span>{t.form.ticket_lbl_vehicle || 'Vehicle:'}</span> <strong>{vehicleType.toUpperCase()}</strong>
                  </div>
                  <div className="ticket-info-row">
                    <span>{t.form.ticket_lbl_date || 'Date:'}</span> <strong>{formData.date.replace('T', ' ')}</strong>
                  </div>
                  <div className="ticket-info-row">
                    <span>{t.form.ticket_lbl_amount || 'Amount:'}</span> <strong>${prices.totalUsd} {t.form.currency_unit || 'USD'} / {t.form.approx_label || '≈'} {prices.totalKrw.toLocaleString()} {t.form.approx_currency || 'KRW'}</strong>
                  </div>
                </div>
              </div>

              <div style={{
                width: '100%',
                background: 'rgba(197, 168, 128, 0.04)',
                border: '1px solid rgba(197, 168, 128, 0.15)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'center',
                fontSize: '0.85rem'
              }}>
                <p style={{ color: '#fff', marginBottom: '8px', fontWeight: '600' }}>
                  {lang === 'ko' ? '예약 내역 이메일 발송 완료' : 'Reservation Email Sent'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  {lang === 'ko' 
                    ? `입력하신 이메일(${formData.email})과 관리자에게 예약 내역이 성공적으로 발송되었습니다.` 
                    : `Reservation details have been successfully sent to your email (${formData.email}) and our support team.`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  onClick={() => {
                    alert('추후 서비스 예정입니다.');
                    // 임시 주석 처리: 결제 키 발급 후 활성화
                    /*
                    navigate('/payment', { 
                      state: {
                        orderId: bookingId,
                        orderName: `BTG ${formData.serviceType.toUpperCase()} Service`,
                        amount: prices.totalKrw,
                        customerName: formData.name,
                        customerEmail: formData.email,
                        customerMobilePhone: formData.phone
                      }
                    });
                    */
                  }} 
                  className="btn-premium primary"
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <CreditCard size={18} />
                  <span>{lang === 'ko' ? '지금 결제하기' : 'Pay Now'}</span>
                </button>
                <button onClick={resetForm} className="btn-premium secondary btn-success-close" style={{ flex: 1 }}>
                  {t.form.close}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .reserve-section {
          background: linear-gradient(to bottom, rgba(4, 9, 20, 1) 0%, rgba(13, 22, 42, 0.4) 100%);
          position: relative;
        }

        .reserve-wrapper {
          margin-top: 40px;
        }
        
        .mt-40 { margin-top: 40px; }
        .mt-24 { margin-top: 24px; }
        .mt-16 { margin-top: 16px; }
        .mt-auto { margin-top: auto; }
        .mb-24 { margin-bottom: 24px; }

        .service-tabs {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 30px;
        }

        .service-tab {
          padding: 12px 32px;
          background: rgba(4, 9, 20, 0.5);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-family: var(--font-serif);
          font-size: 1.1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .service-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .service-tab.active {
          background: rgba(197, 168, 128, 0.1);
          border-color: var(--gold-primary);
          color: var(--gold-primary);
          box-shadow: 0 4px 15px rgba(197, 168, 128, 0.15);
        }

        .reserve-grid-new {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
        }

        .res-col {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
        }

        .res-image-col {
          position: relative;
          background: #000;
        }

        .res-image-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 350px;
        }

        .res-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
          transition: transform 0.5s ease;
        }
        
        .res-image-wrapper:hover .res-image {
          transform: scale(1.05);
        }

        .res-image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 40px 24px 24px;
          background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
        }

        .res-image-overlay h3 {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          color: #fff;
          margin: 0;
        }

        .res-features-col {
          padding: 32px 24px;
        }

        .features-title {
          font-size: 1.3rem;
          color: var(--gold-primary);
          margin-bottom: 20px;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 0.95rem;
          color: #fff;
          line-height: 1.4;
        }

        .feature-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .features-footnote {
          margin-top: 24px;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .res-price-col {
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
        }

        .price-top {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .price-label, .total-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .base-price {
          display: flex;
          flex-direction: column;
        }
        
        .usd-val {
          font-size: 2rem;
          font-family: var(--font-sans);
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        
        .krw-val {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .pax-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 20px 0;
        }
        
        .pax-selector label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
        }

        .total-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 20px;
          margin-bottom: 30px;
        }

        .total-price-usd {
          font-size: 2.2rem;
          font-family: var(--font-sans);
          font-weight: 700;
          color: var(--gold-primary);
          line-height: 1.1;
        }
        
        .total-price-krw {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .btn-add-booking {
          width: 100%;
          padding: 16px;
          font-size: 1.05rem;
          display: flex;
          justify-content: center;
        }

        .detailed-form-wrapper {
          padding: 40px;
          animation: slideDown 0.5s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .reserve-form-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .form-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-item.full-width {
          grid-column: span 2;
        }

        .form-item label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-item label.required::after {
          content: ' *';
          color: var(--gold-primary);
        }

        .form-item input, 
        .form-item select, 
        .form-item textarea {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          background: rgba(4, 9, 20, 0.5);
          border: 1px solid var(--border-subtle);
          color: #fff;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: var(--font-sans);
          transition: var(--transition-fast);
        }

        .form-item input:focus, 
        .form-item select:focus, 
        .form-item textarea:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 10px rgba(197, 168, 128, 0.15);
        }

        /* Number counters */
        .form-item-counters {
          display: flex;
          gap: 16px;
          align-items: flex-end;
        }

        .counter-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .counter-box label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
        }

        .counter-controls {
          display: flex;
          align-items: center;
          background: rgba(4, 9, 20, 0.5);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          height: 46px;
          justify-content: space-between;
          padding: 0 6px;
        }

        .counter-controls button {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .counter-controls button:hover {
          background: var(--gold-primary);
          color: var(--bg-primary);
        }

        .counter-controls span {
          font-weight: 600;
          font-size: 1rem;
        }

        .btn-submit-reserve {
          width: 100%;
          border: none;
          padding: 15px;
          font-size: 1rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .calc-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 10px 0;
        }

        /* Success card styling */
        .booking-success-card {
          max-width: 600px;
          margin: 0 auto;
          padding: 50px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .success-check-icon {
          color: var(--gold-primary);
          margin-bottom: 24px;
        }

        .booking-success-card h3 {
          font-size: 1.8rem;
          color: #fff;
          margin-bottom: 12px;
        }

        .success-desc {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin-bottom: 30px;
          max-width: 450px;
        }

        .ticket-summary {
          width: 100%;
          background: rgba(4, 9, 20, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
          text-align: left;
          position: relative;
        }

        .ticket-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .ticket-brand {
          font-weight: 700;
          color: var(--gold-primary);
        }

        .ticket-id {
          font-family: var(--font-sans);
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 16px;
        }

        .ticket-divider {
          height: 1px;
          border-top: 1px dashed var(--border-subtle);
          margin-bottom: 16px;
        }

        .ticket-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ticket-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .ticket-info-row strong {
          color: #fff;
        }

        .btn-success-close {
          width: 100%;
          max-width: 250px;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }

        @media (max-width: 1024px) {
          .reserve-grid-new {
            grid-template-columns: 1fr;
          }
          .res-image-wrapper {
            min-height: 250px;
          }
        }

        @media (max-width: 768px) {
          .form-group-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .form-item.full-width {
            grid-column: span 1;
          }
          .service-tabs {
            flex-direction: column;
            gap: 10px;
          }
          .detailed-form-wrapper {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  );
}
