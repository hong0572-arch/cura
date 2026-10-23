// 사업자 정보 (전자상거래법 제10조 표시 사항) — 푸터·이용약관·개인정보처리방침이 함께 쓴다.
// company·ceo 는 사업자등록증 기재 그대로 입력한다. 비어 있으면 화면에 표시하지 않는다.
export const BUSINESS = {
  company: { ko: '주식회사 큐라공항서비스', en: 'Cura Airport Service Co.' }, // 사업자등록증 기재 상호
  ceo: { ko: '홍준기', en: 'Hong, Joon Kie' },
  brand: 'Beyond the Gate',
  bizNo: '696-87-04263',
  mailOrderNo: '제 2026-영종구-0090호',
  address: {
    ko: '인천광역시 영종구 공항동로 193번길 40-112',
    en: '40-112, Gonghangdong-ro 193beon-gil, Yeongjong-gu, Incheon, Republic of Korea',
  },
  phone: '+82 10-2853-3998',
  email: 'cura@beyondthegate.kr',
  hosting: 'Vercel Inc.',
  privacyOfficer: { ko: '대표 홍준기', en: 'Hong, Joon Kie (CEO)' }, // 개인정보 보호책임자
};

// 공정거래위원회 사업자정보 확인
export const FTC_BIZ_URL = `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${BUSINESS.bizNo.replace(/-/g, '')}`;
