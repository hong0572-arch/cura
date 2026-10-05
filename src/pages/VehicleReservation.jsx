import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlaneLanding, PlaneTakeoff, Calendar, Clock, Users, Luggage, User, Mail, Phone, CreditCard, ChevronLeft, MapPin, Building, Route as RouteIcon } from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import './VehicleReservation.css'; // Import the premium styles

const libraries = ['places'];

const AIRPORTS = {
  en: [
    { id: 'Incheon International Airport (ICN)', name: 'Incheon Int\'l Airport (ICN)' },
    { id: 'Gimpo International Airport (GMP)', name: 'Gimpo Int\'l Airport (GMP)' },
    { id: 'Gimhae International Airport (PUS)', name: 'Gimhae Int\'l Airport (PUS)' },
    { id: 'Jeju International Airport (CJU)', name: 'Jeju Int\'l Airport (CJU)' }
  ],
  ko: [
    { id: 'Incheon International Airport (ICN)', name: '인천국제공항 (ICN)' },
    { id: 'Gimpo International Airport (GMP)', name: '김포국제공항 (GMP)' },
    { id: 'Gimhae International Airport (PUS)', name: '김해국제공항 (PUS)' },
    { id: 'Jeju International Airport (CJU)', name: '제주국제공항 (CJU)' }
  ]
};

export default function VehicleReservation({ settings, t, lang = 'en' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVehicle = searchParams.get('vehicle') || 'staria';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    language: lang,
  });

  const isKo = lang === 'ko';
  const airportsList = isKo ? AIRPORTS.ko : AIRPORTS.en;

  const [formData, setFormData] = useState({
    serviceType: 'arrival',
    vehicleType: initialVehicle,
    date: '',
    time: '',
    passengers: 1,
    luggage: 0,
    pickupLocation: airportsList[0].id,
    dropoffLocation: '',
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'nicepay', // NicePay included now
  });

  // 거리·요금은 서버가 계산한다 (/api/vehicle-quote)
  const [quote, setQuote] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autocompleteRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceTypeChange = (type) => {
    if (type === 'arrival') {
      setFormData(prev => ({ ...prev, serviceType: type, pickupLocation: airportsList[0].id, dropoffLocation: '' }));
    } else {
      setFormData(prev => ({ ...prev, serviceType: type, pickupLocation: '', dropoffLocation: airportsList[0].id }));
    }
    setQuote(null);
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      const fieldToUpdate = formData.serviceType === 'arrival' ? 'dropoffLocation' : 'pickupLocation';

      let displayAddress = '';
      if (place && place.name) {
        const address = place.formatted_address ? ` (${place.formatted_address})` : '';
        if (place.formatted_address && place.formatted_address.includes(place.name)) {
          displayAddress = place.formatted_address;
        } else {
          displayAddress = `${place.name}${address}`;
        }
      } else if (place && place.formatted_address) {
        displayAddress = place.formatted_address;
      }

      if (displayAddress) {
        setFormData(prev => ({ ...prev, [fieldToUpdate]: displayAddress }));
      }
    }
  };

  // 출발지·도착지·차량·인원이 바뀌면 서버에 견적 요청 (입력 중에는 잠시 대기)
  const { pickupLocation, dropoffLocation, vehicleType, passengers, luggage } = formData;
  useEffect(() => {
    if (pickupLocation.trim().length < 3 || dropoffLocation.trim().length < 3) return;
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const res = await fetch('/api/vehicle-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickupLocation, dropoffLocation, vehicleType, passengers, luggage }),
        });
        const data = res.ok ? await res.json() : null;
        if (!cancelled) setQuote(data);
      } catch (err) {
        console.error('Vehicle quote error:', err);
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    }, 700);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [pickupLocation, dropoffLocation, vehicleType, passengers, luggage]);

  const exRate = quote?.exRate || settings?.exchangeRate || 1350;
  const distanceKm = quote?.distanceKm ?? 0;
  const vehicleUsd = quote && !quote.negotiable ? quote.vehicleUsd : 0;
  const extraPassUsd = quote?.extraPassUsd || 0;
  const extraLugUsd = quote?.extraLugUsd || 0;

  const isKrw = formData.paymentMethod === 'nicepay';
  const isNegotiable = Boolean(quote?.negotiable);
  const hasQuote = Boolean(quote) && !isNegotiable;

  const formattedTotal = isNegotiable
    ? (isKo ? '협의 문의' : 'Contact Us')
    : !hasQuote
      ? (isKo ? '출발지·도착지를 입력하세요' : 'Enter pickup & drop-off')
      : (isKrw ? `₩${quote.totalKrw.toLocaleString()}` : `$${quote.totalUsd.toFixed(2)}`);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.name || !formData.email || !formData.phone || !formData.pickupLocation || !formData.dropoffLocation) {
      alert(t?.wizard?.common?.requiredField || (isKo ? "필수 항목을 모두 입력해 주세요." : "Please fill in all required fields."));
      return;
    }

    if (isNegotiable) {
      alert(isKo ? "거리가 100km를 초과하여 별도 협의가 필요합니다. 고객센터로 문의해 주세요." : "Distances over 100km require a custom quote. Please contact support.");
      return;
    }

    if (!hasQuote || isSubmitting) {
      alert(isKo ? '요금 계산이 끝난 뒤 다시 시도해 주세요.' : 'Please wait until the price is calculated.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderId = `BTG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const token = crypto.randomUUID();
      // 금액은 서버가 다시 계산해 확정한다
      const res = await fetch(`/api/vehicle-reservations/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, method: formData.paymentMethod, form: formData }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const checkout = await res.json();
      navigate(checkout.method === 'paypal' ? '/payment/paypal' : '/payment', {
        state: { orderId, token, checkout }
      });
    } catch (err) {
      console.error('Vehicle reservation error:', err);
      alert(isKo
        ? '예약 저장 중 문제가 발생했습니다. 잠시 후 다시 시도하시거나 고객센터로 연락해 주세요.'
        : 'Something went wrong while saving your reservation. Please try again or contact us.');
      setIsSubmitting(false);
    }
  };

  if (loadError) return <div className="vr-page-wrapper"><div className="vr-container">{isKo ? '지도를 불러오는 중 오류가 발생했습니다.' : 'Error loading maps'}</div></div>;
  if (!isLoaded) return <div className="vr-page-wrapper"><div className="vr-container">{isKo ? '지도 로딩 중...' : 'Loading Maps...'}</div></div>;

  return (
    <div className="vr-page-wrapper">
      <div className="vr-container">

        <button onClick={() => navigate(-1)} className="vr-back-btn">
          <ChevronLeft size={20} style={{ marginRight: '4px' }}/> {isKo ? '뒤로가기' : 'Back'}
        </button>

        <h1 className="vr-page-title">{isKo ? '프리미엄 차량 예약' : 'Vehicle Reservation'}</h1>
        <p className="vr-page-subtitle">{isKo ? '럭셔리 공항 픽업/샌딩 서비스를 예약하세요.' : 'Book your luxury vehicle for premium airport transfers.'}</p>

        <div className="vr-intro-section">
          <div className="vr-intro-feature">
            <img src="/g90.webp" alt="Exceptional Quality" className="vr-intro-img" />
            <h4 className="vr-intro-title">{isKo ? '뛰어난 품질' : 'Exceptional Quality'}</h4>
            <p className="vr-intro-text">{isKo ? '철저하게 관리된 최고급 차량과 전문 기사님을 통해 최고의 편안함을 경험하세요.' : 'Experience top-tier comfort with our meticulously maintained fleet of premium vehicles and highly professional chauffeurs.'}</p>
          </div>
          <div className="vr-intro-feature">
            <img src="/staria.webp" alt="Unbeatable Value" className="vr-intro-img" />
            <h4 className="vr-intro-title">{isKo ? '압도적인 가성비' : 'Unbeatable Value'}</h4>
            <p className="vr-intro-text">{isKo ? '투명하고 경쟁력 있는 거리 기반 요금제로 합리적인 가격의 럭셔리 서비스를 제공합니다.' : 'Enjoy luxury service without the premium price tag. We offer transparent, highly competitive distance-based rates.'}</p>
          </div>
          <div className="vr-intro-feature">
            <img src="/sprinter.webp" alt="Seamless Transfers" className="vr-intro-img" />
            <h4 className="vr-intro-title">{isKo ? '매끄러운 이동' : 'Seamless Transfers'}</h4>
            <p className="vr-intro-text">{isKo ? '공항 수하물 수취대에서 최종 목적지까지, 스트레스 없는 완벽하고 편안한 여정을 보장합니다.' : 'From baggage claim to your final destination, we guarantee a smooth, stress-free journey every time.'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="vr-form-card">

          {/* Service Type & Vehicle */}
          <div className="vr-section">
            <h3 className="vr-section-title">{isKo ? '이동 정보' : 'Transfer Details'}</h3>
            <div className="vr-grid-2">
              <div>
                <label className="vr-label">{isKo ? '서비스 유형' : 'Service Type'}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={`vr-type-btn ${formData.serviceType === 'arrival' ? 'active' : ''}`}
                    onClick={() => handleServiceTypeChange('arrival')}
                  >
                    <PlaneLanding size={18} /> {isKo ? '입국 (Arrival)' : 'Arrival'}
                  </button>
                  <button
                    type="button"
                    className={`vr-type-btn ${formData.serviceType === 'departure' ? 'active' : ''}`}
                    onClick={() => handleServiceTypeChange('departure')}
                  >
                    <PlaneTakeoff size={18} /> {isKo ? '출국 (Departure)' : 'Departure'}
                  </button>
                </div>
              </div>

              <div>
                <label className="vr-label">{isKo ? '차량 선택' : 'Vehicle'}</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="vr-input"
                >
                  <option value="staria">{isKo ? '프리미엄 미니밴 (스타리아)' : 'Premium Minivan (Staria)'}</option>
                  <option value="g90">{isKo ? '럭셔리 세단 (제네시스 G90)' : 'Luxury Sedan (G90)'}</option>
                  <option value="sprinter">{isKo ? 'VIP 대형 밴 (스프린터)' : 'VIP Large Van (Sprinter)'}</option>
                </select>
              </div>
            </div>

            <div className="vr-grid-2" style={{ marginTop: '24px' }}>
              <div>
                <label className="vr-label">
                  {formData.serviceType === 'arrival' ? <PlaneLanding size={16} /> : <Building size={16} />} {isKo ? '출발지' : 'Pick-up Location'}
                </label>
                {formData.serviceType === 'arrival' ? (
                  <select
                    name="pickupLocation"
                    value={formData.pickupLocation}
                    onChange={handleChange}
                    className="vr-input"
                  >
                    {airportsList.map(apt => (
                      <option key={apt.id} value={apt.id}>{apt.name}</option>
                    ))}
                  </select>
                ) : (
                  <Autocomplete
                    onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      name="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={handleChange}
                      required
                      placeholder={isKo ? "호텔 이름 또는 주소" : "Hotel Name or Address"}
                      className="vr-input"
                    />
                  </Autocomplete>
                )}
              </div>
              <div>
                <label className="vr-label">
                  {formData.serviceType === 'arrival' ? <Building size={16} /> : <PlaneTakeoff size={16} />} {isKo ? '도착지' : 'Drop-off Location'}
                </label>
                {formData.serviceType === 'departure' ? (
                  <select
                    name="dropoffLocation"
                    value={formData.dropoffLocation}
                    onChange={handleChange}
                    className="vr-input"
                  >
                    {airportsList.map(apt => (
                      <option key={apt.id} value={apt.id}>{apt.name}</option>
                    ))}
                  </select>
                ) : (
                  <Autocomplete
                    onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      name="dropoffLocation"
                      value={formData.dropoffLocation}
                      onChange={handleChange}
                      required
                      placeholder={isKo ? "호텔 이름 또는 주소" : "Hotel Name or Address"}
                      className="vr-input"
                    />
                  </Autocomplete>
                )}
              </div>
            </div>

            {(quote || isCalculating) && (
              <div style={{ marginTop: '12px', fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RouteIcon size={16} color="#b5912a" />
                <span>{isKo ? '예상 거리:' : 'Estimated Distance:'} <strong>{quote ? `${distanceKm} km` : '-'}</strong></span>
                {isCalculating && <span style={{ fontStyle: 'italic', fontSize: '12px' }}>({isKo ? '계산 중...' : 'calculating...'})</span>}
              </div>
            )}
          </div>

          {/* Date, Time, Pax, Luggage */}
          <div className="vr-section">
            <div className="vr-grid-2">
              <div>
                <label className="vr-label"><Calendar size={16} /> {isKo ? '날짜' : 'Date'}</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required className="vr-input" />
              </div>
              <div>
                <label className="vr-label"><Clock size={16} /> {isKo ? '시간' : 'Time'}</label>
                <input type="time" name="time" value={formData.time} onChange={handleChange} required className="vr-input" />
              </div>
              <div>
                <label className="vr-label"><Users size={16} /> {isKo ? '승객 수' : 'Passengers'}</label>
                <input type="number" min="1" name="passengers" value={formData.passengers} onChange={handleChange} required className="vr-input" />
              </div>
              <div>
                <label className="vr-label"><Luggage size={16} /> {isKo ? '수하물 수' : 'Luggage'}</label>
                <input type="number" min="0" name="luggage" value={formData.luggage} onChange={handleChange} className="vr-input" />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="vr-section">
            <h3 className="vr-section-title">{isKo ? '예약자 정보' : 'Contact Information'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <label className="vr-label"><User size={16} /> {isKo ? '성명' : 'Full Name'}</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder={isKo ? "홍길동" : "John Doe"} className="vr-input" />
              </div>
              <div className="vr-grid-2">
                <div>
                  <label className="vr-label"><Mail size={16} /> {isKo ? '이메일' : 'Email'}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="email@example.com" className="vr-input" />
                </div>
                <div>
                  <label className="vr-label"><Phone size={16} /> {isKo ? '연락처' : 'Phone'}</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="010-1234-5678" className="vr-input" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Option */}
          <div className="vr-section">
            <h3 className="vr-section-title">{isKo ? '결제 수단' : 'Payment Method'}</h3>
            <div className="vr-grid-2">
              <button
                type="button"
                className={`vr-pay-btn ${formData.paymentMethod === 'nicepay' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, paymentMethod: 'nicepay'})}
              >
                <div className="vr-pay-title">
                  <CreditCard size={20} /> NicePay
                </div>
                <div className="vr-pay-desc">{isKo ? '국내 카드 / 원화(KRW) 결제' : 'Domestic Cards / KRW'}</div>
              </button>
              <button
                type="button"
                className={`vr-pay-btn ${formData.paymentMethod === 'paypal' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, paymentMethod: 'paypal'})}
              >
                <div className="vr-pay-title">
                  <CreditCard size={20} /> PayPal
                </div>
                <div className="vr-pay-desc">{isKo ? '해외 카드 / 달러(USD) 결제' : 'International / USD'}</div>
              </button>
            </div>
          </div>

          {/* Payment Details */}
          <div className="vr-section" style={{ marginBottom: 0 }}>
            <h3 className="vr-section-title">{isKo ? '결제 요약' : 'Payment Overview'}</h3>

            <div className="vr-summary-box">
              <div className="vr-summary-row">
                <span>{isKo ? `차량 기본 요금 (거리: ${distanceKm}km)` : `Vehicle Rate (Distance: ${distanceKm}km)`}</span>
                <span>{isNegotiable ? (isKo ? 'TBD (협의)' : 'TBD') : !hasQuote ? '-' : (isKrw ? `₩${Math.round(vehicleUsd * exRate).toLocaleString()}` : `$${vehicleUsd.toFixed(2)}`)}</span>
              </div>

              {(extraPassUsd > 0 || extraLugUsd > 0) && (
                <div className="vr-summary-row">
                  <span>{isKo ? '인원/수하물 추가 요금' : 'Pax/Luggage Surcharge'}</span>
                  <span>{isKrw ? `₩${Math.round((extraPassUsd + extraLugUsd) * exRate).toLocaleString()}` : `$${(extraPassUsd + extraLugUsd).toFixed(2)}`}</span>
                </div>
              )}

              <div className="vr-summary-total">
                <span>{isKo ? '총 결제 금액' : 'Total Amount'}</span>
                <span className="vr-total-val">
                  {formattedTotal}
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className="vr-submit-btn" disabled={isSubmitting} style={{ background: isNegotiable ? '#555' : '' }}>
            {isNegotiable
              ? (isKo ? '고객센터 문의하기 (협의 필요)' : 'Contact Us for Quote (협의)')
              : (isKo ? '결제 진행하기' : 'Proceed to Payment')}
          </button>
        </form>
      </div>
    </div>
  );
}
