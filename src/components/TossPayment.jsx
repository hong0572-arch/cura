import React, { useEffect, useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { useLocation, useNavigate } from 'react-router-dom';

const clientKey = 'test_ck_Z1aOwX7K8mv4vezBqn4W3yQxzvNP';

export default function TossPayment() {
  const paymentWidgetRef = useRef(null);
  const paymentMethodsWidgetRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get order details from navigation state or use defaults for direct testing
  const orderDetails = location.state || {
    orderId: `order_${new Date().getTime()}`,
    orderName: '테스트 결제',
    amount: 50000,
    customerName: '홍길동',
    customerEmail: 'test@example.com',
    customerMobilePhone: '01012341234'
  };

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        // 결제위젯 초기화 (V2 SDK)
        const tossPayments = await loadTossPayments(clientKey);
        
        // 위젯 객체 생성 (비회원 결제는 ANONYMOUS 사용)
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        
        if (!isCancelled) {
          paymentWidgetRef.current = widgets;
        }

        // 금액 설정
        await widgets.setAmount({ currency: 'KRW', value: orderDetails.amount });

        // 결제수단 및 이용약관 렌더링
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: '#payment-method',
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: '#agreement',
            variantKey: 'AGREEMENT',
          }),
        ]);
      } catch (error) {
        console.error('Toss Payments widget initialization failed:', error);
        if (!isCancelled) {
          setErrorMsg(error.message || '위젯 초기화에 실패했습니다.');
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [orderDetails.amount]);

  const handlePayment = async () => {
    const widgets = paymentWidgetRef.current;
    if (!widgets) {
      alert('결제창을 불러오는 중입니다. 잠시만 기다려주세요.');
      return;
    }
    
    try {
      // 결제창 띄우기
      await widgets.requestPayment({
        orderId: orderDetails.orderId,
        orderName: orderDetails.orderName,
        successUrl: `${window.location.origin}/success`,
        failUrl: `${window.location.origin}/fail`,
        customerEmail: orderDetails.customerEmail,
        customerName: orderDetails.customerName,
        customerMobilePhone: orderDetails.customerMobilePhone,
      });
    } catch (err) {
      console.error('Payment request failed:', err);
      setErrorMsg(err.message || '결제 요청에 실패했습니다.');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', background: 'rgba(4, 9, 20, 0.8)', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#c5a880' }}>결제 수단 선택</h2>
      {errorMsg && (
        <div style={{ padding: '15px', marginBottom: '20px', background: 'rgba(255, 0, 0, 0.2)', border: '1px solid red', borderRadius: '8px', color: '#ffaaaa' }}>
          <strong>에러:</strong> {errorMsg}
        </div>
      )}
      <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p><strong>주문명:</strong> {orderDetails.orderName}</p>
        <p><strong>결제금액:</strong> {orderDetails.amount.toLocaleString()}원</p>
      </div>
      <div id="payment-method" style={{ background: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}></div>
      <div id="agreement" style={{ background: 'white', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}></div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handlePayment}
          style={{
            flex: 1,
            padding: '15px',
            backgroundColor: '#3182f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
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
