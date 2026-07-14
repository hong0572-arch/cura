import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CoreValues from './components/CoreValues';
import Services from './components/Services';
import Fleet from './components/Fleet';
import CasRoadmap from './components/CasRoadmap';
import Team from './components/Team';
import ReservationForm from './components/ReservationForm';
import Faq from './components/Faq';
import TermsModal from './components/TermsModal';
import Footer from './components/Footer';

// Admin Components
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

import { translations as defaultTranslations } from './translations';

function App() {
  const [lang, setLang] = useState('ko');
  const [selectedVehicle, setSelectedVehicle] = useState('none');
  const [termsOpen, setTermsOpen] = useState(false);

  // --- Dynamic Content State from localStorage ---
  const [content, setContent] = useState(() => {
    const saved = localStorage.getItem('custom_btg_translations');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Deep merge parsed with defaultTranslations so new keys (like team) are preserved
      const merge = (target, source) => {
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            merge(target[key], source[key]);
          } else if (target[key] === undefined) {
            target[key] = source[key];
          }
        }
        return target;
      };
      return merge(parsed, defaultTranslations);
    }
    return defaultTranslations;
  });

  const [images, setImages] = useState(() => {
    const saved = localStorage.getItem('custom_btg_images');
    return saved ? JSON.parse(saved) : {
      heroBg: '/luxury_airport_vip.png',
      fleetBg: '/luxury_fleet.png'
    };
  });

  const defaultSettings = {
    companyEmail: 'support@beyondthegate.vip',
    extraPassengerFeeUsd: 50,
    extraLuggageFeeUsd: 20,
    exchangeRate: 1350,
    servicePrices: {
      arrival: { usd: 250, krw: 310000 },
      departure: { usd: 270, krw: 330000 },
      transfer: { usd: 340, krw: 420000 },
      picketing: { usd: 140, krw: 150000 }
    },
    vehiclePricesKrw: {
      staria: 140000,
      g90: 240000,
      sprinter: 240000
    }
  };

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('custom_btg_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // --- Admin Routing States ---
  const [view, setView] = useState('user'); // user | admin
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('btg_admin_logged_in') === 'true';
  });

  // Listen to hash changes for Admin View Access
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setView('admin');
      } else {
        setView('user');
      }
    };

    // Trigger on initial mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAdminLogin = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem('btg_admin_logged_in', 'true');
  };

  const handleAdminLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('btg_admin_logged_in');
    window.location.hash = ''; // Back to main
  };

  const handleSaveAdminData = (newContent, newImages, newSettings) => {
    setContent(newContent);
    setImages(newImages);
    localStorage.setItem('custom_btg_translations', JSON.stringify(newContent));
    localStorage.setItem('custom_btg_images', JSON.stringify(newImages));
    if (newSettings) {
      setSettings(newSettings);
      localStorage.setItem('custom_btg_settings', JSON.stringify(newSettings));
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to reset all modifications to default configurations?')) {
      localStorage.removeItem('custom_btg_translations');
      localStorage.removeItem('custom_btg_images');
      localStorage.removeItem('custom_btg_settings');
      localStorage.removeItem('btg_reservations');
      setContent(defaultTranslations);
      setImages({
        heroBg: '/luxury_airport_vip.png',
        fleetBg: '/luxury_fleet.png'
      });
      setSettings(defaultSettings);
      window.location.hash = '';
      alert('Reset completed successfully!');
    }
  };

  // Map translations to selected language
  const t = content[lang] || defaultTranslations[lang];

  // Render Admin Screen if active
  if (view === 'admin') {
    if (!isLoggedIn) {
      return (
        <AdminLogin 
          onLoginSuccess={handleAdminLogin} 
          onCancel={() => { window.location.hash = ''; }} 
        />
      );
    }
    return (
      <AdminDashboard 
        data={content} 
        images={images} 
        settings={settings}
        onSave={handleSaveAdminData} 
        onReset={handleResetDefaults} 
        onPreview={() => { window.location.hash = ''; }}
      />
    );
  }

  // Render standard Customer Screen
  return (
    <>
      <Navbar lang={lang} setLang={setLang} t={t} />
      
      <main>
        {/* Pass customized images to sections */}
        <Hero t={t} customImage={images.heroBg} />
        
        <CoreValues t={t} />
        
        <Services t={t} />
        
        <Fleet 
          t={t} 
          onSelectVehicle={setSelectedVehicle} 
          customImage={images.fleetBg}
        />
        
        <CasRoadmap t={t} />
        
        <Team t={t} />
        
        <ReservationForm 
          t={t} 
          lang={lang}
          selectedVehicle={selectedVehicle} 
          setSelectedVehicle={setSelectedVehicle} 
          settings={settings}
        />
        
        <Faq t={t} />
      </main>

      <Footer t={t} onOpenTerms={() => setTermsOpen(true)} />

      <TermsModal 
        isOpen={termsOpen} 
        onClose={() => setTermsOpen(false)} 
        t={t} 
      />
    </>
  );
}

export default App;
