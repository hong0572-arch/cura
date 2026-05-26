import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CoreValues from './components/CoreValues';
import Services from './components/Services';
import Fleet from './components/Fleet';
import CasRoadmap from './components/CasRoadmap';
import ReservationForm from './components/ReservationForm';
import Faq from './components/Faq';
import TermsModal from './components/TermsModal';
import Footer from './components/Footer';

import { translations } from './translations';

function App() {
  const [lang, setLang] = useState('ko');
  const [selectedVehicle, setSelectedVehicle] = useState('none');
  const [termsOpen, setTermsOpen] = useState(false);

  // Map translations to selected language
  const t = translations[lang];

  return (
    <>
      <Navbar lang={lang} setLang={setLang} t={t} />
      
      <main>
        <Hero t={t} />
        
        <CoreValues t={t} />
        
        <Services t={t} />
        
        <Fleet t={t} onSelectVehicle={setSelectedVehicle} />
        
        <CasRoadmap t={t} />
        
        <ReservationForm 
          t={t} 
          selectedVehicle={selectedVehicle} 
          setSelectedVehicle={setSelectedVehicle} 
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
