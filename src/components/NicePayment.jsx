import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';

export default function NicePayment() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get order details from navigation state or use defaults for direct testing
  const orderDetails = location.state || {
    orderId: `order_${new Date().getTime()}`,
    orderName: '테스트 결제',
    amount: 1004,
    customerName: '홍길동',
    customerEmail: 'test@example.com',
    customerMobilePhone: '01012341234'
  };

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
      setErrorMsg('나이스페이 결제 모듈을 불러오는데 실패했습니다.');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = () => {
    if (!isSdkLoaded || !window.AUTHNICE) {
      alert('결제 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const clientId = import.meta.env.VITE_NICEPAY_CLIENT_KEY;
    if (!clientId) {
      setErrorMsg('나이스페이 Client Key가 설정되지 않았습니다.');
      return;
    }

    try {
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

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', background: 'rgba(4, 9, 20, 0.8)', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#c5a880' }}>국내 카드 결제 (나이스페이)</h2>
      {errorMsg && (
        <div style={{ padding: '15px', marginBottom: '20px', background: 'rgba(255, 0, 0, 0.2)', border: '1px solid red', borderRadius: '8px', color: '#ffaaaa' }}>
          <strong>오류:</strong> {errorMsg}
        </div>
      )}
      <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p><strong>주문명:</strong> {orderDetails.orderName}</p>
        <p><strong>결제금액:</strong> {orderDetails.amount.toLocaleString()}원</p>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
        <button 
          onClick={handlePayment}
          disabled={!isSdkLoaded}
          style={{
            flex: 1,
            padding: '15px',
            backgroundColor: isSdkLoaded ? '#3182f6' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isSdkLoaded ? 'pointer' : 'not-allowed',
          }}
        >
          {orderDetails.amount.toLocaleString()}원 결제하기
        </button>
        <button 
          onClick={() => navigate('/')}
          style={{
            flex: 1,
            padding: '15px',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}
