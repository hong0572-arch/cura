import { localizePath } from '../../utils/locale';
import { CONTACT, copy } from './checkoutCopy';
import './checkout.css';

// 결제·완료·실패 페이지 공통 틀: 네이비 헤더(로고) + 아이보리 본문 + 문의 안내
export default function CheckoutLayout({ lang = 'ko', children }) {
  const t = copy[lang] || copy.ko;
  return (
    <div className="co-page">
      <header className="co-header">
        <div className="co-header-inner">
          <a href={localizePath('/', lang)} aria-label="Beyond the Gate home">
            <img src="/logo.webp" alt="Beyond the Gate" className="co-logo" width="160" height="35" />
          </a>
          <span className="co-secure">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="1" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {t.secure}
          </span>
        </div>
      </header>

      <main className="co-main">{children}</main>

      <footer className="co-footer">
        <span>{t.help}</span>
        <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a>
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </footer>
    </div>
  );
}
