import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const gateway = searchParams.get('gateway');
  
  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      try {
        let isSuccess = false;
        if (gateway === 'paypal' || gateway === 'nicepay') {
          isSuccess = true;
        } else {
          const response = await fetch('/confirm/toss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentKey, orderId, amount }),
          });
          isSuccess = response.ok;
        }

        if (isSuccess) {
          setStatus('success');
          track('Payment Success', { gateway: gateway || 'unknown', amount: amount });
          // Update Firebase Status to 결제 완료
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          await updateDoc(doc(db, "reservations", orderId), {
            status: '결제 완료'
          });
        } else {
          setStatus('error');
          track('Payment Failed', { gateway: gateway || 'unknown', amount: amount, reason: 'confirmation_failed' });
        }
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    };

    confirmPayment();
  }, [searchParams]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      {status === 'processing' && <h2>결제 승인 중입니다...</h2>}
      {status === 'success' && (
        <>
          <h2>🎉 결제가 성공적으로 완료되었습니다!</h2>
          <p>주문번호: {searchParams.get('orderId')}</p>
          <p>결제금액: {gateway === 'paypal' ? '$' : ''}{Number(searchParams.get('amount')).toLocaleString()}{gateway === 'paypal' ? ' USD' : '원'}</p>
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
