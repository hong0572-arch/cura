// 이용약관·개인정보처리방침 (한/영). 회사 정보는 businessInfo.js 에서 가져온다.
// 실제 운영(예약 위저드 수집 항목, NICEPAY·PayPal 결제, Google Firebase·메일·챗봇, Vercel 호스팅)에 맞춰 작성.
// 내용을 바꾸면 시행일(effective)을 함께 고친다.
import { BUSINESS } from './businessInfo';

const B = BUSINESS;
export const LEGAL_EFFECTIVE = { ko: '2026년 10월 23일', en: '23 October 2026' };

export const termsCopy = {
  ko: {
    title: '이용약관',
    intro: `이 약관은 ${B.company.ko}(브랜드: ${B.brand}, 이하 "회사")가 웹사이트(beyondthegate.kr)를 통해 제공하는 공항 의전 및 차량 서비스의 이용 조건을 정합니다.`,
    sections: [
      ['제1조 (목적)', ['이 약관은 회사와 서비스를 이용하는 고객 사이의 권리·의무와 책임, 이용 절차를 정하는 것을 목적으로 합니다.']],
      ['제2조 (서비스)', [
        '회사는 인천·김포국제공항에서 입국·출국·환승 의전(Meet & Assist), 피켓팅, 공항 전용 차량, 외교·정부 인사 및 유명인의 공항 이용을 위한 협조 요청 준비·조율 등의 서비스를 제공합니다.',
        '의전 서비스는 고객의 공항 절차에 동행하여 안내하는 서비스이며, 출입국 심사·세관 등의 절차는 고객 본인이 진행합니다.',
      ]],
      ['제3조 (예약과 계약의 성립)', [
        '고객이 예약 화면에서 정보를 입력하고 결제를 완료한 때 계약이 성립하며, 회사는 결제 완료 후 예약 확정 내용을 이메일로 안내합니다.',
        '고객은 이름(여권 영문 표기), 항공편, 연락처 등 정확한 정보를 입력해야 하며, 정보 오류로 생긴 불이익은 회사가 책임지지 않습니다.',
      ]],
      ['제4조 (요금과 결제)', [
        '요금은 결제 전에 항목별로 표시되며, 결제 금액은 회사 서버가 확정한 금액으로 합니다.',
        '해외 결제(PayPal, 미국 달러)에는 PayPal 결제 수수료 4%가 포함되며, 국내 카드 결제(NICEPAY, 원화)에는 카드 수수료를 부과하지 않습니다.',
        '항공편 시간에 따라 야간·긴급(24시간 이내)·주말 할증이 붙을 수 있으며, 결제 전에 금액과 이유를 표시합니다.',
      ]],
      ['제5조 (취소와 환불)', [
        '서비스 예정 시각 48시간 전까지 취소하면 전액 환불합니다.',
        '서비스 예정 시각 24시간~48시간 전 취소는 결제 금액의 50%를 환불합니다.',
        '서비스 예정 시각 24시간 이내 취소·변경 또는 연락 없이 나타나지 않은 경우(No-show)에는 환불하지 않습니다.',
        '회사의 사정으로 서비스를 제공하지 못한 경우에는 전액 환불합니다. 환불은 결제한 수단으로 처리되며, 결제사 사정에 따라 영업일 기준 수일이 걸릴 수 있습니다.',
      ]],
      ['제6조 (서비스의 범위와 한계)', [
        '인천공항에는 공식적으로 판매되는 Fast Track이 없습니다. 우대 출입국 심사는 외교관, APEC 카드 소지자, 고령자, 7세 이하 어린이, 거동이 불편한 분 등 대상자만 이용할 수 있으며, 대상 여부와 라인 운영은 출입국 당국이 결정합니다. 대상이 아닌 고객은 가장 빠른 동선으로 안내합니다.',
        '공항 당국·관계 부처의 승인이 필요한 사항(전용 통로, 별도 출입 등)은 해당 기관의 결정에 따르며, 회사는 결과를 보장하지 않습니다.',
        '항공편 지연·조기 도착은 회사가 확인하여 일정을 조정합니다. 다만 서비스 시간(입국 약 3시간, 출국 약 2시간)을 크게 넘는 경우 추가 요금이 생길 수 있으며 사전에 안내합니다.',
      ]],
      ['제7조 (고객의 의무)', [
        '고객은 여권·비자 등 출입국에 필요한 서류를 스스로 준비해야 하며, 항공편이나 일정이 바뀌면 즉시 회사에 알려야 합니다.',
        '차량 서비스 이용 시 권장 인원·수하물을 넘으면 안전을 위해 차종 변경을 요청할 수 있습니다.',
      ]],
      ['제8조 (회사의 면책)', [
        '천재지변, 공항·정부 기관의 조치, 항공사 사정, 보안 상황 등 회사가 통제할 수 없는 사유로 서비스를 제공하지 못하거나 지연된 경우 회사는 책임을 지지 않습니다. 이 경우 제공하지 못한 서비스 요금의 환불은 회사와 고객이 협의합니다.',
      ]],
      ['제9조 (개인정보 보호)', ['회사는 고객의 개인정보를 개인정보처리방침에 따라 처리합니다.']],
      ['제10조 (분쟁 해결)', [
        '서비스 관련 문의·불만은 고객센터(이메일·전화·WhatsApp)로 접수하며, 회사는 신속히 처리합니다.',
        '분쟁이 해결되지 않으면 한국소비자원 등 분쟁조정기관에 조정을 신청할 수 있으며, 소송은 민사소송법에 따른 관할 법원에 제기합니다.',
      ]],
    ],
    effective: '시행일',
  },
  en: {
    title: 'Terms of Service',
    intro: `These Terms govern the airport meet & assist and chauffeur services that ${B.company.en} (brand: ${B.brand}, "we") provides through beyondthegate.kr.`,
    sections: [
      ['1. Purpose', ['These Terms set out the rights, obligations and responsibilities of us and our customers, and how our services are booked and used.']],
      ['2. Services', [
        'We provide arrival, departure and transfer meet & assist, picketing, private airport cars, and the preparation and coordination of cooperation requests for diplomats, officials and public figures at Incheon and Gimpo International Airports.',
        'Meet & assist is an escort service. Immigration, customs and other formalities are completed by the passenger.',
      ]],
      ['3. Booking and contract', [
        'A contract is formed when you complete payment on our booking page. We then email your booking confirmation.',
        'Please enter accurate details — your name exactly as in your passport, your flight and your contact details. We are not responsible for problems caused by incorrect information.',
      ]],
      ['4. Prices and payment', [
        'Prices are itemised before payment, and the amount charged is the amount confirmed by our server.',
        'PayPal payments (USD) include a 4% PayPal fee. Korean card payments through NICEPAY (KRW) carry no card fee.',
        'Night, short-notice (within 24 hours) and weekend supplements may apply depending on your flight time; the amount and reason are shown before payment.',
      ]],
      ['5. Cancellation and refunds', [
        'Full refund for cancellations made up to 48 hours before the service time.',
        '50% refund for cancellations made 24–48 hours before the service time.',
        'No refund for cancellations or changes within 24 hours of the service time, or for no-shows.',
        'If we cannot provide the service for reasons on our side, we refund in full. Refunds are made to the original payment method and may take several business days depending on the payment provider.',
      ]],
      ['6. Scope and limits of the service', [
        'Incheon Airport has no official paid Fast Track. Priority immigration lanes are for eligible travellers (diplomats, APEC card holders, seniors, children aged 7 and under, passengers with reduced mobility, etc.); eligibility and lane operations are decided by the immigration authorities. Other travellers are guided along the fastest route.',
        'Matters that require approval by airport authorities or government ministries (dedicated routes, separate access, etc.) are decided by those authorities, and we cannot guarantee the outcome.',
        'We monitor flight delays and early arrivals and adjust the schedule. If the service runs well beyond its standard duration (about 3 hours for arrivals, 2 hours for departures), an additional charge may apply and we will tell you in advance.',
      ]],
      ['7. Your responsibilities', [
        'You are responsible for your passport, visa and other travel documents, and for telling us promptly about any change to your flight or schedule.',
        'For car services, we may ask you to change the vehicle for safety if your party exceeds the recommended number of passengers or bags.',
      ]],
      ['8. Limitation of liability', [
        'We are not liable for services that cannot be provided or are delayed for reasons beyond our control, such as natural disasters, measures by airport or government authorities, airline operations or security situations. Refunds for services not provided in such cases will be agreed between us and the customer.',
      ]],
      ['9. Personal data', ['We process your personal data in accordance with our Privacy Policy.']],
      ['10. Disputes', [
        'Please contact us by email, phone or WhatsApp with any question or complaint; we will respond promptly.',
        'If a dispute cannot be resolved, you may apply for mediation to the Korea Consumer Agency or another dispute resolution body. Court proceedings are brought before the competent court under the Civil Procedure Act of Korea.',
      ]],
    ],
    effective: 'Effective date',
  },
};

export const privacyCopy = {
  ko: {
    title: '개인정보처리방침',
    intro: `${B.company.ko}(브랜드: ${B.brand}, 이하 "회사")는 「개인정보 보호법」에 따라 고객의 개인정보를 보호하고, 관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 공개합니다.`,
    sections: [
      ['1. 처리 목적', [
        '예약 접수와 서비스 제공(공항 영접·동행, 차량 배차, 항공편 확인)',
        '결제·환불 처리와 예약 확인·견적 안내 메일 발송',
        '고객 문의·불만 처리, 분쟁 대응',
        '외교·정부 인사 및 유명인 의전 협조 요청 시 공항 당국·관계 부처 협조 요청 준비(해당 고객에 한함)',
      ]],
      ['2. 처리하는 개인정보 항목', [
        '필수: 이름(여권 영문 표기), 이메일, 휴대전화 번호, 항공편 정보(항공사·편명·도착/출발 시각), 이용 공항·날짜·인원·수하물 수',
        '선택: 차량 목적지·픽업 주소, 좌석 등급, 휠체어 이용 등 도움 필요 여부, 요청사항, 대리 예약 시 예약자 이름·이메일·전화',
        '결제: 결제 수단 정보(카드번호 등)는 결제대행사가 직접 처리하며 회사는 저장하지 않습니다. 회사는 결제 승인번호·금액·결제 수단 종류만 보관합니다.',
        '자동 수집: 접속 기록, 브라우저 정보, 이용 통계(쿠키를 쓰지 않는 방식), 챗봇 이용 시 대화 내용',
      ]],
      ['3. 보유·이용 기간', [
        '계약·청약철회 기록, 대금 결제·서비스 공급 기록: 5년 (전자상거래법)',
        '소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)',
        '웹사이트 접속 기록: 3개월 (통신비밀보호법)',
        '결제하지 않은 예약 진행 정보와 상담 문의: 1년',
        '보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다.',
      ]],
      ['4. 제3자 제공', [
        '회사는 고객의 개인정보를 제3자에게 제공하지 않습니다. 다만 의전 협조 서비스를 요청한 고객의 경우, 고객의 동의를 받아 필요한 범위의 정보를 공항 당국·관계 부처에 제공할 수 있으며, 법령에 따른 요청이 있는 경우에는 예외로 합니다.',
      ]],
      ['5. 처리 위탁 및 국외 이전', [
        '나이스페이먼츠 주식회사(대한민국): 국내 카드 결제 처리',
        'PayPal Pte. Ltd.(싱가포르) 등 PayPal 그룹: 해외 결제 처리 — 결제 시 이름·이메일·결제 금액이 이전됩니다.',
        'Google LLC(미국): 예약 정보 저장·관리(Firebase), 예약 안내 메일 발송(Gmail), 챗봇 대화 처리(Gemini) — 서비스 이용 시 네트워크를 통해 이전되며, 회사 보유 기간 동안 보관됩니다.',
        'Vercel Inc.(미국): 웹사이트 호스팅과 서버 처리, 방문 통계 — 접속 시 네트워크를 통해 처리됩니다.',
        '국외 이전을 원하지 않으시면 이메일·전화로 예약해 주실 수 있으나, 해외 결제(PayPal) 등 일부 서비스 이용이 제한될 수 있습니다.',
      ]],
      ['6. 파기 절차와 방법', ['전자 파일은 복구할 수 없는 방법으로 삭제하고, 종이 문서는 분쇄하거나 소각합니다. 다른 법령에 따라 보관해야 하는 정보는 별도로 분리하여 보관 기간 동안만 보관합니다.']],
      ['7. 정보주체의 권리와 행사 방법', ['고객은 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며, 아래 개인정보 보호책임자에게 이메일·전화로 요청하시면 지체 없이 처리합니다. 법정대리인이나 위임을 받은 사람을 통해서도 요청할 수 있습니다.']],
      ['8. 안전성 확보 조치', ['암호화된 통신(HTTPS), 예약 데이터에 대한 서버 측 접근 통제, 관리자 계정 권한 관리, 결제 정보 미보관 등 개인정보 보호를 위한 기술적·관리적 조치를 하고 있습니다.']],
      ['9. 브라우저 저장소', ['예약 진행 중 입력 내용 유지를 위해 브라우저 저장소(세션·로컬 저장소)를 사용합니다. 브라우저 설정에서 삭제할 수 있으며, 삭제하면 진행 중인 입력 내용이 사라질 수 있습니다.']],
      ['10. 개인정보 보호책임자', [
        `책임자: ${B.privacyOfficer.ko}`,
        `연락처: ${B.email} · ${B.phone}`,
      ]],
      ['11. 권익 침해 구제', ['개인정보 침해에 대한 상담·신고는 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118), 대검찰청(1301), 경찰청(182)에 하실 수 있습니다.']],
    ],
    effective: '시행일',
  },
  en: {
    title: 'Privacy Policy',
    intro: `${B.company.en} (brand: ${B.brand}, "we") protects your personal data in accordance with the Personal Information Protection Act of Korea and publishes this Privacy Policy so that questions and complaints can be handled promptly.`,
    sections: [
      ['1. Why we process your data', [
        'To take bookings and provide our services (airport meeting and escort, car dispatch, flight monitoring)',
        'To process payments and refunds, and to send booking confirmations and quotes by email',
        'To answer enquiries, handle complaints and resolve disputes',
        'For diplomatic, government and VIP protocol requests only: to prepare cooperation requests to airport authorities and government ministries',
      ]],
      ['2. What we collect', [
        'Required: name (as in your passport), email, mobile number, flight details (airline, flight number, arrival/departure time), airport, date, number of passengers and bags',
        'Optional: car pick-up/drop-off address, class of travel, assistance needs such as a wheelchair, special requests, and the booker’s name, email and phone when booking for someone else',
        'Payment: card details are handled directly by the payment provider; we do not store them. We keep only the approval number, amount and payment method type.',
        'Collected automatically: access logs, browser information, cookieless usage statistics, and chatbot conversations if you use the chatbot',
      ]],
      ['3. How long we keep it', [
        'Contract, cancellation, payment and service records: 5 years (E-Commerce Act)',
        'Complaint and dispute records: 3 years (E-Commerce Act)',
        'Website access logs: 3 months (Protection of Communications Secrets Act)',
        'Unpaid booking drafts and enquiries: 1 year',
        'Data is destroyed without delay once the retention period ends or the purpose is fulfilled.',
      ]],
      ['4. Sharing with third parties', [
        'We do not share your personal data with third parties, except — with your consent — the information needed for a protocol cooperation request you asked us to make to airport authorities or ministries, or where required by law.',
      ]],
      ['5. Processors and international transfers', [
        'NICEPAY Payments Co., Ltd. (Korea): Korean card payments',
        'PayPal Pte. Ltd. (Singapore) and the PayPal group: international payments — your name, email and the payment amount are transferred at checkout',
        'Google LLC (USA): booking data storage (Firebase), booking emails (Gmail) and chatbot processing (Gemini) — transferred over the network when you use our services and kept for our retention period',
        'Vercel Inc. (USA): website hosting, server processing and visit statistics — processed over the network when you visit',
        'If you do not wish your data to be transferred abroad, you can book by email or phone, although some services such as PayPal payment may then be unavailable.',
      ]],
      ['6. Destruction', ['Electronic files are deleted so they cannot be recovered; paper records are shredded or incinerated. Data we must keep under other laws is stored separately and only for the required period.']],
      ['7. Your rights', ['You may ask at any time to access, correct, delete or stop the processing of your personal data by contacting our privacy officer below; we will act without delay. Requests may also be made through a legal representative or an authorised person.']],
      ['8. Security measures', ['We use encrypted connections (HTTPS), server-side access control for booking data, managed administrator access, and we do not store card details.']],
      ['9. Browser storage', ['We use your browser’s session and local storage to keep your booking details while you complete a booking. You can clear it in your browser settings; doing so may remove details you have not yet submitted.']],
      ['10. Privacy officer', [
        `Privacy officer: ${B.privacyOfficer.en}`,
        `Contact: ${B.email} · ${B.phone}`,
      ]],
      ['11. Remedies', ['For advice or to report a privacy infringement in Korea, you may contact the Personal Information Dispute Mediation Committee (+82 1833-6972), the Privacy Infringement Report Center (118), the Supreme Prosecutors’ Office (1301) or the Korean National Police Agency (182).']],
    ],
    effective: 'Effective date',
  },
};
