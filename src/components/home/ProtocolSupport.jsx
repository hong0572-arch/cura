import { Landmark, PlaneLanding, ShieldCheck, Mail } from 'lucide-react';
import { CONTACT } from '../checkout/checkoutCopy';

// 외교·정부 인사, 유명인 공항 이용 시 공항 당국·관계 부처 협조 요청 대행 안내 (문구: content/homeCopy.js protocol)
// 온라인 바로 예약이 아닌 개별 문의 서비스 → 메일·WhatsApp 으로 연결
const ICONS = [PlaneLanding, Landmark, ShieldCheck];

export default function ProtocolSupport({ copy }) {
  if (!copy) return null;
  const mail = `mailto:${CONTACT.email}?subject=${encodeURIComponent(copy.mailSubject)}`;
  return (
    <section id="protocol" className="home-section">
      <div className="container">
        <div className="protocol btg-panel on-navy btg-reveal">
          <div className="protocol-copy">
            <p className="btg-eyebrow">{copy.eyebrow}</p>
            <h2 className="protocol-title">{copy.title}</h2>
            <p className="protocol-desc">{copy.desc}</p>
            <div className="protocol-actions">
              <a className="btg-btn btg-btn--gold btg-sheen" href={mail}><Mail size={18} aria-hidden="true" /> {copy.cta}</a>
              <a className="btg-btn btg-btn--ghost" href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </div>
          <ul className="protocol-points">
            {copy.points.map(([title, body], i) => {
              const Icon = ICONS[i] || ShieldCheck;
              return (
                <li key={title}>
                  <span className="protocol-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></span>
                  <div><b>{title}</b><p>{body}</p></div>
                </li>
              );
            })}
            <li className="protocol-note">{copy.note}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
