import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// 결제 페이지 공용: 서버가 확정한 결제 정보(금액·통화)를 가져온다.
// 금액은 브라우저에서 계산하거나 수정하지 않는다.
//
// 새로고침·결제 실패 후 재시도에서도 같은 예약을 이어가도록 예약번호·토큰·언어를
// 이 탭의 sessionStorage 에 보관한다 (탭을 닫으면 사라짐).
const STORAGE_KEY = 'btg_checkout';

export function readSavedCheckout() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveCheckout(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 저장 없이 진행
  }
}

// 개발 서버 전용 미리보기: /payment?demo=1 (운영 빌드에서는 import.meta.env.DEV 가 false 라 제거됨)
function demoCheckout(search) {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(search);
  if (!params.get('demo')) return null;
  const usd = params.get('demo') === 'usd';
  return {
    orderId: 'BTG-2026-000001',
    token: 'demo-token-not-real-000000',
    lang: params.get('lang') || (usd ? 'en' : 'ko'),
    checkout: {
      orderId: 'BTG-2026-000001',
      method: usd ? 'paypal' : 'nicepay',
      amount: usd ? 260 : 325000,
      currency: usd ? 'USD' : 'KRW',
      orderName: 'VIP arrival in ICN',
      customerName: 'Demo Guest',
      customerEmail: 'demo@example.com',
      customerMobilePhone: '000',
      status: '결제 대기중',
    },
  };
}

export function useCheckout() {
  const location = useLocation();
  const fromState = location.state || demoCheckout(location.search) || {};
  const saved = fromState.orderId ? null : readSavedCheckout();
  const orderId = fromState.orderId || saved?.orderId;
  const token = fromState.token || saved?.token;
  const initial = fromState.checkout || null;
  const lang = fromState.lang || saved?.lang || (initial?.currency === 'USD' ? 'en' : 'ko');

  const [checkout, setCheckout] = useState(initial);
  const [error, setError] = useState(orderId && token ? '' : 'missing');

  useEffect(() => {
    if (orderId && token) saveCheckout({ orderId, token, lang });
  }, [orderId, token, lang]);

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

  return { orderId, token, checkout, error, lang };
}
