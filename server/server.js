import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const port = process.env.PORT || 4242;

app.use(cors());
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

app.listen(port, () => {
  console.log(`Payment server running on http://localhost:${port}`);
});
