import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';

// 결제 상태는 서버가 PG사 승인 확인 후 기록한다. 이 페이지는 조회만 한다.
export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gateway = searchParams.get('gateway');
  const orderId = searchParams.get('orderId');
  const [status, setStatus] = useState(orderId ? 'processing' : 'error');
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!orderId) return;
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
  }, [orderId, gateway]);

  const amountLabel = payment
    ? (payment.currency === 'USD'
      ? `$${Number(payment.amount).toFixed(2)} USD`
      : `${Number(payment.amount).toLocaleString()}원`)
    : '';

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      {status === 'processing' && <h2>결제 승인 중입니다...</h2>}
      {status === 'success' && (
        <>
          <h2>🎉 결제가 성공적으로 완료되었습니다!</h2>
          <p>주문번호: {orderId}</p>
          <p>결제금액: {amountLabel}</p>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
          >
            홈으로 돌아가기
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <h2>❌ 결제 승인에 실패했습니다.</h2>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
          >
            홈으로 돌아가기
          </button>
        </>
      )}
    </div>
  );
}
