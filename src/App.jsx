import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
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

  const defaultImages = {
    heroBg: '/luxury_airport_vip.png',
    fleetBg: '/luxury_fleet.png'
  };

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

  // --- Dynamic Content State from Firestore ---
  const [content, setContent] = useState(defaultTranslations);
  const [images, setImages] = useState(defaultImages);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'siteData', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.content) {
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
            setContent(merge(data.content, defaultTranslations));
          }
          if (data.images) setImages(data.images);
          if (data.settings) setSettings(data.settings);
        }
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const handleSaveAdminData = async (newContent, newImages, newSettings) => {
    setContent(newContent);
    setImages(newImages);
    if (newSettings) {
      setSettings(newSettings);
    }

    try {
      await setDoc(doc(db, 'siteData', 'main'), {
        content: newContent,
        images: newImages,
        settings: newSettings || settings
      }, { merge: true });
      // Only log or show non-intrusive alert since AdminDashboard has its own feedback
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      alert('데이터 저장 중 오류가 발생했습니다.');
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('모든 수정한 내용을 기본값으로 초기화하시겠습니까? (Are you sure you want to reset all modifications to default configurations?)')) {
      setContent(defaultTranslations);
      setImages(defaultImages);
      setSettings(defaultSettings);
      
      try {
        await setDoc(doc(db, 'siteData', 'main'), {
          content: defaultTranslations,
          images: defaultImages,
          settings: defaultSettings
        });
        window.location.hash = '';
        alert('Reset completed successfully!');
      } catch (error) {
        console.error('Error resetting Firestore:', error);
      }
    }
  };

  // Map translations to selected language
  const t = content[lang] || defaultTranslations[lang];

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff' }}>Loading...</div>;
  }

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
