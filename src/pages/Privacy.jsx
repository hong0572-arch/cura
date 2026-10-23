import LegalPage from './LegalPage';
import { privacyCopy } from '../content/legalCopy';

// 개인정보처리방침 (한/영)
export default function Privacy({ lang = 'ko' }) {
  return <LegalPage copy={privacyCopy} lang={lang} />;
}
