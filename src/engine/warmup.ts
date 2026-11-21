import type { Equipment, Exercise, RestCategory, Settings, WarmupOverrideMode, WarmupStep } from '../types'
import { KG_PER_LB } from '../utils/units'
import { incrementKg, roundTo } from './progression'

/**
 * Aufwärmsätze (Heuristik). Studienlage: Ein spezifisches Aufwärmen (leichtere Sätze derselben Übung)
 * verbessert Maximalkraft und Wiederholungszahl teils leicht, teils gar nicht; Effekte zeigen sich vor allem
 * bei Lasten nahe am Maximum (Systematic Review Ribeiro et al., Motricidade 2021). Zu Satzzahl und Prozenten
 * gibt es keinen Konsens oder keine Formel. Die Regeln unten sind daher Praxis-Heuristiken:
 * - schwerer (hohe %1RM) = mehr Rampensätze, leicht = weniger
 * - Muskel schon durch frühere Übungen belastet = weniger oder keine Sätze
 * - die Stange allein (z. B. 20 kg) ist bereits Aufwärmen, Sätze darunter entfallen
 */
export interface WarmupSet { weight: number | null; reps: number }

/**
 * Scheme-Defaults: Verbundübungen mit voller Rampe, Isolation (meist am Ende des Workouts) nur zwei leichte Sätze,
 * Core ohne Aufwärmen. Die Studienlage stützt vor allem spezifisches Aufwärmen nahe an schweren Lasten.
 */
const COMPOUND_RAMP: WarmupStep[] = [{ pct: 40, reps: 5 }, { pct: 60, reps: 5 }, { pct: 80, reps: 3 }]
const ISO_RAMP: WarmupStep[] = [{ pct: 50, reps: 10 }, { pct: 75, reps: 5 }]
const copy = (steps: WarmupStep[]) => steps.map((x) => ({ ...x }))
export const DEFAULT_WARMUP_SCHEMES: Record<RestCategory, WarmupStep[]> = {
  compoundUpper: copy(COMPOUND_RAMP),
  compoundLower: copy(COMPOUND_RAMP),
  isoUpper: copy(ISO_RAMP),
  isoLower: copy(ISO_RAMP),
  core: [],
}

export const cloneSchemes = (s: Record<RestCategory, WarmupStep[]>): Record<RestCategory, WarmupStep[]> =>
  ({ compoundUpper: [...s.compoundUpper], compoundLower: [...s.compoundLower], isoUpper: [...s.isoUpper], isoLower: [...s.isoLower], core: [...s.core] })

const NO_WARMUP: Equipment[] = ['bodyweight', 'band', 'cardio']
/** Leergewicht der Stange bzw. kleinste sinnvolle Last */
const MIN_LOAD: Partial<Record<Equipment, number>> = { barbell: 20, smith: 15 }
/** Leere Stange in lb-Ländern (45 lb) bzw. leere Smith-Maschine (35 lb) */
const MIN_LOAD_LB: Partial<Record<Equipment, number>> = { barbell: 45, smith: 35 }

export type Freshness = 'fresh' | 'partial' | 'primed'

export interface WarmupContext {
  equipment: Equipment
  compound: boolean
  isCore: boolean
  freshness: Freshness
  /** Anteil am 1RM des Arbeitssatzes (0-1), aus Ziel-Wdh. und RIR */
  intensity: number
}

/** Anteil am 1RM für `reps` Wiederholungen bei `rir` Reserve (Epley, umgekehrt). */
export const intensityOf = (reps: number, rir: number) => 1 / (1 + (Math.max(1, reps) + Math.max(0, rir)) / 30)

// Smart nutzt höchstens 3 Aufwärmsätze; Prozente und Wiederholungen wachsen mit der Schwere
const RAMP_COMPOUND: Record<number, WarmupStep[]> = {
  1: [{ pct: 60, reps: 5 }],
  2: [{ pct: 50, reps: 8 }, { pct: 75, reps: 4 }],
  3: [{ pct: 40, reps: 8 }, { pct: 60, reps: 5 }, { pct: 80, reps: 3 }],
}
const RAMP_ISO: Record<number, WarmupStep[]> = {
  1: [{ pct: 60, reps: 8 }],
  2: [{ pct: 50, reps: 10 }, { pct: 75, reps: 5 }],
}

/** Smart: Satzzahl (max. 3) aus Schwere (Intensität) und Frische des Muskels. Isolation: 2 Sätze. */
export function smartSteps(c: WarmupContext): WarmupStep[] {
  if (c.isCore || NO_WARMUP.includes(c.equipment)) return []
  let n = c.compound ? (c.intensity >= 0.78 ? 3 : 2) : 2
  if (c.freshness === 'partial') n -= 1
  if (c.freshness === 'primed') n = c.compound ? Math.max(n - 2, c.intensity >= 0.85 ? 1 : 0) : 0
  if (n <= 0) return []
  return (c.compound ? RAMP_COMPOUND : RAMP_ISO)[Math.min(n, c.compound ? 3 : 2)] ?? []
}

/** Schritte in Gewichte umrechnen (gerundet, Stange als Untergrenze, ohne Doppelte). */
export function stepsToSets(steps: WarmupStep[], workWeight: number | null, equipment: Equipment, unit: Settings['weightUnit'] = 'kg'): WarmupSet[] {
  if (steps.length === 0 || NO_WARMUP.includes(equipment)) return []
  if (workWeight == null || workWeight <= 0) return steps.map((s) => ({ weight: null, reps: s.reps }))
  const inc = incrementKg(equipment, unit) || 1
  const floor = (unit === 'lb' && MIN_LOAD_LB[equipment] ? MIN_LOAD_LB[equipment] * KG_PER_LB : MIN_LOAD[equipment]) ?? inc
  const out: WarmupSet[] = []
  for (const s of steps) {
    const weight = Math.max(floor, roundTo((workWeight * s.pct) / 100, inc))
    if (weight >= workWeight) continue
    if (out.some((o) => o.weight === weight)) continue
    out.push({ weight, reps: s.reps })
  }
  return out
}

export interface ResolveInput {
  /** Effektiver Modus nach Überschreibung ('default' bereits aufgelöst) */
  mode: 'smart' | 'scheme' | 'none'
  scheme: WarmupStep[]
  ctx: WarmupContext
  workWeight: number | null
  /** Anzeige-Einheit für die Rundung der Gewichte (Standard kg) */
  unit?: Settings['weightUnit']
}

export function resolveWarmupSteps({ mode, scheme, ctx }: Pick<ResolveInput, 'mode' | 'scheme' | 'ctx'>): WarmupStep[] {
  if (mode === 'none') return []
  return mode === 'smart' ? smartSteps(ctx) : scheme
}

export function resolveWarmup(i: ResolveInput): WarmupSet[] {
  return stepsToSets(resolveWarmupSteps(i), i.workWeight, i.ctx.equipment, i.unit)
}

/**
 * Neu berechnete Aufwärmsätze mit bereits vorhandenen (abgehakten) zusammenführen: Sätze, deren Gewicht schon
 * vorkommt, entfallen, damit keine doppelten Gewichte entstehen. Sätze ohne Gewicht (null) bleiben unberührt.
 */
export function dedupeWarmups<T extends { weight: number | null }>(fresh: T[], kept: { weight: number | null }[]): T[] {
  const seen = kept.flatMap((k) => (k.weight == null ? [] : [k.weight]))
  const out: T[] = []
  for (const f of fresh) {
    if (f.weight != null) {
      const w = f.weight
      if (seen.some((x) => Math.abs(x - w) < 0.05)) continue
      seen.push(w)
    }
    out.push(f)
  }
  return out
}

/** Modus der Übung: eigene Überschreibung, sonst App-Einstellung. */
export function effectiveMode(
  override: WarmupOverrideMode | undefined, appMode: 'smart' | 'scheme' | 'off',
): 'smart' | 'scheme' | 'none' {
  if (override === 'none') return 'none'
  if (override === 'smart' || override === 'scheme') return override
  return appMode === 'off' ? 'none' : appMode
}

/** Frische des Hauptmuskels: schon von früheren Übungen des Tages belastet? */
export function freshnessFor(
  dayExerciseIds: string[], index: number, lookup: (id: string) => Exercise | undefined,
): Freshness {
  const ex = lookup(dayExerciseIds[index])
  if (!ex) return 'fresh'
  const earlier = dayExerciseIds.slice(0, index).map(lookup).filter((e): e is Exercise => !!e && !e.cardio)
  if (earlier.some((o) => o.primary.some((m) => ex.primary.includes(m)))) return 'primed'
  if (earlier.some((o) => o.secondary.some((m) => ex.primary.includes(m)) || o.primary.some((m) => ex.secondary.includes(m)))) return 'partial'
  return 'fresh'
}

/** Ist die Übung an Index `index` die erste des Tages mit diesem Hauptmuskel? */
export function isFirstForMuscle(
  dayExerciseIds: string[], index: number, lookup: (id: string) => Exercise | undefined,
): boolean {
  const ex = lookup(dayExerciseIds[index])
  const muscle = ex?.primary[0]
  if (!ex || !muscle) return true
  return !dayExerciseIds.slice(0, index).some((id) => {
    const o = lookup(id)
    return !o?.cardio && o?.primary[0] === muscle
  })
}

/** Prozentwerte eines fertigen Aufwärmsatzes relativ zum Arbeitsgewicht (für die Anzeige) */
export function stepsFromSets(sets: WarmupSet[], workWeight: number | null): WarmupStep[] {
  return sets.map((s) => ({ pct: workWeight && s.weight ? Math.round((s.weight / workWeight) * 100) : 0, reps: s.reps }))
}
