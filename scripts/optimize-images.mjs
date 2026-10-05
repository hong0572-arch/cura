// public/ 의 PNG·JPG 이미지를 WebP로 변환한다 (원본은 그대로 둔다).
// 새 이미지를 public/ 에 추가했다면 한 번 실행:  node scripts/optimize-images.mjs
// 사이트 코드는 로컬 이미지 경로(.png/.jpg)를 .webp 로 바꿔서 불러온다 (src/utils/images.js)
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const MAX_WIDTH = 1920

const files = (await fs.readdir(publicDir)).filter(f => /\.(png|jpe?g)$/i.test(f))
let before = 0
let after = 0
for (const file of files) {
  const src = path.join(publicDir, file)
  const out = path.join(publicDir, file.replace(/\.(png|jpe?g)$/i, '.webp'))
  const input = await fs.readFile(src)
  const output = await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer()
  await fs.writeFile(out, output)
  before += input.length
  after += output.length
  console.log(`${file.padEnd(32)} ${(input.length / 1024).toFixed(0).padStart(5)} KB → ${(output.length / 1024).toFixed(0).padStart(4)} KB`)
}

// SNS 공유용 대표 이미지 (1200x630)
await sharp(await fs.readFile(path.join(publicDir, 'luxury_airport_vip.png')))
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({ quality: 82 })
  .toFile(path.join(publicDir, 'og-image.jpg'))

console.log(`\n합계 ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB, og-image.jpg 생성`)
