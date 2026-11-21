import type { MuscleId, TimeBudget } from '../../types'
import { MusclePair } from '../../components/MuscleFigure'
import { MUSCLES } from '../../data/muscles'

/** Eigene Mini-Piktogramme für den Wizard (SVG, Farbe folgt currentColor). */

const C1 = 'var(--muscle)', C2 = '#8b5cf6', C3 = '#f97316'
const paint = (ids: MuscleId[], color: string): Partial<Record<MuscleId, string>> => Object.fromEntries(ids.map((m) => [m, color]))
const PUSH: MuscleId[] = ['chest', 'frontDelts', 'sideDelts', 'triceps', 'serratus']
const PULL: MuscleId[] = ['lats', 'upperBack', 'traps', 'rearDelts', 'biceps', 'forearms', 'lowerBack']
const LEGS: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'tibialis']
const ALL = MUSCLES.map((m) => m.id)

/** Split-Piktogramm: Körper von vorn und hinten, Muskelgruppen farbig markiert (Full Body einfarbig, Upper/Lower zweifarbig, PPL dreifarbig). */
export function SplitPicto({ split }: { split: string }) {
  const colors =
    split === 'ulfb' ? { ...paint(MUSCLES.filter((m) => m.region === 'upper').map((m) => m.id), C1), ...paint(MUSCLES.filter((m) => m.region === 'lower').map((m) => m.id), C2) }
    : split === 'ppl' ? { ...paint(PUSH, C3), ...paint(PULL, C1), ...paint(LEGS, C2) }
    : paint(ALL, C1)
  return <MusclePair colors={colors} />
}

const TIME_FILL: Record<TimeBudget, number> = { u20: 0.15, '20-40': 0.3, '40-60': 0.5, '60-90': 0.7, '90-120': 0.9, o120: 1 }

/** Uhr, deren Zifferblatt sich mit der Zeit füllt (bis 20 min fast leer, über 120 min voll). */
export function TimeIcon({ time, size = 24 }: { time: TimeBudget; size?: number }) {
  const f = TIME_FILL[time]
  const a = f * Math.PI * 2 - Math.PI / 2
  const x = 12 + 8 * Math.cos(a), y = 12 + 8 * Math.sin(a)
  const wedge = f >= 1 ? null : `M12 12V4A8 8 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}z`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      {wedge ? <path d={wedge} fill="currentColor" fillOpacity=".4" stroke="none" /> : <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity=".4" stroke="none" />}
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

/** Erfahrungsstufe als aufsteigende Balken (0–4 gefüllt). */
export function LevelIcon({ level, size = 24 }: { level: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0" strokeLinecap="round" strokeWidth="3">
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${5 + i * 5} 20V${16 - i * 4}`} stroke="currentColor" opacity={i < level ? 1 : 0.25} />
      ))}
    </svg>
  )
}
