import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { journeysCopy } from '../content/journeysCopy';
import { localizePath } from '../utils/locale';
import { CONTACT } from '../components/checkout/checkoutCopy';
import './PrivateJourneys.css';

const EMPTY = {
  name: '', email: '', phone: '', country: '',
  arrival: '', departure: '', flexible: false,
  adults: 2, children: 0,
  styles: [], places: [], needs: [],
  budget: 'unsure', contact: 'email', message: '',
  consent: false, company: '',
};

// 맞춤 여행 사전 상담 폼 — 제출하면 서버가 관리자 메일로 전달한다 (/api/journey-enquiries)
export default function PrivateJourneys({ lang = 'ko' }) {
  const c = journeysCopy[lang] || journeysCopy.ko;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const onField = (e) => {
    const { name, value, type, checked } = e.target;
    update(name, type === 'checkbox' ? checked : value);
  };
  const toggle = (key, value) => setForm(prev => ({
    ...prev,
    [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.consent) {
      setStatus('error');
      setMessage(c.required);
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/journey-enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
      });
      if (res.status === 429) throw Object.assign(new Error('rate'), { code: 429 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReference(data.id || '');
      setStatus('sent');
      track('Journey Enquiry', { adults: form.adults, budget: form.budget });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Enquiry failed:', err);
      setStatus('error');
      setMessage(err.code === 429 ? c.tooMany : c.error);
    }
  };

  const renderChips = (name, options) => (
    <div className="pj-chips">
      {Object.entries(options).map(([value, label]) => (
        <label key={value} className={`pj-chip ${form[name].includes(value) ? 'is-on' : ''}`}>
          <input type="checkbox" checked={form[name].includes(value)} onChange={() => toggle(name, value)} />
          {label}
        </label>
      ))}
    </div>
  );

  return (
    <div className="pj-page">
      <section className="pj-hero on-navy">
        <div className="container pj-hero-inner">
          <div className="pj-hero-copy">
            <p className="btg-eyebrow">{c.eyebrow}</p>
            <h1 className="pj-title">{c.title}</h1>
            <p className="pj-intro">{c.intro}</p>
            <ul className="pj-points">
              {c.points.map(p => (
                <li key={p}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="pj-hero-media">
            <img src="/luggage_assistance.webp" alt="" width="640" height="480" />
          </div>
        </div>
      </section>

      <section className="container pj-body">
        {status === 'sent' ? (
          <div className="pj-sent btg-card" role="status">
            <div className="pj-sent-icon" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h2>{c.sentTitle}</h2>
            <p>{c.sentBody}</p>
            {reference && <p className="pj-ref">{c.reference} · <span>{reference}</span></p>}
            <div className="pj-sent-actions">
              <a className="btg-btn btg-btn--primary" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <button type="button" className="btg-btn btg-btn--ghost" onClick={() => { setForm(EMPTY); setStatus('idle'); }}>{c.another}</button>
            </div>
          </div>
        ) : (
          <form className="pj-form btg-card" onSubmit={submit} noValidate>
            {/* 봇 차단용 숨김 필드 */}
            <div className="pj-hp" aria-hidden="true">
              <label>Company<input name="company" tabIndex={-1} autoComplete="off" value={form.company} onChange={onField} /></label>
            </div>

            <fieldset className="pj-fieldset">
              <legend>{c.sections.you}</legend>
              <div className="pj-grid">
                <label className="pj-field">{c.fields.name} *
                  <input name="name" value={form.name} onChange={onField} autoComplete="name" required />
                </label>
                <label className="pj-field">{c.fields.email} *
                  <input name="email" type="email" value={form.email} onChange={onField} autoComplete="email" required />
                </label>
                <label className="pj-field"><span>{c.fields.phone} <span className="pj-opt">({c.fields.optional})</span></span>
                  <input name="phone" type="tel" value={form.phone} onChange={onField} autoComplete="tel" placeholder="+82 10 0000 0000" />
                </label>
                <label className="pj-field"><span>{c.fields.country} <span className="pj-opt">({c.fields.optional})</span></span>
                  <input name="country" value={form.country} onChange={onField} autoComplete="country-name" />
                </label>
              </div>
            </fieldset>

            <fieldset className="pj-fieldset">
              <legend>{c.sections.trip}</legend>
              <div className="pj-grid">
                <label className="pj-field">{c.fields.arrival}
                  <input name="arrival" type="date" value={form.arrival} onChange={onField} />
                </label>
                <label className="pj-field">{c.fields.departure}
                  <input name="departure" type="date" value={form.departure} min={form.arrival || undefined} onChange={onField} />
                </label>
                <label className="pj-field">{c.fields.adults}
                  <input name="adults" type="number" min="1" max="50" value={form.adults} onChange={onField} />
                </label>
                <label className="pj-field">{c.fields.children}
                  <input name="children" type="number" min="0" max="50" value={form.children} onChange={onField} />
                </label>
              </div>
              <label className="pj-check">
                <input type="checkbox" name="flexible" checked={form.flexible} onChange={onField} />
                {c.fields.flexible}
              </label>
              <label className="pj-field pj-field--full">{c.fields.budget}
                <select name="budget" value={form.budget} onChange={onField}>
                  {Object.entries(c.budgets).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </fieldset>

            <fieldset className="pj-fieldset">
              <legend>{c.sections.prefs}</legend>
              <p className="pj-sub">{c.fields.styles}</p>
              {renderChips('styles', c.styles)}
              <p className="pj-sub">{c.fields.places}</p>
              {renderChips('places', c.places)}
              <p className="pj-sub">{c.fields.needs}</p>
              {renderChips('needs', c.needs)}
            </fieldset>

            <fieldset className="pj-fieldset">
              <legend>{c.sections.message}</legend>
              <label className="pj-field pj-field--full">{c.fields.message}
                <textarea name="message" rows="5" value={form.message} onChange={onField} placeholder={c.fields.messagePlaceholder} />
              </label>
              <p className="pj-sub">{c.fields.contact}</p>
              <div className="pj-chips" role="radiogroup" aria-label={c.fields.contact}>
                {Object.entries(c.contacts).map(([value, label]) => (
                  <label key={value} className={`pj-chip ${form.contact === value ? 'is-on' : ''}`}>
                    <input type="radio" name="contact" value={value} checked={form.contact === value} onChange={onField} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="pj-consent">
              <label className="pj-check">
                <input type="checkbox" name="consent" checked={form.consent} onChange={onField} required />
                <strong>{c.consentLabel}</strong>
              </label>
              <p>{c.consentDetail} <a href={localizePath('/privacy', lang)} target="_blank" rel="noopener noreferrer">{c.privacyLink}</a></p>
            </div>

            {status === 'error' && message && <p className="pj-alert" role="alert">{message}</p>}

            <div className="pj-actions">
              <button type="submit" className="btg-btn btg-btn--gold btg-sheen" disabled={status === 'sending'}>
                {status === 'sending' ? c.sending : c.submit}
              </button>
              <a
                href={localizePath('/#hero', lang)}
                onClick={(e) => { e.preventDefault(); navigate(localizePath('/#hero', lang)); }}
                className="pj-link"
              >
                {c.airportCta} →
              </a>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
