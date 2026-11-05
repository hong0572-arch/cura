// 해외 고객용 국가별 안내 페이지 (/travel-from, /travel-from/:market) — 코드 관리, 한/영.
// 대상 시장(2026-11): 미국·인도·중동·독일·영국·싱가포르. 검색·AI 답변에 인용될 수 있도록
// 사실 위주로 쓴다. 패스트트랙·대기 시간은 CLAUDE.md 기준 문구를 지키고(보장 표현 금지),
// 입국 요건(비자·K-ETA)은 바뀌므로 공식 사이트로 안내만 한다.
// 시차는 한국(KST, UTC+9, 서머타임 없음) 기준.

export const MARKET_SLUGS = ['united-states', 'india', 'middle-east', 'germany', 'united-kingdom', 'singapore'];

// 푸터 등 짧은 링크용 이름
export const MARKET_LABELS = {
  en: { 'united-states': 'USA', india: 'India', 'middle-east': 'Middle East', germany: 'Germany', 'united-kingdom': 'UK', singapore: 'Singapore' },
  ko: { 'united-states': '미국', india: '인도', 'middle-east': '중동', germany: '독일', 'united-kingdom': '영국', singapore: '싱가포르' },
};

// 구조화 데이터(audience)에 쓰는 국가 — 영어 이름, ISO 코드
export const MARKET_COUNTRIES = {
  'united-states': [['United States', 'US']],
  india: [['India', 'IN']],
  'middle-east': [['United Arab Emirates', 'AE'], ['Saudi Arabia', 'SA'], ['Qatar', 'QA'], ['Kuwait', 'KW'], ['Bahrain', 'BH'], ['Oman', 'OM']],
  germany: [['Germany', 'DE']],
  'united-kingdom': [['United Kingdom', 'GB']],
  singapore: [['Singapore', 'SG']],
};

export const marketsCopy = {
  en: {
    ui: {
      breadcrumbHome: 'Home',
      hubCrumb: 'Travelling from abroad',
      book: 'Book airport VIP',
      groups: 'Delegations & corporate groups',
      whatsapp: 'Ask on WhatsApp',
      factsTitle: 'At a glance',
      fromPrice: 'Arrival VIP from',
      priceNote: (price) => `US$${price} · up to 3 guests`,
      airportsLabel: 'Airports',
      airportsValue: 'Incheon ICN (T1 & T2) · Gimpo GMP',
      languagesLabel: 'Service languages',
      languagesValue: 'English · Korean',
      highlightsTitle: 'How we look after you',
      tipsTitle: 'Before you fly',
      faqTitle: 'Questions we are often asked',
      otherMarkets: 'Travelling from somewhere else?',
      closingTitle: 'Arrive in Korea the easy way.',
      closingText: 'Book online in a few minutes with your flight number, or tell us about a delegation or group and we will send a proposal.',
      notFound: 'We could not find that page.',
      readMore: 'Read the guide',
    },
    hub: {
      title: 'Incheon Airport VIP Service for International Travellers',
      description: 'VIP meet & assist and private chauffeurs at Incheon and Gimpo airports for travellers from the US, India, the Middle East, Germany, the UK and Singapore. Prices in USD, English-speaking escorts.',
      eyebrow: 'Travelling from abroad',
      h1: 'Your arrival in Korea, handled from the aircraft door.',
      intro: 'Beyond the Gate is a Korean airport VIP service based at Incheon International Airport. An English-speaking escort meets you at the gate, takes you through immigration, baggage claim and customs, and hands you to your private chauffeur. These guides explain what to expect when you fly in from your part of the world.',
      marketsTitle: 'Guides by departure country',
    },
    commonFaq: [
      {
        q: 'Is there a Fast Track at Incheon Airport?',
        a: 'Incheon Airport does not sell an official Fast Track. Priority immigration lanes are only for eligible travellers — for example diplomats, APEC Business Travel Card holders, seniors, children aged 7 and under and travellers with reduced mobility — and eligibility is decided by the immigration authorities. For everyone else, your escort takes you by the shortest route and we aim to get you through within 20 minutes of joining the queue. This is a target, not a guarantee.',
      },
      {
        q: 'What does VIP meet & assist include?',
        a: 'On arrival, an escort meets you by name at the aircraft gate, guides you through immigration, baggage claim and customs, and walks you to your car. On departure, the escort meets you at the kerb and takes you through check-in, security and emigration to the lounge or gate. The base price covers up to 3 guests; larger parties are assigned one escort per 3 guests, and a porter is added when luggage exceeds 4 bags per escort.',
      },
      {
        q: 'How do I pay, and in which currency?',
        a: 'Prices are shown in US dollars. International guests usually pay with PayPal (a 4% PayPal processing fee applies). Payment in Korean won by card through NICEPAY is also available, with no card surcharge.',
      },
      {
        q: 'How far ahead can I book?',
        a: 'Online booking is open for service dates from today up to 60 days ahead (Korea time). For anything more urgent or unusual, message us on WhatsApp and we will tell you what is possible.',
      },
      {
        q: 'Which airports do you cover?',
        a: 'Incheon International Airport (ICN), both Terminal 1 and Terminal 2, and Gimpo International Airport (GMP) in Seoul. Private chauffeur transfers run between the airports and anywhere in Seoul and the surrounding area.',
      },
    ],
    markets: {
      'united-states': {
        name: 'United States',
        title: 'Incheon Airport VIP Meet & Assist for Travellers from the US',
        description: 'Flying to Seoul from the United States? Get met at the aircraft gate at Incheon, escorted through immigration and customs, and driven to your hotel. Prices in USD, English-speaking escorts.',
        eyebrow: 'From the United States',
        h1: 'After a long flight from the US, walk straight into Korea.',
        intro: 'Nonstop flights from the United States to Incheon take 13 hours or more. Our escort meets you at the aircraft door, keeps you on the shortest route through the terminal and hands you to a private chauffeur, so the first hour in Korea is the easiest part of the trip.',
        timeDiff: 'Korea is 13–14 hours ahead of New York and 16–17 hours ahead of Los Angeles (Korea does not use daylight saving).',
        highlights: [
          { title: 'Met at the gate', text: 'Your escort holds a name sign at the aircraft bridge and stays with you until you are in the car.' },
          { title: 'Business arrivals', text: 'For executives visiting Korean partners, we coordinate the airport and the car so you can go straight to a meeting or hotel.' },
          { title: 'Families and seniors', text: 'Wheelchair assistance and extra hands for strollers and luggage; larger families get one escort per three guests.' },
          { title: 'Priced in US dollars', text: 'See the full price before you pay and settle online with PayPal.' },
        ],
        tips: [
          'Check whether you need a K-ETA or a visa on the official Korean government sites (k-eta.go.kr) before you fly — requirements change.',
          'Book with your flight number so we can follow your flight and adjust if it is early or late.',
          'If you land in the evening, add a chauffeur so you go straight to your hotel without queuing for a taxi.',
        ],
        faq: [
          { q: 'Do you track my flight from the US if it is delayed?', a: 'Yes. We follow your flight using the flight number in your booking and adjust the meeting time to the actual arrival.' },
          { q: 'Can you also take me from Incheon to Seoul?', a: 'Yes. Add a private chauffeur (Genesis G90 sedan, Hyundai Staria minivan or Mercedes Sprinter) when you book, or book a transfer on its own.' },
        ],
      },
      india: {
        name: 'India',
        title: 'Incheon Airport VIP Service for Travellers from India',
        description: 'VIP meet & assist at Incheon Airport for families and business travellers from India — escort from the gate, help with large luggage, wheelchair assistance and private chauffeurs. Prices in USD.',
        eyebrow: 'From India',
        h1: 'For families and business travellers flying in from India.',
        intro: 'Many guests from India travel as families or with colleagues, often with plenty of luggage. We size the team to your group — escorts for the people, porters for the bags — so everyone moves through Incheon together and reaches the car without a scramble.',
        timeDiff: 'Korea is 3½ hours ahead of India (IST).',
        highlights: [
          { title: 'Built for larger groups', text: 'One escort for every three guests, each escort handling up to four bags, with porters added for extra luggage.' },
          { title: 'Care for elders', text: 'Wheelchair assistance can be arranged, and your escort stays beside parents and grandparents through every step.' },
          { title: 'Business delegations', text: 'Visiting Korean manufacturers, IT or energy partners? We meet the whole delegation and coordinate the vehicles.' },
          { title: 'Food on the way', text: 'Your escort can point you to vegetarian-friendly options in the terminal before you leave the airport.' },
        ],
        tips: [
          'Check visa or K-ETA requirements for your passport on the official Korean government sites before you fly.',
          'Tell us how many bags you are bringing — it decides how many porters we send.',
          'If someone needs a wheelchair, request it from your airline too; we confirm it with you when you book.',
        ],
        faq: [
          { q: 'We are a family of six with ten suitcases. How is that priced?', a: 'The base price covers three guests and a per-person fee applies from the fourth. Six guests are looked after by two escorts, who handle eight bags between them; the remaining two bags need one porter.' },
          { q: 'Can elderly parents get help through the airport?', a: 'Yes. Choose wheelchair assistance when you book and your escort will stay with them throughout. Priority immigration for seniors depends on eligibility, which the immigration authorities decide.' },
        ],
      },
      'middle-east': {
        name: 'the Middle East',
        title: 'Incheon Airport VIP Service for Travellers from the UAE, Saudi Arabia & Qatar',
        description: 'Discreet VIP meet & assist at Incheon Airport for families, executives and official delegations from the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain and Oman. Large-party escorts, chauffeurs and protocol coordination.',
        eyebrow: 'From the Gulf & Middle East',
        h1: 'Discreet arrivals for families, executives and delegations from the Gulf.',
        intro: 'Guests from the Gulf often travel with family, staff and a lot of luggage, and value privacy as much as speed. We plan the escort team, porters and vehicles around your party before you land, and keep the route through Incheon calm and direct.',
        timeDiff: 'Korea is 5 hours ahead of the UAE and Oman, and 6 hours ahead of Saudi Arabia, Qatar, Kuwait and Bahrain.',
        highlights: [
          { title: 'Large parties, one plan', text: 'One escort per three guests, porters for extra luggage, and Mercedes Sprinter vans when the entourage needs them.' },
          { title: 'Privacy first', text: 'Your details stay with the team on duty, and the route avoids lingering in busy public areas.' },
          { title: 'Official delegations', text: 'For government or high-profile guests, we can request cooperation from the airport authorities and relevant agencies on your behalf. Approval rests with those authorities.' },
          { title: 'Prayer and dining', text: 'Incheon Airport has prayer rooms; your escort can take you there and show you dining options that suit your needs.' },
        ],
        tips: [
          'Check visa or K-ETA requirements for each passport in your party on the official Korean government sites.',
          'Send us the number of guests and bags early so we can plan escorts, porters and vehicles.',
          'For official visits, contact us well before the travel date so there is time to request protocol cooperation.',
        ],
        faq: [
          { q: 'Is there a prayer room at Incheon Airport?', a: 'Yes. Incheon Airport provides prayer rooms in its terminals, and your escort can take you there before or after formalities.' },
          { q: 'Can you handle a royal or government delegation?', a: 'We can coordinate the airport arrival and vehicles and request cooperation from the airport authorities and relevant ministries on your behalf. What can be granted is decided by those authorities, so please contact us early.' },
        ],
        native: {
          lang: 'ar',
          dir: 'rtl',
          heading: 'بالعربية',
          text: 'نستقبلكم عند باب الطائرة في مطار إنتشون الدولي، ونرافقكم خلال إجراءات الجوازات واستلام الأمتعة والجمارك حتى سيارتكم الخاصة. نخطط مسبقاً لعدد المرافقين والحمّالين والسيارات بحسب حجم العائلة أو الوفد، مع الحرص على الخصوصية. تتوفر في المطار غرف للصلاة. الأسعار بالدولار الأمريكي، ويتحدث فريقنا الإنجليزية والكورية.',
        },
      },
      germany: {
        name: 'Germany',
        title: 'Incheon Airport VIP Meet & Assist for Travellers from Germany',
        description: 'Punctual VIP meet & assist at Incheon Airport for business travellers and families from Germany — escort from the gate, private chauffeur to Seoul, prices in USD. Kurzinfo auf Deutsch.',
        eyebrow: 'From Germany',
        h1: 'Precise, punctual arrivals for travellers from Germany.',
        intro: 'Whether you are visiting Korean industrial partners or starting a holiday, the plan is simple: an escort at the aircraft door, the shortest route through immigration and customs, and a chauffeur waiting at the kerb at the time we agreed.',
        timeDiff: 'Korea is 8 hours ahead of Germany, 7 hours during German summer time.',
        highlights: [
          { title: 'On time, every step', text: 'We follow your flight and set the meeting time to the actual arrival, so neither you nor the driver waits.' },
          { title: 'Business travel', text: 'Ideal for engineers, executives and trade delegations heading straight to meetings in Seoul or industrial sites.' },
          { title: 'Clear prices', text: 'The full price is shown before you pay — no surprises at the airport.' },
          { title: 'Transit help', text: 'Connecting onward in Asia? We can escort you between flights at Incheon.' },
        ],
        tips: [
          'Check K-ETA or visa requirements on the official Korean government sites before you travel.',
          'Book with your flight number so we can follow your flight.',
          'For a delegation, send the guest list in advance through our corporate enquiry form.',
        ],
        faq: [
          { q: 'Do your escorts speak German?', a: 'Our escorts work in English and Korean. Booking pages, confirmations and support are in English.' },
          { q: 'Can my company be invoiced for a delegation?', a: 'Please send a corporate enquiry with the group details and we will reply with a proposal and the payment options available.' },
        ],
        native: {
          lang: 'de',
          dir: 'ltr',
          heading: 'Kurz auf Deutsch',
          text: 'Beyond the Gate ist ein VIP-Service am Flughafen Incheon (Seoul). Wir empfangen Sie direkt am Flugzeug, begleiten Sie durch Passkontrolle, Gepäckausgabe und Zoll und bringen Sie zu Ihrem privaten Fahrer. Ideal für Geschäftsreisende und Delegationen. Preise in US-Dollar; unser Team spricht Englisch und Koreanisch.',
        },
      },
      'united-kingdom': {
        name: 'the United Kingdom',
        title: 'Incheon Airport VIP Meet & Assist for Travellers from the UK',
        description: 'VIP meet & assist at Incheon and Gimpo airports for travellers from the UK — met at the gate, escorted through immigration, private chauffeur to Seoul. Transit help for onward flights. Prices in USD.',
        eyebrow: 'From the United Kingdom',
        h1: 'From London to Seoul, with someone waiting at the door.',
        intro: 'After an overnight flight from the UK, we keep things simple: an escort at the aircraft bridge, a calm route through immigration and baggage claim, and a private car to your hotel or first meeting.',
        timeDiff: 'Korea is 9 hours ahead of the UK, 8 hours during British Summer Time.',
        highlights: [
          { title: 'Met at the aircraft', text: 'Your escort meets you with a name sign as you step off and stays with you to the car.' },
          { title: 'Finance and business', text: 'For executives on tight schedules, we line up the escort and chauffeur so you go straight to the meeting.' },
          { title: 'Onward connections', text: 'Flying on to Japan, China or elsewhere in Asia? We can escort you through your transfer at Incheon.' },
          { title: 'Families', text: 'Extra hands for children, strollers and luggage, with wheelchair assistance on request.' },
        ],
        tips: [
          'Check K-ETA or visa requirements on the official Korean government sites before you fly.',
          'Prices are in US dollars; PayPal works with UK cards and accounts.',
          'Add a chauffeur when you book so the car is waiting when you clear customs.',
        ],
        faq: [
          { q: 'Can you help with a connection at Incheon?', a: 'Yes. Our transit service meets you at the arriving gate and takes you to your connecting flight, including any transfer security check.' },
          { q: 'Do you cover Gimpo Airport too?', a: 'Yes. Gimpo (GMP) mainly serves domestic flights and some short-haul routes; we provide the same escort and chauffeur service there.' },
        ],
      },
      singapore: {
        name: 'Singapore',
        title: 'Incheon Airport VIP Service for Travellers from Singapore',
        description: 'VIP meet & assist at Incheon Airport for travellers from Singapore — ideal for early-morning arrivals on overnight flights and short business trips. Escort, chauffeur, prices in USD.',
        eyebrow: 'From Singapore',
        h1: 'Short trip, early landing — make the airport the quick part.',
        intro: 'Many overnight flights from Singapore land at Incheon early in the morning, and business trips to Seoul are often just a few days long. We meet you at the gate, keep you moving through formalities and have a car ready, so you reach your hotel or first meeting fresh.',
        timeDiff: 'Korea is 1 hour ahead of Singapore.',
        highlights: [
          { title: 'Early-morning arrivals', text: 'Your escort is at the gate whatever time you land, and the chauffeur is timed to your actual arrival.' },
          { title: 'Short business trips', text: 'Book arrival and departure together so both ends of a tight trip are taken care of.' },
          { title: 'Families on holiday', text: 'Help with children, strollers and luggage from the aircraft to the car.' },
          { title: 'Domestic connections', text: 'Heading on to Jeju or Busan? We can take you between Incheon and Gimpo with a private chauffeur.' },
        ],
        tips: [
          'Check K-ETA or visa requirements for your passport on the official Korean government sites.',
          'Book with your flight number; we follow early or late arrivals.',
          'For a departure, we meet you at the kerb and take you through check-in, security and emigration.',
        ],
        faq: [
          { q: 'My flight lands around 6 am. Will someone be there?', a: 'Yes. Our service runs around the clock; your escort meets you at the gate at your actual arrival time.' },
          { q: 'Can I book both arrival and departure?', a: 'Yes. Book each service with its date and flight number; many guests on short trips book both together.' },
        ],
      },
    },
  },

  ko: {
    ui: {
      breadcrumbHome: '홈',
      hubCrumb: '해외 손님 안내',
      book: '공항 의전 예약',
      groups: '대표단·기업 단체 문의',
      whatsapp: 'WhatsApp 문의',
      factsTitle: '한눈에 보기',
      fromPrice: '입국 의전',
      priceNote: (price) => `US$${price}부터 · 3명까지`,
      airportsLabel: '공항',
      airportsValue: '인천 ICN(T1·T2) · 김포 GMP',
      languagesLabel: '안내 언어',
      languagesValue: '영어 · 한국어',
      highlightsTitle: '이렇게 모십니다',
      tipsTitle: '출발 전 확인',
      faqTitle: '자주 묻는 질문',
      otherMarkets: '다른 나라에서 오시나요?',
      closingTitle: '해외 손님의 첫 한 시간을 맡겨 주세요.',
      closingText: '항공편 번호만 있으면 몇 분 안에 온라인으로 예약할 수 있습니다. 대표단·단체는 문의를 남기시면 제안서를 보내 드립니다.',
      notFound: '페이지를 찾을 수 없습니다.',
      readMore: '안내 보기',
    },
    hub: {
      title: '해외 손님 인천공항 의전 안내',
      description: '미국·인도·중동·독일·영국·싱가포르에서 오는 손님을 위한 인천·김포공항 VIP 의전과 전용 차량. 영어 응대, 달러 결제, 단체·대표단 의전.',
      eyebrow: '해외 손님 안내',
      h1: '해외에서 오는 손님, 비행기 문 앞에서부터 모십니다.',
      intro: 'Beyond the Gate는 인천국제공항을 기반으로 한 공항 VIP 의전 서비스입니다. 영어로 응대하는 담당자가 게이트에서 손님을 맞아 입국심사·수하물·세관을 함께 지나 전용 차량까지 안내합니다. 해외 바이어·가족·대표단을 초청하실 때 출발 국가별로 알아 두면 좋은 내용을 정리했습니다.',
      marketsTitle: '출발 국가별 안내',
    },
    commonFaq: [
      {
        q: '인천공항에 패스트트랙이 있나요?',
        a: '인천공항에는 공식 Fast Track 상품이 없습니다. 우대 출입국 심사는 외교관, APEC 카드 소지자, 고령자, 7세 이하 어린이, 거동이 불편한 분 등 대상자만 이용할 수 있고, 대상 여부는 출입국 당국이 결정합니다. 그 외 손님은 담당자가 최단 동선으로 안내하며 대기줄 진입 후 20분 이내 통과를 목표로 합니다(보장 사항은 아닙니다).',
      },
      {
        q: 'VIP 의전에는 무엇이 포함되나요?',
        a: '입국 시 담당자가 항공기 게이트에서 이름표를 들고 맞이해 입국심사·수하물 수취·세관을 거쳐 차량까지 안내합니다. 출국 시에는 도착 지점에서 맞이해 체크인·보안검색·출국심사를 거쳐 라운지나 탑승구까지 모십니다. 기본 요금에 3명까지 포함되며, 손님 3명마다 담당자 1명, 담당자 1명당 수하물 4개를 넘으면 포터가 추가됩니다.',
      },
      {
        q: '결제는 어떻게 하나요?',
        a: '요금은 미국 달러로 표시됩니다. 해외 손님은 보통 PayPal로 결제하며(PayPal 수수료 4%), 국내 카드는 NICEPAY로 원화 결제할 수 있고 카드 수수료는 받지 않습니다.',
      },
      {
        q: '얼마나 미리 예약할 수 있나요?',
        a: '온라인 예약은 서울 기준 오늘부터 60일 이내 이용일까지 가능합니다. 급한 일정이나 특별한 요청은 WhatsApp으로 문의해 주세요.',
      },
      {
        q: '어느 공항에서 이용할 수 있나요?',
        a: '인천국제공항(ICN) 제1·제2터미널과 김포국제공항(GMP)입니다. 전용 차량은 공항과 서울·수도권 각지를 오갑니다.',
      },
    ],
    markets: {
      'united-states': {
        name: '미국',
        title: '미국에서 오는 손님 인천공항 의전',
        description: '미국에서 출장·여행으로 오는 손님을 인천공항 게이트에서 맞이해 입국심사·세관을 거쳐 호텔까지 모십니다. 영어 응대, 달러 결제.',
        eyebrow: '미국에서 오는 손님',
        h1: '13시간 넘는 비행 끝, 도착 후 한 시간은 편하게.',
        intro: '미국에서 인천까지 직항은 13시간 이상 걸립니다. 담당자가 항공기 문 앞에서 손님을 맞아 최단 동선으로 터미널을 지나 전용 차량에 모십니다.',
        timeDiff: '한국은 뉴욕보다 13~14시간, 로스앤젤레스보다 16~17시간 빠릅니다(한국은 서머타임 없음).',
        highlights: [
          { title: '게이트에서 영접', text: '탑승교 앞에서 이름표를 들고 맞이하고, 차량에 오를 때까지 함께합니다.' },
          { title: '비즈니스 방문', text: '국내 협력사를 찾는 임원은 공항에서 바로 회의 장소나 호텔로 이동할 수 있게 차량까지 맞춥니다.' },
          { title: '가족·고령 손님', text: '휠체어 지원과 유모차·수하물 도움, 손님 3명마다 담당자 1명을 배정합니다.' },
          { title: '달러 요금', text: '결제 전 전체 요금을 확인하고 PayPal로 결제합니다.' },
        ],
        tips: [
          '입국 요건(K-ETA·비자)은 바뀔 수 있으니 공식 사이트(k-eta.go.kr)에서 확인하도록 안내해 주세요.',
          '항공편 번호로 예약하면 지연·조기 도착에 맞춰 시간을 조정합니다.',
          '저녁 도착이라면 전용 차량을 함께 예약해 택시 대기 없이 호텔로 이동하세요.',
        ],
        faq: [
          { q: '미국발 항공편이 지연되면 어떻게 되나요?', a: '예약하신 항공편 번호로 운항 상황을 확인해 실제 도착 시간에 맞춰 영접합니다.' },
          { q: '인천공항에서 서울까지 차량도 되나요?', a: '네. 예약 시 전용 차량(제네시스 G90, 스타리아, 벤츠 스프린터)을 추가하거나 차량만 따로 예약할 수 있습니다.' },
        ],
      },
      india: {
        name: '인도',
        title: '인도에서 오는 손님 인천공항 의전',
        description: '인도에서 오는 가족·비즈니스 손님을 위한 인천공항 VIP 의전 — 게이트 영접, 많은 수하물 포터, 휠체어 지원, 전용 차량. 달러 결제.',
        eyebrow: '인도에서 오는 손님',
        h1: '가족 단위·대표단으로 오는 인도 손님을 위해.',
        intro: '인도 손님은 가족이나 동료와 함께, 수하물을 넉넉히 들고 오는 경우가 많습니다. 인원에 맞춰 담당자를, 수하물에 맞춰 포터를 배정해 일행 모두가 함께 차량까지 이동합니다.',
        timeDiff: '한국은 인도(IST)보다 3시간 30분 빠릅니다.',
        highlights: [
          { title: '단체에 맞춘 인원', text: '손님 3명마다 담당자 1명, 담당자 1명당 수하물 4개, 넘는 수하물은 포터를 추가합니다.' },
          { title: '어르신 동행', text: '휠체어 지원을 준비하고 모든 단계에서 담당자가 곁을 지킵니다.' },
          { title: '비즈니스 대표단', text: '제조·IT·에너지 협력사를 방문하는 대표단 전원을 맞이하고 차량을 조율합니다.' },
          { title: '식사 안내', text: '공항을 나서기 전 채식 가능한 식당을 안내해 드릴 수 있습니다.' },
        ],
        tips: [
          '여권별 비자·K-ETA 요건을 공식 사이트에서 확인하도록 안내해 주세요.',
          '수하물 개수를 알려 주시면 그에 맞춰 포터 인원을 정합니다.',
          '휠체어가 필요하면 항공사에도 함께 요청하세요. 예약 때 다시 확인합니다.',
        ],
        faq: [
          { q: '6명 가족에 캐리어 10개면 요금이 어떻게 되나요?', a: '기본 요금에 3명까지 포함되고 4번째 손님부터 1인 추가 요금이 붙습니다. 6명이면 담당자 2명이 수하물 8개를 맡고, 남는 2개에 포터 1명이 추가됩니다.' },
          { q: '부모님이 고령이신데 도움을 받을 수 있나요?', a: '네. 예약 때 휠체어 지원을 선택하면 담당자가 내내 함께합니다. 고령자 우대 심사 대상 여부는 출입국 당국이 결정합니다.' },
        ],
      },
      'middle-east': {
        name: '중동',
        title: '중동(UAE·사우디·카타르) 손님 인천공항 의전',
        description: 'UAE·사우디아라비아·카타르·쿠웨이트·바레인·오만에서 오는 가족·임원·정부 대표단을 위한 인천공항 의전 — 대규모 일행, 전용 차량, 의전 협조 요청 대행.',
        eyebrow: '중동에서 오는 손님',
        h1: '중동 가족·임원·대표단의 조용하고 빈틈없는 도착.',
        intro: '걸프 지역 손님은 가족·수행원과 함께 많은 짐을 들고 오는 경우가 많고, 속도만큼 사생활 보호를 중요하게 여깁니다. 도착 전에 담당자·포터·차량을 일행 규모에 맞춰 준비합니다.',
        timeDiff: '한국은 UAE·오만보다 5시간, 사우디아라비아·카타르·쿠웨이트·바레인보다 6시간 빠릅니다.',
        highlights: [
          { title: '대규모 일행', text: '손님 3명마다 담당자 1명, 넘는 수하물은 포터, 수행원이 많으면 벤츠 스프린터를 배치합니다.' },
          { title: '사생활 보호', text: '손님 정보는 담당 팀만 공유하고, 붐비는 공용 공간에 머무르지 않는 동선을 짭니다.' },
          { title: '정부·왕실 대표단', text: '공항 당국과 관계 기관에 의전 협조 요청을 대행합니다. 승인 여부는 해당 기관이 결정합니다.' },
          { title: '기도실·식사', text: '인천공항에는 기도실이 있으며, 담당자가 기도실과 알맞은 식당을 안내합니다.' },
        ],
        tips: [
          '일행 각자의 여권별 비자·K-ETA 요건을 공식 사이트에서 확인하도록 안내해 주세요.',
          '인원과 수하물 수를 미리 알려 주시면 담당자·포터·차량을 계획합니다.',
          '공식 방문은 협조 요청에 시간이 필요하니 일찍 문의해 주세요.',
        ],
        faq: [
          { q: '인천공항에 기도실이 있나요?', a: '네. 인천공항 터미널에 기도실이 있으며, 수속 전후로 담당자가 안내합니다.' },
          { q: '왕실·정부 대표단 의전도 가능한가요?', a: '공항 도착과 차량을 조율하고, 공항 당국·관계 부처에 협조 요청을 대행합니다. 승인 범위는 해당 기관이 결정하므로 일찍 문의해 주세요.' },
        ],
      },
      germany: {
        name: '독일',
        title: '독일에서 오는 손님 인천공항 의전',
        description: '독일에서 오는 출장자·대표단·가족을 위한 인천공항 VIP 의전 — 정확한 시간, 게이트 영접, 서울행 전용 차량. 달러 결제.',
        eyebrow: '독일에서 오는 손님',
        h1: '정확한 시간을 중시하는 독일 손님을 위해.',
        intro: '산업 협력사 방문이든 휴가든 계획은 단순합니다. 항공기 문 앞에서 맞이하고, 최단 동선으로 입국심사·세관을 지나, 약속한 시간에 차량이 기다립니다.',
        timeDiff: '한국은 독일보다 8시간(독일 서머타임 기간에는 7시간) 빠릅니다.',
        highlights: [
          { title: '시간 정확성', text: '운항 상황에 맞춰 영접 시간을 정해 손님도 기사도 기다리지 않습니다.' },
          { title: '출장·대표단', text: '엔지니어·임원·무역 대표단이 곧바로 서울이나 산업 현장으로 이동할 수 있습니다.' },
          { title: '투명한 요금', text: '결제 전에 전체 요금을 보여 드립니다.' },
          { title: '환승 지원', text: '아시아 다른 도시로 갈아타는 경우 인천공항 환승을 함께합니다.' },
        ],
        tips: [
          'K-ETA·비자 요건을 공식 사이트에서 확인하도록 안내해 주세요.',
          '항공편 번호로 예약해 주세요.',
          '대표단은 기업 문의 양식으로 명단을 미리 보내 주세요.',
        ],
        faq: [
          { q: '독일어로 안내받을 수 있나요?', a: '담당자는 영어와 한국어로 안내합니다. 예약 화면·확인 메일·상담도 영어로 제공합니다.' },
          { q: '회사 앞으로 대표단 비용을 청구할 수 있나요?', a: '기업 문의로 단체 정보를 보내 주시면 제안서와 가능한 결제 방법을 안내해 드립니다.' },
        ],
        native: {
          lang: 'de',
          dir: 'ltr',
          heading: 'Kurz auf Deutsch',
          text: 'Beyond the Gate ist ein VIP-Service am Flughafen Incheon (Seoul). Wir empfangen Sie direkt am Flugzeug, begleiten Sie durch Passkontrolle, Gepäckausgabe und Zoll und bringen Sie zu Ihrem privaten Fahrer. Ideal für Geschäftsreisende und Delegationen. Preise in US-Dollar; unser Team spricht Englisch und Koreanisch.',
        },
      },
      'united-kingdom': {
        name: '영국',
        title: '영국에서 오는 손님 인천공항 의전',
        description: '영국에서 오는 손님을 위한 인천·김포공항 VIP 의전 — 게이트 영접, 입국심사 동행, 서울행 전용 차량, 환승 지원. 달러 결제.',
        eyebrow: '영국에서 오는 손님',
        h1: '런던에서 서울까지, 문 앞에서 기다리는 사람이 있습니다.',
        intro: '영국에서 밤새 날아온 손님을 탑승교에서 맞이해 입국심사와 수하물 수취를 차분히 마치고, 전용 차량으로 호텔이나 첫 미팅 장소까지 모십니다.',
        timeDiff: '한국은 영국보다 9시간(영국 서머타임 기간에는 8시간) 빠릅니다.',
        highlights: [
          { title: '항공기 앞 영접', text: '내리는 순간 이름표로 맞이하고 차량까지 함께합니다.' },
          { title: '금융·비즈니스', text: '일정이 빠듯한 임원이 곧바로 회의에 갈 수 있도록 담당자와 차량을 맞춥니다.' },
          { title: '환승', text: '일본·중국 등 아시아로 갈아타는 경우 인천공항 환승을 안내합니다.' },
          { title: '가족', text: '아이·유모차·수하물을 돕고, 요청 시 휠체어를 지원합니다.' },
        ],
        tips: [
          'K-ETA·비자 요건을 공식 사이트에서 확인하도록 안내해 주세요.',
          '요금은 달러이며 영국 카드·계정으로 PayPal 결제가 가능합니다.',
          '전용 차량을 함께 예약하면 세관을 나오는 시간에 맞춰 차량이 대기합니다.',
        ],
        faq: [
          { q: '인천공항 환승도 도와주나요?', a: '네. 환승 의전은 도착 게이트에서 맞이해 환승 보안검색을 거쳐 다음 항공편까지 안내합니다.' },
          { q: '김포공항도 되나요?', a: '네. 김포공항(GMP)은 주로 국내선과 일부 단거리 국제선이 오가며, 같은 의전·차량 서비스를 제공합니다.' },
        ],
      },
      singapore: {
        name: '싱가포르',
        title: '싱가포르에서 오는 손님 인천공항 의전',
        description: '싱가포르발 야간 비행으로 이른 아침 도착하는 손님, 짧은 출장 손님을 위한 인천공항 VIP 의전과 전용 차량. 달러 결제.',
        eyebrow: '싱가포르에서 오는 손님',
        h1: '이른 아침 도착, 짧은 출장 — 공항은 빠르게.',
        intro: '싱가포르발 야간 항공편은 이른 아침 인천에 도착하는 경우가 많고, 서울 출장은 며칠로 짧은 경우가 많습니다. 게이트에서 맞이해 수속을 마치고 차량까지 바로 모십니다.',
        timeDiff: '한국은 싱가포르보다 1시간 빠릅니다.',
        highlights: [
          { title: '이른 아침 도착', text: '몇 시에 도착하든 게이트에서 맞이하고, 차량은 실제 도착 시간에 맞춥니다.' },
          { title: '짧은 출장', text: '입국·출국 의전을 함께 예약해 일정 양쪽을 모두 챙깁니다.' },
          { title: '가족 여행', text: '항공기에서 차량까지 아이·유모차·수하물을 돕습니다.' },
          { title: '국내선 연결', text: '제주·부산으로 이어 가는 경우 인천↔김포 전용 차량으로 이동합니다.' },
        ],
        tips: [
          '여권별 K-ETA·비자 요건을 공식 사이트에서 확인하도록 안내해 주세요.',
          '항공편 번호로 예약하면 이른·늦은 도착에 맞춥니다.',
          '출국 때는 도착 지점에서 맞이해 체크인·보안검색·출국심사를 함께합니다.',
        ],
        faq: [
          { q: '오전 6시쯤 도착해도 영접이 되나요?', a: '네. 24시간 운영하며 실제 도착 시간에 맞춰 게이트에서 맞이합니다.' },
          { q: '입국·출국을 함께 예약할 수 있나요?', a: '네. 서비스별로 날짜와 항공편 번호를 넣어 예약하며, 짧은 일정의 손님은 대부분 함께 예약합니다.' },
        ],
      },
    },
  },
};

export const marketCopy = (lang) => marketsCopy[lang] || marketsCopy.ko;

// 입국 의전 기본 요금(USD) — 관리자 설정(인천공항) → 예전 설정 순서로 찾는다
export function arrivalFromUsd(settings) {
  const icn = settings?.airports?.find?.(a => a.code === 'ICN');
  const usd = Number(icn?.services?.arrival?.usd ?? settings?.servicePrices?.arrival?.usd);
  return usd > 0 ? usd : null;
}
