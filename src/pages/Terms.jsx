import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Terms = ({ t }) => {
  return (
    <>
      <div style={{ minHeight: '80vh', padding: '120px 5% 60px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Terms & Conditions</h1>
        <div style={{ lineHeight: '1.6', fontSize: '1.1rem' }}>
          <h2>1. Introduction</h2>
          <p>Welcome to Beyond the Gate. These Terms & Conditions govern your use of our services.</p>
          <br/>
          <h2>2. Services</h2>
          <p>Beyond the Gate provides luxury airport transfer and VIP meet & greet services.</p>
          <br/>
          <h2>3. Bookings and Cancellations</h2>
          <ul>
            <li>Free cancellation up to 48 hours before service</li>
            <li>50% charge within 24–48 hours</li>
            <li>No refund within 24 hours</li>
          </ul>
          <br/>
          {/* Add more terms here as needed */}
          <p><em>Last updated: August 2026</em></p>
        </div>
      </div>
    </>
  );
};

export default Terms;
