import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './firebase';
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
import PrivateJourneys from './pages/PrivateJourneys';

// Admin Components
// 관리자 화면·예약 위저드는 필요할 때만 불러온다 (첫 화면 JS 용량 절감)
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
import ReviewSystem from './components/ReviewSystem';
import Chatbot from './components/Chatbot';
const BookingWizard = lazy(() => import('./components/BookingWizard'));

import SEOMeta from './components/SEOMeta';
import ThreeWays from './components/home/ThreeWays';
import OpsTracker from './components/home/OpsTracker';
import ClosingCta from './components/home/ClosingCta';
import './components/home/home.css';
import { homeCopy } from './content/homeCopy';
import { translations as defaultTranslations } from './translations';
import { langFromPath, stripLocale, localizePath } from './utils/locale';
import { optimizedImage } from './utils/images';

// Firestore 문구에 없는 키는 코드의 기본 번역으로 채운다
const mergeContent = (target, source) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeContent(target[key], source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
  return target;
};

// initialSiteData: 빌드 시 사전 렌더링에 쓴 Firestore siteData 스냅샷
// (브라우저에서는 window.__SITE_DATA__ 로 전달되어 첫 화면을 바로 그린다)
function App({ initialSiteData = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = langFromPath(location.pathname);

  const [selectedVehicle, setSelectedVehicle] = useState('none');
  const [termsOpen, setTermsOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState(null);

  // 예전 주소(?lang=en)는 /en/... 경로로 옮긴다
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const legacyLang = params.get('lang');
    if (!legacyLang) return;
    params.delete('lang');
    const query = params.toString();
    const target = legacyLang === 'en' ? localizePath(stripLocale(location.pathname), 'en') : stripLocale(location.pathname);
    navigate(`${target}${query ? `?${query}` : ''}${location.hash}`, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  // 페이지 이동 시: #섹션이 있으면 그 위치로, 없으면 맨 위로 스크롤
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id === 'admin') return;
    if (!id) {
      window.scrollTo(0, 0);
      return;
    }
    const timer = setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  // 클라이언트에서 언어가 바뀌면 <html lang> 도 맞춘다 (사전 렌더링 페이지는 빌드 시 지정)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (newLang) => {
    const target = localizePath(stripLocale(location.pathname), newLang);
    navigate(`${target}${location.search}${location.hash}`);
  };

  const defaultImages = {
    heroBg: '/luxury_airport_vip.webp',
    fleetBg: '/luxury_fleet.webp',
  };

  // Gemini API 키는 서버 환경변수(GEMINI_API_KEY)로만 관리한다
  const defaultChatbot = {
    systemPrompt: 'You are a VIP concierge for Beyond The Gate, a premium black car service in Korea. Be polite and helpful.',
    knowledgeBase: 'We provide airport transfers in luxury vehicles (Genesis G90, Mercedes Sprinter).',
    fallbackMessage: 'Please leave your email or call us directly, and a human agent will assist you.',
  };

  const defaultSettings = {
    companyEmail: 'cura@beyondthegate.kr',
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
  const resolveSiteData = (data) => {
    const settingsFromData = data?.settings ? { ...data.settings } : null;
    // Ensure chatbot settings exist even if data.settings is from an older save
    if (settingsFromData && !settingsFromData.chatbot) {
      settingsFromData.chatbot = { ...defaultChatbot };
    }
    return {
      content: data?.content ? mergeContent(structuredClone(data.content), defaultTranslations) : defaultTranslations,
      images: data?.images
        ? Object.fromEntries(Object.entries(data.images).map(([k, v]) => [k, optimizedImage(v)]))
        : defaultImages,
      settings: settingsFromData || defaultSettings,
    };
  };

  const [initial] = useState(() => resolveSiteData(initialSiteData));
  const [content, setContent] = useState(initial.content);
  const [images, setImages] = useState(initial.images);
  const [settings, setSettings] = useState(initial.settings);

  // 첫 화면은 빌드 시점 데이터로 바로 그리고, 최신 데이터는 뒤에서 받아 갱신한다
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'siteData', 'main'));
        if (docSnap.exists()) {
          const next = resolveSiteData(docSnap.data());
          setContent(next.content);
          setImages(next.images);
          setSettings(next.settings);
        }
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Admin Routing States ---
  const [view, setView] = useState('user'); // user | admin
  // 'checking' | 'signedOut' | 'notAdmin' | 'admin'
  const [adminState, setAdminState] = useState('checking');

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user || user.isAnonymous || !user.email) {
        setAdminState('signedOut');
        return;
      }
      try {
        // admins/{uid} 문서는 본인만 읽을 수 있다 (firestore.rules)
        const snap = await getDoc(doc(db, 'admins', user.uid));
        setAdminState(snap.exists() ? 'admin' : 'notAdmin');
      } catch {
        setAdminState('notAdmin');
      }
    });
  }, []);

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

  const handleAdminLogout = async () => {
    await signOut(auth);
    window.location.hash = ''; // Back to main
  };

  // 공개 문서(siteData)에 비밀값이 남지 않도록 저장 전에 제거한다
  const stripSecrets = (s) => {
    if (!s) return s;
    const clean = { ...s };
    if (clean.system) {
      clean.system = { ...clean.system };
      delete clean.system.adminPassword;
    }
    if (clean.chatbot) {
      clean.chatbot = { ...clean.chatbot };
      delete clean.chatbot.apiKey;
    }
    return clean;
  };

  const handleSaveAdminData = async (newContent, newImages, newSettings) => {
    setContent(newContent);
    setImages(newImages);
    if (newSettings) {
      setSettings(newSettings);
    }

    try {
      // merge 없이 전체 덮어쓰기 — 예전에 저장된 비밀값 필드까지 확실히 지운다
      await setDoc(doc(db, 'siteData', 'main'), {
        content: newContent,
        images: newImages,
        settings: stripSecrets(newSettings || settings)
      });
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
          settings: stripSecrets(defaultSettings)
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

  // Render Admin Screen if active
  if (view === 'admin') {
    const loadingScreen = <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff' }}>Loading...</div>;
    if (adminState === 'checking') {
      return loadingScreen;
    }
    if (adminState !== 'admin') {
      return (
        <Suspense fallback={loadingScreen}>
          <AdminLogin
            notAuthorized={adminState === 'notAdmin'}
            onCancel={() => { window.location.hash = ''; }}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={loadingScreen}>
        <AdminDashboard
          data={content}
          images={images}
          settings={settings}
          onSave={handleSaveAdminData}
          onReset={handleResetDefaults}
          onPreview={() => { window.location.hash = ''; }}
          onLogout={handleAdminLogout}
        />
      </Suspense>
    );
  }

  // Render standard Customer Screen
  return (
    <>
      <SEOMeta lang={lang} path={stripLocale(location.pathname)} translations={content || defaultTranslations} />
      <Navbar lang={lang} setLang={setLang} t={t} />

      <main>
        <Routes>
          {/* 한국어: /about, 영어: /en/about — 같은 페이지 구성을 두 경로에 둔다 */}
          {['ko', 'en'].map(routeLang => (
            <Route key={routeLang} path={routeLang === 'en' ? 'en' : '/'}>
          <Route index element={
            <>
              {/* Pass customized images to sections */}
              <Hero t={t} lang={lang} customImage={images.heroBg} settings={settings} onOpenWizard={(data) => {
                setWizardData(data);
                setIsWizardOpen(true);
              }} />

              <ThreeWays copy={(homeCopy[lang] || homeCopy.ko).ways} lang={lang} />

              <Services t={t} />

              <OpsTracker copy={(homeCopy[lang] || homeCopy.ko).ops} />

              <Fleet
                t={t}
                onSelectVehicle={setSelectedVehicle}
                customImage={images.fleetBg}
              />

              <CoreValues t={t} />

              <ReviewSystem t={t} />

              <Faq t={t} />

              <ClosingCta copy={(homeCopy[lang] || homeCopy.ko).closing} lang={lang} />
            </>
          } />
          <Route path="about" element={<AboutUs t={t} />} />
          <Route path="book-vehicle" element={<VehicleReservation t={t} settings={settings} lang={lang} />} />
          <Route path="terms" element={<Terms t={t} />} />
          <Route path="privacy" element={<Privacy t={t} />} />
          <Route path="blog" element={<Blog t={t} lang={lang} />} />
          <Route path="business" element={<BusinessProposal t={t} />} />
          <Route path="private-journeys" element={<PrivateJourneys lang={lang} />} />
            </Route>
          ))}
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
        <Suspense fallback={null}>
          <BookingWizard
            initialData={wizardData}
            onClose={() => setIsWizardOpen(false)}
            settings={settings}
            t={t}
            lang={lang}
          />
        </Suspense>
      )}
    </>
  );
}

export default App;
