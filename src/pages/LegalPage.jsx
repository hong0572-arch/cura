import { BUSINESS } from '../content/businessInfo';
import { LEGAL_EFFECTIVE } from '../content/legalCopy';
import './LegalPage.css';

// 이용약관·개인정보처리방침 공용 화면 (문구: content/legalCopy.js, 회사 정보: content/businessInfo.js)
export default function LegalPage({ copy, lang = 'ko' }) {
  const isKo = lang !== 'en';
  const c = copy[isKo ? 'ko' : 'en'];
  const pick = (v) => (typeof v === 'string' ? v : v[isKo ? 'ko' : 'en']);
  const company = [
    [isKo ? '상호' : 'Company', pick(BUSINESS.company)],
    [isKo ? '대표자' : 'CEO', pick(BUSINESS.ceo)],
    [isKo ? '사업자등록번호' : 'Business Reg. No.', BUSINESS.bizNo],
    [isKo ? '통신판매업 신고번호' : 'Mail-order Sales Reg. No.', BUSINESS.mailOrderNo],
    [isKo ? '주소' : 'Address', pick(BUSINESS.address)],
    [isKo ? '연락처' : 'Contact', `${BUSINESS.email} · ${BUSINESS.phone}`],
  ];
  return (
    <div className="legal">
      <div className="container legal-inner">
        <h1>{c.title}</h1>
        <p className="legal-intro">{c.intro}</p>
        {c.sections.map(([title, items]) => (
          <section key={title}>
            <h2>{title}</h2>
            {items.length > 1 ? <ul>{items.map(t => <li key={t}>{t}</li>)}</ul> : <p>{items[0]}</p>}
          </section>
        ))}
        <p className="legal-date">{c.effective}: {LEGAL_EFFECTIVE[isKo ? 'ko' : 'en']}</p>
        <dl className="legal-company">
          {company.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>
    </div>
  );
}
