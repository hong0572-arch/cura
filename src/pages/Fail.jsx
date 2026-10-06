import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import CheckoutLayout from '../components/checkout/CheckoutLayout';
import { copy, CONTACT } from '../components/checkout/checkoutCopy';
import { readSavedCheckout } from '../utils/useCheckout';
import { localizePath } from '../utils/locale';

export default function Fail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const gateway = searchParams.get('gateway');
  const [saved] = useState(() => readSavedCheckout());
  const orderId = searchParams.get('orderId') || saved?.orderId || '';
  const lang = saved?.lang || (gateway === 'paypal' ? 'en' : 'ko');
  const t = copy[lang] || copy.ko;

  // 같은 예약으로 다시 결제할 수 있으면 결제 화면으로 돌려보낸다 (금액은 서버가 다시 확인)
  const canRetry = Boolean(saved?.orderId && saved?.token && (!orderId || saved.orderId === orderId));

  useEffect(() => {
    track('Payment Failed', { code: code || 'unknown', message: message || 'unknown' });
  }, [code, message]);

  const retry = () => {
    navigate(gateway === 'paypal' ? '/payment/paypal' : '/payment', {
      state: { orderId: saved.orderId, token: saved.token, lang: saved.lang },
    });
  };

  return (
    <CheckoutLayout lang={lang}>
      <section className="co-card" aria-live="polite">
        <div className="co-card-head">
          <span className="btg-eyebrow">{t.checkout}</span>
          {orderId && <span className="co-ref">{orderId}</span>}
        </div>
        <div className="co-body">
          <div className="co-status co-status--fail">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
          </div>
          <h1 className="co-title">{t.failTitle}</h1>
          <p className="co-sub">{t.failBody}</p>

          {(message || code) && (
            <dl className="co-rows">
              <div className="co-row"><dt>{t.reason}</dt><dd>{message || code}</dd></div>
            </dl>
          )}

          <div className="co-actions">
            {canRetry ? (
              <button type="button" className="btg-btn btg-btn--gold btg-sheen" onClick={retry}>{t.retry}</button>
            ) : (
              <a className="btg-btn btg-btn--primary" href={localizePath('/', lang)}>{t.startOver}</a>
            )}
            <a className="co-link-btn" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" style={{ textAlign: 'center' }}>WhatsApp · {CONTACT.phone}</a>
          </div>
        </div>
      </section>
    </CheckoutLayout>
  );
}
