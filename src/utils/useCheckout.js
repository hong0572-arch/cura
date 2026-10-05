import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// 결제 페이지 공용: 서버가 확정한 결제 정보(금액·통화)를 가져온다.
// 금액은 브라우저에서 계산하거나 수정하지 않는다.
export function useCheckout() {
  const location = useLocation();
  const { orderId, token, checkout: initial } = location.state || {};
  const [checkout, setCheckout] = useState(initial || null);
  const [error, setError] = useState(orderId && token ? '' : 'missing');

  useEffect(() => {
    if (initial || !orderId || !token) return;
    fetch(`/api/reservations/${encodeURIComponent(orderId)}/checkout?token=${encodeURIComponent(token)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setCheckout)
      .catch(err => {
        console.error('Checkout load failed:', err);
        setError('load');
      });
  }, [initial, orderId, token]);

  return { orderId, token, checkout, error };
}
