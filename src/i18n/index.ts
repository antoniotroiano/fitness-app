/**
 * Sprachsystem. Quelltexte sind Deutsch; `t('Deutscher Text', …args)` liefert bei Sprache „en“ die Übersetzung
 * aus `dictEn.ts` (fehlt sie, bleibt der deutsche Text). Platzhalter `{0}`, `{1}` werden ersetzt.
 *
 * Die Sprache wird beim Start synchron aus localStorage gelesen (Spiegel von `Settings.language`) und gilt für
 * die ganze Sitzung: ein Wechsel lädt die App neu (`setLanguage`), damit auch Texte in Modul-Konstanten stimmen.
 */
import { EN } from './dictEn'

export type Lang = 'de' | 'en'

const STORAGE_KEY = 'liftlab-lang'

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'en' || v === 'de') return v
  } catch { /* kein localStorage (Tests, privater Modus) */ }
  return 'de'
}

export const LANG: Lang = readLang()
/** Locale für Zahlen und Datum */
export const LOCALE = LANG === 'en' ? 'en-US' : 'de-DE'

export function t(de: string, ...args: (string | number)[]): string {
  let s = LANG === 'en' ? (EN[de] ?? de) : de
  if (args.length) s = s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''))
  return s
}

/** Sprache speichern und die App neu laden, falls sie sich ändert. */
export function setLanguage(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignorieren */ }
  if (lang !== LANG && typeof location !== 'undefined') location.reload()
}


/** Englische Zählwörter mitten im Satz klein schreiben (deutsche Substantive bleiben groß). */
export const lc = (s: string) => (LANG === 'en' ? s.toLowerCase() : s)
