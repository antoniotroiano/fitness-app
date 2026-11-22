import type {
  Exercise, Experience, MuscleId, PlannedExercise, Program, ProgramConfig, Split, TimeBudget, WorkoutDay,
} from '../types'
import { SECONDARY_WEIGHT } from '../data/muscles'
import { TIME_BASED } from '../data/exercises'
import { baseRepRange, baseRir, PEAK_SETS_FACTOR, type ExerciseRole } from './periodization'
import { isRepless, METRIC_RANGE } from './metric'

type DayType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'

const DAY_MUSCLES: Record<DayType, MuscleId[]> = {
  push: ['chest', 'frontDelts', 'sideDelts', 'triceps'],
  pull: ['lats', 'upperBack', 'rearDelts', 'traps', 'biceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'abs'],
  upper: ['chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts', 'biceps', 'triceps', 'traps', 'forearms'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'abs'],
  full: ['chest', 'lats', 'upperBack', 'quads', 'hamstrings', 'glutes', 'sideDelts', 'biceps', 'triceps', 'calves', 'abs'],
}

/** An welchen Tagen Fokus-Muskeln trainiert werden, wenn sie nicht ohnehin im Tagesmuster stehen. */
const DAY_HOME: Partial<Record<MuscleId, DayType[]>> = {
  neck: ['upper', 'pull', 'full'], serratus: ['upper', 'push', 'full'], tibialis: ['lower', 'legs', 'full'],
  obliques: ['lower', 'legs', 'full'], lowerBack: ['lower', 'legs', 'pull', 'full'],
}

/** Nur auf ausdrücklichen Wunsch (Fokus "Höher") eingeplant, sonst reichen Verbund- und Isolationsübungen anderer Gruppen. */
const FOCUS_ONLY: MuscleId[] = ['forearms', 'neck', 'serratus', 'tibialis', 'obliques', 'lowerBack']

/**
 * Anteil des Standard-Wochenvolumens pro Muskelgruppe: Viele Gruppen werden durch Verbundübungen
 * bereits indirekt trainiert (vordere Schulter beim Drücken, Trapez und hintere Schulter beim Rudern).
 */
const VOLUME_FACTOR: Partial<Record<MuscleId, number>> = {
  frontDelts: 0.5, rearDelts: 0.8, traps: 0.6, abs: 0.7, adductors: 0.7, abductors: 0.7,
}

const DAY_LABEL: Record<DayType, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper', lower: 'Lower', full: 'Full Body',
}

/** Reihenfolge innerhalb eines Tages: große Muskeln zuerst */
const ORDER: MuscleId[] = [
  'quads', 'hamstrings', 'glutes', 'chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts', 'triceps', 'biceps',
  'traps', 'adductors', 'abductors', 'calves', 'abs', 'forearms', 'obliques', 'lowerBack', 'neck', 'serratus', 'tibialis',
]

export function dayTypes(split: Split, days: number): DayType[] {
  const d = Math.min(6, Math.max(2, days))
  let s = split
  if (s === 'none') s = d <= 3 ? 'fullBody' : d <= 5 ? 'ulfb' : 'ppl'
  if (s === 'fullBody') return Array<DayType>(d).fill('full')
  if (s === 'ulfb') {
    return ({
      2: ['upper', 'lower'], 3: ['upper', 'lower', 'full'], 4: ['upper', 'lower', 'upper', 'lower'],
      5: ['upper', 'lower', 'full', 'upper', 'lower'], 6: ['upper', 'lower', 'full', 'upper', 'lower', 'full'],
    } as Record<number, DayType[]>)[d]
  }
  return ({
    2: ['upper', 'lower'], 3: ['push', 'pull', 'legs'], 4: ['push', 'pull', 'legs', 'upper'],
    5: ['push', 'pull', 'legs', 'upper', 'lower'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  } as Record<number, DayType[]>)[d]
}

const SLOT_PATTERN: Record<number, (number | 'rest')[]> = {
  2: [0, 'rest', 'rest', 1, 'rest', 'rest', 'rest'],
  3: [0, 'rest', 1, 'rest', 2, 'rest', 'rest'],
  4: [0, 1, 'rest', 2, 3, 'rest', 'rest'],
  5: [0, 1, 2, 'rest', 3, 4, 'rest'],
  6: [0, 1, 2, 3, 4, 5, 'rest'],
}

export function weekSlots(days: number): (number | 'rest')[] {
  return SLOT_PATTERN[Math.min(6, Math.max(1, days))] ?? [0, 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']
}

export const SESSION_SET_CAP: Record<TimeBudget, number> = {
  u20: 6, '20-40': 12, '40-60': 18, '60-90': 24, '90-120': 30, o120: 36,
}

const BASE_WEEKLY_SETS: Record<Experience, number> = { none: 6, beginner: 8, intermediate: 12, advanced: 14 }

export function weeklyTarget(config: ProgramConfig, muscle: MuscleId): number {
  let sets = BASE_WEEKLY_SETS[config.experience]
  if (config.goal === 'strength') sets *= 0.8
  sets *= VOLUME_FACTOR[muscle] ?? 1
  const prio = config.focus[muscle]
  if (prio === 'high') sets *= 1.35
  if (prio === 'low') sets *= 0.6
  return Math.max(3, Math.round(sets))
}

function pickExercises(
  pool: Exercise[], muscle: MuscleId, count: number, used: Set<string>, rotate: number,
): Exercise[] {
  const candidates = pool.filter((e) => e.primary[0] === muscle && !e.cardio && !used.has(e.id))
  const fallback = pool.filter((e) => e.primary.includes(muscle) && !e.cardio && !used.has(e.id))
  const list = candidates.length ? candidates : fallback
  const compounds = list.filter((e) => e.compound)
  const isolations = list.filter((e) => !e.compound)
  const out: Exercise[] = []
  // Erste Übung bevorzugt Verbundübung, zweite Isolation; rotiert nach Tagesindex für Abwechslung
  const pick = (arr: Exercise[]) => arr.length ? arr[rotate % arr.length] : undefined
  const first = pick(compounds) ?? pick(isolations)
  if (first) out.push(first)
  if (count > 1) {
    const rest = list.filter((e) => e.id !== first?.id)
    const second = pick(rest.filter((e) => !e.compound)) ?? pick(rest)
    if (second) out.push(second)
  }
  return out
}

export interface GenerateResult { program: Omit<Program, 'id' | 'createdAt' | 'active'> }

/** Bei Hypertrophie pro Woche mindestens eine direkte Übung für diese Muskeln (sonst deckt die Sekundär-Gutschrift sie rechnerisch ab). */
const DIRECT_MIN_MUSCLES: MuscleId[] = ['biceps', 'triceps', 'sideDelts']

/** Direkte Übung: Isolationsübung mit diesem Muskel als Hauptmuskel (kein Verbund, kein Rudern/Drücken mit Sekundäranteil). */
export const isDirectFor = (ex: Pick<Exercise, 'primary' | 'pattern'>, m: MuscleId) =>
  ex.primary[0] === m && ex.pattern === 'isolation'

/** Satzkosten im Zeitbudget: Das Budget gilt für die Spitzenwoche (Woche 3/4, `PEAK_SETS_FACTOR`). */
const peakCost = (sets: number) => Math.max(1, Math.round(sets * PEAK_SETS_FACTOR))

interface DayState {
  index: number
  type: DayType
  muscles: MuscleId[]
  credit: Partial<Record<MuscleId, number>>
  used: Set<string>
  planned: PlannedExercise[]
  /** Position der Muskelgruppe in `ORDER`: bestimmt die Reihenfolge der Übungen im Tag */
  sortKey: Map<PlannedExercise, number>
  /** Verbleibendes Zeitbudget in Spitzenwochen-Sätzen */
  remaining: number
  mains: number
}

export function generate(config: ProgramConfig, exercises: Exercise[]): GenerateResult {
  const types = dayTypes(config.split, config.days)
  // Zeit-/Distanzübungen nur auf ausdrücklichen Wunsch, Band nur bei ausdrücklich gewähltem Band-Equipment
  const explicit = new Set(config.includeExercises ?? [])
  const bandChosen = !!config.equipment?.includes('band')
  const pool = exercises.filter(
    (e) => !e.cardio && (!config.equipment || config.equipment.includes(e.equipment))
      && (e.equipment !== 'band' || bandChosen) && (!(TIME_BASED.has(e.id) || isRepless(e.metric)) || explicit.has(e.id)),
  )
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const dayMuscles = (t: DayType): MuscleId[] => {
    const base = DAY_MUSCLES[t].filter((m) => !FOCUS_ONLY.includes(m) || config.focus[m] === 'high')
    // Fokus-Muskeln, die in keinem Tagesmuster vorkommen, hängen an Pull (Rücken, Nacken), Upper/Full (Oberkörper) oder Legs/Lower (Unterkörper)
    const extra = FOCUS_ONLY.filter((m) => config.focus[m] === 'high' && !DAY_MUSCLES[t].includes(m) && (DAY_HOME[m] ?? []).includes(t))
    return [...base, ...extra]
  }
  const freq: Partial<Record<MuscleId, number>> = {}
  types.forEach((t) => dayMuscles(t).forEach((m) => { freq[m] = (freq[m] ?? 0) + 1 }))

  // Wochenvolumen an das Zeitbudget anpassen (Budget gilt für die Spitzenwoche)
  const cap = SESSION_SET_CAP[config.time]
  const baseCap = cap / PEAK_SETS_FACTOR
  const weeklyWanted = Object.keys(freq).reduce((a, m) => a + weeklyTarget(config, m as MuscleId), 0)
  const scale = Math.min(1, (baseCap * types.length) / weeklyWanted)

  // Noch zu verteilende Wochensätze und verbleibende Tage je Muskel: nicht platzierte Sätze wandern so auf spätere Tage
  const left: Partial<Record<MuscleId, number>> = {}
  const daysLeft: Partial<Record<MuscleId, number>> = { ...freq }
  for (const m of Object.keys(freq) as MuscleId[]) left[m] = weeklyTarget(config, m) * scale

  const states: DayState[] = types.map((type, index) => ({
    index, type, credit: {}, used: new Set<string>(), planned: [], sortKey: new Map(), remaining: cap, mains: 0,
    // Fokus "Höher" wird zuerst platziert (bekommt das Zeitbudget vor allen anderen), die Anzeigereihenfolge folgt `ORDER`
    muscles: [...dayMuscles(type)].sort((a, b) =>
      Number(config.focus[b] === 'high') - Number(config.focus[a] === 'high') || ORDER.indexOf(a) - ORDER.indexOf(b)),
  }))

  const add = (d: DayState, ex: Exercise, sets: number, m: MuscleId) => {
    // Bis zu zwei Hauptübungen pro Tag; weitere Verbundübungen mittlere, Isolation hohe Wiederholungen
    const role: ExerciseRole = !ex.compound ? 'isolation' : d.mains < 2 ? 'main' : 'secondary'
    if (role === 'main') d.mains += 1
    const range = isRepless(ex.metric) ? METRIC_RANGE[ex.metric!]! : baseRepRange(config.goal, ex.compound, role)
    const pe: PlannedExercise = { exerciseId: ex.id, sets, repMin: range.min, repMax: range.max, rir: baseRir(config.experience) }
    d.planned.push(pe)
    d.sortKey.set(pe, ORDER.indexOf(m))
    d.used.add(ex.id)
    d.remaining -= peakCost(sets)
    ex.primary.forEach((p) => { d.credit[p] = (d.credit[p] ?? 0) + sets })
    ex.secondary.forEach((p) => { d.credit[p] = (d.credit[p] ?? 0) + sets * SECONDARY_WEIGHT })
  }

  /** Platziert Übungen für einen Muskel; gibt die tatsächlich platzierten Sätze zurück (0 = passt nicht ins Budget). */
  const place = (d: DayState, m: MuscleId, want: number): number => {
    // Mindestens 3 Sätze für Verbundübungen, 2 für Isolation; ab 5 Sätzen zwei Übungen
    const lead = pickExercises(pool, m, 1, d.used, d.index)[0]
    if (!lead) return 0
    const min = lead.compound ? 3 : 2
    for (let sets = Math.max(want, min); sets >= min; sets--) {
      const chosen = pickExercises(pool, m, sets >= 5 ? 2 : 1, d.used, d.index)
      if (!chosen.length) return 0
      const split = chosen.length === 2 ? [Math.ceil(sets / 2), Math.floor(sets / 2)] : [sets]
      if (split.reduce((a, x) => a + peakCost(x), 0) > d.remaining) continue
      chosen.forEach((ex, i) => add(d, ex, split[i], m))
      return sets
    }
    return 0
  }

  // 1. Durchgang: Tag für Tag, Rest des Wochenziels verteilt sich auf die verbleibenden Tage des Muskels
  for (const d of states) {
    for (const m of d.muscles) {
      const perDay = (left[m] ?? 0) / (daysLeft[m] ?? 1)
      daysLeft[m] = (daysLeft[m] ?? 1) - 1
      const before = d.credit[m] ?? 0
      const needed = Math.round(perDay - before)
      if (needed <= 0) { left[m] = Math.max(0, (left[m] ?? 0) - perDay); continue }
      const placed = place(d, m, needed)
      left[m] = Math.max(0, (left[m] ?? 0) - (placed > 0 ? placed + before : before))
    }
  }

  // 2. Durchgang: weiterhin offene Sätze auf andere Tage mit derselben Muskelgruppe verschieben (freie Kapazität zuerst)
  for (const m of ORDER) {
    while ((left[m] ?? 0) >= 1.5) {
      const days = states.filter((d) => d.muscles.includes(m)).sort((a, b) => b.remaining - a.remaining)
      const placed = days.map((d) => place(d, m, Math.round(left[m] ?? 0))).find((p) => p > 0) ?? 0
      if (!placed) break
      left[m] = (left[m] ?? 0) - placed
    }
  }

  // 3. Hypertrophie: pro Woche mindestens eine direkte Übung für Bizeps, Trizeps, seitliche Schulter
  if (config.goal === 'hypertrophy') {
    for (const m of DIRECT_MIN_MUSCLES) {
      const dayOf = states.filter((d) => d.muscles.includes(m))
      if (!dayOf.length) continue
      const has = states.some((d) => d.planned.some((p) => { const ex = byId.get(p.exerciseId); return !!ex && isDirectFor(ex, m) }))
      if (has) continue
      for (const d of [...dayOf].sort((a, b) => b.remaining - a.remaining)) {
        const ex = pool.filter((e) => isDirectFor(e, m) && !d.used.has(e.id))
        const pick = ex[d.index % Math.max(1, ex.length)]
        if (!pick) continue
        const sets = 2
        // Fehlt Platz im Budget, geben andere Übungen des Tages Sätze ab (nie unter 2 Sätze)
        while (d.remaining < peakCost(sets)) {
          const donor = [...d.planned].filter((p) => p.sets > 2).sort((a, b) => b.sets - a.sets)[0]
          if (!donor) break
          donor.sets -= 1
          d.remaining += peakCost(donor.sets + 1) - peakCost(donor.sets)
        }
        if (d.remaining < peakCost(sets)) continue
        add(d, pick, sets, m)
        break
      }
    }
  }

  const days: WorkoutDay[] = states.map((d) => {
    const nameIndex = types.slice(0, d.index + 1).filter((t) => t === d.type).length
    const dup = types.filter((t) => t === d.type).length > 1
    return {
      id: `day-${d.index}`,
      name: `Workout ${String.fromCharCode(65 + d.index)} · ${DAY_LABEL[d.type]}${dup ? ` ${nameIndex}` : ''}`,
      exercises: [...d.planned].sort((a, b) => (d.sortKey.get(a) ?? 0) - (d.sortKey.get(b) ?? 0)),
    }
  })

  return {
    program: {
      name: config.name, icon: config.icon, color: config.color, config,
      days, weekSlots: weekSlots(types.length),
    },
  }
}
