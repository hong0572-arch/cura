const fetch = require('node-fetch');

async function testEmail() {
  try {
    const res = await fetch('http://localhost:4242/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: 'cura@beyondthegate.kr',
        subject: 'Test Email from Script',
        text: 'This is a test to see if SMTP is working.'
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}

testEmail();
