import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { track } from '@vercel/analytics';
import CheckoutLayout from '../components/checkout/CheckoutLayout';
import { copy, formatAmount, CONTACT } from '../components/checkout/checkoutCopy';
import { readSavedCheckout } from '../utils/useCheckout';
import { localizePath } from '../utils/locale';

// 결제 상태는 서버가 PG사 승인 확인 후 기록한다. 이 페이지는 조회만 한다.
export default function Success() {
  const [searchParams] = useSearchParams();
  const gateway = searchParams.get('gateway');
  const orderId = searchParams.get('orderId');
  const [status, setStatus] = useState(orderId ? 'processing' : 'error');
  const [payment, setPayment] = useState(null);
  const [lang] = useState(() => readSavedCheckout()?.lang || (gateway === 'paypal' ? 'en' : 'ko'));
  const t = copy[lang] || copy.ko;

  useEffect(() => {
    if (!orderId) return;
    // 개발 서버 전용 미리보기: /success?orderId=BTG-2026-000001&demo=1
    if (import.meta.env.DEV && searchParams.get('demo')) {
      const timer = setTimeout(() => {
        setPayment({ amount: 325000, currency: 'KRW' });
        setStatus(searchParams.get('demo') === 'error' ? 'error' : 'success');
      }, 900);
      return () => clearTimeout(timer);
    }
    fetch(`/api/reservations/${encodeURIComponent(orderId)}/status`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(data => {
        if (data.paid) {
          setPayment(data);
          setStatus('success');
          track('Payment Success', { gateway: gateway || 'unknown', amount: data.amount });
        } else {
          setStatus('error');
          track('Payment Failed', { gateway: gateway || 'unknown', reason: 'not_paid' });
        }
      })
      .catch(error => {
        console.error(error);
        setStatus('error');
      });
  }, [orderId, gateway, searchParams]);

  return (
    <CheckoutLayout lang={lang}>
      <section className="co-card" aria-live="polite">
        <div className="co-card-head">
          <span className="btg-eyebrow">{status === 'success' ? t.paid : t.checkout}</span>
          {orderId && <span className="co-ref">{orderId}</span>}
        </div>

        <div className="co-body">
          {status === 'processing' && (
            <>
              <div className="co-status co-status--wait"><div className="co-spinner" aria-hidden="true" /></div>
              <h1 className="co-title">{t.processingTitle}</h1>
              <p className="co-sub">{t.processingBody}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="co-status co-status--ok">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </div>
              <h1 className="co-title">{t.successTitle}</h1>
              <p className="co-sub">{t.successBody}</p>

              <dl className="co-rows">
                <div className="co-row"><dt>{t.reservation}</dt><dd className="co-mono">{orderId}</dd></div>
                {payment && (
                  <div className="co-row"><dt>{t.total}</dt><dd className="btg-num">{formatAmount(payment.amount, payment.currency)}</dd></div>
                )}
              </dl>

              <div>
                <p className="btg-eyebrow" style={{ margin: '0 0 12px' }}>{t.nextTitle}</p>
                <ol className="co-steps">
                  {t.next.map((line, i) => (
                    <li key={line}><span>{String(i + 1).padStart(2, '0')}</span><span>{line}</span></li>
                  ))}
                </ol>
              </div>

              <div className="co-actions">
                <a className="btg-btn btg-btn--primary" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="co-link-btn" href={localizePath('/', lang)} style={{ textAlign: 'center' }}>{t.home}</a>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="co-status co-status--fail">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 7v6M12 17h.01" /></svg>
              </div>
              <h1 className="co-title">{t.unverifiedTitle}</h1>
              <p className="co-sub">{t.unverifiedBody}</p>
              {orderId && (
                <dl className="co-rows">
                  <div className="co-row"><dt>{t.reservation}</dt><dd className="co-mono">{orderId}</dd></div>
                </dl>
              )}
              <div className="co-actions">
                <a className="btg-btn btg-btn--primary" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="co-link-btn" href={localizePath('/', lang)} style={{ textAlign: 'center' }}>{t.home}</a>
              </div>
            </>
          )}
        </div>
      </section>
    </CheckoutLayout>
  );
}
