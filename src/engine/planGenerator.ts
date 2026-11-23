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

/** Große Muskeln: bekommen bei knappem Budget vor den kleinen ihr volles Wochenziel. */
const BIG_MUSCLES: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'chest', 'lats', 'upperBack']
/** Gewicht der Priorität: Fokus "Höher" vor großen Muskeln vor dem Rest (Rest skaliert zuerst herunter). */
const PRIORITY_WEIGHT = { focus: 1.8, big: 1.6, rest: 1 }
/** Ab diesem Tagesbudget (Basissätze) behält jeder große Muskel mindestens 3 Sätze pro Woche (ab '20-40'). */
const BIG_FLOOR_FROM_DAY_CAP = 9
/** Kleinere Zuteilung ist als eigene Übung sinnlos: Der Muskel entfällt, sein Anteil geht an die übrigen. */
const MIN_ALLOCATION = 2.5

/**
 * Verteilt das Wochenbudget auf die Muskeln: Priorisierung statt globalem Faktor.
 * Passt alles, gilt das Wochenziel. Sonst bekommt jeder Muskel min(Ziel, λ · Gewicht · Ziel) mit λ aus dem Budget,
 * so dass Fokus-Muskeln und große Muskeln zuerst ihr volles Ziel erreichen und der Rest skaliert. Bei Hypertrophie sind
 * für Bizeps, Trizeps und seitliche Schulter vorab 2 Sätze (eine Direktübung) reserviert; Muskeln unter `MIN_ALLOCATION`
 * Sätzen entfallen, von den niedrigsten Prioritäten aus. Das Budget je Tag (`dayCap` in Basissätzen) begrenzt die Muskeln
 * eines Tages gemeinsam: was ein voller Tag nicht aufnimmt, geht an Muskeln, die auf anderen Tagen noch Platz haben.
 * `dayMuscles` = Muskeln je Tag.
 */
export function allocateWeekly(
  config: ProgramConfig, dayMuscles: MuscleId[][], dayCap: number,
): Partial<Record<MuscleId, number>> {
  const muscles = [...new Set(dayMuscles.flat())]
  const freq = (m: MuscleId) => dayMuscles.filter((d) => d.includes(m)).length
  const target = new Map(muscles.map((m) => [m, weeklyTarget(config, m)]))
  const budget = dayCap * dayMuscles.length
  const out: Partial<Record<MuscleId, number>> = {}
  const total = muscles.reduce((a, m) => a + target.get(m)!, 0)
  if (total <= budget && dayMuscles.every((d) => d.reduce((a, m) => a + target.get(m)! / freq(m), 0) <= dayCap)) {
    muscles.forEach((m) => { out[m] = target.get(m)! })
    return out
  }

  const weight = (m: MuscleId) => config.focus[m] === 'high' ? PRIORITY_WEIGHT.focus : BIG_MUSCLES.includes(m) ? PRIORITY_WEIGHT.big : PRIORITY_WEIGHT.rest
  // Mindestanteil: Direktübung (Hypertrophie) für Bizeps/Trizeps/seitliche Schulter, bei normalem Budget auch 3 Sätze je großem Muskel
  const bigFloor = dayCap >= BIG_FLOOR_FROM_DAY_CAP
  const floor = (m: MuscleId) => {
    if (config.goal === 'hypertrophy' && DIRECT_MIN_MUSCLES.includes(m) && config.focus[m] !== 'high') return Math.min(2, target.get(m)!)
    return bigFloor && BIG_MUSCLES.includes(m) ? Math.min(3, target.get(m)!) : 0
  }
  // Niedrigste Priorität zuerst streichen: kleines Gewicht, dann spät in ORDER
  const dropOrder = [...muscles].sort((a, b) => weight(a) - weight(b) || ORDER.indexOf(b) - ORDER.indexOf(a))
  const ub = new Map(target)
  const active = new Set(muscles)
  const solve = (): Map<MuscleId, number> => {
    const share = (m: MuscleId, l: number) => Math.max(floor(m), Math.min(ub.get(m)!, l * weight(m) * target.get(m)!))
    for (;;) {
      let lo = 0, hi = 4
      const sum = (l: number) => [...active].reduce((a, m) => a + share(m, l), 0)
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (sum(mid) > budget) hi = mid; else lo = mid }
      const drop = dropOrder.find((m) => active.has(m) && floor(m) === 0 && share(m, lo) < MIN_ALLOCATION)
      if (!drop || active.size <= 1) return new Map([...active].map((m) => [m, share(m, lo)]))
      active.delete(drop)
    }
  }
  let alloc = solve()
  for (let iter = 0; iter < 12; iter++) {
    let overloaded = false
    for (const d of dayMuscles) {
      const load = d.reduce((a, m) => a + (alloc.get(m) ?? 0) / freq(m), 0)
      if (load <= dayCap * 1.02) continue
      overloaded = true
      // Gleiche Gewichtung wie global: Fokus und große Muskeln behalten ihren Anteil am Tag am längsten
      const part = (m: MuscleId) => (alloc.get(m) ?? 0) / freq(m)
      const dayShare = (m: MuscleId, l: number) => Math.max(floor(m) / freq(m), Math.min(part(m), l * weight(m) * part(m)))
      const act = new Set(d)
      for (;;) {
        let lo = 0, hi = 4
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2
          if ([...act].reduce((a, m) => a + dayShare(m, mid), 0) > dayCap) hi = mid; else lo = mid
        }
        // Wie global: Anteile unter dem Minimum entfallen, niedrigste Priorität zuerst
        const drop = dropOrder.find((m) => act.has(m) && floor(m) === 0 && dayShare(m, lo) * freq(m) < MIN_ALLOCATION)
        if (!drop || act.size <= 1) { act.forEach((m) => { ub.set(m, Math.min(ub.get(m)!, dayShare(m, lo) * freq(m))) }); break }
        act.delete(drop)
        ub.set(drop, 0)
      }
    }
    if (!overloaded) break
    alloc = solve()
  }
  muscles.forEach((m) => { out[m] = alloc.get(m) ?? 0 })
  return out
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
  const allocation = allocateWeekly(config, types.map(dayMuscles), baseCap)

  // Noch zu verteilende Wochensätze und verbleibende Tage je Muskel: nicht platzierte Sätze wandern so auf spätere Tage
  const left: Partial<Record<MuscleId, number>> = {}
  const daysLeft: Partial<Record<MuscleId, number>> = { ...freq }
  for (const m of Object.keys(freq) as MuscleId[]) left[m] = allocation[m] ?? 0

  // Bei sehr knappem Budget (u20) reichen 2 Sätze für eine Verbundübung, sonst bliebe kein Platz neben der Direktübung
  const compoundMin = cap < SESSION_SET_CAP['20-40'] ? 2 : 3
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
    const min = lead.compound ? compoundMin : 2
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

  /** Hypertrophie: pro Woche mindestens eine direkte Übung für Bizeps, Trizeps, seitliche Schulter. */
  const ensureDirect = () => {
    if (config.goal !== 'hypertrophy') return
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

  // Bei knappem Budget zuerst die Direktübungen reservieren, bevor Verbundübungen den Tag füllen
  if (Object.keys(freq).some((m) => (allocation[m as MuscleId] ?? 0) < weeklyTarget(config, m as MuscleId) - 0.01)) ensureDirect()

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

  // 3. Sicherheitsnetz, falls oben nichts davon platziert wurde
  ensureDirect()

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
