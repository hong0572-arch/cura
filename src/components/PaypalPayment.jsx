import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { useCheckout } from '../utils/useCheckout';
import { localizePath } from '../utils/locale';
import CheckoutLayout from './checkout/CheckoutLayout';
import { copy, formatAmount } from './checkout/checkoutCopy';

// PayPal 버튼 문구는 결제 화면 언어에 맞춘다
const paypalOptions = (lang) => ({
    "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
    currency: "USD",
    intent: "capture",
    locale: lang === 'ko' ? 'ko_KR' : 'en_US',
});

export default function PaypalPayment() {
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState('');

    // 서버가 확정한 결제 정보 (금액은 서버가 PayPal 주문 생성 시 다시 사용)
    const { orderId, token, checkout: orderDetails, error: checkoutError, lang } = useCheckout();
    const t = copy[lang] || copy.en;

    const createOrder = async () => {
        try {
            track('Payment Initiated', { method: 'PayPal', amount: orderDetails.amount });
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // 금액은 보내지 않는다 — 서버가 예약에 확정된 금액으로 주문을 만든다
                body: JSON.stringify({ orderId, token }),
            });

            if (!response.ok) {
                const errorDetail = await response.json();
                throw new Error(errorDetail.error || "Failed to create order");
            }
            
            const orderData = await response.json();
            
            if (orderData.id) {
                return orderData.id;
            } else {
                throw new Error("Invalid response from server: Missing order ID");
            }
        } catch (error) {
            console.error("Create Order Error:", error);
            setErrorMsg(`Order creation failed: ${error.message}. Please check if the backend server is running and keys are correct.`);
            throw error;
        }
    };

    const onApprove = async (data, actions) => {
        try {
            const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ orderId, token }),
            });

            if (!response.ok) {
                const errorDetail = await response.json();
                throw new Error(errorDetail.error || "Failed to capture payment");
            }

            const orderData = await response.json();
            
            // Three cases to handle:
            //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
            //   (2) Other non-recoverable errors -> Show a failure message
            //   (3) Successful transaction -> Show confirmation or redirect
            
            const errorDetail = orderData?.details?.[0];

            if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
                // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
                // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
                return actions.restart();
            } else if (errorDetail) {
                // (2) Other non-recoverable errors -> Show a failure message
                throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
            } else if (!orderData.purchase_units) {
                throw new Error(JSON.stringify(orderData));
            } else {
                // (3) Successful transaction
                const transaction =
                    orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                    orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
                
                console.log(`Transaction ${transaction.status}: ${transaction.id}`);
                // Navigate to success page using query string to match existing Success.jsx expectations
                navigate(`/success?gateway=paypal&orderId=${encodeURIComponent(orderId)}`);
            }
        } catch (error) {
            console.error("Capture Error:", error);
            setErrorMsg(`Sorry, your transaction could not be processed: ${error.message}`);
            // Navigate to fail page using query string to match existing Fail.jsx expectations
            navigate(`/fail?gateway=paypal&orderId=${encodeURIComponent(orderId || '')}&message=${encodeURIComponent(error.message)}`);
        }
    };

    const amountLabel = orderDetails ? formatAmount(orderDetails.amount, 'USD') : '';

    return (
        <CheckoutLayout lang={lang}>
            <section className="co-card" aria-labelledby="co-title">
                <div className="co-card-head">
                    <span className="btg-eyebrow">{t.checkout} · PayPal</span>
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
                                    <div className="co-row"><dt>{lang === 'ko' ? '예약자' : 'Lead guest'}</dt><dd>{orderDetails.customerName}</dd></div>
                                )}
                            </dl>

                            <div className="co-total">
                                <span className="co-total-label">{t.total}</span>
                                <span className="co-total-amount">{amountLabel}</span>
                            </div>
                            <p className="co-note">{t.paypalFee}</p>

                            {errorMsg && <p className="co-alert" role="alert">{errorMsg}</p>}

                            {orderDetails.currency === 'USD' && (
                                <div className="co-paypal">
                                    <PayPalScriptProvider options={paypalOptions(lang)}>
                                        <PayPalButtons
                                            style={{ layout: "vertical", shape: "rect", color: "gold", label: "pay" }}
                                            createOrder={createOrder}
                                            onApprove={onApprove}
                                            onError={(err) => {
                                                console.error("PayPal Error:", err);
                                                setErrorMsg(prev => prev || "An error occurred during the payment process. Please try again.");
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                </div>
                            )}

                            <div className="co-actions">
                                <button type="button" className="co-link-btn" onClick={() => navigate(-1)}>{t.back}</button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </CheckoutLayout>
    );
}
