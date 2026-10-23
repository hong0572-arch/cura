import LegalPage from './LegalPage';
import { termsCopy } from '../content/legalCopy';

// 이용약관 (한/영)
export default function Terms({ lang = 'ko' }) {
  return <LegalPage copy={termsCopy} lang={lang} />;
}
