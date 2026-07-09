import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';

export default function ReservationForm({ t, lang, selectedVehicle, setSelectedVehicle, settings }) {
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
  const [mailtoUrl, setMailtoUrl] = useState('');

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
      const emailSubject = `[Beyond the Gate] New Reservation Request - ${newBookingId}`;
      const emailBody = `Dear Beyond the Gate Team,

A new reservation request has been submitted with the details below:

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

      const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      setMailtoUrl(mailtoUrl);
      window.location.href = mailtoUrl;

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
    setMailtoUrl('');
    setStatus('idle');
  };

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
            <div className="reserve-grid grid-2">
              {/* Left Side: Form */}
              <form onSubmit={handleSubmit} className="reserve-form-panel glass-panel">
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
                    <label htmlFor="serviceType">{t.form.service_type}</label>
                    <select 
                      id="serviceType"
                      name="serviceType" 
                      value={formData.serviceType} 
                      onChange={handleChange}
                    >
                      <option value="arrival">{t.services.tabs.arrival}</option>
                      <option value="departure">{t.services.tabs.departure}</option>
                      <option value="transfer">{t.services.tabs.transfer}</option>
                      <option value="picketing">{t.services.tabs.picketing || '입국장 피케팅 (Welcome Picketing)'}</option>
                    </select>
                  </div>
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
                </div>

                <div className="form-group-row">
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
                  <div className="form-item-counters">
                    <div className="counter-box">
                      <label>{t.form.passengers}</label>
                      <div className="counter-controls">
                        <button type="button" onClick={() => handleNumChange('passengers', formData.passengers - 1)}>-</button>
                        <span>{formData.passengers}</span>
                        <button type="button" onClick={() => handleNumChange('passengers', formData.passengers + 1)}>+</button>
                      </div>
                    </div>
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

                <div className="form-item full-width">
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
                  className="btn-premium primary btn-submit-reserve" 
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

              {/* Right Side: Tariff Details */}
              <div className="tariff-calculator-panel glass-panel">
                <div className="calc-header">
                  <Calculator size={24} className="calc-header-icon" />
                  <h3 className="font-serif">{t.form.calc_title}</h3>
                </div>

                <div className="calc-breakdown">
                  <div className="calc-row">
                    <span className="calc-row-lbl">{t.form.calc_base ? t.form.calc_base.split(' (')[0] : ''}</span>
                    <span className="calc-row-val">${prices.base}</span>
                  </div>
                  
                  {vehicleType !== 'none' && (
                    <div className="calc-row">
                      <span className="calc-row-lbl">
                        {t.form.calc_vehicle} ({vehicleType.toUpperCase()})
                      </span>
                      <span className="calc-row-val">${prices.vehicle}</span>
                    </div>
                  )}

                  {formData.passengers > 4 && (
                    <div className="calc-row surcharge">
                      <span className="calc-row-lbl">
                        {t.form.calc_extra_pass ? `${t.form.calc_extra_pass.split(' (')[0]} ($${settings?.extraPassengerFeeUsd || 50}/pax over 4)` : ''}
                      </span>
                      <span className="calc-row-val">+${prices.extraPass}</span>
                    </div>
                  )}

                  {formData.luggage > 4 && (
                    <div className="calc-row surcharge">
                      <span className="calc-row-lbl">
                        {t.form.calc_extra_lug ? `${t.form.calc_extra_lug.split(' (')[0]} ($${settings?.extraLuggageFeeUsd || 20}/bag over 4)` : ''}
                      </span>
                      <span className="calc-row-val">+${prices.extraLug}</span>
                    </div>
                  )}

                  <div className="calc-divider"></div>

                  <div className="calc-total-box">
                    <span className="total-title">{t.form.calc_total}</span>
                    <div className="total-price-group">
                      <span className="total-price-usd">${prices.totalUsd} <span className="currency-unit">{t.form.currency_unit || 'USD'}</span></span>
                      <span className="total-price-krw">{t.form.approx_label || '≈'} {prices.totalKrw.toLocaleString()} {t.form.approx_currency || 'KRW'}</span>
                    </div>
                  </div>
                </div>

                <div className="calc-footer">
                  <ShieldCheck size={18} className="shield-icon" />
                  <span>{t.form.calc_footer_text || 'Secure 256-bit SSL encrypted booking portal. Final rates verified before billing email.'}</span>
                </div>
              </div>
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

              {mailtoUrl && (
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
                    {lang === 'ko' ? '회사 이메일로 예약 요청 발송' : 'Email Reservation to Company'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '14px' }}>
                    {lang === 'ko' 
                      ? `회사 이메일(${settings?.companyEmail || 'support@beyondthegate.vip'})로 예약 요청 메일 작성 창이 실행되었습니다. 메일 앱이 열리지 않았거나 수동 전송이 필요하면 아래 버튼을 클릭하세요.` 
                      : `A reservation email has been prepared to send to ${settings?.companyEmail || 'support@beyondthegate.vip'}. If it did not open automatically, please click below.`}
                  </p>
                  <a 
                    href={mailtoUrl}
                    className="btn-premium secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      padding: '10px 20px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <span>{lang === 'ko' ? '회사로 예약 메일 직접 전송' : 'Send Reservation Email Now'}</span>
                  </a>
                </div>
              )}

              <button onClick={resetForm} className="btn-premium primary btn-success-close">
                {t.form.close}
              </button>
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

        .reserve-form-panel {
          padding: 40px;
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
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          align-items: flex-end;
        }

        .counter-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
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
          margin-top: 10px;
          padding: 15px;
          font-size: 1rem;
        }

        /* Tariff details panel */
        .tariff-calculator-panel {
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          border-left: 2px solid var(--gold-primary);
        }

        .calc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
        }

        .calc-header-icon {
          color: var(--gold-primary);
        }

        .calc-header h3 {
          font-size: 1.6rem;
          color: #fff;
        }

        .calc-breakdown {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 40px;
        }

        .calc-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .calc-row.surcharge {
          color: var(--gold-primary);
        }

        .calc-row-val {
          font-weight: 600;
          color: #fff;
        }

        .calc-row.surcharge .calc-row-val {
          color: var(--gold-primary);
        }

        .calc-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 10px 0;
        }

        .calc-total-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .total-title {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .total-price-group {
          display: flex;
          flex-direction: column;
        }

        .total-price-usd {
          font-size: 2.4rem;
          font-weight: 700;
          color: var(--gold-primary);
          font-family: var(--font-serif);
          line-height: 1.1;
        }

        .currency-unit {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .total-price-krw {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .calc-footer {
          display: flex;
          gap: 10px;
          color: var(--text-muted);
          font-size: 0.75rem;
          line-height: 1.4;
        }

        .shield-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
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
          font-family: var(--font-serif);
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
          .reserve-grid {
            grid-template-columns: 1fr;
          }
          .tariff-calculator-panel {
            border-left: none;
            border-top: 2px solid var(--gold-primary);
            margin-top: 24px;
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
          .form-item-counters {
            grid-template-columns: 1fr 1fr;
            align-items: flex-end;
          }
          .reserve-form-panel, .tariff-calculator-panel {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  );
}
