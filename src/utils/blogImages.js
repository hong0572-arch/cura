// 블로그 글 주제에 맞는 사진을 사이트 사진 중에서 고른다.
// (자동 생성 글에 이미지가 없을 때 사용. 글마다 고정된 사진이 나오도록 id 로 결정)
const LIBRARY = {
  arrival: ['/vip_arrival_escort.webp', '/vip_arrival_escort_v2.webp', '/vip_arrival_escort_v3.webp', '/arrival_service_sunset.webp'],
  departure: ['/vip_departure_escort.webp', '/departure_service_wing.webp'],
  fleet: ['/luxury_fleet.webp', '/g90.webp', '/sprinter.webp', '/staria.webp'],
  journey: ['/luggage_assistance.webp', '/luxury_airport_vip.webp'],
  service: ['/value_trust.webp', '/value_professionalism.webp', '/value_response.webp', '/value_security.webp', '/value_efficiency.webp', '/value_247.webp'],
};

const TOPICS = [
  ['departure', /출국|departure|tax ?refund|택스|환급|boarding|탑승/i],
  ['fleet', /블랙카|black ?car|차량|chauffeur|limousine|리무진|g90|sprinter|스프린터|staria|스타리아|픽업|pick-?up|transfer/i],
  ['journey', /가족|family|여행|travel|journey|luggage|수하물|라운지|lounge/i],
  ['arrival', /입국|arrival|영접|meet|greet|의전/i],
];

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function blogImages(post) {
  if (post.mainImageUrl) {
    return { cover: post.mainImageUrl, inline: post.subImageUrl || null };
  }
  const text = `${post.title || ''} ${post.titleEn || ''} ${(post.content || '').slice(0, 800)}`;
  const topics = TOPICS.filter(([, re]) => re.test(text)).map(([name]) => name);
  const pool = [...new Set([...(topics.length ? topics : ['arrival']).flatMap(t => LIBRARY[t]), ...LIBRARY.service])];
  const h = hash(post.id || text);
  const cover = pool[h % pool.length];
  const rest = pool.filter(src => src !== cover);
  const inline = rest[(h >>> 3) % rest.length];
  return { cover, inline };
}

// 마크다운을 걷어 낸 요약문
export function excerpt(markdown = '', length = 150) {
  const plain = markdown
    .replace(/^#+\s+.*$/m, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? `${plain.slice(0, length).trim()}…` : plain;
}

export function postTitle(post, lang) {
  const raw = lang === 'en' && post.titleEn ? post.titleEn : post.title || '';
  return raw.replace(/^#+\s*/, '');
}

export function postBody(post, lang) {
  const raw = lang === 'en' && post.contentEn ? post.contentEn : post.content || '';
  // 자동 번역 결과에 남는 'Title:' / 'Content:' 라벨 제거
  return raw
    .replace(/^#+\s+(.*)$/m, '')
    .replace(/^\s*(Title|Content)\s*:\s*$/gim, '')
    .replace(/^\s*Content\s*:\s*/i, '')
    .trim();
}

export function postDate(post, lang) {
  const ts = post.createdAt;
  const date = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}
