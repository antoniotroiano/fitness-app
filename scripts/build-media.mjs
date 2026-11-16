#!/usr/bin/env node
/**
 * Übungsbilder aufbereiten (nur lokal, keine Netzwerkzugriffe).
 * Aufruf: node scripts/build-media.mjs <pfad/zu/free-exercise-db-with-videos>
 * Liest src/data/media/map.json und kopiert die männlichen Poster der gemappten Übungen
 * nach public/exercise-media/poster/<slug>.jpg (unter macOS per `sips` auf 480 px Breite verkleinert).
 * Schreibt src/data/media/manifest.json (Liste der vorhandenen Slugs).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2] || process.env.MEDIA_SRC
if (!src) { console.error('Usage: node scripts/build-media.mjs <repo-pfad>'); process.exit(1) }

const map = JSON.parse(readFileSync(join(root, 'src/data/media/map.json'), 'utf8'))
const slugs = [...new Set(Object.values(map))].sort()
const outDir = join(root, 'public/exercise-media/poster')
mkdirSync(outDir, { recursive: true })

let sips = true
try { execFileSync('sips', ['--version'], { stdio: 'ignore' }) } catch { sips = false }

const present = []
const missing = []
let bytes = 0
for (const slug of slugs) {
  const from = join(src, 'thumbnails/male', `${slug}.jpg`)
  const to = join(outDir, `${slug}.jpg`)
  if (!existsSync(from)) { missing.push(slug); continue }
  if (sips) execFileSync('sips', ['-Z', '480', '--setProperty', 'formatOptions', '70', from, '--out', to], { stdio: 'ignore' })
  else copyFileSync(from, to)
  bytes += statSync(to).size
  present.push(slug)
}
writeFileSync(join(root, 'src/data/media/manifest.json'), JSON.stringify(present, null, 1) + '\n')
console.log(`${present.length} Poster, ${(bytes / 1e6).toFixed(1)} MB${sips ? '' : ' (unverkleinert, sips fehlt)'}`)
if (missing.length) console.log('Fehlend (bitte aus map.json entfernen):', missing.join(', '))
