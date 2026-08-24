import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEOMeta({ lang, translations }) {
  const seo = translations[lang]?.seo || translations['ko'].seo;
  const baseUrl = "https://beyondthegate.kr";

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Airport VIP Meet and Assist & Chauffeur Service",
    "provider": {
      "@id": `${baseUrl}/#organization`
    },
    "areaServed": {
      "@type": "Place",
      "name": "Incheon International Airport"
    },
    "description": seo.description,
    "url": baseUrl
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#organization`,
    "name": "Beyond the Gate",
    "alternateName": "Cura Airport Service (CAS)",
    "description": seo.description,
    "url": baseUrl,
    "telephone": "+82-2-1234-5678",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Incheon",
      "addressRegion": "Incheon",
      "addressCountry": "KR",
      "streetAddress": "Incheon International Airport"
    },
    "areaServed": "Incheon Airport, Seoul, Korea",
    "openingHours": "Mo,Tu,We,Th,Fr,Sa,Su 00:00-23:59"
  };

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      
      {/* Open Graph */}
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={`${baseUrl}/?lang=${lang}`} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      
      {/* Alternate Languages for SEO */}
      <link rel="alternate" hreflang="ko" href={`${baseUrl}/`} />
      <link rel="alternate" hreflang="en" href={`${baseUrl}/?lang=en`} />
      <link rel="alternate" hreflang="x-default" href={`${baseUrl}/`} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify([schemaData, localBusinessSchema])}
      </script>
    </Helmet>
  );
}
