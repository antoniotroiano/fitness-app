import type { MuscleId } from '../types'
import type { ReactNode } from 'react'

/**
 * Eigene, stilisierte Muskelfigur (Vorder- und Rückansicht) als Inline-SVG.
 * Alle Pfade beschreiben nur die rechte Körperhälfte (x >= 50) und werden gespiegelt.
 * Koordinaten: x 0–100 (Mitte 50), y 0–190 (Scheitel bis Fußsohle).
 */
type View = 'front' | 'back'

/** Körperflächen (geschlossen, ohne Kontur) und ihre Außenkanten (offen, mit Kontur). */
const HEAD = 'M50 1.5C55 1.5 58.2 5 58.2 10.5C58.2 14.8 56.6 18.3 53.8 20.3C52.6 21 51.4 21.3 50 21.3Z'
const NECK = 'M50 17L54.3 17C54.3 20.5 54.8 23.2 56 25.5L50 27Z'
const TORSO =
  'M50 24L55.2 24C57.5 27 61.5 28.6 66 29.4C68.6 29.9 70.2 31.6 70.4 34.5' +
  'C69.4 38 68 41 67.4 44.5C67.6 49 67.4 54 66.5 58.5C65.3 64 64.1 69 64 74' +
  'C64.2 78.5 66 82 66.6 87C67.6 93 67.8 99 67 106C66 114 64.4 121 63.4 127.5' +
  'C62.8 130.5 62.6 133 63.4 137.5C64.2 143 63.4 150 61.3 158C60 164 58.8 168.5 58.9 172.5' +
  'C59.2 175.5 61.4 178 61.6 180.5C61.7 182.6 60 183.4 57.5 183.4L54.6 183.4' +
  'C53.4 183.4 53.2 182 53.5 180C53.9 177 54.6 174.5 54.6 171.5C54.4 165 52.9 157 52.7 149' +
  'C52.6 142 53.6 137 53.8 132C53.9 128 53.3 124 52.9 118C52.4 111 51.6 104 50.6 98.5L50 98.5Z'
const TORSO_EDGE =
  'M55.2 24.6C57.5 27 61.5 28.6 66 29.4M67.4 44.5C67.6 49 67.4 54 66.5 58.5C65.3 64 64.1 69 64 74' +
  'C64.2 78.5 66 82 66.6 87C67.6 93 67.8 99 67 106C66 114 64.4 121 63.4 127.5' +
  'C62.8 130.5 62.6 133 63.4 137.5C64.2 143 63.4 150 61.3 158C60 164 58.8 168.5 58.9 172.5' +
  'C59.2 175.5 61.4 178 61.6 180.5C61.7 182.6 60 183.4 57.5 183.4L54.6 183.4' +
  'C53.4 183.4 53.2 182 53.5 180C53.9 177 54.6 174.5 54.6 171.5C54.4 165 52.9 157 52.7 149' +
  'C52.6 142 53.6 137 53.8 132C53.9 128 53.3 124 52.9 118C52.4 111 51.6 104 50.6 98.5'
const ARM =
  'M64 30C68.5 28.8 73.2 29.8 75.3 33.2C76.8 35.8 77 39.5 76.8 44C76.7 50 77 56 77 61' +
  'C77.6 63.5 78.8 66.5 79 70.5C79.2 77 78.2 83.5 77.6 89C78.6 90.6 79.6 93 79.4 96.5' +
  'C79.2 99.5 78.4 101.6 76.9 102C75.3 102.3 74.3 100.6 73.8 98.3C73.4 96 73.4 92.5 73.6 89.6' +
  'C72.7 83 71.4 76.5 71 70.5C70.8 67.5 70.6 65 70.3 62.8C69.6 59 69.1 54 68.8 49C68.5 46.5 68 45 67.4 44.5' +
  'C67 40 66 34 64 30Z'
const ARM_EDGE = ARM.replace('C67 40 66 34 64 30Z', '')
const NECK_EDGE = 'M50 1.5C55 1.5 58.2 5 58.2 10.5C58.2 14.8 56.6 18.3 53.8 20.3M54.3 19.5C54.4 21.5 54.9 23.3 55.6 24.8'

const FILLS = [NECK, TORSO, ARM, HEAD]
const EDGES = [NECK_EDGE, TORSO_EDGE, ARM_EDGE]

const FOREARM = 'M71.6 65.5C73.6 63.4 76.6 63.6 77.9 67C78.6 70.5 78.4 76 77.4 81.5C76.9 84.5 76.4 87 75.9 88.6L74.2 88.6C73.4 84 72.4 78 71.7 72.5C71.4 70 71.3 67.5 71.6 65.5Z'
const FRONT_DELT = 'M63.5 31.2C67 30 70.3 30.8 71.8 33.8C72.1 37.5 71.3 41.5 69.6 45.4C68.4 41.5 66.6 37.2 63.5 31.2Z'
const SIDE_DELT = 'M70.6 30.6C73.4 31 75.4 33 76.1 36.4C76.4 40.5 75.4 44.6 73.4 48C73.4 43 73.2 38 72.6 34.6C72.2 32.8 71.6 31.6 70.6 30.6Z'

/** Bauchmuskel-Segment mit runden Ecken. */
const ABS_ROW = (y0: number, y1: number) =>
  `M51 ${y0 + 1.2}Q51 ${y0} 52.2 ${y0}L56.2 ${y0 + 0.3}Q57.4 ${y0 + 0.4} 57.4 ${y0 + 1.6}L57.2 ${y1 - 1.2}Q57.1 ${y1} 55.9 ${y1}L52.2 ${y1}Q51 ${y1} 51 ${y1 - 1.2}Z`

// Reihenfolge = Zeichenreihenfolge: spätere Regionen liegen über früheren
const FRONT: Partial<Record<MuscleId, string[]>> = {
  neck: ['M51.2 19.8C52.8 21 54.4 23.2 55.4 26.6L53.2 27.6C52.6 25 51.9 22.6 51.2 19.8Z'],
  traps: ['M54.8 23.4C57 26 60.6 27.8 65.6 29.2C62 30.4 58.4 30.4 55.6 29.2C55.6 27.3 55.3 25.3 54.8 23.4Z'],
  frontDelts: [FRONT_DELT],
  sideDelts: [SIDE_DELT],
  chest: ['M50.9 33C55.5 31.3 60.4 31.2 63.6 32.4C66.4 35.6 67.8 39.5 67.8 43.6C64.4 47.6 58.8 49.8 53.2 49.6C51.8 49.5 51 48.6 50.9 47.2Z'],
  serratus: [
    'M64.2 49.6C65.5 48.8 66.8 48.9 67.3 50.2L65 52.4Z',
    'M64.1 53.4C65.4 52.6 66.8 52.7 67.1 54L64.8 56.2Z',
    'M64 57.2C65.2 56.5 66.4 56.6 66.6 57.9L64.6 60Z',
  ],
  biceps: ['M69.4 46.6C70.8 44.2 73.8 44.4 75.2 48.4C75.9 52.5 75.6 57.5 73.4 61.6C71.9 61 70.4 57.4 69.6 53.4C69.8 51 69.5 48.8 69.4 46.6Z'],
  forearms: [FOREARM],
  abs: [
    ABS_ROW(52, 58.4), ABS_ROW(59.6, 66), ABS_ROW(67.2, 73.6),
    'M51 76.2Q51 75 52.2 75L56 75.1Q57.2 75.2 57.1 76.4C56.8 83 55 89.5 51 94.2Z',
  ],
  obliques: ['M58.9 54.2C61.8 54 64.6 55.6 65.9 58.6C66 65.5 64.6 72.5 63.2 79.6C61.6 82.6 60 85.4 58.7 87.4C59 77 59 65 58.9 54.2Z'],
  abductors: ['M64.6 86.4C66.4 87.6 67.4 91 67.2 96.4L65.6 99.8C64.6 95.6 64.2 90.8 64.6 86.4Z'],
  adductors: ['M51.4 98C53.4 99 54.9 101.6 55.5 104.6C55.4 108.6 54.6 112.4 53.6 115C52.4 110.4 51.6 104 51.4 98Z'],
  quads: [
    'M56.6 97.4C60 94.8 63.6 94.6 65.3 98.2C66.4 105.4 65.2 115.6 62.3 125.4C60.8 127.2 58.4 127.8 56.2 127.2C54.4 126.6 53.6 124.8 53.6 122.6C53.6 118.8 54.3 115.2 55.6 112.2C55.6 106.6 55.9 101.4 56.6 97.4Z',
  ],
  calves: ['M54 133.6C55.9 135.4 56.9 141 56.5 148C56.2 152 55.6 154.8 54.6 156.6C53.6 151 53.3 140.6 54 133.6Z'],
  tibialis: ['M59 133.4C60.6 135.6 61.4 141.4 60.9 149C60.4 156.6 59.2 163.4 58 167.6C57.4 159 57.5 143.6 59 133.4Z'],
}

const BACK: Partial<Record<MuscleId, string[]>> = {
  neck: ['M51.2 18.6L53.6 18.6C53.8 20.6 54.2 22.2 54.8 23.6L51.2 25Z'],
  upperBack: ['M58.2 35.8C61.8 34.4 65.4 34.8 67.2 37.8C67.8 41.6 66.4 45 63.2 47.2C60.6 46.4 58.6 44.4 57.6 41.4C57.1 39.3 57.3 37.4 58.2 35.8Z'],
  traps: ['M50.2 19C52.2 22.6 54.4 25 56.6 26.2C60.4 27.8 64 28.6 66.8 30.2C63 32.8 58.8 36.6 56.6 41.6C54.6 46 52.6 50.8 50.2 56Z'],
  rearDelts: [FRONT_DELT],
  sideDelts: [SIDE_DELT],
  lats: ['M54.2 52.4C58.2 48.6 62.4 46.8 66.4 45.4C66.9 49.6 66.9 55.4 65.6 61.2C64.4 67.6 61.2 73 57.2 77.2C55.2 72.4 53.6 66.6 52.4 60.4C52.6 57.4 53.2 54.6 54.2 52.4Z'],
  lowerBack: ['M50.9 61.8C52.6 63.2 54.2 66.4 55.6 72C56.6 77.8 56.6 83.4 55.6 87.6L50.9 87.6Z'],
  triceps: ['M69.2 42.6C70.8 40.2 73.8 40.2 75.8 44.2C76.7 49.8 76.3 55.8 74.7 60.4C72.6 61.4 70.6 60.4 69.6 57.2C69.3 52.4 69 47.4 69.2 42.6Z'],
  forearms: [FOREARM],
  abductors: ['M57 84.6C60.4 81.4 64.4 81.6 66.2 84.4C66.8 85.8 66.9 87.4 66.4 88.8C63.4 86.6 60.2 85.4 57 84.6Z'],
  glutes: ['M50.9 88.6C55 85.4 60.8 85 64.9 87.4C67.4 91.4 67.6 98 65.6 103C63.6 106.4 59.8 108.2 55.6 108C53.6 107.9 52 107.2 50.9 106.4Z'],
  hamstrings: [
    'M52 108.6C54.8 108.2 57.4 109.2 58.4 112.2C59 118 58.6 124 57.6 128.4C55.6 128.6 54.4 126.6 54 123.4C53 118.6 52.3 113.6 52 108.6Z',
    'M59.6 108.4C62.6 107.6 65.4 108.6 65.9 112C66 118 64.4 124 62 128.4C60.6 128.6 59.6 126.6 59.4 123.4C59.1 118.4 59.1 113.4 59.6 108.4Z',
  ],
  calves: [
    'M54 133.4C56.4 132.4 57.8 135.2 57.9 139.4C58 146 57 151.8 55.6 155C54.6 152 53.9 146 53.7 140.4C53.6 137.6 53.7 135.4 54 133.4Z',
    'M58.8 133.2C61.4 132.6 63.4 135.2 63.3 140C63 146 61.2 151 59.6 153.4C59 147.4 58.7 140.4 58.8 133.2Z',
  ],
}

const BACK_ONLY: MuscleId[] = ['lats', 'upperBack', 'traps', 'glutes', 'hamstrings', 'triceps', 'lowerBack', 'rearDelts']
const LOWER: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'tibialis']

const MIRROR = 'translate(100 0) scale(-1 1)'

/** Zeichnet eine Körperhälfte und ihr Spiegelbild. */
function Both({ children }: { children: ReactNode }) {
  return <><g>{children}</g><g transform={MIRROR}>{children}</g></>
}

function Body({ view, primary, secondary, colors }: { view: View; primary: MuscleId[]; secondary: MuscleId[]; colors?: Partial<Record<MuscleId, string>> }) {
  const map = view === 'front' ? FRONT : BACK
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <Both>{FILLS.map((d, i) => <path key={i} d={d} fill="var(--surface2)" stroke="var(--surface2)" strokeWidth="0.5" />)}</Both>
      <Both>
        {(Object.keys(map) as MuscleId[]).map((m) => {
          const role = primary.includes(m) ? 'p' : secondary.includes(m) ? 's' : 'n'
          const own = colors?.[m]
          if (own) return map[m]!.map((d, i) => <path key={`${m}${i}`} d={d} fill={own} />)
          return map[m]!.map((d, i) => (
            <path key={`${m}${i}`} d={d} fill={role === 'n' ? 'var(--line)' : 'var(--muscle)'}
              fillOpacity={role === 'p' ? 1 : role === 's' ? 0.45 : 0.55} />
          ))
        })}
      </Both>
      <Both>{EDGES.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--line)" strokeWidth="0.7" />)}</Both>
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
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--muscle)' }} /> Primär</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--muscle)', opacity: 0.45 }} /> Sekundär</span>
      </div>
    </div>
  )
}

/** Vorder- und Rückansicht nebeneinander, Muskelgruppen mit eigenen Farben (z. B. Split-Piktogramme). */
export function MusclePair({ colors, height = 76 }: { colors: Partial<Record<MuscleId, string>>; height?: number }) {
  return (
    <span className="flex gap-1.5 shrink-0" aria-hidden>
      {(['front', 'back'] as const).map((v) => (
        <svg key={v} height={height} width={Math.round(height * 72 / 190)} viewBox="14 0 72 190">
          <Body view={v} primary={[]} secondary={[]} colors={colors} />
        </svg>
      ))}
    </span>
  )
}
