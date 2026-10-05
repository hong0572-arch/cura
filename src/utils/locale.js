import { useLocation } from 'react-router-dom';

// 언어는 URL 경로로 구분한다: 한국어 = /about, 영어 = /en/about
// (검색엔진이 언어별 페이지를 따로 색인할 수 있도록 ?lang=en 쿼리 대신 경로 사용)

export const SITE_URL = 'https://beyondthegate.kr';

export function langFromPath(pathname = '/') {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko';
}

// '/en/about' → '/about'
export function stripLocale(pathname = '/') {
  if (langFromPath(pathname) !== 'en') return pathname;
  return pathname.slice(3) || '/';
}

// '/about' → '/en/about' (영어), 쿼리·해시 포함 경로도 처리
export function localizePath(path, lang) {
  if (lang !== 'en') return path;
  if (path === '/' || path === '') return '/en';
  if (path.startsWith('/#') || path.startsWith('/?')) return `/en${path.slice(1)}`;
  return `/en${path}`;
}

export function useLocale() {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);
  return { lang, to: (path) => localizePath(path, lang) };
}
