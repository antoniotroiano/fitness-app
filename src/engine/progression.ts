import type { Equipment, LoggedSet, Session, Settings, WeightScale } from '../types'
import { effectiveStep, floorToScale, minOfScale, snapToScale, stepDown, stepUp } from './weightScale'
import { KG_PER_LB } from '../utils/units'

/** Kleinste Gewichtssprünge pro Equipment (kg). Konfigurierbare Defaults. */
export const INCREMENT: Record<Equipment, number> = {
  barbell: 2.5, smith: 2.5, machine: 2.5, cable: 2.5,
  dumbbell: 2, kettlebell: 4, bodyweight: 1, band: 1, cardio: 0,
}

/** Kleinste Gewichtssprünge in lb (Stange 5 lb, Kurzhantel 2,5 lb, Kettlebell 5 lb). */
const INCREMENT_LB: Record<Equipment, number> = {
  barbell: 5, smith: 5, machine: 5, cable: 5,
  dumbbell: 2.5, kettlebell: 5, bodyweight: 2.5, band: 2.5, cardio: 0,
}

/**
 * Gewichtssprung in kg für die gewählte Anzeige-Einheit. Bei lb ist es der lb-Schritt, umgerechnet:
 * Vielfache davon sind in lb glatte Werte (5 lb Stange, 2,5 lb Kurzhantel). Gespeichert wird weiter metrisch.
 */
export function incrementKg(equipment: Equipment, unit: Settings['weightUnit'] = 'kg'): number {
  return unit === 'lb' ? INCREMENT_LB[equipment] * KG_PER_LB : INCREMENT[equipment]
}

/** Maximaler Sprung pro Einheit in Prozent (Gewicht), nur für die Anpassung zwischen Sätzen */
const MAX_JUMP = 0.1
/** Maximaler e1RM-Zuwachs gegenüber dem bei Ziel-RIR erwartbaren e1RM, wenn die Obergrenze erreicht ist */
const MAX_E1RM_JUMP = 0.05

/** Annahme für Sätze ohne erfasstes RIR: überall gleich, damit Statistik und Progression dieselbe Einheit gleich bewerten. */
export const FALLBACK_RIR = 2
/** Ab dieser Zahl effektiver Wiederholungen (Wdh. + RIR) wächst der Epley-Faktor nur noch halb so schnell. */
const EPLEY_KNEE = 12

/**
 * Faktor 1RM / Arbeitsgewicht für `n` effektive Wiederholungen. Epley (1 + n/30), mit zwei Korrekturen:
 * eine einzelne Wiederholung ist das 1RM selbst (Faktor 1), und über 12 effektive Wiederholungen
 * überschätzt Epley zunehmend (Studien zu Vorhersagegleichungen), dort wächst der Faktor nur halb so schnell.
 */
function oneRmFactor(n: number): number {
  if (n <= 1) return 1
  if (n <= EPLEY_KNEE) return 1 + n / 30
  return 1 + EPLEY_KNEE / 30 + (n - EPLEY_KNEE) / 60
}

/** Geschätztes 1RM (Epley, gedämpft ab 12 effektiven Wdh.), Reserve-Wiederholungen werden zu den Wiederholungen addiert. */
export function e1rm(weight: number, reps: number, rir = 0): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * oneRmFactor(reps + Math.max(0, rir))
}

/** Gewicht, mit dem `reps` Wiederholungen bei `rir` Reserve möglich sein sollten (Umkehrung von `e1rm`). */
export function weightForReps(oneRm: number, reps: number, rir = 0): number {
  return oneRm / oneRmFactor(reps + Math.max(0, rir))
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 100) / 100
  return Math.round(value / step) * step
}

export interface RepRange { min: number; max: number }

export interface Suggestion {
  /** null = noch keine Historie, Nutzer wählt das Startgewicht selbst */
  weight: number | null
  reps: number
}

export interface SuggestInput {
  range: RepRange
  targetRir: number
  equipment: Equipment
  /** Sätze der letzten Einheit dieser Übung */
  last?: LoggedSet[]
  /** Plateau erkannt (siehe isStalled) */
  stalled?: boolean
  /** Assistierte Übung: das Gewicht ist die Unterstützung, weniger Gewicht = schwerer */
  assisted?: boolean
  /** Zeitübung: `reps` sind Sekunden, Progression +TIME_STEP s statt +1 Wdh. */
  metric?: 'reps' | 'time'
  /** Anzeige-Einheit: bestimmt die Rundung der Vorschläge (Standard kg) */
  unit?: Settings['weightUnit']
  /** Verfügbare Gerätegewichte (Override): Vorschläge liegen immer auf dieser Skala */
  scale?: WeightScale
}

/** Zeitübungen: Zuwachs pro Einheit in Sekunden */
export const TIME_STEP = 5

/** Startgewicht, wenn eine Körpergewichtsübung die Obergrenze erreicht hat (Zusatzgewicht, kg) */
export const BODYWEIGHT_ADDED_START = 2.5

/** Plateau-Reset: neues e1RM-Ziel relativ zur letzten Einheit */
export const STALL_RESET = 0.95
/** Fällt das e1RM zwischen zwei Einheiten um mehr als das, beginnt ein neuer Abschnitt (z. B. nach einem Reset). */
export const STALL_DROP = 0.02

export function suggestNext({ range, targetRir, equipment, last, stalled, assisted, metric, unit, scale }: SuggestInput): Suggestion {
  const inc = scale ? effectiveStep(scale) : incrementKg(equipment, unit)
  // Rundung und Schritte: auf der Gerätegewicht-Skala, sonst auf dem Equipment-Inkrement
  const snap = (w: number) => (scale ? snapToScale(w, scale) : roundTo(w, inc))
  const up = (w: number) => (scale ? stepUp(w, scale) : roundTo(w + (inc || 1), inc || 1))
  const down = (w: number) => (scale ? stepDown(w, scale) : roundTo(w - (inc || 1), inc || 1))
  const lowest = scale ? minOfScale(scale) : inc
  const worked = (last ?? []).filter((s) => !s.warmup && s.reps > 0)
  if (worked.length === 0) return { weight: null, reps: range.min }

  // Zeitübungen (Halten/Tragen): +5 s je Einheit; an der Obergrenze Zusatzlast (falls schon mit Gewicht) bzw. Zeit halten
  if (metric === 'time') {
    const held = Math.min(...worked.map((s) => s.reps))
    const load = Math.max(...worked.map((s) => s.weight))
    if (held < range.max) return { weight: load, reps: Math.min(range.max, Math.max(range.min, held + TIME_STEP)) }
    return load > 0 ? { weight: up(load), reps: range.min } : { weight: 0, reps: range.max }
  }

  // Reine Wiederholungs-Progression: Körpergewicht ohne Zusatzlast und assistierte Übungen
  const topWeight = Math.max(...worked.map((s) => s.weight))
  if (assisted || topWeight <= 0) {
    const assist = assisted ? Math.min(...worked.map((s) => s.weight)) : 0
    const atMax = Math.min(...worked.map((s) => s.reps)) >= range.max
    const minReps = Math.min(...worked.map((s) => s.reps))
    if (!atMax) return { weight: assist, reps: Math.min(range.max, Math.max(range.min, minReps + 1)) }
    if (assisted) {
      return assist > 0
        ? { weight: Math.max(0, down(assist)), reps: range.min }
        : { weight: 0, reps: range.max }
    }
    return { weight: BODYWEIGHT_ADDED_START, reps: range.min }
  }

  const sets = worked.filter((s) => s.weight > 0)
  const lastWeight = Math.max(...sets.map((s) => s.weight))
  const topSets = sets.filter((s) => s.weight === lastWeight)
  const minReps = Math.min(...topSets.map((s) => s.reps))
  const avgE1rm = sets.reduce((a, s) => a + e1rm(s.weight, s.reps, s.rir ?? FALLBACK_RIR), 0) / sets.length

  if (stalled) {
    // Reset über das e1RM (≈ −5 %), das Gewicht sinkt aber immer mindestens um einen Schritt
    const reset = snap(weightForReps(avgE1rm * STALL_RESET, range.min, targetRir))
    return { weight: Math.max(lowest, Math.min(reset, down(lastWeight))), reps: range.min }
  }

  // Alle Sätze am oberen Ende: Gewicht erhöhen, Wiederholungen zurück an die Untergrenze
  if (minReps >= range.max) {
    // Der Deckel wirkt auf den e1RM, nicht auf das Gewicht: ein Wechsel des Rep-Bereichs (z. B. 8–12 → 4–8)
    // verschiebt das Gewicht legitim um mehr als 10 %, der e1RM darf aber nur begrenzt wachsen.
    const candidate = snap(weightForReps(avgE1rm, range.min, targetRir))
    const floor = up(lastWeight)
    const capE1rm = e1rm(lastWeight, minReps, targetRir) * (1 + MAX_E1RM_JUMP)
    const capW = weightForReps(capE1rm, range.min, targetRir)
    const cap = Math.max(floor, scale ? floorToScale(capW, scale) : Math.floor(capW / inc) * inc)
    return { weight: Math.min(cap, Math.max(floor, candidate)), reps: range.min }
  }

  // Sonst: eine Wiederholung mehr; bei großer Abweichung wird aus dem e1RM neu gerechnet
  const reps = Math.min(range.max, Math.max(range.min, minReps + 1))
  const candidate = snap(weightForReps(avgE1rm, reps, targetRir))
  // Höchstens eine Stufe Abweichung: Gewicht halten (Hysterese)
  const near = scale ? candidate === up(lastWeight) || candidate === down(lastWeight) || candidate === lastWeight : Math.abs(candidate - lastWeight) <= inc
  // Mit Skala: war das letzte Gewicht nicht darauf (neue Einstellung), wird es auf die Skala gesetzt
  const weight = near ? (scale ? snap(lastWeight) : lastWeight) : candidate
  return { weight: Math.max(lowest, weight), reps }
}

/**
 * Plateau: die letzten beiden e1RM-Werte liegen nicht über dem davor (Toleranz 0,5 %).
 * Nach einem deutlichen Abfall (> STALL_DROP, z. B. Plateau-Reset) zählt nur noch die Historie ab dort,
 * so folgt nach einem Reset keine zweite Reduktion, bevor drei Einheiten auf dem neuen Niveau vorliegen.
 * Historie: e1RM je Einheit, älteste zuerst (Deload-Einheiten vorher entfernen).
 */
export function isStalled(history: number[]): boolean {
  let start = 0
  for (let i = 1; i < history.length; i++) if (history[i] < history[i - 1] * (1 - STALL_DROP)) start = i
  const h = history.slice(start)
  if (h.length < 3) return false
  const [a, b, c] = h.slice(-3)
  if (a <= 0) return false
  const tol = a * 0.005
  return b <= a + tol && c <= a + tol
}

/** e1RM einer Einheit: bester Satz */
export function sessionE1rm(sets: LoggedSet[], fallbackRir = FALLBACK_RIR): number {
  return Math.max(0, ...sets.filter((s) => !s.warmup).map((s) => e1rm(s.weight, s.reps, s.rir ?? fallbackRir)))
}

/**
 * Leistung einer Einheit für die Plateau-Erkennung: bestes Gewicht × Wiederholungen als 1RM-Schätzung **ohne**
 * RIR-Korrektur. Der Plan lässt über den Block die Wiederholungen steigen und den RIR sinken: wer ihn exakt
 * befolgt, hat dabei einen konstanten RIR-korrigierten e1RM, leistet aber mehr. Mit RIR-Korrektur wäre das
 * ein falsches Plateau (und ein Reset), ohne sie zählt es als Fortschritt.
 */
export function sessionPerformance(sets: LoggedSet[]): number {
  return Math.max(0, ...sets.filter((s) => !s.warmup).map((s) => e1rm(s.weight, s.reps, 0)))
}

/** Letzte Einheit einer Übung, getrennt in Aufwärm- und Arbeitssätze (Sortierung: Datum, dann finishedAt). */
export function previousSets(sessions: Session[], exerciseId: string): { warmups: LoggedSet[]; work: LoggedSet[] } {
  const last = sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt)
    .at(-1)
  const sets = last?.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? []
  return { warmups: sets.filter((s) => s.warmup), work: sets.filter((s) => !s.warmup) }
}

/** Abweichung zwischen Ist- und Plan-e1RM, ab der Folgesätze angepasst werden (±1 RIR liegt darunter, ±2 darüber). */
export const ADAPT_DEAD_ZONE = 0.035

/**
 * Gewicht eines noch offenen Folgesatzes nach einem abgehakten Satz. Verglichen wird der Satz mit seiner
 * eigenen Planung (Gewicht, Wdh., RIR): lief er wie geplant (±1 RIR ist normale Schätzungenauigkeit),
 * bleibt das geplante Gewicht des Folgesatzes. Sonst wird es um das Verhältnis der e1RM-Werte skaliert,
 * höchstens ±10 %. Ohne Planungsgewicht (neue Übung) dient das Gewicht des abgehakten Satzes als Basis.
 */
export function adaptNextWeight(
  done: { weight: number; reps: number; rir: number; planWeight?: number | null; planReps: number; planRir: number },
  nextPlanWeight: number | null, equipment: Equipment, unit: Settings['weightUnit'] = 'kg', scale?: WeightScale,
): number | null {
  if (done.weight <= 0 || done.reps <= 0 || done.planReps <= 0) return null
  const inc = (scale ? effectiveStep(scale) : incrementKg(equipment, unit)) || 1
  const snap = (w: number) => (scale ? snapToScale(w, scale) : roundTo(w, inc))
  const lowest = scale ? minOfScale(scale) : inc
  const planDone = done.planWeight ?? done.weight
  const ratio = e1rm(done.weight, done.reps, done.rir) / e1rm(planDone, done.planReps, done.planRir)
  const base = nextPlanWeight ?? done.weight
  if (Math.abs(ratio - 1) <= ADAPT_DEAD_ZONE) return Math.max(lowest, snap(base))
  const scaled = Math.min(base * (1 + MAX_JUMP), Math.max(base * (1 - MAX_JUMP), base * ratio))
  return Math.max(lowest, snap(scaled))
}
