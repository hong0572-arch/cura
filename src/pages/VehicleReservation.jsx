import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlaneLanding, PlaneTakeoff, Calendar, Clock, Users, Luggage, User, Mail, Phone, CreditCard } from 'lucide-react';

export default function VehicleReservation({ settings, t }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVehicle = searchParams.get('vehicle') || 'staria';

  const [formData, setFormData] = useState({
    serviceType: 'arrival', // 'arrival' | 'departure'
    vehicleType: initialVehicle,
    date: '',
    time: '',
    passengers: 1,
    luggage: 0,
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'nicepay', // 'nicepay' | 'paypal'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Price Calculation Logic
  const exRate = settings?.exchangeRate || 1350;
  
  // Base cost for the vehicle
  let vehicleKrw = 140000;
  if (formData.vehicleType === 'g90') {
    vehicleKrw = settings?.vehiclePricesKrw?.g90 || 240000;
  } else if (formData.vehicleType === 'sprinter') {
    vehicleKrw = settings?.vehiclePricesKrw?.sprinter || 240000;
  } else {
    vehicleKrw = settings?.vehiclePricesKrw?.staria || 140000;
  }

  const vehicleUsd = Math.round(vehicleKrw / exRate);

  const extraPassCount = Math.max(0, formData.passengers - 4);
  const extraPassUsd = extraPassCount * (settings?.extraPassengerFeeUsd || 50);

  const extraLugCount = Math.max(0, formData.luggage - 4);
  const extraLugUsd = extraLugCount * (settings?.extraLuggageFeeUsd || 20);

  const totalUsd = vehicleUsd + extraPassUsd + extraLugUsd;
  const totalKrw = vehicleKrw + Math.round((extraPassUsd + extraLugUsd) * exRate);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.date || !formData.time || !formData.name || !formData.email || !formData.phone) {
      alert(t?.wizard?.common?.requiredField || "Please fill in all required fields.");
      return;
    }

    const orderId = 'VEH' + Math.floor(Math.random() * 1000000);

    if (formData.paymentMethod === 'nicepay') {
      navigate('/payment', { 
        state: {
          orderId,
          orderName: `Vehicle Reservation: ${formData.vehicleType.toUpperCase()}`,
          amount: totalKrw,
          customerName: formData.name,
          customerEmail: formData.email,
          customerMobilePhone: formData.phone
        }
      });
    } else {
      navigate('/payment/paypal', { 
        state: {
          orderId,
          orderName: `Vehicle Reservation: ${formData.vehicleType.toUpperCase()}`,
          amount: totalUsd,
          customerName: formData.name,
          customerEmail: formData.email,
          customerMobilePhone: formData.phone
        }
      });
    }
  };

  return (
    <div className="reservation-page" style={{ padding: '60px 20px', backgroundColor: 'var(--bg-primary)', color: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', fontSize: '16px' }}
        >
          &larr; Back
        </button>

        <h1 style={{ fontSize: '32px', marginBottom: '10px', fontWeight: 'bold' }}>Vehicle Reservation</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Book your luxury vehicle for airport transfers.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '30px', backgroundColor: 'var(--bg-secondary)', padding: '40px', borderRadius: '12px' }}>
          
          {/* Service Type & Vehicle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Service Type</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, serviceType: 'arrival'})}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: formData.serviceType === 'arrival' ? '2px solid var(--gold-primary)' : '1px solid #333', backgroundColor: formData.serviceType === 'arrival' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <PlaneLanding size={18} /> Arrival (입국)
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, serviceType: 'departure'})}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: formData.serviceType === 'departure' ? '2px solid var(--gold-primary)' : '1px solid #333', backgroundColor: formData.serviceType === 'departure' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <PlaneTakeoff size={18} /> Departure (출국)
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Vehicle</label>
              <select 
                name="vehicleType" 
                value={formData.vehicleType} 
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff', fontSize: '16px' }}
              >
                <option value="staria" style={{ color: '#000' }}>Premium Minivan (Staria)</option>
                <option value="g90" style={{ color: '#000' }}>Luxury Sedan (G90)</option>
                <option value="sprinter" style={{ color: '#000' }}>VIP Large Van (Sprinter)</option>
              </select>
            </div>
          </div>

          {/* Date, Time, Pax, Luggage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><Calendar size={16} /> Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><Clock size={16} /> Time</label>
              <input type="time" name="time" value={formData.time} onChange={handleChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><Users size={16} /> Passengers</label>
              <input type="number" min="1" name="passengers" value={formData.passengers} onChange={handleChange} required style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><Luggage size={16} /> Luggage</label>
              <input type="number" min="0" name="luggage" value={formData.luggage} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
            </div>
          </div>

          <hr style={{ borderColor: '#333', margin: '10px 0' }} />

          {/* Contact Details */}
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' }}>Contact Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><User size={16} /> Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><Mail size={16} /> Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}><Phone size={16} /> Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1 234 567 890" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
                </div>
              </div>
            </div>
          </div>

          <hr style={{ borderColor: '#333', margin: '10px 0' }} />

          {/* Payment Details */}
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' }}>Payment Method</h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, paymentMethod: 'nicepay'})}
                style={{ flex: 1, padding: '16px', borderRadius: '8px', border: formData.paymentMethod === 'nicepay' ? '2px solid var(--gold-primary)' : '1px solid #333', backgroundColor: formData.paymentMethod === 'nicepay' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={20} /> NicePay 
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Domestic Cards / KRW</div>
              </button>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, paymentMethod: 'paypal'})}
                style={{ flex: 1, padding: '16px', borderRadius: '8px', border: formData.paymentMethod === 'paypal' ? '2px solid var(--gold-primary)' : '1px solid #333', backgroundColor: formData.paymentMethod === 'paypal' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={20} /> PayPal
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>International / USD</div>
              </button>
            </div>

            <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <span>Vehicle Rate</span>
                <span>{formData.paymentMethod === 'nicepay' ? `₩${vehicleKrw.toLocaleString()}` : `$${vehicleUsd.toFixed(2)}`}</span>
              </div>
              {(extraPassUsd > 0 || extraLugUsd > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <span>Surcharges (Extra pax/luggage)</span>
                  <span>{formData.paymentMethod === 'nicepay' ? `₩${Math.round((extraPassUsd + extraLugUsd) * exRate).toLocaleString()}` : `$${(extraPassUsd + extraLugUsd).toFixed(2)}`}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #333', fontSize: '20px', fontWeight: 'bold' }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--gold-primary)' }}>
                  {formData.paymentMethod === 'nicepay' ? `₩${totalKrw.toLocaleString()}` : `USD $${totalUsd.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--gold-primary)', color: '#000', fontSize: '18px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '10px' }}
          >
            Proceed to Payment
          </button>
        </form>
      </div>
    </div>
  );
}
