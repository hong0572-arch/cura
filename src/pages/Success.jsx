import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  
  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setStatus('error');
        return;
      }

      try {
        const response = await fetch('http://localhost:4242/confirm/toss', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
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
          <p>결제금액: {Number(searchParams.get('amount')).toLocaleString()}원</p>
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
