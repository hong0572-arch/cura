import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { useCheckout } from '../utils/useCheckout';
import { localizePath } from '../utils/locale';
import CheckoutLayout from './checkout/CheckoutLayout';
import { copy, formatAmount } from './checkout/checkoutCopy';

export default function NicePayment() {
  const navigate = useNavigate();
  // 서버가 확정한 결제 정보 (금액은 브라우저에서 바꿀 수 없음)
  const { checkout: orderDetails, error: checkoutError, lang } = useCheckout();
  const t = copy[lang] || copy.ko;

  const [errorMsg, setErrorMsg] = useState('');
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  useEffect(() => {
    // Load Nicepay SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://pay.nicepay.co.kr/v1/js/';
    script.async = true;
    script.onload = () => {
      setIsSdkLoaded(true);
    };
    script.onerror = () => {
      setErrorMsg(lang === 'en' ? 'The payment module could not be loaded.' : '나이스페이 결제 모듈을 불러오는데 실패했습니다.');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [lang]);

  const handlePayment = () => {
    if (!orderDetails || orderDetails.currency !== 'KRW') return;
    if (!isSdkLoaded || !window.AUTHNICE) {
      setErrorMsg(t.loadingModule);
      return;
    }

    const clientId = import.meta.env.VITE_NICEPAY_CLIENT_KEY;
    if (!clientId) {
      setErrorMsg('나이스페이 Client Key가 설정되지 않았습니다.');
      return;
    }

    try {
      setErrorMsg('');
      track('Payment Initiated', { method: 'NicePay', amount: orderDetails.amount });
      window.AUTHNICE.requestPay({
        clientId: clientId,
        method: 'card',
        orderId: orderDetails.orderId,
        amount: orderDetails.amount,
        goodsName: orderDetails.orderName,
        returnUrl: `${window.location.origin}/api/nicepay-return`, // Webhook endpoint to receive auth result
        buyerName: orderDetails.customerName,
        buyerEmail: orderDetails.customerEmail,
        buyerTel: orderDetails.customerMobilePhone,
        fnError: function (result) {
          console.error('Nicepay Error:', result);
          setErrorMsg(result.errorMsg || '결제 중 오류가 발생했습니다.');
        }
      });
    } catch (err) {
      console.error('Payment request failed:', err);
      setErrorMsg(err.message || '결제 요청 중 오류가 발생했습니다.');
    }
  };

  const amountLabel = orderDetails ? formatAmount(orderDetails.amount, 'KRW') : '';

  return (
    <CheckoutLayout lang={lang}>
      <section className="co-card" aria-labelledby="co-title">
        <div className="co-card-head">
          <span className="btg-eyebrow">{t.checkout} · NICEPAY</span>
          {orderDetails && <span className="co-ref">{orderDetails.orderId}</span>}
        </div>

        <div className="co-body">
          {checkoutError && !orderDetails ? (
            <>
              <p className="co-alert" role="alert">{t.missing}</p>
              <a className="btg-btn btg-btn--primary" href={localizePath('/', lang)}>{t.startOver}</a>
            </>
          ) : !orderDetails ? (
            <p className="co-sub">{t.checking}</p>
          ) : (
            <>
              <h1 id="co-title" className="co-title">{orderDetails.orderName}</h1>

              <dl className="co-rows">
                <div className="co-row"><dt>{t.reservation}</dt><dd className="co-mono">{orderDetails.orderId}</dd></div>
                {orderDetails.customerName && (
                  <div className="co-row"><dt>{lang === 'en' ? 'Lead guest' : '예약자'}</dt><dd>{orderDetails.customerName}</dd></div>
                )}
              </dl>

              <div className="co-total">
                <span className="co-total-label">{t.total}</span>
                <span className="co-total-amount">{amountLabel}</span>
              </div>
              <p className="co-note">{t.noCardFee}</p>

              {errorMsg && <p className="co-alert" role="alert">{errorMsg}</p>}

              <div className="co-actions">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={!isSdkLoaded}
                  className="btg-btn btg-btn--gold btg-sheen"
                >
                  {isSdkLoaded ? t.payNow(amountLabel) : t.loadingModule}
                </button>
                <button type="button" className="co-link-btn" onClick={() => navigate(-1)}>{t.back}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </CheckoutLayout>
  );
}
