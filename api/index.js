import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBWKmsDjCZcWOXHrmDCv8hrdPFhMCqBk2s",
  authDomain: "cura-1969a.firebaseapp.com",
  projectId: "cura-1969a",
  storageBucket: "cura-1969a.firebasestorage.app",
  messagingSenderId: "630189967071",
  appId: "1:630189967071:web:69a1eff6a28688b23ccb6a",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const port = process.env.PORT || 4242;

app.use(cors());
// URL-encoded body parser is required because Nicepay POSTs form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 자동 이메일 발송 API
app.post('/api/send-email', async (req, res) => {
  const { customerEmail, adminEmail, subject, text, html } = req.body;
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
      const mailOptions = {
        from: `"Beyond The Gate" <${user}>`,
        to: customerEmail,
        subject: `[Beyond The Gate] ${subject}`,
      };

      if (html) {
        mailOptions.html = html;
      } else {
        mailOptions.text = `안녕하세요. Beyond The Gate 예약 시스템입니다.\n\n고객님의 예약이 성공적으로 접수되었습니다. 예약 내역은 아래와 같습니다.\n\n${text}`;
      }

      await transporter.sendMail(mailOptions);
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

// --- Threads Integration ---
async function postToThreads(text) {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  const threadsUserId = process.env.THREADS_USER_ID;

  if (!accessToken || !threadsUserId) {
    console.warn("Threads credentials not found. Skipping Threads post.");
    return null;
  }

  try {
    // 1. 미디어 컨테이너 생성 (TEXT 타입)
    const createContainerUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    const createParams = new URLSearchParams({
      media_type: 'TEXT',
      text: text,
      access_token: accessToken
    });
    
    const createResp = await fetch(`${createContainerUrl}?${createParams.toString()}`, { method: 'POST' });
    const createData = await createResp.json();

    if (!createResp.ok) {
      throw new Error(`Threads Container Error: ${JSON.stringify(createData)}`);
    }

    const creationId = createData.id;

    // 2. 미디어 컨테이너 발행
    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });

    const publishResp = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    const publishData = await publishResp.json();

    if (!publishResp.ok) {
      throw new Error(`Threads Publish Error: ${JSON.stringify(publishData)}`);
    }

    console.log("Successfully posted to Threads:", publishData.id);
    return publishData.id;
  } catch (error) {
    console.error("Threads post failed:", error);
    return null;
  }
}

// 블로그 포스팅 자동 발행 (Vercel Cron)
app.get('/api/cron', async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // beyondthegate.kr SEO/GEO 최적화를 위한 공항 의전 서비스 주제의 블로그 글 생성
    const prompt = `당신은 프리미엄 공항 의전 및 블랙카 서비스 전문가입니다. 
목적: 'beyondthegate.kr' 웹사이트가 '인천공항 의전 서비스', 'VIP 공항 픽업', '인천공항 콜밴', '프리미엄 리무진', '김포/제주 등 국내 공항 의전', '중국 공항 픽업 및 글로벌 의전', '외국인 바이어 의전' 등의 키워드 검색 결과(SEO/GEO)에서 최상단에 노출되도록 하는 것입니다.
위 목적을 달성하기 위해, 독자에게 유용하고 흥미로우며 전문적인 정보가 담긴 블로그 포스팅을 1개 작성해주세요.

다음 조건들을 반드시 지켜주세요:
1. 제목은 첫 줄에 '#'을 사용하여 가장 매력적이고 검색에 유리한 문구로 작성하세요.
2. 현재 메인 서비스인 '인천공항'을 중심으로 강조하되, 김포/제주 등 다른 국내 공항과 향후 확장될 '중국 주요 공항'에서의 VIP 의전 서비스에 대한 기대감이나 정보도 자연스럽게 언급하세요.
3. 'Beyond The Gate' 브랜드 이름과 공식 사이트 주소(beyondthegate.kr)를 포함하여 신뢰감 있게 언급하세요.
4. 타겟 독자는 중요한 비즈니스 출장자, VIP, 안전하고 편안한 이동을 원하는 가족 단위 여행객입니다.
5. 본문은 Markdown 형식(소제목, 글머리 기호, 굵은 글씨 등 활용)으로 가독성 좋게 작성하세요.
6. 단순히 홍보만 하는 것이 아니라 실제 공항 이용 팁, 국가별/공항별 의전 서비스의 필요성 등 가치 있는 정보를 포함하세요.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });
    
    const content = response.text;
    
    // 제목 추출 (첫 번째 # 또는 ## 라인을 제목으로 사용)
    const titleMatch = content.match(/^#+\s+(.*)$/m);
    const title = titleMatch ? titleMatch[1] : `프리미엄 공항 의전 서비스 가이드 - ${new Date().toLocaleDateString()}`;

    // 이미지 생성 (메인 이미지, 보조 이미지)
    let mainImageUrl = '';
    let subImageUrl = '';
    
    try {
      const mainImageResp = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: 'A luxurious black premium van like Mercedes Sprinter or Hyundai Staria waiting outside an international airport terminal, professional cinematic photography, VIP service concept, high quality',
        config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
      });
      if (mainImageResp.generatedImages && mainImageResp.generatedImages.length > 0) {
        mainImageUrl = `data:image/jpeg;base64,${mainImageResp.generatedImages[0].image.imageBytes}`;
      }

      const subImageResp = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: 'A professional chauffeur in a black suit opening the door of a luxury black sedan for a VIP passenger, elegant, business travel, 8k resolution, photorealistic',
        config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
      });
      if (subImageResp.generatedImages && subImageResp.generatedImages.length > 0) {
        subImageUrl = `data:image/jpeg;base64,${subImageResp.generatedImages[0].image.imageBytes}`;
      }
    } catch (imgError) {
      console.error('Image generation failed (fallback to text-only):', imgError);
    }

    // Firestore에 저장
    const docRef = await addDoc(collection(db, "blog_posts"), {
      title,
      content,
      mainImageUrl,
      subImageUrl,
      createdAt: serverTimestamp(),
      author: "Gemini AI",
      published: true
    });

    // --- Threads 자동 포스팅 ---
    try {
      const threadsPrompt = `다음은 방금 작성된 블로그 포스팅 내용입니다. 이 내용을 바탕으로 Threads(스레드)에 올릴 짧고 매력적인 홍보글을 작성해주세요. 
필수 조건:
1. 300자 이내로 핵심만 간결하게 작성
2. 관련된 해시태그 3~5개 포함
3. 마지막에 '자세한 내용은 beyondthegate.kr 에서 확인하세요!' 라는 문구 추가

블로그 제목: ${title}
블로그 내용 일부:
${content.substring(0, 500)}...`;

      const threadsResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: threadsPrompt,
      });
      
      const threadsText = threadsResponse.text;
      await postToThreads(threadsText);
    } catch (threadsError) {
      console.error('Threads generation or posting failed:', threadsError);
    }

    res.status(200).json({ success: true, message: 'Blog post published and sent to Threads', postId: docRef.id });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ error: 'Failed to generate and publish blog post', details: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Payment server running on http://localhost:${port}`);
  });
}

export default app;
