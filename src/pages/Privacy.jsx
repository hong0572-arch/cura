import React from 'react';

const Privacy = ({ t }) => {
  return (
    <>
      <div style={{ minHeight: '80vh', padding: '120px 5% 60px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Privacy Policy</h1>
        <div style={{ lineHeight: '1.6', fontSize: '1.1rem' }}>
          <h2>1. Information We Collect</h2>
          <p>We collect personal information that you provide to us, such as name, contact details, and flight information, to process your booking.</p>
          <br/>
          <h2>2. How We Use Your Information</h2>
          <p>Your information is used exclusively to provide and improve our VIP services.</p>
          <br/>
          <h2>3. Data Security</h2>
          <p>We implement strict security measures to protect your personal data against unauthorized access or disclosure.</p>
          <br/>
          {/* Add more terms here as needed */}
          <p><em>Last updated: August 2026</em></p>
        </div>
      </div>
    </>
  );
};

export default Privacy;
