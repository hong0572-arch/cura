// 홈 화면의 새 섹션 문구 (한/영).
// 관리자 화면에서 편집하는 문구(Firestore siteData)와 별개로 코드에서 관리한다.
export const homeCopy = {
  ko: {
    board: {
      live: 'LIVE',
      caption: '서비스 · 오늘의 도착편 · 여행 (예시 데이터)',
      sets: [
        { title: 'SERVICES', rows: [['MEET & ASSIST', 'BOOK'], ['CHAUFFEUR', 'BOOK'], ['PRIVATE TOUR', 'SOON'], ['SMALL GROUPS', 'REQUEST'], ['CORPORATE', 'REQUEST']] },
        { title: 'TODAY · ARRIVALS', rows: [['KE012 LAX', 'AT GATE'], ['OZ221 JFK', 'LANDED'], ['SQ600 SIN', 'ON TIME'], ['LH712 FRA', 'ON TIME'], ['AF264 CDG', 'DELAYED']] },
        { title: 'JOURNEYS', rows: [['SEOUL PALACES', 'PRIVATE'], ['JEJU ESCAPE', 'FAMILY'], ['BUSAN COAST', 'FRIENDS'], ['FINE DINING', 'SEOUL'], ['BUYER MEETING', 'CORPORATE']] },
      ],
    },
    ways: {
      eyebrow: '세 가지 방법',
      title: '둘이서, 가족과, 혹은 팀과 함께.',
      items: [
        {
          id: 'journeys',
          tag: '사전 상담',
          title: 'Private Journeys',
          desc: '커플·가족·친구를 위한 맞춤 여행. 전담 가이드, 차량, 레스토랑, 숙소까지 일정에 맞춰 준비합니다. 정식 오픈 전, 사전 상담을 받고 있습니다.',
          cta: '사전 상담 신청',
          href: '/private-journeys',
          image: '/luggage_assistance.webp',
          alt: '여행객의 짐을 돕는 컨시어지',
        },
        {
          id: 'airport',
          tag: '온라인 바로 예약',
          title: '공항 의전 & 차량',
          desc: '인천·김포공항 VIP 의전, 제네시스 G90·스타리아·벤츠 스프린터 전문 기사 차량.',
          cta: '예약하기 · USD 250부터',
          href: '/#hero',
          image: '/vip_arrival_escort.webp',
          alt: '게이트에서 고객을 맞이하는 에이전트',
        },
        {
          id: 'groups',
          tag: '맞춤 제안',
          title: '단체 & 기업',
          desc: '소규모 단체 여행과 기념 여행, 기업 대표단·바이어 의전, 인센티브와 행사까지 처음부터 끝까지 운영합니다.',
          cta: '제안 요청',
          href: '/business',
          image: '/luxury_fleet.webp',
          alt: '단체 이동을 위해 준비된 프리미엄 차량',
        },
      ],
    },
    ops: {
      eyebrow: '운영 방식',
      title: '항공편은 저희가 지켜봅니다.',
      desc: '지연, 게이트 변경, 조기 도착까지 착륙 전에 처리합니다. 에이전트와 기사의 일정은 자동으로 다시 맞춰집니다.',
      tracking: '추적 중',
      sample: '예시',
      phases: ['운항 중 · 도착 예정 14:05', '착륙 · 14:02', '게이트 31 에이전트 대기', '차량 탑승 · 호텔로 이동'],
      steps: [
        { time: 'T-60', label: '항공편 추적 시작' },
        { time: 'LANDING', label: '기사 일정 재조정' },
        { time: 'GATE', label: '이름 보드로 영접' },
        { time: '+25 MIN', label: '차량 탑승' },
      ],
    },
    promise: {
      eyebrow: '약속',
    },
    closing: {
      title: '둘이서, 가족과, 혹은 팀과 함께하는 한국 여행을 계획 중이신가요?',
      desc: '날짜와 인원, 원하시는 여행을 알려 주세요. 담당 플래너가 맞춤 제안을 보내드립니다.',
      primary: '상담 신청',
      secondary: '공항 의전 바로 예약',
    },
  },
  en: {
    board: {
      live: 'LIVE',
      caption: 'Services · today’s arrivals · journeys (sample data)',
      sets: [
        { title: 'SERVICES', rows: [['MEET & ASSIST', 'BOOK'], ['CHAUFFEUR', 'BOOK'], ['PRIVATE TOUR', 'SOON'], ['SMALL GROUPS', 'REQUEST'], ['CORPORATE', 'REQUEST']] },
        { title: 'TODAY · ARRIVALS', rows: [['KE012 LAX', 'AT GATE'], ['OZ221 JFK', 'LANDED'], ['SQ600 SIN', 'ON TIME'], ['LH712 FRA', 'ON TIME'], ['AF264 CDG', 'DELAYED']] },
        { title: 'JOURNEYS', rows: [['SEOUL PALACES', 'PRIVATE'], ['JEJU ESCAPE', 'FAMILY'], ['BUSAN COAST', 'FRIENDS'], ['FINE DINING', 'SEOUL'], ['BUYER MEETING', 'CORPORATE']] },
      ],
    },
    ways: {
      eyebrow: 'Three ways to travel with us',
      title: 'For two, for the family, or for the whole team.',
      items: [
        {
          id: 'journeys',
          tag: 'Early enquiries',
          title: 'Private Journeys',
          desc: 'Tailor-made trips for couples, families and friends — private guides, chauffeurs, dining and stays, arranged around you. Launching soon; we are taking early enquiries.',
          cta: 'Enquire early',
          href: '/private-journeys',
          image: '/luggage_assistance.webp',
          alt: 'Concierge assisting a traveller with luggage',
        },
        {
          id: 'airport',
          tag: 'Book online · instant',
          title: 'Airport & Chauffeur',
          desc: 'VIP Meet & Assist at Incheon and Gimpo, and Genesis G90, Staria or Mercedes Sprinter with a professional driver.',
          cta: 'Book from USD 250',
          href: '/#hero',
          image: '/vip_arrival_escort.webp',
          alt: 'Agent welcoming a guest at the gate',
        },
        {
          id: 'groups',
          tag: 'By proposal',
          title: 'Groups & Corporate',
          desc: 'Small-group trips and celebrations, delegations and buyer hosting, incentives and events — planned and run end to end.',
          cta: 'Request a proposal',
          href: '/business',
          image: '/luxury_fleet.webp',
          alt: 'Premium vehicles prepared for a group',
        },
      ],
    },
    ops: {
      eyebrow: 'How we work',
      title: "We watch the flight, so you don't have to.",
      desc: 'Delays, gate changes and early arrivals are handled before you land — your agent and driver are re-timed automatically.',
      tracking: 'TRACKING',
      sample: 'sample',
      phases: ['EN ROUTE · ETA 14:05 KST', 'LANDED · 14:02 KST', 'AGENT AT GATE 31', 'GUEST IN CAR · TO HOTEL'],
      steps: [
        { time: 'T-60', label: 'Flight tracked' },
        { time: 'LANDING', label: 'Driver re-timed' },
        { time: 'GATE', label: 'Agent with name board' },
        { time: '+25 MIN', label: 'In the car' },
      ],
    },
    promise: {
      eyebrow: 'Our promise',
    },
    closing: {
      title: 'Planning Korea for two, for the family, or for your team?',
      desc: 'Tell us your dates, group size and the trip you have in mind. A planner will reply with a tailored proposal.',
      primary: 'Start an enquiry',
      secondary: 'Book airport VIP',
    },
  },
};
