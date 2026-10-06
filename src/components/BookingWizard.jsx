import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronLeft, CreditCard, ChevronDown, ChevronUp, Minus, Plus, Luggage, PlaneTakeoff, Search, Ticket, UploadCloud, Plane, User, UserPlus, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { computeQuote } from '../utils/pricing';
import { localizePath } from '../utils/locale';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../firebase';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

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

import { AIRLINES } from '../utils/airlines';

export default function BookingWizard({ onClose, initialData, settings, t, lang = 'en' }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isAirlineOpen, setIsAirlineOpen] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState('');
  const [isTransferAirlineOpen, setIsTransferAirlineOpen] = useState(false);
  const [transferAirlineSearch, setTransferAirlineSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('nicepay');
  const [isQuoteOpen, setIsQuoteOpen] = useState(true);
  const hasSentProposal = useRef(false);
  const newBookingId = () => `BTG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const [bookingId, setBookingId] = useState(newBookingId);
  // 이 예약을 수정·결제할 수 있는 고객 전용 토큰 (서버가 첫 저장 시 등록)
  const [bookingToken] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    language: lang,
  });
  const autocompleteRef = useRef(null);

  const [formData, setFormData] = useState({
    airport: initialData?.airport || 'ICN',
    serviceType: initialData?.serviceType || 'arrival',
    date: initialData?.date || getTodayString(),
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
    flightTime: '',
    transferAirline: '',
    transferFlightNumber: '',
    transferFlightTime: '',

    // Step 4: Passenger Details
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    dobMonth: '',
    dobDay: '',
    dobYear: '',
    travelClass: '',
    phone: '',
    wheelchair: false,

    // Step 5: Contact
    sameAsPrimary: true,
    contactFirst: initialData?.firstName || '',
    contactLast: initialData?.lastName || '',
    contactEmail: initialData?.email || '',
    contactPhone: '',
    vehicleType: 'none',
    transferAddress: '',
    specialRequests: ''
  });

  const updateForm = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.name) {
        // If it's a known place/hotel, combine name and address
        const address = place.formatted_address ? ` (${place.formatted_address})` : '';
        // Sometimes place.name is already the full address, so we check to avoid duplication
        if (place.formatted_address && place.formatted_address.includes(place.name)) {
          updateForm('transferAddress', place.formatted_address);
        } else {
          updateForm('transferAddress', `${place.name}${address}`);
        }
      } else if (place && place.formatted_address) {
        updateForm('transferAddress', place.formatted_address);
      }
    }
  };

  // 예약 진행 상황을 서버에 저장 (이탈 추적용). 상태·금액은 서버가 결정한다.
  const syncReservation = async () => {
    const res = await fetch(`/api/reservations/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: bookingToken, step, formData }),
    });
    if (res.status === 409) {
      // 다른 예약과 번호가 겹친 경우 새 번호로 다시 저장
      setBookingId(newBookingId());
      return false;
    }
    return res.ok;
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        const ok = await syncReservation();
        // 결제 단계 진입 시 견적서 메일 1회 발송 (서버가 내용 생성, 중복 발송 방지)
        if (ok && step === 6 && !hasSentProposal.current && formData.email) {
          hasSentProposal.current = true;
          fetch(`/api/reservations/${bookingId}/proposal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: bookingToken }),
          }).catch(err => {
            console.error('Error sending proposal email:', err);
            hasSentProposal.current = false;
          });
        }
      } catch (e) {
        console.error('Reservation sync error:', e);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, formData, bookingId]);

  // Price Calculation — 서버(api/index.js)와 같은 함수로 계산하고, 실제 결제 금액은 서버가 확정한다.
  const quote = computeQuote(formData, settings);
  const currentAirport = settings?.airports?.find(a => a.code === formData.airport) || null;
  const { baseFeeUsd, vehicleUsd, extraPassUsd, extraLugUsd, porterUsd, surcharges } = quote;
  const baseTotalUsd = quote.subtotalUsd;
  const paypalFeeUsd = quote.paypalFeeUsd;
  const paypalTotalUsd = quote.paypalTotalUsd;
  const nicepayTotalKrw = quote.nicepayTotalKrw;
  const selectedTotalLabel = selectedPayment === 'paypal'
    ? `USD ${paypalTotalUsd.toFixed(2)}`
    : `₩${nicepayTotalKrw.toLocaleString()}`;

  const formatTimeAmPm = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const steps = [
    { id: 1, name: t?.wizard?.steps?.step1 || 'Select service' },
    { id: 2, name: t?.wizard?.steps?.step2 || 'Additional services' },
    { id: 3, name: t?.wizard?.steps?.step3 || 'Flight information' },
    { id: 4, name: t?.wizard?.steps?.step4 || 'Passengers details' },
    { id: 5, name: t?.wizard?.steps?.step5 || 'Contact information' },
    { id: 6, name: t?.wizard?.steps?.step6 || 'Payment details' }
  ];
  const handleNext = () => {
    if (step === 2) {
      if (formData.vehicleType !== 'none' && (!formData.transferAddress || formData.transferAddress.trim() === '')) {
        alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
        return;
      }
    } else if (step === 3) {
      if (!formData.airline || !formData.flightNumber || !formData.flightTime) {
        alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
        return;
      }
      if (formData.serviceType === 'transfer') {
        if (!formData.transferAirline || !formData.transferFlightNumber || !formData.transferFlightTime) {
          alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
          return;
        }
      }
    } else if (step === 4) {
      if (!formData.firstName || !formData.lastName || !formData.dobMonth || !formData.dobDay || !formData.dobYear || !formData.email || !formData.phone) {
        alert(t?.wizard?.common?.requiredField || "Please fill in all required fields marked with *");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert("Please enter a valid email address.");
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

  const handlePayment = async (method) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 최신 입력값을 먼저 저장한 뒤 서버에 결제 금액 확정을 요청
      if (!(await syncReservation())) throw new Error('sync failed');
      const res = await fetch(`/api/reservations/${bookingId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: bookingToken, method }),
      });
      if (!res.ok) throw new Error(`submit failed (${res.status})`);
      const checkout = await res.json();

      navigate(checkout.method === 'paypal' ? '/payment/paypal' : '/payment', {
        state: { orderId: bookingId, token: bookingToken, checkout, lang }
      });
    } catch (err) {
      console.error('Reservation submit error:', err);
      alert(lang === 'ko'
        ? '예약 저장 중 문제가 발생했습니다. 잠시 후 다시 시도하시거나 고객센터로 연락해 주세요.'
        : 'Something went wrong while saving your reservation. Please try again or contact us.');
      setIsSubmitting(false);
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
                {step > s.id ? <><Check size={14} /> {t?.wizard?.common?.completed || 'Completed'}</> : step === s.id ? (t?.wizard?.common?.inProgress || 'In progress') : (t?.wizard?.common?.notCompleted || 'Not completed')}
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

              <div className="package-selector mb-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {[
                  { id: 'arrival', label: 'Arrival (입국)' },
                  { id: 'departure', label: 'Departure (출국)' },
                  { id: 'transfer', label: 'Transfer (환승)' },
                  { id: 'picketing', label: 'Picketing (피켓팅)' }
                ].map(svc => (
                  <div
                    key={svc.id}
                    className={`sky-pkg-card ${formData.serviceType === svc.id ? 'active' : ''}`}
                    onClick={() => updateForm('serviceType', svc.id)}
                  >
                    <div className="sky-pkg-card-header">
                      <span className="sky-pkg-title">{svc.label}</span>
                      {formData.serviceType === svc.id && (
                        <div className="sky-check-circle">
                          <Check size={14} color="#fff" />
                        </div>
                      )}
                    </div>
                    <div className="sky-pkg-desc">
                      USD {settings?.servicePrices?.[svc.id]?.usd || (svc.id === 'arrival' ? 250 : svc.id === 'departure' ? 270 : svc.id === 'transfer' ? 340 : 140)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sky-pkg-detail-card mb-24">
                <div className="sky-pkg-detail-body">
                  <div className="sky-pkg-left">
                    <h3 className="sky-pkg-main-title">{t?.wizard?.step1?.meetGreetTitle || 'VIP Meet & Greet'}</h3>

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
                      {formData.serviceType === 'arrival' ? (
                        <>
                          <li>
                            <span className="sky-inc-icon">👤</span>
                            <div><strong>Personal greeting</strong> at the arrival air-bridge by your Beyond the Gate agent with a name-board welcome</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🏃</span>
                            <div>
                              <strong>Fast-track immigration</strong> through priority lanes (where available)<br />
                              Priority guidance through airport procedures (Fast Track lanes available only for eligible passengers)<br />
                              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                <strong>* Fast Track Notice:</strong> Incheon Airport does not offer commercial Fast Track officially. Fast Track access is limited to airport-authorized passengers only. Our staff will guide you through the most efficient route available.
                              </div>
                            </div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🧳</span>
                            <div><strong>Baggage assistance:</strong> Escort will assist with baggage retrieval and guide you to your vehicle.</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🛂</span>
                            <div><strong>Customs clearance & escort assistance</strong></div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🚶</span>
                            <div><strong>Escort all the way</strong> to your driver, hotel shuttle, or curbside pick-up point</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">✈️</span>
                            <div><strong>Real-time flight monitoring</strong> — we wait for you, even if you are delayed</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">⏱️</span>
                            <div><strong>Service Duration: 3 hours:</strong> The service duration is 3 hours, and processing times may vary depending on airport congestion</div>
                          </li>
                        </>
                      ) : formData.serviceType === 'departure' ? (
                        <>
                          <li>
                            <span className="sky-inc-icon">👤</span>
                            <div><strong>Personal greeting</strong> at the departure floor by your Beyond the Gate agent with a name-board welcome</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🏃</span>
                            <div>
                              <strong>Fast-track immigration</strong> through priority lanes (where available)<br />
                              Priority guidance through airport procedures (Fast Track lanes available only for eligible passengers)<br />
                              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                <strong>* Fast Track Notice:</strong> Incheon Airport does not offer commercial Fast Track officially. Fast Track access is limited to airport-authorized passengers only. Our staff will guide you through the most efficient route available.
                              </div>
                            </div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🧳</span>
                            <div><strong>Baggage assistance:</strong> Escort will assist with baggage retrieval and guide you from your vehicle.</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🛂</span>
                            <div><strong>Customs clearance & escort assistance</strong></div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🧾</span>
                            <div>{lang === 'ko'
                              ? <><strong>택스리펀드 지원:</strong> 외국인 고객의 부가세 환급 절차 안내 및 세관 확인·환급 창구 동행 (환급 여부·금액은 세관 및 환급사업자 기준)</>
                              : <><strong>Tax refund assistance:</strong> guidance through the VAT refund process for international guests, with escort to the customs check and refund counters (eligibility set by Korea Customs and refund operators)</>}</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🚶</span>
                            <div><strong>Escort all the way</strong> to your flight</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">✈️</span>
                            <div><strong>Real-time flight monitoring</strong> — we wait for you, even if you are delayed</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">⏱️</span>
                            <div><strong>Service Duration: 2 hours:</strong> The service duration is 3 hours, and processing times may vary depending on airport congestion</div>
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <span className="sky-inc-icon">👤</span>
                            <div><strong>Personal Greeting</strong> at the arrival gate with a name sign</div>
                          </li>
                          <li>
                            <span className="sky-inc-icon">🏃</span>
                            <div>
                              <strong>Fast track</strong> through the airport formalities<br />
                              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                <strong>* Fast Track Notice:</strong> Incheon Airport does not offer commercial Fast Track officially. Fast Track access is limited to airport-authorized passengers only. Our staff will guide you through the most efficient route available.
                              </div>
                            </div>
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
                        </>
                      )}

                      <li style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #eee' }}>
                        <span className="sky-inc-icon">📍</span>
                        <div><strong>Meeting Point:</strong> At the arrival gate (airbridge) or designated arrival hall depending on airport regulations</div>
                      </li>
                      <li>
                        <span className="sky-inc-icon">ℹ️</span>
                        <div><strong>Escort support only;</strong> immigration and customs procedures must be completed by the passenger.</div>
                      </li>
                      <li>
                        <span className="sky-inc-icon">📅</span>
                        <div>
                          <strong>Cancellation Policy:</strong><br />
                          <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', color: '#555', fontSize: '0.9rem', listStyleType: 'disc' }}>
                            <li>Free cancellation up to 48 hours before service</li>
                            <li>50% charge within 24–48 hours</li>
                            <li>No refund within 24 hours</li>
                          </ul>
                        </div>
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
                  <div style={{ width: '100%', height: '100%', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={48} color="#6366f1" />
                  </div>
                </div>
                <div className="sky-addon-content">
                  <h3 className="sky-addon-title">{t?.wizard?.step4?.title || 'Passengers'}</h3>
                  <p className="sky-addon-sub">{t?.wizard?.step4?.morePeopleSub?.replace('{n}', formData.passengers) || `Total ${formData.passengers} passenger(s). Add or remove passengers.`}</p>

                  <div className="sky-counter-box mt-16">
                    <div className="sky-counter-label">
                      <Users size={18} className="sky-bag-icon" />
                      <span>{t?.wizard?.step4?.title || 'Passengers'}</span>
                    </div>
                    <div className="sky-counter-controls">
                      <button
                        className="sky-counter-btn"
                        onClick={() => updateForm('passengers', Math.max(1, formData.passengers - 1))}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="sky-counter-value">{formData.passengers}</span>
                      <button
                        className="sky-counter-btn"
                        onClick={() => updateForm('passengers', formData.passengers + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sky-addon-card mb-24">
                <div className="sky-addon-img-wrap">
                  <img src="/luggage_assistance.webp" alt="Luggage Assistance" className="sky-addon-img" />
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
              {formData.serviceType !== 'transfer' && (
                <div className="sky-addon-card mb-24">
                  <div className="sky-addon-img-wrap">
                    <img src="/luxury_fleet.webp" alt="Chauffeur Vehicle" className="sky-addon-img" />
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
                              {v.name || (v.id === 'staria' ? 'Staria' : v.id === 'g90' ? 'G90' : 'Benz Sprinter')} USD {settings?.vehiclePricesUsd?.[v.id] || v.priceUsd}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="staria">Staria USD {settings?.vehiclePricesUsd?.staria || 130}</option>
                            <option value="g90">G90 USD {settings?.vehiclePricesUsd?.g90 || 200}</option>
                            <option value="sprinter">Benz Sprinter USD {settings?.vehiclePricesUsd?.sprinter || 200}</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Address Input (Conditional based on vehicle selection) */}
                    {formData.vehicleType !== 'none' && (
                      <div className="sky-form-group mt-16" style={{ width: '100%' }}>
                        <label className="sky-form-label">
                          {formData.serviceType === 'arrival'
                            ? (t?.wizard?.step2?.dropoffAddress || 'Drop-off Address (Hotel/Destination)')
                            : (t?.wizard?.step2?.pickupAddress || 'Pick-up Address (Origin/Hotel)')}
                          {' '}*
                        </label>
                        {isLoaded ? (
                          <Autocomplete
                            onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                            onPlaceChanged={handlePlaceChanged}
                          >
                            <input
                              type="text"
                              placeholder={formData.serviceType === 'arrival' ? 'Enter your destination address (e.g. Grand Hyatt Seoul)' : 'Enter your pick-up address'}
                              value={formData.transferAddress || ''}
                              onChange={(e) => updateForm('transferAddress', e.target.value)}
                              className="sky-text-input"
                              style={{ width: '100%' }}
                            />
                          </Autocomplete>
                        ) : (
                          <input
                            type="text"
                            placeholder={formData.serviceType === 'arrival' ? 'Enter your destination address (e.g. Grand Hyatt Seoul)' : 'Enter your pick-up address'}
                            value={formData.transferAddress || ''}
                            onChange={(e) => updateForm('transferAddress', e.target.value)}
                            className="sky-text-input"
                            style={{ width: '100%' }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                      {['arrival', 'transfer', 'picketing'].includes(formData.serviceType) ? (t?.wizard?.step3?.arrivalTitle || 'Arrival flight') : formData.serviceType === 'departure' ? (t?.wizard?.step3?.departureTitle || 'Departure flight') : (t?.wizard?.step3?.connectionTitle || 'Connection flight')}
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

                  {/* Flight Time */}
                  <div className="sky-form-group">
                    <label className="sky-form-label">
                      {formData.serviceType === 'arrival' ? 'Arrival time' : formData.serviceType === 'departure' ? 'Departure time' : 'Flight time'} *
                    </label>
                    <input
                      type="time"
                      value={formData.flightTime}
                      onChange={(e) => updateForm('flightTime', e.target.value)}
                      className="sky-text-input"
                    />
                    <p className="sky-field-note mt-8">
                      Please enter the arrival or departure time of your flight.
                    </p>
                  </div>
                </div>
              </div>

              {formData.serviceType === 'transfer' && (
                <div className="sky-flight-card mb-24">
                  <div className="sky-flight-header mb-20">
                    <PlaneTakeoff size={20} className="sky-flight-icon" />
                    <div>
                      <h3 className="sky-flight-title">Departure flight (출발 항공편)</h3>
                      <p className="sky-flight-sub">{t?.wizard?.step3?.flightSub || 'Please provide us with your airline details and the flight number'}</p>
                    </div>
                  </div>

                  <div className="sky-flight-form-row">
                    {/* Airline Search Dropdown */}
                    <div className="sky-form-group">
                      <label className="sky-form-label">{t?.wizard?.step3?.airlineLabel || 'Airline'} *</label>
                      <div className="sky-airline-input-wrap">
                        <div
                          className={`sky-airline-box ${isTransferAirlineOpen ? 'active' : ''}`}
                          onClick={() => setIsTransferAirlineOpen(!isTransferAirlineOpen)}
                        >
                          <Search size={16} className="sky-search-icon" />
                          <input
                            type="text"
                            placeholder={t?.wizard?.step3?.airlinePlaceholder || "Search for your airline"}
                            value={formData.transferAirline || transferAirlineSearch}
                            onChange={(e) => {
                              updateForm('transferAirline', e.target.value);
                              setTransferAirlineSearch(e.target.value);
                              setIsTransferAirlineOpen(true);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={() => setIsTransferAirlineOpen(true)}
                            className="sky-airline-input"
                          />
                          <ChevronDown size={16} className="sky-chevron-icon" />
                        </div>

                        {isTransferAirlineOpen && (
                          <div className="sky-airline-dropdown">
                            {AIRLINES.filter(a =>
                              a.name.toLowerCase().includes((formData.transferAirline || transferAirlineSearch).toLowerCase()) ||
                              a.code.toLowerCase().includes((formData.transferAirline || transferAirlineSearch).toLowerCase())
                            ).map(a => (
                              <div
                                key={a.code}
                                className="sky-airline-item"
                                onClick={() => {
                                  updateForm('transferAirline', a.name);
                                  setTransferAirlineSearch(a.name);
                                  setIsTransferAirlineOpen(false);
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
                        value={formData.transferFlightNumber}
                        onChange={(e) => updateForm('transferFlightNumber', e.target.value)}
                        className="sky-text-input"
                      />
                      <p className="sky-field-note mt-8">
                        {t?.wizard?.step3?.flightNumNote || 'You can find your flight number on your ticket, please provide us with numbers only.'}
                      </p>
                    </div>

                    {/* Flight Time */}
                    <div className="sky-form-group">
                      <label className="sky-form-label">Departure time *</label>
                      <input
                        type="time"
                        value={formData.transferFlightTime}
                        onChange={(e) => updateForm('transferFlightTime', e.target.value)}
                        className="sky-text-input"
                      />
                      <p className="sky-field-note mt-8">
                        Local time at {formData.airport}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Surcharge Table */}
              <div className="sky-flight-card mb-24">
                <div className="sky-flight-header mb-16">
                  <div>
                    <h3 className="sky-flight-title">Additional Surcharges (추가 요금 안내)</h3>
                    <p className="sky-flight-sub">Certain requests may incur an additional surcharge based on time and urgency.</p>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '12px 8px' }}>{lang === 'ko' ? '구분' : 'Category'}</th>
                        <th style={{ padding: '12px 8px' }}>{lang === 'ko' ? '목적' : 'Description'}</th>
                        <th style={{ padding: '12px 8px' }}>{lang === 'ko' ? '추가요금 (KRW)' : 'Surcharge (KRW)'}</th>
                        <th style={{ padding: '12px 8px' }}>{lang === 'ko' ? '추가요금 (USD)' : 'Surcharge (USD)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{lang === 'ko' ? '야간 요금' : 'Night Service'}</td>
                        <td style={{ padding: '12px 8px', color: '#666' }}>22:00~06:00</td>
                        <td style={{ padding: '12px 8px' }}>KRW 50,000</td>
                        <td style={{ padding: '12px 8px' }}>40</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{lang === 'ko' ? '긴급 요청' : 'Urgent Request'}</td>
                        <td style={{ padding: '12px 8px', color: '#666' }}>{lang === 'ko' ? '서비스 시작 24시간 이내 요청' : 'Request within 24 hours of service start'}</td>
                        <td style={{ padding: '12px 8px' }}>KRW 50,000</td>
                        <td style={{ padding: '12px 8px' }}>40</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{lang === 'ko' ? '초긴급 요청' : 'Super Urgent Request'}</td>
                        <td style={{ padding: '12px 8px', color: '#666' }}>{lang === 'ko' ? '서비스 시작 6시간 이내 요청' : 'Request within 6 hours of service start'}</td>
                        <td style={{ padding: '12px 8px' }}>KRW 60,000</td>
                        <td style={{ padding: '12px 8px' }}>48</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{lang === 'ko' ? '주말/공휴일' : 'Weekend/Holiday'}</td>
                        <td style={{ padding: '12px 8px', color: '#666' }}></td>
                        <td style={{ padding: '12px 8px' }}>KRW 25,000</td>
                        <td style={{ padding: '12px 8px' }}>20</td>
                      </tr>
                    </tbody>
                  </table>
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
                    <button
                      type="button"
                      className="btn-sky-social mt-8"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', marginTop: '12px' }}
                      onClick={async () => {
                        try {
                          const result = await signInWithPopup(auth, googleProvider);
                          const user = result.user;
                          if (user) {
                            const nameParts = user.displayName ? user.displayName.split(' ') : [];
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ') || '';
                            updateForm('firstName', firstName);
                            updateForm('lastName', lastName);
                            updateForm('email', user.email || '');
                          }
                        } catch (error) {
                          console.error("Google sign in failed", error);
                          alert("Google Login Failed: " + error.message);
                        }
                      }}
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: 16, height: 16 }} />
                      Continue with Google
                    </button>
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

                {/* Row 3: Special Requests */}
                <div className="sky-flight-form-row mt-24">
                  <div className="sky-form-group" style={{ width: '100%' }}>
                    <label className="sky-form-label">{t?.wizard?.step5?.specialRequests || 'Special Requests'} <span className="sky-optional-tag">{t?.wizard?.common?.optional || 'optional'}</span></label>
                    <textarea
                      placeholder={t?.wizard?.step5?.specialRequestsPlaceholder || "Please let us know if you have oversized luggage, require a baby seat, or have any other specific needs."}
                      value={formData.specialRequests}
                      onChange={(e) => updateForm('specialRequests', e.target.value)}
                      className="sky-text-input"
                      style={{ minHeight: '80px', resize: 'vertical', paddingTop: '12px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="step-panel">
              {/* Order ID Top Bar */}
              <div className="sky-order-header mb-24">
                <h2 className="sky-order-id-title">{t?.wizard?.step6?.orderId || 'Order ID'}: {bookingId}</h2>
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
                        <span>{formData.serviceType === 'departure' ? 'Departure' : formData.serviceType === 'arrival' ? 'Arrival' : 'Connection'} Escort Base (1-2 pax)</span>
                        <span>USD {baseFeeUsd.toFixed(2)}</span>
                      </div>
                      {vehicleUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Vehicle Fee ({
                            formData.vehicleType === 'g90' ? 'G90' :
                            formData.vehicleType === 'staria' ? 'Staria' :
                            formData.vehicleType === 'sprinter' ? 'Benz Sprinter' :
                            String(formData.vehicleType).replace(/Venz/i, 'Benz')
                          })</span>
                          <span>USD {vehicleUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {extraPassUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Extra Passengers ({Math.max(0, formData.passengers - 2)} pax)</span>
                          <span>USD {extraPassUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {extraLugUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Extra Baggage ({Math.max(0, formData.luggageCount - Math.max(2, formData.passengers))} ea)</span>
                          <span>USD {extraLugUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {porterUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Porter Service ({formData.luggageCount >= 9 ? '2 porters' : '1 porter'})</span>
                          <span>USD {porterUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {surcharges.nightFeeUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Night Surcharge ({formatTimeAmPm(formData.flightTime)})</span>
                          <span>USD {surcharges.nightFeeUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {surcharges.urgentFeeUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Urgent Surcharge ({surcharges.urgentFeeUsd === 48 ? '< 6 hours' : '< 24 hours'})</span>
                          <span>USD {surcharges.urgentFeeUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {surcharges.weekendFeeUsd > 0 && (
                        <div className="sky-quote-accordion-row">
                          <span>Weekend Surcharge</span>
                          <span>USD {surcharges.weekendFeeUsd.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedPayment === 'paypal' && (
                        <div className="sky-quote-accordion-row">
                          <span>{t?.wizard?.step6?.paypalFee || 'PayPal Fee (4%)'}</span>
                          <span>USD {paypalFeeUsd.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="sky-quote-accordion-total mt-16 pt-12">
                        <strong>{t?.wizard?.step6?.total || 'Total'}:</strong>
                        <strong className="sky-quote-total-val">{selectedTotalLabel}</strong>
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
                  disabled={isSubmitting}
                >
                  {t?.wizard?.step6?.submitPayment || 'Submit payment'}
                </button>

                <div className="sky-terms-text text-center mt-24">
                  {t?.wizard?.step6?.termsNote?.replace('SkyVip', 'Beyond the Gate') || 'By clicking "Submit payment" I acknowledge that I agree with Beyond the Gate'} <a href={localizePath('/terms', lang)} target="_blank" rel="noopener noreferrer">{t?.wizard?.step6?.termsLink || 'Terms & Conditions'}</a> & <a href={localizePath('/privacy', lang)} target="_blank" rel="noopener noreferrer">{t?.wizard?.step6?.privacyLink || 'Privacy Policy'}</a>
                </div>
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
                <p className="sky-flight-sub mb-20">{t?.wizard?.step6?.invoiceNote || 'Invoices related to your order'} {""}</p>

                <div className="sky-invoice-box">
                  <div className="sky-invoice-row mb-12">
                    <div className="sky-invoice-left">
                      <span className="sky-inv-code">INV{bookingId.substring(3)}</span>
                      <span className="sky-unpaid-badge sm">
                        <span className="sky-dollar-icon">$</span> {t?.wizard?.step6?.unpaid || 'UNPAID'}
                      </span>
                    </div>
                    <span className="sky-inv-amount">{selectedTotalLabel}</span>
                  </div>

                  <p className="sky-inv-desc mb-16">
                    VIP {formData.serviceType === 'departure' ? 'Departure' : formData.serviceType === 'arrival' ? 'Arrival' : 'Connection'} in {formData.airport}
                  </p>

                  <div className="sky-invoice-total pt-12">
                    <span>{t?.wizard?.step6?.total || 'Total'}:</span>
                    <strong>{selectedTotalLabel}</strong>
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
                <a href={`tel:${(t?.footer?.phone_val || '+821028533998').replace(/[^+\d]/g, '').replace(/^\+820/, '+82')}`} className="sky-contact-link">
                  {t?.footer?.phone_val || '+82 10-2853-3998'}
                </a>
              </div>

              <div className="sky-contact-item mb-20">
                <span className="sky-contact-emoji">📬</span>
                <a href={`mailto:${t?.footer?.email_val || 'cura@beyondthegate.kr'}`} className="sky-contact-link">
                  {t?.footer?.email_val || 'cura@beyondthegate.kr'}
                </a>
              </div>

              <a
                href={`https://wa.me/${(t?.footer?.phone_val || '+821028533998').replace(/[^+\d]/g, '').replace(/^\+/, '').replace(/^820/, '82')}`}
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
                    <span>Escort Base (1-2 pax):</span>
                    <span>USD {baseFeeUsd.toFixed(2)}</span>
                  </div>
                  {vehicleUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Vehicle Fee ({
                        formData.vehicleType === 'g90' ? 'G90' :
                        formData.vehicleType === 'staria' ? 'Staria' :
                        formData.vehicleType === 'sprinter' ? 'Benz Sprinter' :
                        String(formData.vehicleType).replace(/Venz/i, 'Benz')
                      }):</span>
                      <span>USD {vehicleUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {extraPassUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Extra Passengers ({Math.max(0, formData.passengers - 2)} pax):</span>
                      <span>USD {extraPassUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {extraLugUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Extra Baggage ({Math.max(0, formData.luggageCount - Math.max(2, formData.passengers))} ea):</span>
                      <span>USD {extraLugUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {porterUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Porter Service ({formData.luggageCount >= 9 ? '2 porters' : '1 porter'}):</span>
                      <span>USD {porterUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {surcharges.nightFeeUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Night Service Surcharge ({formatTimeAmPm(formData.flightTime)}):</span>
                      <span>USD {surcharges.nightFeeUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {surcharges.urgentFeeUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Urgent Surcharge ({surcharges.urgentFeeUsd === 48 ? '< 6 hours' : '< 24 hours'}):</span>
                      <span>USD {surcharges.urgentFeeUsd.toFixed(2)}</span>
                    </div>
                  )}
                  {surcharges.weekendFeeUsd > 0 && (
                    <div className="sky-quote-row">
                      <span>Weekend Surcharge:</span>
                      <span>USD {surcharges.weekendFeeUsd.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="sky-quote-row font-medium mt-8">
                    <span>{t?.wizard?.sidebar?.subtotal || 'Subtotal'}:</span>
                    <span>USD {baseTotalUsd.toFixed(2)}</span>
                  </div>
                </div>

                <div className="sky-total-row mt-20">
                  <span className="sky-total-label">{t?.wizard?.sidebar?.totalKrwCard || 'Korean card (KRW)'}:</span>
                  <span className="sky-total-amount">₩{nicepayTotalKrw.toLocaleString()}</span>
                </div>
                <div className="sky-fee-note mb-20">
                  {t?.wizard?.sidebar?.totalPaypal || 'PayPal (USD, incl. 4% fee)'}: USD {paypalTotalUsd.toFixed(2)}
                </div>

                <button onClick={handleNext} className="btn-sky-book-now">
                  {step === 1 ? (t?.wizard?.sidebar?.btnStep1 || 'Select & Book Now') : step === 5 ? (t?.wizard?.sidebar?.btnStep5 || 'Proceed to Pay') : (t?.wizard?.sidebar?.btnContinue || 'Continue')}
                </button>

                <div className="sky-terms-text text-center mt-24">
                  {t?.wizard?.sidebar?.termsAck?.replace('SkyVip', 'Beyond the Gate') || 'By clicking the button I acknowledge that I agree with Beyond the Gate'} <a href={localizePath('/terms', lang)} target="_blank" rel="noopener noreferrer">{t?.wizard?.step6?.termsLink || 'Terms & Conditions'}</a> & <a href={localizePath('/privacy', lang)} target="_blank" rel="noopener noreferrer">{t?.wizard?.step6?.privacyLink || 'Privacy Policy'}</a>.
                </div>
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
