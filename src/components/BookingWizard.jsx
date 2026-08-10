import React, { useState } from 'react';
import { Check, ChevronLeft, CreditCard, ChevronDown, ChevronUp, Minus, Plus, Luggage, PlaneTakeoff, Search, Ticket, UploadCloud, Plane, User, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COUNTRY_CODES = [
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
];

const AIRLINES = [
  { name: 'Korean Air', code: 'KE' },
  { name: 'Asiana Airlines', code: 'OZ' },
  { name: '7Air Cargo', code: 'R7' },
  { name: '9Air', code: 'AQ' },
  { name: 'Abaete Aerotaxi', code: 'E4' },
  { name: 'Abakan Air', code: 'S5*' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'Emirates', code: 'EK' },
  { name: 'Lufthansa', code: 'LH' },
  { name: 'KLM Royal Dutch', code: 'KL' },
  { name: 'Air France', code: 'AF' },
  { name: 'Singapore Airlines', code: 'SQ' },
  { name: 'Cathay Pacific', code: 'CX' },
];

export default function BookingWizard({ onClose, initialData, settings, t }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isAirlineOpen, setIsAirlineOpen] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('nicepay');
  const [isQuoteOpen, setIsQuoteOpen] = useState(true);
  const orderId = 'ORD626197';
  const [formData, setFormData] = useState({
    airport: initialData?.airport || 'ICN',
    serviceType: initialData?.serviceType || 'arrival',
    date: initialData?.date || '',
    passengers: initialData?.passengers || 1,
    email: initialData?.email || '',
    
    // Step 1: Select Service
    package: 'meet_greet', // meet_greet | vip_terminal
    
    // Step 2: Additional Services
    luggageCount: 0,
    addTransfer: false,
    
    // Step 3: Flight Information
    airline: '',
    flightNumber: '',
    
    // Step 4: Passenger Details
    firstName: '',
    lastName: '',
    dobMonth: '',
    dobDay: '',
    dobYear: '',
    travelClass: '',
    phone: '',
    wheelchair: false,
    
    // Step 5: Contact
    sameAsPrimary: true,
    contactFirst: '',
    contactLast: '',
    contactEmail: '',
    contactPhone: '',
    vehicleType: 'none'
  });

  const updateForm = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  // Price Calculation Integration
  const exRate = settings?.exchangeRate || 1350;
  
  const serviceTypeKey = ['arrival', 'departure', 'transfer'].includes(formData.serviceType) ? formData.serviceType : 'arrival';
  const currentAirport = settings?.airports?.find(a => a.code === formData.airport) || null;
  
  // Base prices based on selected airport or fallback
  const baseFeeUsd = currentAirport?.services?.[serviceTypeKey]?.usd ?? settings?.servicePrices?.[serviceTypeKey]?.usd ?? 250;
  const baseFeeKrw = currentAirport?.services?.[serviceTypeKey]?.krw ?? settings?.servicePrices?.[serviceTypeKey]?.krw ?? 310000;

  // Vehicle pricing
  let vehicleKrw = 0;
  let vehicleUsd = 0;
  const currentVehicle = currentAirport?.vehicles?.find(v => v.id === formData.vehicleType) || null;
  
  if (currentVehicle) {
    vehicleKrw = currentVehicle.priceKrw;
    vehicleUsd = currentVehicle.priceUsd;
  } else if (formData.vehicleType === 'staria') {
    vehicleKrw = settings?.vehiclePricesKrw?.staria || 140000;
  } else if (formData.vehicleType === 'g90') {
    vehicleKrw = settings?.vehiclePricesKrw?.g90 || 240000;
  } else if (formData.vehicleType === 'sprinter') {
    vehicleKrw = settings?.vehiclePricesKrw?.sprinter || 240000;
  }
  
  if (!currentVehicle && vehicleKrw > 0) {
    vehicleUsd = Math.round(vehicleKrw / exRate);
  }

  const extraPassCount = Math.max(0, formData.passengers - 4);
  const extraPassUsd = extraPassCount * (settings?.extraPassengerFeeUsd || 50);

  const extraLugCount = Math.max(0, formData.luggageCount - 4);
  const extraLugUsd = extraLugCount * (settings?.extraLuggageFeeUsd || 20);

  const totalUsd = baseFeeUsd + vehicleUsd + extraPassUsd + extraLugUsd;
  const totalKrw = baseFeeKrw + vehicleKrw + Math.round((extraPassUsd + extraLugUsd) * exRate);

  const steps = [
    { id: 1, name: t?.wizard?.steps?.step1 || 'Select service' },
    { id: 2, name: t?.wizard?.steps?.step2 || 'Additional services' },
    { id: 3, name: t?.wizard?.steps?.step3 || 'Flight information' },
    { id: 4, name: t?.wizard?.steps?.step4 || 'Passengers details' },
    { id: 5, name: t?.wizard?.steps?.step5 || 'Contact information' },
    { id: 6, name: t?.wizard?.steps?.step6 || 'Payment details' }
  ];

  const handleNext = () => {
    if (step === 3) {
      if (!formData.airline || !formData.flightNumber) {
        alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
        return;
      }
    } else if (step === 4) {
      if (!formData.firstName || !formData.lastName || !formData.dobMonth || !formData.dobDay || !formData.dobYear || !formData.email || !formData.phone) {
        alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
        return;
      }
    } else if (step === 5) {
      if (!formData.sameAsPrimary && (!formData.contactFirst || !formData.contactLast || !formData.contactEmail || !formData.contactPhone)) {
        alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
        return;
      }
    }
    setStep(prev => Math.min(prev + 1, 6));
  };
  const handleBack = () => {
    if (step === 1) onClose();
    else setStep(prev => prev - 1);
  };

  const handlePayment = (method) => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const bookingId = `BTG-2026-${randNum}`;
    
    const newReservation = {
      id: bookingId,
      dateSubmitted: new Date().toLocaleString(),
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      serviceType: formData.serviceType,
      date: formData.date,
      flight: `${formData.airline} ${formData.flightNumber}`,
      vehicleType: formData.vehicleType,
      passengers: formData.passengers,
      luggage: formData.luggageCount,
      msg: '',
      totalUsd: totalUsd,
      totalKrw: totalKrw
    };

    const existingRes = localStorage.getItem('btg_reservations');
    const resList = existingRes ? JSON.parse(existingRes) : [];
    resList.unshift(newReservation);
    localStorage.setItem('btg_reservations', JSON.stringify(resList));

    const targetEmail = settings?.companyEmail || 'support@beyondthegate.vip';
    const emailSubject = `New Reservation Request - ${bookingId}`;
    const emailBody = `A new reservation request has been submitted with the details below:

[Reservation Details]
- Reference Ticket ID: ${bookingId}
- Service Date & Time: ${formData.date}
- Service Type: ${formData.serviceType.toUpperCase()}
- Flight: ${newReservation.flight}

[Client Info]
- Name: ${newReservation.name}
- Email: ${formData.email}
- Phone: ${formData.phone}

[Service Configuration]
- Selected Chauffeur Vehicle: ${formData.vehicleType.toUpperCase()}
- Passengers Count: ${formData.passengers}
- Checked Luggage Count: ${formData.luggageCount}

[Pricing Breakdown]
- Base Assist Fee: $${baseFeeUsd}
- Chauffeur Vehicle Fee: $${vehicleUsd}
- Extra Passenger Surcharge: $${extraPassUsd}
- Extra Baggage Surcharge: $${extraLugUsd}
--------------------------------------------------
- Estimated Total Cost: $${totalUsd} (≈ ${totalKrw.toLocaleString()} KRW)

Sincerely,
Beyond the Gate Automated System`;

    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: targetEmail,
        customerEmail: formData.email,
        subject: emailSubject,
        text: emailBody
      })
    }).catch(err => console.error("Email send error:", err));

    if (method === 'nicepay' || method === 'card' || method === 'domestic') {
      navigate('/payment', { 
        state: {
          orderId: bookingId,
          orderName: `VIP ${formData.serviceType} in ICN`,
          amount: totalKrw,
          customerName: newReservation.name,
          customerEmail: formData.email,
          customerMobilePhone: formData.phone
        }
      });
    } else {
      navigate('/payment/paypal', { 
        state: {
          orderId: bookingId,
          orderName: `VIP ${formData.serviceType} in ICN`,
          amount: totalUsd,
          customerName: newReservation.name,
          customerEmail: formData.email,
          customerMobilePhone: formData.phone
        }
      });
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-header">
        <button onClick={handleBack} className="wizard-back-btn">
          <ChevronLeft size={20} /> {t?.wizard?.common?.back || 'Back'}
        </button>
        <div className="wizard-stepper">
          {steps.map(s => (
            <div key={s.id} className="stepper-item">
              <div className="step-name">
                {s.id}. {s.name}
              </div>
              <div className={`step-status ${step > s.id ? 'completed' : step === s.id ? 'progress' : 'pending'}`}>
                {step > s.id ? <><Check size={14}/> {t?.wizard?.common?.completed || 'Completed'}</> : step === s.id ? (t?.wizard?.common?.inProgress || 'In progress') : (t?.wizard?.common?.notCompleted || 'Not completed')}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="wizard-close-btn">✕</button>
      </div>

      <div className="wizard-body container">
        <div className="wizard-content">
          
          {step === 1 && (
            <div className="step-panel">
              <div className="sky-step-header mb-24">
                <h2 className="sky-header-title">
                  {formData.serviceType.charAt(0).toUpperCase() + formData.serviceType.slice(1)} {formData.airport}, Incheon International Airport
                </h2>
                <div className="sky-header-meta">
                  <span>📅 {formData.date || '18 Aug, 2026'}</span>
                  <span>👥 {formData.passengers} Adult</span>
                </div>
              </div>

              <div className="package-selector mb-24">
                <div 
                  className={`sky-pkg-card ${formData.package === 'meet_greet' ? 'active' : ''}`}
                  onClick={() => updateForm('package', 'meet_greet')}
                >
                  <div className="sky-pkg-card-header">
                    <span className="sky-pkg-title">{t?.wizard?.step1?.meetGreetTitle || 'VIP Meet & Greet'}</span>
                    <div className="sky-check-circle">
                      <Check size={14} color="#fff" />
                    </div>
                  </div>
                  <div className="sky-pkg-desc">{t?.wizard?.step1?.meetGreetDesc || 'Personal assistance throughout the airport.'}</div>
                </div>
              </div>

              <div className="sky-pkg-detail-card mb-24">
                <div className="sky-pill-badge mb-12">SILVER PACKAGE</div>
                
                <div className="sky-pkg-detail-body">
                  <div className="sky-pkg-left">
                    <h3 className="sky-pkg-main-title">{t?.wizard?.step1?.meetGreetTitle || 'Meet & Greet'}</h3>
                    
                    <div className="sky-price-section">
                      <span className="sky-price-label">{t?.wizard?.step1?.servicePrice || 'Service price'}</span>
                      <div className="sky-price-amount">
                        <strong>USD {baseFeeUsd.toFixed(2)}</strong> <span className="sky-per-pass">{t?.wizard?.step1?.perPassenger || '/ 1 passenger'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="sky-pkg-right">
                    <div className="sky-included-title">{t?.wizard?.step1?.includedTitle || 'INCLUDED IN PACKAGE:'}</div>
                    <ul className="sky-included-list">
                      <li>
                        <span className="sky-inc-icon">👤</span>
                        <div><strong>Personal Greeting</strong> at the arrival gate with a name sign</div>
                      </li>
                      <li>
                        <span className="sky-inc-icon">🏃</span>
                        <div><strong>Fast track</strong> through the airport formalities</div>
                      </li>
                      <li>
                        <span className="sky-inc-icon">🧳</span>
                        <div><strong>Baggage Handling</strong> luggage assistance upon request</div>
                      </li>
                      <li>
                        <span className="sky-inc-icon">🚶</span>
                        <div><strong>Airport Exiting</strong> accompanying to the curbside area</div>
                      </li>
                      <li>
                        <span className="sky-inc-icon">🚗</span>
                        <div><strong>Transfer Service</strong> luxury vehicle from the airport for an additional fee</div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="sky-notice-box mt-24">
                  <span className="sky-notice-icon">ℹ</span>
                  <div className="sky-notice-text">
                    {t?.wizard?.step1?.noticeText || 'The transfer rates provided are applicable for travel to city center with MPV. If you require a transfer to a different destination or upgrade a car class, please feel free to contact us, and we will be happy to assist you with a personalized quote'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-panel">
              <h2 className="sky-step2-title">{t?.wizard?.step2?.title || 'Additional Services'}</h2>
              <p className="sky-step2-sub mb-24">{t?.wizard?.step2?.subtitle || "Tell us more about your trip and pick anything you'd like us to handle."}</p>
              
              <div className="sky-addon-card mb-24">
                <div className="sky-addon-img-wrap">
                  <img src="/luggage_assistance.jpg" alt="Luggage Assistance" className="sky-addon-img" />
                </div>
                <div className="sky-addon-content">
                  <h3 className="sky-addon-title">{t?.wizard?.step2?.luggageTitle || 'Luggage Assistance'}</h3>
                  <p className="sky-addon-sub">{t?.wizard?.step2?.luggageSub || 'We will handle your luggage for you'}</p>
                  
                  <div className="sky-counter-box mt-16">
                    <div className="sky-counter-label">
                      <Luggage size={18} className="sky-bag-icon" />
                      <span>{t?.wizard?.step2?.bagsLabel || 'Amount of bags'}</span>
                    </div>
                    <div className="sky-counter-controls">
                      <button 
                        className="sky-counter-btn"
                        onClick={() => updateForm('luggageCount', Math.max(0, formData.luggageCount - 1))}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="sky-counter-value">{formData.luggageCount}</span>
                      <button 
                        className="sky-counter-btn"
                        onClick={() => updateForm('luggageCount', formData.luggageCount + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chauffeur Vehicle Card */}
              <div className="sky-addon-card mb-24">
                <div className="sky-addon-img-wrap">
                  <img src="/luxury_fleet.png" alt="Chauffeur Vehicle" className="sky-addon-img" />
                </div>
                <div className="sky-addon-content">
                  <h3 className="sky-addon-title">{t?.wizard?.step2?.vehicleTitle || 'Chauffeur Vehicle'}</h3>
                  <p className="sky-addon-sub">{t?.wizard?.step2?.vehicleSub || 'Private transfer within the city to your destination'}</p>
                  
                  <div className="sky-counter-box mt-16">
                    <select 
                      value={formData.vehicleType} 
                      onChange={e => updateForm('vehicleType', e.target.value)}
                      className="sky-vehicle-select"
                    >
                      <option value="none">{t?.wizard?.step2?.vehicleNone || 'None (No Chauffeur Vehicle)'}</option>
                      {currentAirport?.vehicles && currentAirport.vehicles.length > 0 ? (
                        currentAirport.vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} (₩{v.priceKrw.toLocaleString()} / ~USD ${v.priceUsd})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="staria">Hyundai Staria (₩140,000 / ~USD $104)</option>
                          <option value="g90">Genesis G90 (₩240,000 / ~USD $178)</option>
                          <option value="sprinter">Mercedes Sprinter (₩240,000 / ~USD $178)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-panel">
              <h2 className="sky-step2-title">{t?.wizard?.step3?.title || 'Flight Information'}</h2>
              <p className="sky-step2-sub mb-24">{t?.wizard?.step3?.subtitle || 'Please add flight information below.'}</p>
              
              {/* Flight Details Card */}
              <div className="sky-flight-card mb-24">
                <div className="sky-flight-header mb-20">
                  <PlaneTakeoff size={20} className="sky-flight-icon" />
                  <div>
                    <h3 className="sky-flight-title">
                      {formData.serviceType === 'arrival' ? (t?.wizard?.step3?.arrivalTitle || 'Arrival flight') : formData.serviceType === 'departure' ? (t?.wizard?.step3?.departureTitle || 'Departure flight') : (t?.wizard?.step3?.connectionTitle || 'Connection flight')}
                    </h3>
                    <p className="sky-flight-sub">{t?.wizard?.step3?.flightSub || 'Please provide us with your airline details and the flight number'}</p>
                  </div>
                </div>

                <div className="sky-flight-form-row">
                  {/* Airline Search Dropdown */}
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step3?.airlineLabel || 'Airline'} *</label>
                    <div className="sky-airline-input-wrap">
                      <div 
                        className={`sky-airline-box ${isAirlineOpen ? 'active' : ''}`}
                        onClick={() => setIsAirlineOpen(!isAirlineOpen)}
                      >
                        <Search size={16} className="sky-search-icon" />
                        <input 
                          type="text" 
                          placeholder={t?.wizard?.step3?.airlinePlaceholder || "Search for your airline"}
                          value={formData.airline || airlineSearch}
                          onChange={(e) => {
                            updateForm('airline', e.target.value);
                            setAirlineSearch(e.target.value);
                            setIsAirlineOpen(true);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={() => setIsAirlineOpen(true)}
                          className="sky-airline-input"
                        />
                        <ChevronDown size={16} className="sky-chevron-icon" />
                      </div>

                      {isAirlineOpen && (
                        <div className="sky-airline-dropdown">
                          {AIRLINES.filter(a => 
                            a.name.toLowerCase().includes((formData.airline || airlineSearch).toLowerCase()) ||
                            a.code.toLowerCase().includes((formData.airline || airlineSearch).toLowerCase())
                          ).map(a => (
                            <div 
                              key={a.code} 
                              className="sky-airline-item"
                              onClick={() => {
                                updateForm('airline', a.name);
                                setAirlineSearch(a.name);
                                setIsAirlineOpen(false);
                              }}
                            >
                              <div className="sky-airline-item-left">
                                <Plane size={14} className="sky-plane-icon" />
                                <span>{a.name}</span>
                              </div>
                              <span className="sky-airline-code">{a.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flight Number */}
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step3?.flightNumLabel || 'Flight number'} *</label>
                    <input 
                      type="text" 
                      placeholder=""
                      value={formData.flightNumber}
                      onChange={(e) => updateForm('flightNumber', e.target.value)}
                      className="sky-text-input"
                    />
                    <p className="sky-field-note mt-8">
                      {t?.wizard?.step3?.flightNumNote || 'You can find your flight number on your ticket, please provide us with numbers only.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Flight Tickets Card */}
              <div className="sky-flight-card mb-24">
                <div className="sky-flight-header mb-16">
                  <Ticket size={20} className="sky-flight-icon" />
                  <div>
                    <h3 className="sky-flight-title">
                      {t?.wizard?.step3?.uploadTitle || 'Upload your Flight Tickets'} <span className="sky-optional-tag">{t?.wizard?.common?.optional || 'optional'}</span>
                    </h3>
                    <p className="sky-flight-sub">{t?.wizard?.step3?.uploadSub || 'You can upload your tickets now, or our team will contact you about this later on.'}</p>
                  </div>
                </div>

                <div className="sky-dropzone-box">
                  <UploadCloud size={28} className="sky-upload-icon mb-12" />
                  <div className="sky-dropzone-text">
                    {t?.wizard?.step3?.dropzoneText || 'Drag & drop your files or click here to select files'}
                  </div>
                  <div className="sky-dropzone-sub mt-4">
                    {t?.wizard?.step3?.dropzoneSub || 'JPEG, PNG, PDF files supported, up to 5MB'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-panel">
              <h2 className="sky-step2-title">{t?.wizard?.step4?.title || 'Enter Passengers Details'}</h2>
              <p className="sky-step2-sub mb-24">{t?.wizard?.step4?.subtitle || 'Add and review the number of passengers and their personal details.'}</p>
              
              {/* Primary Passenger Card */}
              <div className="sky-flight-card mb-24">
                <div className="sky-pax-card-header mb-24">
                  <div className="sky-pax-header-left">
                    <User size={20} className="sky-flight-icon" />
                    <div>
                      <h3 className="sky-flight-title">{t?.wizard?.step4?.primaryTitle || 'Primary passenger'}</h3>
                      <p className="sky-flight-sub">{t?.wizard?.step4?.primarySub || 'We need each passenger details to book a service for you'}</p>
                    </div>
                  </div>
                  
                  <select 
                    value={formData.paxCategory || 'adult'} 
                    onChange={(e) => updateForm('paxCategory', e.target.value)}
                    className="sky-pax-type-select"
                  >
                    <option value="adult">{t?.wizard?.step4?.adultLabel || 'Adult (7+ years)'}</option>
                    <option value="child">{t?.wizard?.step4?.childLabel || 'Child (0-7 years)'}</option>
                  </select>
                </div>

                {/* Row 1: First Name & Last Name */}
                <div className="sky-flight-form-row mb-20">
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step4?.firstName || 'First Name'} *</label>
                    <input 
                      type="text" 
                      placeholder={t?.wizard?.step4?.firstName || "Enter first name"}
                      value={formData.firstName}
                      onChange={(e) => updateForm('firstName', e.target.value)}
                      className="sky-text-input"
                    />
                  </div>
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step4?.lastName || 'Last Name'} *</label>
                    <input 
                      type="text" 
                      placeholder={t?.wizard?.step4?.lastName || "Enter last name"}
                      value={formData.lastName}
                      onChange={(e) => updateForm('lastName', e.target.value)}
                      className="sky-text-input"
                    />
                  </div>
                </div>

                {/* Row 2: Date of Birth & Class of Travel */}
                <div className="sky-flight-form-row mb-20">
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step4?.dob || 'Date of birth'} *</label>
                    <div className="sky-dob-grid">
                      <select 
                        value={formData.dobMonth} 
                        onChange={(e) => updateForm('dobMonth', e.target.value)}
                        className="sky-select-input"
                      >
                        <option value="">Month</option>
                        <option value="01">Jan</option>
                        <option value="02">Feb</option>
                        <option value="03">Mar</option>
                        <option value="04">Apr</option>
                        <option value="05">May</option>
                        <option value="06">Jun</option>
                        <option value="07">Jul</option>
                        <option value="08">Aug</option>
                        <option value="09">Sep</option>
                        <option value="10">Oct</option>
                        <option value="11">Nov</option>
                        <option value="12">Dec</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Day" 
                        value={formData.dobDay}
                        onChange={(e) => updateForm('dobDay', e.target.value)}
                        className="sky-text-input center-text"
                      />
                      <input 
                        type="text" 
                        placeholder="Year" 
                        value={formData.dobYear}
                        onChange={(e) => updateForm('dobYear', e.target.value)}
                        className="sky-text-input center-text"
                      />
                    </div>
                  </div>

                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step4?.travelClass || 'Class of travel'} <span className="sky-optional-tag">{t?.wizard?.common?.optional || 'optional'}</span></label>
                    <select 
                      value={formData.travelClass} 
                      onChange={(e) => updateForm('travelClass', e.target.value)}
                      className="sky-select-input"
                    >
                      <option value="">Select</option>
                      <option value="first">First Class</option>
                      <option value="business">Business Class</option>
                      <option value="premium_economy">Premium Economy</option>
                      <option value="economy">Economy Class</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Email & Phone Number */}
                <div className="sky-flight-form-row mb-24">
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step4?.email || 'Email'} *</label>
                    <input 
                      type="email" 
                      placeholder={t?.wizard?.step4?.email || "Enter email"}
                      value={formData.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className="sky-text-input"
                    />
                  </div>
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step4?.phone || 'Phone number'} *</label>
                    <div className="sky-phone-input-wrap">
                      <select 
                        value={formData.countryCode || '+1'} 
                        onChange={(e) => updateForm('countryCode', e.target.value)}
                        className="sky-country-code-select"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input 
                        type="tel" 
                        placeholder="— — — — —" 
                        value={formData.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        className="sky-phone-input"
                      />
                    </div>
                    <p className="sky-field-note mt-8">
                      {t?.wizard?.step4?.smsUpdateNote || 'You may receive SMS updates about your booking'}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch: Wheelchair */}
                <div className="sky-toggle-row">
                  <label className="sky-switch">
                    <input 
                      type="checkbox" 
                      checked={formData.wheelchair} 
                      onChange={(e) => updateForm('wheelchair', e.target.checked)} 
                    />
                    <span className="sky-slider round"></span>
                  </label>
                  <span className="sky-toggle-label">{t?.wizard?.step4?.wheelchairLabel || 'Wheelchair requested from the airline'}</span>
                </div>
              </div>

              {/* Additional Passenger Cards (if passengers > 1) */}
              {Array.from({ length: Math.max(0, formData.passengers - 1) }).map((_, idx) => {
                const paxNum = idx + 2;
                return (
                  <div key={paxNum} className="sky-flight-card mb-24">
                    <div className="sky-pax-card-header mb-24">
                      <div className="sky-pax-header-left">
                        <User size={20} className="sky-flight-icon" />
                        <div>
                          <h3 className="sky-flight-title">{t?.wizard?.step4?.passengerTitle || 'Passenger'} #{paxNum}</h3>
                          <p className="sky-flight-sub">{t?.wizard?.step4?.additionalSub || 'Additional passenger details'}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select 
                          value={formData[`paxCategory_${paxNum}`] || 'adult'} 
                          onChange={(e) => updateForm(`paxCategory_${paxNum}`, e.target.value)}
                          className="sky-pax-type-select"
                        >
                          <option value="adult">{t?.wizard?.step4?.adultLabel || 'Adult (7+ years)'}</option>
                          <option value="child">{t?.wizard?.step4?.childLabel || 'Child (0-7 years)'}</option>
                        </select>

                        <button 
                          type="button"
                          onClick={() => updateForm('passengers', formData.passengers - 1)}
                          className="btn-sky-remove-pax"
                          title="Remove passenger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="sky-flight-form-row mb-20">
                      <div className="sky-form-group">
                        <label className="sky-form-label">{t?.wizard?.step4?.firstName || 'First Name'}</label>
                        <input 
                          type="text" 
                          placeholder={t?.wizard?.step4?.firstName || "Enter first name"} 
                          value={formData[`firstName_${paxNum}`] || ''}
                          onChange={(e) => updateForm(`firstName_${paxNum}`, e.target.value)}
                          className="sky-text-input"
                        />
                      </div>
                      <div className="sky-form-group">
                        <label className="sky-form-label">{t?.wizard?.step4?.lastName || 'Last Name'}</label>
                        <input 
                          type="text" 
                          placeholder={t?.wizard?.step4?.lastName || "Enter last name"} 
                          value={formData[`lastName_${paxNum}`] || ''}
                          onChange={(e) => updateForm(`lastName_${paxNum}`, e.target.value)}
                          className="sky-text-input"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Card: More people traveling? */}
              <div className="sky-addon-card sky-more-people-card mb-24">
                <div className="sky-more-people-left">
                  <UserPlus size={24} className="sky-flight-icon" />
                  <div>
                    <h4 className="sky-more-title">{t?.wizard?.step4?.morePeopleTitle || 'More people traveling?'}</h4>
                    <p className="sky-more-sub">
                      {t?.wizard?.step4?.morePeopleSub || 'Total {n} passenger(s). Add or remove passengers from your booking.'}
                    </p>
                  </div>
                </div>

                <div className="sky-pax-action-btns">
                  {formData.passengers > 1 && (
                    <button 
                      type="button"
                      className="btn-sky-add-pax remove-btn"
                      onClick={() => updateForm('passengers', Math.max(1, formData.passengers - 1))}
                    >
                      <Minus size={16} /> {t?.wizard?.common?.remove || 'Remove'}
                    </button>
                  )}
                  <button 
                    type="button"
                    className="btn-sky-add-pax"
                    onClick={() => updateForm('passengers', formData.passengers + 1)}
                  >
                    <UserPlus size={16} /> {t?.wizard?.common?.addPassenger || 'Add passenger'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="step-panel">
              <h2 className="sky-step2-title">{t?.wizard?.step5?.title || 'Contact Information'}</h2>
              <p className="sky-step2-sub mb-24">{t?.wizard?.step5?.subtitle || 'The best point of contact for this reservation.'}</p>
              
              <button type="button" className="sky-signin-btn mb-24">
                {t?.wizard?.step5?.signIn || 'Sign in'}
              </button>

              <div className="sky-or-divider mb-24">
                <span>{t?.wizard?.step5?.or || 'OR'}</span>
              </div>

              <div className="sky-flight-card mb-24">
                <label className="sky-checkbox-wrap mb-24">
                  <input 
                    type="checkbox" 
                    checked={formData.sameAsPrimary} 
                    onChange={(e) => {
                      const isSame = e.target.checked;
                      updateForm('sameAsPrimary', isSame);
                      if (isSame) {
                        updateForm('contactFirst', formData.firstName);
                        updateForm('contactLast', formData.lastName);
                        updateForm('contactEmail', formData.email);
                        updateForm('contactPhone', formData.phone);
                      }
                    }} 
                  />
                  <span className="sky-checkbox-custom"></span>
                  <span className="sky-checkbox-label">{t?.wizard?.step5?.sameAsPrimary || 'Same as a primary passenger'}</span>
                </label>

                {/* Row 1: First Name & Last Name */}
                <div className="sky-flight-form-row mb-20">
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step5?.firstName || 'First Name'} *</label>
                    <input 
                      type="text" 
                      placeholder="" 
                      value={formData.sameAsPrimary ? formData.firstName : formData.contactFirst}
                      onChange={(e) => !formData.sameAsPrimary && updateForm('contactFirst', e.target.value)}
                      readOnly={formData.sameAsPrimary}
                      className="sky-text-input"
                    />
                  </div>
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step5?.lastName || 'Last Name'} *</label>
                    <input 
                      type="text" 
                      placeholder="" 
                      value={formData.sameAsPrimary ? formData.lastName : formData.contactLast}
                      onChange={(e) => !formData.sameAsPrimary && updateForm('contactLast', e.target.value)}
                      readOnly={formData.sameAsPrimary}
                      className="sky-text-input"
                    />
                  </div>
                </div>

                {/* Row 2: Email & Phone Number */}
                <div className="sky-flight-form-row">
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step5?.email || 'Email'} *</label>
                    <input 
                      type="email" 
                      placeholder="" 
                      value={formData.sameAsPrimary ? formData.email : formData.contactEmail}
                      onChange={(e) => !formData.sameAsPrimary && updateForm('contactEmail', e.target.value)}
                      readOnly={formData.sameAsPrimary}
                      className="sky-text-input"
                    />
                  </div>
                  <div className="sky-form-group">
                    <label className="sky-form-label">{t?.wizard?.step5?.phone || 'Phone number'} *</label>
                    <div className="sky-phone-input-wrap">
                      <select 
                        value={formData.contactCountryCode || formData.countryCode || '+82'} 
                        onChange={(e) => updateForm('contactCountryCode', e.target.value)}
                        className="sky-country-code-select"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input 
                        type="tel" 
                        placeholder="— — — — —" 
                        value={formData.sameAsPrimary ? formData.phone : formData.contactPhone}
                        onChange={(e) => !formData.sameAsPrimary && updateForm('contactPhone', e.target.value)}
                        readOnly={formData.sameAsPrimary}
                        className="sky-phone-input"
                      />
                    </div>
                    <p className="sky-field-note mt-8">
                      {t?.wizard?.step5?.smsConsent || 'By adding your number you agree to receive text messages.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="step-panel">
              {/* Order ID Top Bar */}
              <div className="sky-order-header mb-24">
                <h2 className="sky-order-id-title">{t?.wizard?.step6?.orderId || 'Order ID'}: {orderId}</h2>
                <span className="sky-unpaid-badge">
                  <span className="sky-dollar-icon">$</span> {t?.wizard?.step6?.unpaid || 'UNPAID'}
                </span>
              </div>

              {/* Payment Details Card */}
              <div className="sky-flight-card mb-24">
                <h3 className="sky-flight-title mb-16">{t?.wizard?.step6?.paymentDetailsTitle || 'Payment details'}</h3>

                {/* Quote Service Accordion */}
                <div className="sky-quote-accordion mb-24">
                  <div 
                    className="sky-quote-accordion-header"
                    onClick={() => setIsQuoteOpen(!isQuoteOpen)}
                  >
                    <span>{t?.wizard?.step6?.quoteForService || 'QUOTE FOR SERVICE (USD)'}</span>
                    {isQuoteOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {isQuoteOpen && (
                    <div className="sky-quote-accordion-body mt-12">
                      <div className="sky-quote-accordion-row">
                        <span>VIP {formData.serviceType === 'departure' ? 'Departure' : formData.serviceType === 'arrival' ? 'Arrival' : 'Connection'} in {formData.airport} - USD {(totalUsd * 1.04).toFixed(0)}</span>
                        <span>USD {(totalUsd * 1.04).toFixed(2)}</span>
                      </div>
                      <div className="sky-quote-accordion-total mt-16 pt-12">
                        <strong>{t?.wizard?.step6?.total || 'Total'}:</strong>
                        <strong className="sky-quote-total-val">USD {(totalUsd * 1.04).toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selectable Payment Methods */}
                <div className="sky-payment-methods mb-24">
                  {/* Option 1: Nicepay (Domestic Card / 국내 결제) */}
                  <div 
                    className={`sky-payment-option ${selectedPayment === 'nicepay' ? 'selected' : ''}`}
                    onClick={() => setSelectedPayment('nicepay')}
                  >
                    <div className="sky-payment-left">
                      <div className="sky-radio-circle">
                        {selectedPayment === 'nicepay' && <div className="sky-radio-inner" />}
                      </div>
                      <CreditCard size={22} className="sky-pay-icon" />
                      <div>
                        <span className="sky-pay-label">Nicepay</span>
                        <span className="sky-pay-sublabel"> (Domestic Card / 국내 결제)</span>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: PayPal (International / 해외 결제) */}
                  <div 
                    className={`sky-payment-option ${selectedPayment === 'paypal' ? 'selected' : ''}`}
                    onClick={() => setSelectedPayment('paypal')}
                  >
                    <div className="sky-payment-left">
                      <div className="sky-radio-circle">
                        {selectedPayment === 'paypal' && <div className="sky-radio-inner" />}
                      </div>
                      <span className="sky-paypal-badge">PayPal</span>
                      <div>
                        <span className="sky-pay-label">PayPal</span>
                        <span className="sky-pay-sublabel"> (International / 해외 결제)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Payment Button */}
                <button 
                  type="button"
                  onClick={() => handlePayment(selectedPayment)}
                  className="btn-sky-submit-payment mb-16"
                >
                  {t?.wizard?.step6?.submitPayment || 'Submit payment'}
                </button>

                <p className="sky-terms-note center-text">
                  {t?.wizard?.step6?.termsNote || 'By clicking "Submit payment" I acknowledge that I agree with SkyVip'} <a href="#terms">{t?.wizard?.step6?.termsLink || 'Terms & Conditions'}</a> & <a href="#privacy">{t?.wizard?.step6?.privacyLink || 'Privacy Policy'}</a>
                </p>
              </div>

              {/* Airport Banner Header */}
              <div className="sky-airport-banner mb-24">
                <h3 className="sky-banner-title">
                  {formData.airport === 'ICN' ? 'Incheon International Airport, ICN' : `${formData.airport} Airport`}
                </h3>
                <div className="sky-banner-meta mt-8">
                  <span>📅 {formData.date || '18 Aug, 2026'}</span>
                  <span>👥 {formData.passengers} Adult</span>
                </div>
              </div>

              {/* Order Summary Card */}
              <div className="sky-flight-card mb-24">
                <h3 className="sky-flight-title mb-4">{t?.wizard?.step6?.orderSummaryTitle || 'Order summary'}</h3>
                <p className="sky-flight-sub mb-20">{t?.wizard?.step6?.invoiceNote || 'Invoices related to your order'} {orderId}</p>

                <div className="sky-invoice-box">
                  <div className="sky-invoice-row mb-12">
                    <div className="sky-invoice-left">
                      <span className="sky-inv-code">INV639065</span>
                      <span className="sky-unpaid-badge sm">
                        <span className="sky-dollar-icon">$</span> {t?.wizard?.step6?.unpaid || 'UNPAID'}
                      </span>
                    </div>
                    <span className="sky-inv-amount">USD {(totalUsd * 1.04).toFixed(2)}</span>
                  </div>
                  
                  <p className="sky-inv-desc mb-16">
                    VIP {formData.serviceType === 'departure' ? 'Departure' : formData.serviceType === 'arrival' ? 'Arrival' : 'Connection'} in {formData.airport} - USD {(totalUsd * 1.04).toFixed(0)}
                  </p>

                  <div className="sky-invoice-total pt-12">
                    <span>{t?.wizard?.step6?.total || 'Total'}:</span>
                    <strong>USD {(totalUsd * 1.04).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        
        {/* Cart Sidebar */}
        <div className="wizard-sidebar">
          {step === 6 ? (
            /* Screenshot 1 Right Sidebar: Any questions left? */
            <div className="sky-sidebar-card p-24">
              <h3 className="sky-questions-title mb-8">{t?.wizard?.sidebar?.questionsTitle || 'Any questions left?'}</h3>
              <p className="sky-questions-sub mb-20">
                {t?.wizard?.sidebar?.questionsSub || 'Feel free to reach out, our team of professionals is online 24/7 and ready to help!'}
              </p>

              <div className="sky-contact-item mb-12">
                <span className="sky-contact-emoji">☎️</span>
                <a href="tel:+18555759847" className="sky-contact-link">+1 855 575 98 47</a>
              </div>

              <div className="sky-contact-item mb-20">
                <span className="sky-contact-emoji">📬</span>
                <a href="mailto:reservations@usvipservices.com" className="sky-contact-link">reservations@usvipservices.com</a>
              </div>

              <a 
                href="https://wa.me/18555759847" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-sky-whatsapp"
              >
                <span className="whatsapp-dot">💬</span> {t?.wizard?.sidebar?.whatsappBtn || 'Contact us via WhatsApp'}
              </a>
            </div>
          ) : (
            /* Standard Cart Sidebar for Steps 1 - 5 */
            <>
              <div className="sky-sidebar-card mb-16">
                <h3 className="sky-sidebar-title">Meet & Greet - {formData.serviceType.charAt(0).toUpperCase() + formData.serviceType.slice(1)}</h3>
                <p className="sky-sidebar-sub">At {formData.airport}, Incheon International Airport</p>
                
                <div className="sky-sidebar-meta mb-20">
                  <span>📅 {formData.date || '18 Aug, 2026'}</span>
                  <span>👥 {formData.passengers} Adult</span>
                </div>

                <div className="sky-quote-section">
                  <div className="sky-quote-header">
                    <span>{t?.wizard?.sidebar?.quoteTitle || 'QUOTE FOR SERVICE'}</span>
                    <ChevronDown size={14} />
                  </div>
                  <div className="sky-quote-row">
                    <span>x{formData.passengers} Adult:</span>
                    <span>USD {baseFeeUsd.toFixed(2)}</span>
                  </div>
                  {vehicleUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Vehicle Fee:</span>
                      <span>USD {vehicleUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {extraPassUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Extra Passengers:</span>
                      <span>USD {extraPassUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {extraLugUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Extra Baggage:</span>
                      <span>USD {extraLugUsd.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="sky-quote-row font-medium mt-8">
                    <span>{t?.wizard?.sidebar?.subtotal || 'Subtotal'}:</span>
                    <span>USD {totalUsd.toFixed(2)}</span>
                  </div>
                </div>

                <div className="sky-total-row mt-20">
                  <span className="sky-total-label">{t?.wizard?.step6?.total || 'Total'}:</span>
                  <span className="sky-total-amount">USD {(totalUsd * 1.04).toFixed(2)}</span>
                </div>
                <div className="sky-fee-note mb-20">
                  {t?.wizard?.sidebar?.feeNote || 'incl. transaction fee Credit Card Fee USD'} {(totalUsd * 0.04).toFixed(2)}
                </div>

                <button onClick={handleNext} className="btn-sky-book-now">
                  {step === 1 ? (t?.wizard?.sidebar?.btnStep1 || 'Select & Book Now') : step === 5 ? (t?.wizard?.sidebar?.btnStep5 || 'Proceed to Pay') : (t?.wizard?.sidebar?.btnContinue || 'Continue')}
                </button>

                <p className="sky-terms-note mt-12">
                  {t?.wizard?.sidebar?.termsAck || 'By clicking the button I acknowledge that I agree with SkyVip'} <a href="#terms">{t?.wizard?.step6?.termsLink || 'Terms & Conditions'}</a> & <a href="#privacy">{t?.wizard?.step6?.privacyLink || 'Privacy Policy'}</a>.
                </p>
              </div>

              {/* Coupon Box */}
              <div className="sky-sidebar-box mb-16">
                <span>🎟 {t?.wizard?.sidebar?.coupon || 'Have a coupon?'}</span>
                <button className="btn-text-blue">{t?.wizard?.sidebar?.couponAdd || 'Add'}</button>
              </div>

              {/* Question Box */}
              <div className="sky-sidebar-box vertical">
                <h4>{t?.wizard?.sidebar?.questionsTitle || 'Any questions left?'}</h4>
                <p>{t?.wizard?.sidebar?.questionsSub || 'Feel free to reach out, our team of professionals is online 24/7 and ready to help!'}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Temporary CheckCircle component for styling
function CheckCircle({ className }) {
  return <Check className={className} size={18} />;
}
