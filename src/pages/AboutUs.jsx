import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CasRoadmap from '../components/CasRoadmap';
import Team from '../components/Team';

export default function AboutUs({ t }) {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          const offset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="about-page">
      <div className="about-container">
        <Team t={t} />
        <CasRoadmap t={t} />
      </div>

      <style>{`
        .about-page {
          padding-top: 100px;
          min-height: 100vh;
          background: linear-gradient(rgba(4, 9, 20, 0.6), rgba(4, 9, 20, 0.85)), url('/luxury_airport_vip.png') center/cover fixed;
          padding-bottom: 60px;
          position: relative;
        }

        .about-container {
          position: relative;
          z-index: 2;
          max-width: 1000px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 20px 40px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }

        @media (max-width: 768px) {
          .about-container {
            margin: 0 16px;
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>
  );
}
