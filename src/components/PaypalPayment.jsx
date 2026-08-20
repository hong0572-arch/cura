import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useLocation, useNavigate } from 'react-router-dom';
import { track } from '@vercel/analytics';

// Note: Replace with your actual Client ID or use environment variables
// Vite uses import.meta.env.VITE_PAYPAL_CLIENT_ID
const initialOptions = {
    "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
    currency: "USD",
    intent: "capture",
};

export default function PaypalPayment() {
    const location = useLocation();
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState('');

    // Get order details from navigation state
    const orderDetails = location.state || {
        orderId: `order_${new Date().getTime()}`,
        orderName: 'BTG Service Reservation',
        amount: "250.00" // Default test amount in USD
    };

    const createOrder = async (data, actions) => {
        try {
            track('Payment Initiated', { method: 'PayPal', amount: orderDetails.amount });
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // Pass order details to server to create order securely
                body: JSON.stringify({
                    orderId: orderDetails.orderId,
                    amount: parseFloat(orderDetails.amount).toFixed(2), // Ensure format like "250.00"
                    orderName: orderDetails.orderName
                }),
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
                navigate(`/success?paymentKey=${transaction.id}&orderId=${orderDetails.orderId}&amount=${orderDetails.amount}&gateway=paypal`);
            }
        } catch (error) {
            console.error("Capture Error:", error);
            setErrorMsg(`Sorry, your transaction could not be processed: ${error.message}`);
            // Navigate to fail page using query string to match existing Fail.jsx expectations
            navigate(`/fail?message=${encodeURIComponent(error.message)}`);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', background: 'rgba(4, 9, 20, 0.8)', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#c5a880' }}>Pay with PayPal</h2>
            
            {errorMsg && (
                <div style={{ padding: '15px', marginBottom: '20px', background: 'rgba(255, 0, 0, 0.2)', border: '1px solid red', borderRadius: '8px', color: '#ffaaaa' }}>
                    <strong>Error:</strong> {errorMsg}
                </div>
            )}
            
            <div style={{ marginBottom: '30px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ marginBottom: '10px' }}><strong>Order:</strong> {orderDetails.orderName}</p>
                <p><strong>Total Amount:</strong> ${orderDetails.amount} USD</p>
            </div>

            <PayPalScriptProvider options={initialOptions}>
                <PayPalButtons
                    style={{ layout: "vertical", shape: "rect" }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={(err) => {
                        console.error("PayPal Error:", err);
                        setErrorMsg(prev => prev || "An error occurred during the payment process. Please try again.");
                    }}
                />
            </PayPalScriptProvider>
            
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button 
                    onClick={() => navigate('/')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: 'transparent',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    Cancel and Return
                </button>
            </div>
        </div>
    );
}
