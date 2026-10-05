// public/ 의 로컬 이미지(.png/.jpg)는 WebP 버전을 쓴다 (scripts/optimize-images.mjs 로 생성)
// 관리자가 올린 Firebase Storage 이미지(https://...)는 그대로 둔다.
export function optimizedImage(src) {
  if (typeof src !== 'string') return src;
  return /^\/[^/].*\.(png|jpe?g)$/i.test(src) ? src.replace(/\.(png|jpe?g)$/i, '.webp') : src;
}
