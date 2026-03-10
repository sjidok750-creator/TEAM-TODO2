/**
 * gen-icons.mjs
 * SVG → PNG icon generator (sharp)
 * Usage: node scripts/gen-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// ── SVG 소스 (도장 디자인) ──────────────────────────────────────────────────
const stampSVG = (size, pad = 0.14) => {
  const bg    = '#fff7f5'
  const clr   = '#E8694A'
  const s     = size
  const inset = Math.round(s * pad)           // 외부 여백
  const bx    = inset                          // stamp rect x
  const bw    = s - inset * 2                  // stamp rect width
  const bh    = Math.round(bw * 0.82)          // stamp rect height
  const by    = Math.round((s - bh) / 2)       // stamp rect y (vertically centered)
  const cx    = s / 2                          // center x
  const midY  = by + bh / 2                   // divider y
  const topY  = by + bh * 0.27                // TODO center y
  const botY  = by + bh * 0.73                // LIST center y
  const fs    = Math.round(bw * 0.285)        // font size
  const sw    = Math.max(3, Math.round(s * 0.028))  // stroke-width outer
  const dw    = Math.max(1, Math.round(s * 0.010))  // divider stroke-width
  const rx    = Math.max(2, Math.round(s * 0.018))  // border radius
  const lx1   = bx + Math.round(bw * 0.06)
  const lx2   = bx + bw - Math.round(bw * 0.06)
  const ls    = Math.round(fs * 0.09)         // letter-spacing

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="${bg}"/>
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}"
        rx="${rx}" ry="${rx}"
        fill="${bg}" stroke="${clr}" stroke-width="${sw}"/>
  <text x="${cx}" y="${topY}"
        font-family="'Courier New',Courier,monospace"
        font-size="${fs}" font-weight="700" fill="${clr}"
        text-anchor="middle" dominant-baseline="middle"
        letter-spacing="${ls}">TODO</text>
  <line x1="${lx1}" y1="${midY}" x2="${lx2}" y2="${midY}"
        stroke="${clr}" stroke-width="${dw}" stroke-linecap="round" opacity="0.55"/>
  <text x="${cx}" y="${botY}"
        font-family="'Courier New',Courier,monospace"
        font-size="${fs}" font-weight="700" fill="${clr}"
        text-anchor="middle" dominant-baseline="middle"
        letter-spacing="${ls}">LIST</text>
</svg>`
}

// ── 생성 설정 ───────────────────────────────────────────────────────────────
const targets = [
  // Android 표준
  { file: 'icon-192.png',        size: 192, pad: 0.13 },
  // Android 고화질 / PWA
  { file: 'icon-512.png',        size: 512, pad: 0.13 },
  // Android maskable (safe zone = 80%, so pad ≥ 0.10)
  { file: 'icon-512-maskable.png', size: 512, pad: 0.18 },
  // iOS (apple-touch-icon) — 180px, solid bg (no transparency)
  { file: 'apple-touch-icon.png', size: 180, pad: 0.12 },
  // Favicon
  { file: 'favicon-32.png',       size: 32,  pad: 0.10 },
]

mkdirSync(publicDir, { recursive: true })

for (const { file, size, pad } of targets) {
  const svg = Buffer.from(stampSVG(size, pad))
  const out = join(publicDir, file)
  await sharp(svg)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out)
  console.log(`✓ ${file}  (${size}×${size})`)
}

console.log('\nAll icons generated in public/')
