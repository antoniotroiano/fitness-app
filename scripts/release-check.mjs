// Release-Prüfung: genutzt von CI (`npm run check:release`) und vom Release-Workflow. Keine Abhängigkeiten.
// Die reinen Funktionen sind in `scripts/releaseCheck.test.mjs` getestet.
//
// Regeln (siehe docs/dev/data-i18n.md, „Release-Ablauf“):
//   - `version` in package.json ist ein reines `x.y.z`
//   - `src/data/changelog.ts` hat einen nicht leeren Eintrag `version: 'x.y.z'` für genau diese Version
//   - kein Changelog-Eintrag ist neuer als package.json (fängt „Version nicht erhöht“ ab)
//
// CLI: `node scripts/release-check.mjs [--notes <datei>]`
//   Exit 1 mit Problemliste, sonst 0; `--notes` schreibt die Einträge als Markdown für das GitHub-Release.
//   Ist $GITHUB_OUTPUT gesetzt, wird `version=x.y.z` angehängt.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { argv, env, exit, stderr, stdout } from 'node:process'
import { URL, fileURLToPath } from 'node:url'

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export const isReleaseVersion = (v) => typeof v === 'string' && SEMVER.test(v)

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

/** Liest die Einträge `{ version, date, items }` aus dem Quelltext von `src/data/changelog.ts`. */
export function parseChangelog(text) {
  const entries = []
  const re = /version:\s*'([^']*)',\s*date:\s*'([^']*)',\s*items:\s*\[([\s\S]*?)\n\s*\],?\s*\n\s*\}/g
  for (const m of text.matchAll(re)) {
    const items = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((s) => s[1].replace(/\\(.)/g, '$1'))
    entries.push({ version: m[1], date: m[2], items })
  }
  return entries
}

/** Prüft Version und Changelog zusammen. Liefert die Probleme und, wenn alles passt, die Release-Notes. */
export function checkRelease(version, changelogText) {
  const problems = []
  if (!isReleaseVersion(version)) problems.push(`package.json-Version „${version}“ hat nicht die Form x.y.z.`)
  const entries = parseChangelog(changelogText)
  if (entries.length === 0) problems.push('src/data/changelog.ts: keine Einträge gefunden (Format geändert?).')
  const seen = new Set()
  for (const e of entries) {
    if (!isReleaseVersion(e.version)) problems.push(`Changelog-Version „${e.version}“ hat nicht die Form x.y.z.`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) problems.push(`Changelog ${e.version}: Datum „${e.date}“ ist nicht yyyy-mm-dd.`)
    if (seen.has(e.version)) problems.push(`Changelog hat zwei Einträge für ${e.version}.`)
    seen.add(e.version)
  }
  let notes
  if (isReleaseVersion(version)) {
    const entry = entries.find((e) => e.version === version)
    if (!entry) problems.push(`Kein Changelog-Eintrag für ${version} in src/data/changelog.ts.`)
    else if (entry.items.length === 0) problems.push(`Der Changelog-Eintrag für ${version} ist leer.`)
    else notes = entry.items.map((i) => `- ${i}`).join('\n')
    for (const e of entries) {
      if (isReleaseVersion(e.version) && compareVersions(e.version, version) > 0) {
        problems.push(`Changelog hat einen Eintrag für ${e.version}, neuer als package.json (${version}). Version erhöhen oder Eintrag entfernen.`)
      }
    }
  }
  return { problems, notes }
}

function main() {
  const root = new URL('../', import.meta.url)
  const i = argv.indexOf('--notes')
  const notesFile = i >= 0 ? argv[i + 1] : undefined
  if (i >= 0 && !notesFile) { stderr.write('--notes braucht einen Dateinamen.\n'); exit(2) }
  const version = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).version
  const changelog = readFileSync(new URL('src/data/changelog.ts', root), 'utf8')
  const { problems, notes } = checkRelease(version, changelog)
  if (problems.length > 0) {
    stderr.write(`Release-Prüfung fehlgeschlagen:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`)
    exit(1)
  }
  if (notesFile) writeFileSync(notesFile, `${notes}\n`)
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `version=${version}\n`)
  stdout.write(`Release-Prüfung ok: ${version} hat einen Changelog-Eintrag.\n`)
}

if (argv[1] === fileURLToPath(import.meta.url)) main()
