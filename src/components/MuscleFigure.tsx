import type { MuscleId } from '../types'

/**
 * Eigene, stilisierte Muskelfigur (Vorder- und Rückansicht) als Inline-SVG.
 * Alle Pfade beschreiben nur die rechte Körperhälfte (x >= 50) und werden gespiegelt.
 */
type View = 'front' | 'back'

const SILHOUETTE: string[] = [
  'M50 27 L62 29 Q70 31 72 38 L69 64 L64 90 L50 92 Z', // Torso
  'M72 38 Q78 40 79 48 L77 72 L71 72 L69 50 Z', // Oberarm
  'M71 72 L77 72 L78 98 L72 98 Z', // Unterarm
  'M50 90 L64 88 L65 134 L52 134 Z', // Oberschenkel
  'M53 134 L63 134 L61 184 L55 184 Z', // Unterschenkel
]

const ARM = (a: number, b: number) => `M71 ${a} L77 ${a} L76 ${b} L71 ${b} Z`
const FOREARM = 'M72 74 L77 74 L78 96 L73 96 Z'
const FRONT_DELT = 'M62 30 Q66 30 68 34 L66 45 L64 42 L62 34 Z'
const SIDE_DELT = 'M68 32 Q72 34 73 39 L71 48 L67 46 L67.5 35 Z'

// Reihenfolge = Zeichenreihenfolge: spätere Regionen liegen über früheren
const FRONT: Partial<Record<MuscleId, string[]>> = {
  neck: ['M50 19 L54 19 L55 25 L50 27 Z'],
  traps: ['M52 26 L58 28 L62 31 L57 33 L51 30 Z'],
  frontDelts: [FRONT_DELT],
  sideDelts: [SIDE_DELT],
  chest: ['M51 34 L62 33 L65 44 L63 52 L51 53 Z'],
  serratus: ['M65 48 L68.5 49 L68 58 L64.5 56 Z'],
  biceps: [ARM(49, 66)],
  forearms: [FOREARM],
  abs: ['M51 55 L62 55 L62 88 L51 90 Z'],
  obliques: ['M62.5 58 L67.5 60 L65.5 78 L62.5 86 Z'],
  quads: ['M52 94 L63 92 L62 126 L53 126 Z'],
  adductors: ['M50.5 96 L54 96 L55 120 L51 116 Z'],
  abductors: ['M63 92 L65.5 92 L64.5 112 L62.5 112 Z'],
  tibialis: ['M54.5 140 L58 140 L57.5 166 L55.5 166 Z'],
  calves: ['M58.5 140 L61.5 140 L60.5 162 L58.5 162 Z'],
}

const BACK: Partial<Record<MuscleId, string[]>> = {
  neck: ['M50 19 L54 19 L55 25 L50 28 Z'],
  traps: ['M50 26 L57 27 L63 31 L58 44 L50 52 Z'],
  rearDelts: [FRONT_DELT],
  sideDelts: [SIDE_DELT],
  upperBack: ['M50 46 L58 46 L57 58 L50 60 Z'],
  lats: ['M57 50 L68 42 L66 64 L58 72 L55 62 Z'],
  lowerBack: ['M50 72 L56 74 L57 88 L50 89 Z'],
  triceps: [ARM(49, 68)],
  forearms: [FOREARM],
  glutes: ['M50 90 L64 88 L65 104 L50 108 Z'],
  abductors: ['M64 90 L66 90 L65 106 L63 104 Z'],
  hamstrings: ['M51 110 L63 108 L62 130 L52 130 Z'],
  calves: ['M54 138 L62 138 L61 166 L55 166 Z'],
}

const BACK_ONLY: MuscleId[] = ['lats', 'upperBack', 'traps', 'glutes', 'hamstrings', 'triceps', 'lowerBack', 'rearDelts']
const LOWER: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'tibialis']

const MIRROR = 'translate(100 0) scale(-1 1)'

function Body({ view, primary, secondary }: { view: View; primary: MuscleId[]; secondary: MuscleId[] }) {
  const map = view === 'front' ? FRONT : BACK
  const half = (
    <>
      {SILHOUETTE.map((d, i) => <path key={i} d={d} fill="var(--surface2)" stroke="var(--line)" strokeWidth="0.6" />)}
      {(Object.keys(map) as MuscleId[]).map((m) => {
        const role = primary.includes(m) ? 'p' : secondary.includes(m) ? 's' : 'n'
        return map[m]!.map((d, i) => (
          <path key={`${m}${i}`} d={d} fill={role === 'n' ? 'var(--line)' : 'var(--muscle)'}
            fillOpacity={role === 'p' ? 1 : role === 's' ? 0.45 : 0.55} />
        ))
      })}
    </>
  )
  return (
    <g>
      <ellipse cx="50" cy="11" rx="8" ry="9.5" fill="var(--surface2)" stroke="var(--line)" strokeWidth="0.6" />
      <rect x="45" y="19" width="10" height="8" fill="var(--surface2)" />
      <g>{half}</g>
      <g transform={MIRROR}>{half}</g>
    </g>
  )
}

/** Kleines Vorschaubild: wählt Ansicht und Ausschnitt nach Hauptmuskel. */
export function MuscleThumb({ primary, secondary, size = 56 }: { primary: MuscleId[]; secondary: MuscleId[]; size?: number }) {
  const lead = primary[0]
  const view: View = lead && BACK_ONLY.includes(lead) ? 'back' : 'front'
  const lower = lead ? LOWER.includes(lead) : false
  const box = lower ? '20 84 60 104' : '14 2 72 98'
  return (
    <svg width={size} height={size} viewBox={box} role="img" aria-label="Trainierte Muskeln"
      className="rounded-xl bg-surface border border-line shrink-0">
      <Body view={view} primary={primary} secondary={secondary} />
    </svg>
  )
}

/** Detailansicht mit Vorder- und Rückseite plus Legende. */
export function MuscleDetail({ primary, secondary }: { primary: MuscleId[]; secondary: MuscleId[] }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {(['front', 'back'] as const).map((v) => (
          <div key={v} className="text-center">
            <svg viewBox="14 0 72 190" className="w-full max-h-72" role="img" aria-label={v === 'front' ? 'Vorderansicht' : 'Rückansicht'}>
              <Body view={v} primary={primary} secondary={secondary} />
            </svg>
            <div className="text-xs text-muted">{v === 'front' ? 'Vorne' : 'Hinten'}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 justify-center text-xs text-muted mt-2">
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-accent inline-block" /> Primär</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-accent/45 inline-block" /> Sekundär</span>
      </div>
    </div>
  )
}
