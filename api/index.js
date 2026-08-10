import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const port = process.env.PORT || 4242;

app.use(cors());
// URL-encoded body parser is required because Nicepay POSTs form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 자동 이메일 발송 API
app.post('/api/send-email', async (req, res) => {
  const { customerEmail, adminEmail, subject, text } = req.body;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return res.status(500).json({ error: 'SMTP credentials are not configured in server/.env' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // 기본적으로 Gmail을 사용하도록 설정
      auth: {
        user,
        pass,
      },
    });

    // 1. 관리자에게 알림 메일 발송
    if (adminEmail) {
      await transporter.sendMail({
        from: `"BTG System" <${user}>`,
        to: adminEmail,
        subject: `[Admin] ${subject}`,
        text: text,
      });
    }

    // 2. 고객에게 확인 메일 발송
    if (customerEmail) {
      await transporter.sendMail({
        from: `"Beyond The Gate" <${user}>`,
        to: customerEmail,
        subject: `[Beyond The Gate] ${subject}`,
        text: `안녕하세요. Beyond The Gate 예약 시스템입니다.\n\n고객님의 예약이 성공적으로 접수되었습니다. 예약 내역은 아래와 같습니다.\n\n${text}`,
      });
    }

    res.status(200).json({ success: true, message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// 토스페이먼츠 결제 승인 API
app.post('/confirm/toss', async (req, res) => {
  const { paymentKey, orderId, amount } = req.body;
  const secretKey = process.env.TOSS_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'Toss Secret Key is missing' });
  }

  const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString('base64');

  try {
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Toss Payments Confirm Error:', error);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

// --- Nicepay Integration ---
app.post('/api/nicepay-return', async (req, res) => {
  const { authResultCode, authResultMsg, tid, txTid, authToken, mid, orderId, amount, signature, clientId } = req.body;
  const transactionId = tid || txTid; // Nicepay V2 uses 'tid'
  const secretKey = process.env.NICEPAY_SECRET_KEY;
  // Fallback to env var if clientId is not in req.body
  const nicepayClientId = clientId || process.env.VITE_NICEPAY_CLIENT_KEY;

  if (!secretKey || !nicepayClientId) {
    return res.redirect(`/fail?message=${encodeURIComponent('Nicepay keys are missing')}`);
  }

  // authResultCode '0000' means authentication succeeded
  if (authResultCode !== '0000') {
    return res.redirect(`/fail?message=${encodeURIComponent(authResultMsg || 'Authentication failed')}`);
  }

  const encryptedSecretKey = Buffer.from(`${nicepayClientId}:${secretKey}`).toString('base64');

  try {
    const response = await fetch(`https://api.nicepay.co.kr/v1/payments/${transactionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: parseInt(amount) }),
    });

    const data = await response.json();
    
    // resultCode '0000' means capture succeeded
    if (!response.ok || data.resultCode !== '0000') {
      console.error("Nicepay Capture Failed:", data);
      return res.redirect(`/fail?message=${encodeURIComponent(data.resultMsg || 'Capture failed')}`);
    }
    
    // Success! Redirect to frontend success page
    res.redirect(`/success?gateway=nicepay&paymentKey=${transactionId}&orderId=${orderId}&amount=${amount}`);
  } catch (error) {
    console.error('Nicepay Capture Error:', error);
    res.redirect(`/fail?message=${encodeURIComponent('Payment capture process failed')}`);
  }
});

// --- PayPal Integration ---
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"; // Use sandbox by default

async function generatePaypalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("Missing PayPal Client ID or Secret in .env");
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal Auth Error: ${data.error_description || response.statusText}`);
  }
  return data.access_token;
}

app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, amount, orderName } = req.body;
    const accessToken = await generatePaypalAccessToken();
    const url = `${PAYPAL_BASE_URL}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          description: orderName,
          amount: {
            currency_code: "USD",
            value: amount,
          },
        },
      ],
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

app.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const accessToken = await generatePaypalAccessToken();
    const url = `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Failed to capture order:", error);
    res.status(500).json({ error: error.message || "Failed to capture order" });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Payment server running on http://localhost:${port}`);
  });
}

export default app;
