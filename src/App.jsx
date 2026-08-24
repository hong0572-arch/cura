import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CoreValues from './components/CoreValues';
import Services from './components/Services';
import Fleet from './components/Fleet';
import CasRoadmap from './components/CasRoadmap';
import Team from './components/Team';
import Faq from './components/Faq';
import TermsModal from './components/TermsModal';
import Footer from './components/Footer';
import AboutUs from './pages/AboutUs';
import VehicleReservation from './pages/VehicleReservation';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Blog from './pages/Blog';
import BusinessProposal from './pages/BusinessProposal';

// Admin Components
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ReviewSystem from './components/ReviewSystem';
import Chatbot from './components/Chatbot';
import BookingWizard from './components/BookingWizard';

import SEOMeta from './components/SEOMeta';
import { translations as defaultTranslations } from './translations';

function App() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const langFromUrl = searchParams.get('lang') === 'en' ? 'en' : 'ko';

  const [lang, setLangState] = useState(langFromUrl);
  const [selectedVehicle, setSelectedVehicle] = useState('none');
  const [termsOpen, setTermsOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState(null);

  useEffect(() => {
    if (langFromUrl !== lang) {
      setLangState(langFromUrl);
    }
  }, [langFromUrl]);

  const setLang = (newLang) => {
    setLangState(newLang);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('lang', newLang);
    window.history.pushState({}, '', `${window.location.pathname}?${newParams.toString()}`);
  };

  const defaultImages = {
    heroBg: '/luxury_airport_vip.jpg',
    fleetBg: '/luxury_fleet.png',
  };

  const defaultChatbot = {
    apiKey: import.meta.env.VITE_CHATBOT_API_KEY || '',
    systemPrompt: 'You are a VIP concierge for Beyond The Gate, a premium black car service in Korea. Be polite and helpful.',
    knowledgeBase: 'We provide airport transfers in luxury vehicles (Genesis G90, Mercedes Sprinter).',
    fallbackMessage: 'Please leave your email or call us directly, and a human agent will assist you.',
  };

  const defaultSettings = {
    companyEmail: 'support@beyondthegate.vip',
    extraPassengerFeeUsd: 120,
    extraLuggageFeeUsd: 40,
    porterFeeUsd: 110,
    nightSurchargeUsd: 40,
    urgentSurcharge6hUsd: 48,
    urgentSurcharge24hUsd: 40,
    weekendSurchargeUsd: 40,
    exchangeRate: 1350,
    airports: [
      {
        code: 'ICN',
        city: 'Seoul',
        name: 'Incheon Intl',
        services: {
          arrival: { usd: 250, krw: 310000 },
          departure: { usd: 270, krw: 330000 },
          transfer: { usd: 340, krw: 420000 },
          picketing: { usd: 140, krw: 150000 }
        },
        vehicles: [
          { id: 'staria', name: 'Premium Minivan (Staria)', priceUsd: 130, priceKrw: 175500 },
          { id: 'g90', name: 'Luxury Sedan (G90)', priceUsd: 200, priceKrw: 270000 },
          { id: 'sprinter', name: 'VIP Large Van (Sprinter)', priceUsd: 200, priceKrw: 270000 }
        ]
      },
      {
        code: 'CDG',
        city: 'Paris',
        name: 'Paris Charles de',
        services: {
          arrival: { usd: 300, krw: 400000 },
          departure: { usd: 300, krw: 400000 },
          transfer: { usd: 400, krw: 540000 },
          picketing: { usd: 150, krw: 200000 }
        },
        vehicles: [
          { id: 'vclass', name: 'Mercedes V-Class', priceUsd: 200, priceKrw: 270000 },
          { id: 'sclass', name: 'Mercedes S-Class', priceUsd: 300, priceKrw: 400000 }
        ]
      }
    ],
    chatbot: defaultChatbot,
    servicePrices: {
      arrival: { usd: 250, krw: 310000 },
      departure: { usd: 270, krw: 330000 },
      transfer: { usd: 340, krw: 420000 },
      picketing: { usd: 140, krw: 150000 }
    },
    vehiclePricesUsd: {
      staria: 130,
      g90: 200,
      sprinter: 200
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
          if (data.settings) {
            // Ensure chatbot settings exist even if data.settings is from an older save
            const mergedSettings = { ...data.settings };
            if (!mergedSettings.chatbot || !mergedSettings.chatbot.apiKey) {
              mergedSettings.chatbot = {
                ...(mergedSettings.chatbot || {}),
                ...defaultChatbot,
              };
            }
            setSettings(mergedSettings);
          }
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
          adminPassword={settings?.system?.adminPassword || 'admin1234'}
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
      <SEOMeta lang={lang} translations={content || defaultTranslations} />
      <Navbar lang={lang} setLang={setLang} t={t} />

      <main>
        <Routes>
          <Route path="/" element={
            <>
              {/* Pass customized images to sections */}
              <Hero t={t} customImage={images.heroBg} settings={settings} onOpenWizard={(data) => {
                setWizardData(data);
                setIsWizardOpen(true);
              }} />

              <CoreValues t={t} />

              <Services t={t} />

              <Fleet
                t={t}
                onSelectVehicle={setSelectedVehicle}
                customImage={images.fleetBg}
              />

              <ReviewSystem t={t} />

              <Faq t={t} />
            </>
          } />
          <Route path="/about" element={<AboutUs t={t} />} />
          <Route path="/book-vehicle" element={<VehicleReservation t={t} settings={settings} lang={lang} />} />
          <Route path="/terms" element={<Terms t={t} />} />
          <Route path="/privacy" element={<Privacy t={t} />} />
          <Route path="/blog" element={<Blog t={t} />} />
          <Route path="/business" element={<BusinessProposal t={t} />} />
        </Routes>
      </main>

      <Footer t={t} onOpenTerms={() => setTermsOpen(true)} />

      <TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        t={t}
      />

      <Chatbot settings={settings} lang={lang} />

      {isWizardOpen && (
        <BookingWizard
          initialData={wizardData}
          onClose={() => setIsWizardOpen(false)}
          settings={settings}
          t={t}
          lang={lang}
        />
      )}
    </>
  );
}

export default App;
