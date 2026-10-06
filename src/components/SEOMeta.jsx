import { Helmet } from 'react-helmet-async';
import { SITE_URL, localizePath } from '../utils/locale';

// 대표 도메인은 beyondthegate.kr 하나로 통일한다.
// servicebycura.com 은 beyondthegate.kr 로 리다이렉트만 하며 canonical/hreflang 에 쓰지 않는다.

const BUSINESS = {
  name: 'Beyond the Gate',
  alternateName: 'Cura Airport Service (CAS)',
  telephone: '+82-10-2853-3998',
  email: 'cura@beyondthegate.kr',
  logo: `${SITE_URL}/logo.png`,
};

// 페이지별 제목·설명 (홈은 관리자 화면의 SEO 문구를 사용)
const PAGE_META = {
  '/about': {
    ko: { title: '회사 소개', description: 'Beyond the Gate(큐라에어포트서비스)는 인천·김포공항 VIP 의전과 프리미엄 차량 서비스를 제공합니다. 운영 철학과 팀을 소개합니다.' },
    en: { title: 'About Us', description: 'Beyond the Gate (Cura Airport Service) provides VIP meet & assist and premium chauffeur services at Incheon and Gimpo airports in Korea.' },
  },
  '/book-vehicle': {
    ko: { title: '공항 차량 예약', description: '인천·김포공항 픽업 및 샌딩 차량 예약. 스타리아, 제네시스 G90, 벤츠 스프린터 중 선택하고 거리별 요금을 바로 확인하세요.' },
    en: { title: 'Airport Chauffeur Booking', description: 'Book a private airport transfer from Incheon or Gimpo airport. Choose Staria, Genesis G90 or Mercedes Sprinter and see your fare instantly.' },
  },
  '/private-journeys': {
    ko: { title: 'Private Journeys · 맞춤 한국 여행 사전 상담', description: '커플·가족·소규모 단체를 위한 럭셔리 맞춤 한국 여행. 공항 의전, 전담 가이드, 전용 차량, 레스토랑과 숙소까지 일정에 맞춰 설계합니다.' },
    en: { title: 'Private Journeys · Tailor-made Korea Trips', description: 'Luxury tailor-made trips to Korea for couples, families and small groups — airport VIP, private guides, chauffeurs, dining and stays arranged around you.' },
  },
  '/blog': {
    ko: { title: '공항 의전 가이드 블로그', description: '인천공항 이용 팁, VIP 의전 서비스 안내 등 공항 이동에 도움이 되는 정보를 전합니다.' },
    en: { title: 'Airport VIP Travel Guide', description: 'Tips for Incheon and Gimpo airports, VIP meet & assist explained, and guides for business travellers visiting Korea.' },
  },
  '/business': {
    ko: { title: '기업·제휴 제안', description: '기업 출장, 해외 바이어 의전, 여행사 제휴 등 Beyond the Gate와의 비즈니스 협력을 제안해 주세요.' },
    en: { title: 'Corporate & Partnership Inquiries', description: 'Corporate travel, delegation and buyer hosting, and travel agency partnerships with Beyond the Gate in Korea.' },
  },
  '/terms': {
    ko: { title: '이용약관', description: 'Beyond the Gate 서비스 이용약관.' },
    en: { title: 'Terms & Conditions', description: 'Terms and conditions for Beyond the Gate services.' },
  },
  '/privacy': {
    ko: { title: '개인정보처리방침', description: 'Beyond the Gate 개인정보처리방침.' },
    en: { title: 'Privacy Policy', description: 'Privacy policy of Beyond the Gate.' },
  },
};

const AIRPORTS = [
  { '@type': 'Airport', name: 'Incheon International Airport', iataCode: 'ICN' },
  { '@type': 'Airport', name: 'Gimpo International Airport', iataCode: 'GMP' },
];

// FAQ 답변의 [강조] 표기는 구조화 데이터에서는 제거한다
const plain = (text = '') => String(text).replace(/[[\]]/g, '');

export default function SEOMeta({ lang, path = '/', translations }) {
  const content = translations[lang] || translations.ko;
  const seo = content?.seo || translations.ko.seo;
  const page = PAGE_META[path]?.[lang];

  const title = page ? `${page.title} | ${BUSINESS.name}` : seo.title;
  const description = page?.description || seo.description;
  const url = `${SITE_URL}${localizePath(path, lang)}`;
  const koUrl = `${SITE_URL}${path}`;
  const enUrl = `${SITE_URL}${localizePath(path, 'en')}`;
  const image = `${SITE_URL}/og-image.jpg`;

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#organization`,
    name: BUSINESS.name,
    alternateName: BUSINESS.alternateName,
    url: SITE_URL,
    logo: BUSINESS.logo,
    image,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    description: translations.en?.seo?.description || seo.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Incheon',
      addressRegion: 'Incheon',
      addressCountry: 'KR',
    },
    areaServed: AIRPORTS,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: BUSINESS.telephone,
      email: BUSINESS.email,
      contactType: 'reservations',
      availableLanguage: ['Korean', 'English'],
    },
    priceRange: '$$$',
  };

  const schemas = [organization];

  if (path === '/') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Airport VIP Meet and Assist',
      name: lang === 'ko' ? '인천·김포공항 VIP 의전 서비스' : 'Incheon & Gimpo Airport VIP Meet and Assist',
      provider: { '@id': `${SITE_URL}/#organization` },
      areaServed: AIRPORTS,
      description,
      url,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: lang === 'ko' ? '공항 의전 서비스' : 'Airport services',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: lang === 'ko' ? '입국 의전' : 'Arrival Meet & Assist' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: lang === 'ko' ? '출국 의전' : 'Departure Meet & Assist' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: lang === 'ko' ? '환승 의전' : 'Transit Assistance' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: lang === 'ko' ? '공항 픽업·샌딩 차량' : 'Airport Chauffeur Transfer' } },
        ],
      },
    });

    const faqItems = content?.faq?.items || [];
    if (faqItems.length) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: lang,
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: plain(item.q),
          acceptedAnswer: { '@type': 'Answer', text: plain(item.a) },
        })),
      });
    }
  }

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      {seo.keywords && <meta name="keywords" content={seo.keywords} />}
      <link rel="canonical" href={url} />

      {/* 언어별 페이지 연결 — 해외 사용자는 영어 페이지를 기본으로 */}
      <link rel="alternate" hrefLang="ko" href={koUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={BUSINESS.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : 'en_US'} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(schemas)}</script>
    </Helmet>
  );
}
