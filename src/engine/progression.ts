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

/** Effektive Wiederholungen (Wdh. + RIR), die mit `weight` bei geschätztem 1RM `oneRm` möglich sind (Umkehrung des Faktors). */
export function effectiveRepsAt(oneRm: number, weight: number): number {
  if (weight <= 0 || oneRm <= 0) return 0
  const f = oneRm / weight
  if (f <= 1) return 1
  if (f <= 1 + EPLEY_KNEE / 30) return Math.max(1, (f - 1) * 30)
  return EPLEY_KNEE + (f - 1 - EPLEY_KNEE / 30) * 60
}

/** Gewicht, mit dem `reps` Wiederholungen bei `rir` Reserve möglich sein sollten (Umkehrung von `e1rm`). */
export function weightForReps(oneRm: number, reps: number, rir = 0): number {
  return oneRm / oneRmFactor(reps + Math.max(0, rir))
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 100) / 100
  return Math.round(value / step) * step
}

/**
 * Rundung und Gewichtsstufen eines Geräts: auf der Gerätegewicht-Skala, sonst auf dem Equipment-Inkrement.
 * `off` (Körperlast, siehe engine/bodyweight.ts): die Gewichte sind Gesamtlasten (Körperlast + Zusatzgewicht),
 * Stufen gelten für das Zusatzgewicht, und „ohne Zusatzgewicht“ (= `off`) ist die leichteste Stufe.
 */
export function loadSteps(equipment: Equipment, unit: Settings['weightUnit'] = 'kg', scale?: WeightScale, off = 0) {
  const inc = scale ? effectiveStep(scale) : incrementKg(equipment, unit)
  const step = inc || 1
  const baseLowest = scale ? minOfScale(scale) : inc
  const snapA = (a: number) => (scale ? snapToScale(a, scale) : roundTo(a, inc))
  const upA = (a: number) => (scale ? stepUp(a, scale) : roundTo(a + step, step))
  const downA = (a: number) => (scale ? stepDown(a, scale) : roundTo(a - step, step))
  const floorA = (a: number) => (scale ? floorToScale(a, scale) : Math.floor(a / step + 1e-9) * step)
  if (off <= 0) return { inc, snap: snapA, up: upA, down: downA, floor: floorA, lowest: baseLowest }
  const EPS = 1e-6
  const clean = (n: number) => Math.round(n * 1000) / 1000
  const add = (fn: (a: number) => number) => (w: number) => clean(off + Math.max(0, fn(w - off)))
  return {
    inc,
    snap: add((a) => (a <= baseLowest / 2 + EPS ? 0 : snapA(a))),
    up: add((a) => (a < baseLowest - EPS ? baseLowest : upA(a))),
    down: add((a) => (a <= baseLowest + EPS ? 0 : downA(a))),
    floor: add((a) => (a < baseLowest - EPS ? 0 : floorA(a))),
    lowest: off,
  }
}

export interface RepRange { min: number; max: number }

export interface Suggestion {
  /** null = noch keine Historie, Nutzer wählt das Startgewicht selbst */
  weight: number | null
  reps: number
  /**
   * Gewichtsstufe zu groß (siehe EXTEND_REPS): `extend` = Gewicht gehalten, Wdh. über der Obergrenze, bis die
   * nächste Stufe im Bereich machbar ist; `gap` = Bereich mit dieser Stufe nicht erreichbar, Sprung mit weniger Wdh.
   */
  note?: 'extend' | 'gap'
  /** Bei `note`: die nächste Gewichtsstufe (wie `weight`) */
  nextWeight?: number
  /** Warum dieser Vorschlag (siehe explainSuggestion); von suggestNext gesetzt */
  reason?: SuggestionReason
  /** `check` = auffällige Änderung gegenüber der letzten Einheit, bitte prüfen; sonst `info` */
  level?: 'info' | 'check'
  /** Letzte Einheit: schwerstes Gewicht und schwächste Wdh. daran (Zusatzgewicht bei Körperlast), für den Begründungstext */
  prev?: { weight: number; reps: number }
}

/**
 * Gründe eines Vorschlags: `start` keine Historie, `time` Zeitübung, `reps` nur Wdh. (Körpergewicht/assistiert) bzw. +1 Wdh.,
 * `bwLoad` erstes Zusatzgewicht, `top` Obergrenze erreicht → schwerer, `up`/`down` Gewicht aus dem e1RM angepasst,
 * `hold` Gewicht und Wdh. wie zuletzt, `stall` Plateau-Reset, `break` nach Trainingspause gedeckelt, `extend`/`gap` Gerätegrenze.
 */
export type SuggestionReason = 'start' | 'time' | 'reps' | 'bwLoad' | 'top' | 'up' | 'down' | 'hold' | 'stall' | 'break' | 'extend' | 'gap'

/** Gewichtsänderung über diesem Anteil oder Wdh.-Sprung über dieser Zahl gegenüber der letzten Einheit: Stufe `check` */
export const CHECK_WEIGHT_CHANGE = 0.1
export const CHECK_REPS_CHANGE = 3

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
  /** Tage seit der letzten Einheit dieser Übung: nach langen Pausen startet der Vorschlag niedriger */
  daysSince?: number
  /**
   * Körperlast heute (Anteil × Körpergewicht, kg, siehe engine/bodyweight.ts). Gesetzt: gerechnet wird mit der
   * Gesamtlast (Körperlast + Zusatzgewicht), `last` und das Ergebnis bleiben Zusatzgewichte (Ergebnis ≥ 0).
   */
  bodyLoad?: number
  /** Körperlast am Tag der letzten Einheit (fehlt: wie `bodyLoad`) */
  lastBodyLoad?: number
  /**
   * Zielwert: `min` = klassische Double Progression (nach einer Steigerung zurück an die Untergrenze),
   * `mid` = Gewicht und Wdh. so wählen, dass die Wdh. möglichst in der Mitte des Bereichs liegen (Standard: min).
   */
  target?: 'min' | 'mid'
  /** Nur bei `mid`: Gewicht halten, solange die Wdh. damit im Bereich bleiben (Standard: an) */
  weightMatch?: boolean
  /** Bereich über die Obergrenze erweitern, wenn die nächste Gewichtsstufe zu groß ist (Standard: an, siehe EXTEND_REPS) */
  expandRange?: boolean
}

/** Zeitübungen: Zuwachs pro Einheit in Sekunden */
export const TIME_STEP = 5

/** Startgewicht, wenn eine Körpergewichtsübung die Obergrenze erreicht hat (Zusatzgewicht, kg) */
export const BODYWEIGHT_ADDED_START = 2.5

/**
 * Trainingspause: bis 3 Wochen kein Abschlag, danach 1,5 % e1RM je Woche über 2 Wochen hinaus, höchstens 15 %.
 * Kalibriert am Trainingsverlauf des Nutzers: nach ~8 Wochen Pause lag das e1RM typisch 5–15 % (Median ≈ 8 %) niedriger.
 */
export const DETRAIN_GRACE_DAYS = 21
const DETRAIN_PER_WEEK = 0.015
const DETRAIN_MAX = 0.15
export function detrainFactor(daysSince?: number): number {
  if (!daysSince || daysSince <= DETRAIN_GRACE_DAYS) return 1
  return 1 - Math.min(DETRAIN_MAX, (DETRAIN_PER_WEEK * (daysSince - 14)) / 7)
}

/**
 * Equipment-Grenzen: Ist die nächste Gewichtsstufe so groß, dass damit selbst die Untergrenze (−1 Wdh.) bei Ziel-RIR
 * nicht machbar ist (typisch: leichte Kurzhanteln in 2-kg-Schritten, Seitheben 10 → 12 kg = +20 %), bleibt das Gewicht
 * und die Wdh. steigen über die Obergrenze, bis der e1RM die Stufe trägt. Höchstens EXTEND_REPS × Obergrenze darüber
 * (15 → 19, 10 → 13); danach Sprung mit den machbaren Wdh. und Hinweis „nicht erreichbar“.
 */
export const EXTEND_REPS = 0.25
const extendCap = (range: RepRange) => range.max + Math.max(2, Math.ceil(range.max * EXTEND_REPS))

/** Plateau-Reset: neues e1RM-Ziel relativ zur letzten Einheit */
export const STALL_RESET = 0.95
/** Fällt das e1RM zwischen zwei Einheiten um mehr als das, beginnt ein neuer Abschnitt (z. B. nach einem Reset). */
export const STALL_DROP = 0.02

/** Vorschlag mit Begründung (`reason`, `level`, `prev`): die Anzeige im Logger und in der Vorschau. */
export function suggestExplained(input: SuggestInput): Suggestion {
  return explainSuggestion(input, suggestNext(input))
}

/**
 * Begründung und Warnstufe zu einem Vorschlag, aus Eingabe und Ergebnis abgeleitet (die Rechenwege bleiben unberührt).
 * Stufe `check`, wenn das Gewicht um mehr als CHECK_WEIGHT_CHANGE oder die Wdh. um mehr als CHECK_REPS_CHANGE von der
 * letzten Einheit abweichen (nicht bei Start, Plateau-Reset und Pause: dort ist die Änderung erwartet).
 */
export function explainSuggestion(input: SuggestInput, sug: Suggestion): Suggestion {
  const worked = (input.last ?? []).filter((s) => !s.warmup && !s.segment && s.reps > 0)
  if (sug.weight == null || worked.length === 0) return { ...sug, reason: 'start', level: 'info' }
  const topWeight = Math.max(...worked.map((s) => s.weight))
  const topSets = worked.filter((s) => s.weight === topWeight)
  const prev = { weight: topWeight, reps: Math.min(...topSets.map((s) => s.reps)) }
  const done = (reason: SuggestionReason, level: 'info' | 'check' = 'info'): Suggestion => ({ ...sug, reason, level, prev })
  if (input.metric === 'time') return done('time')
  const bodyOnly = input.assisted || topWeight <= 0
  if (bodyOnly) return done(!input.assisted && sug.weight > 0 ? 'bwLoad' : 'reps')
  if (input.stalled) return done('stall')
  if (detrainFactor(input.daysSince) < 1) {
    const without = suggestNext({ ...input, daysSince: undefined })
    if (without.weight !== sug.weight) return done('break')
  }
  const eps = 1e-6
  const w = sug.weight
  const big = Math.abs(w - prev.weight) > prev.weight * CHECK_WEIGHT_CHANGE + eps || Math.abs(sug.reps - prev.reps) > CHECK_REPS_CHANGE
  const level = big ? 'check' : 'info'
  if (sug.note) return done(sug.note, level)
  if (w > prev.weight + eps) return done(prev.reps >= input.range.max ? 'top' : 'up', level)
  if (w < prev.weight - eps) return done('down', level)
  return done(sug.reps > prev.reps ? 'reps' : 'hold', level)
}

export function suggestNext(input: SuggestInput): Suggestion {
  const off = input.bodyLoad && input.bodyLoad > 0 && !input.assisted && input.metric !== 'time' ? input.bodyLoad : 0
  if (off <= 0) return suggestTotal(input, 0, 0)
  const lastOff = input.lastBodyLoad && input.lastBodyLoad > 0 ? input.lastBodyLoad : off
  const last = input.last?.map((s) => (s.warmup || s.reps <= 0 ? s : { ...s, weight: s.weight + lastOff }))
  const sug = suggestTotal({ ...input, last }, off, lastOff)
  if (sug.weight == null) return sug
  // Gesamtlast → Zusatzgewicht
  const added = (w: number) => Math.max(0, Math.round((w - off) * 1000) / 1000)
  return { ...sug, weight: added(sug.weight), ...(sug.nextWeight != null ? { nextWeight: added(sug.nextWeight) } : {}) }
}

/** `off`/`lastOff`: Körperlast heute/in der letzten Einheit; Gewichte in `last` und im Ergebnis sind dann Gesamtlasten. */
function suggestTotal({ range, targetRir, equipment, last, stalled, assisted, metric, unit, scale, daysSince, target = 'min', weightMatch = true, expandRange = true }: SuggestInput, off: number, lastOff: number): Suggestion {
  const { inc, snap, up, down, floor, lowest } = loadSteps(equipment, unit, scale, off)
  const worked = (last ?? []).filter((s) => !s.warmup && !s.segment && s.reps > 0)
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
  // Nach langer Pause: Gewicht höchstens so hoch, wie das reduzierte e1RM für die vorgeschlagenen Wdh. erlaubt
  const detrain = detrainFactor(daysSince)
  const afterBreak = (sug: Suggestion): Suggestion => {
    if (detrain >= 1 || sug.weight == null) return sug
    const capped = snap(weightForReps(avgE1rm * detrain, sug.reps, targetRir))
    return { ...sug, weight: Math.max(lowest, Math.min(sug.weight, capped)) }
  }

  if (stalled) {
    // Reset über das e1RM (≈ −5 %), das Gewicht sinkt aber immer mindestens um einen Schritt
    const resetReps = target === 'mid' ? midOf(range) : range.min
    const reset = snap(weightForReps(avgE1rm * STALL_RESET, resetReps, targetRir))
    return afterBreak({ weight: Math.max(lowest, Math.min(reset, down(lastWeight))), reps: resetReps })
  }

  // Halten heißt bei Körperlast: gleiches Zusatzgewicht (die Körperlast kann sich seit der letzten Einheit geändert haben)
  // Ohne Geräteliste bleibt das Zusatzgewicht exakt (eine 2,5-kg-Scheibe wird nicht auf die 1-kg-Schritte gerundet)
  const held = off > 0 ? (scale ? snap(off + lastWeight - lastOff) : Math.round((off + lastWeight - lastOff) * 1000) / 1000) : scale ? snap(lastWeight) : lastWeight
  const firstAdded = off > 0 && lastWeight - lastOff <= 1e-6 && minReps >= range.max
  if (target === 'mid' && !firstAdded) {
    return afterBreak(suggestMid({ range, targetRir, sets: topSets, minReps, held, lowest, snap, up, down, weightMatch, expandRange }))
  }

  // Alle Sätze am oberen Ende: Gewicht erhöhen, Wiederholungen zurück an die Untergrenze
  if (minReps >= range.max) {
    // Körpergewicht ohne Zusatz → erstes Zusatzgewicht: sanfter Einstieg mit der kleinsten Stufe
    // (BODYWEIGHT_ADDED_START bzw. kleinstes Gerätegewicht) und so vielen Wdh., wie das e1RM bei Ziel-RIR hergibt,
    // statt mit vollem Sprung zurück an die Untergrenze (3 × 10 Klimmzüge → +2,5 kg × 8 statt +8 kg × 6).
    if (firstAdded) {
      const start = scale ? minOfScale(scale) : BODYWEIGHT_ADDED_START
      const total = off + start
      const reps = Math.min(range.max, Math.max(range.min, Math.floor(effectiveRepsAt(avgE1rm, total) - targetRir + 1e-9)))
      return afterBreak({ weight: total, reps })
    }
    // Der Deckel wirkt auf den e1RM, nicht auf das Gewicht: ein Wechsel des Rep-Bereichs (z. B. 8–12 → 4–8)
    // verschiebt das Gewicht legitim um mehr als 10 %, der e1RM darf aber nur begrenzt wachsen.
    const candidate = snap(weightForReps(avgE1rm, range.min, targetRir))
    const minUp = up(lastWeight)
    const extCap = expandRange ? extendCap(range) : range.max
    // Keine schwerere Stufe verfügbar (Ende der Geräteliste): Gewicht halten, Wdh. bis zur erweiterten Grenze
    if (minUp <= lastWeight + 1e-6) return afterBreak({ weight: lastWeight, reps: Math.min(extCap, minReps + 1), note: 'gap' })
    // Machbare Wdh. mit der nächsten Stufe; reicht es nicht einmal für die Untergrenze − 1: Bereich erweitern.
    // Hier ungedämpfter Epley: die Dämpfung ab 12 Wdh. ist für die 1RM-Schätzung bewusst vorsichtig, überschätzt aber
    // den Wdh.-Verlust beim Sprung (+10 % ≈ −8 Wdh. statt ≈ −3 bis −4 nach RM-Tabellen).
    const plainE1rm = sets.reduce((a, s) => a + s.weight * (1 + (s.reps + Math.max(0, s.rir ?? FALLBACK_RIR)) / 30), 0) / sets.length
    const repsAtUp = Math.floor(30 * (plainE1rm / minUp - 1) - targetRir + 1e-9)
    if (repsAtUp < range.min - 1 && candidate <= minUp) {
      if (minReps < extCap) return afterBreak({ weight: lastWeight, reps: minReps + 1, note: 'extend', nextWeight: minUp })
      // Ohne Erweiterung: Sprung, Ziel bleibt die Untergrenze (Hinweis „nicht erreichbar“)
      return afterBreak({ weight: minUp, reps: expandRange ? Math.max(1, repsAtUp) : range.min, note: 'gap', nextWeight: minUp })
    }
    const capE1rm = e1rm(lastWeight, minReps, targetRir) * (1 + MAX_E1RM_JUMP)
    const capW = weightForReps(capE1rm, range.min, targetRir)
    const cap = Math.max(minUp, floor(capW))
    return afterBreak({ weight: Math.min(cap, Math.max(minUp, candidate)), reps: range.min })
  }

  // Sonst: eine Wiederholung mehr; bei großer Abweichung wird aus dem e1RM neu gerechnet
  const reps = Math.min(range.max, Math.max(range.min, minReps + 1))
  const candidate = snap(weightForReps(avgE1rm, reps, targetRir))
  // Höchstens eine Stufe Abweichung: Gewicht halten (Hysterese)
  // Mit Körperlast ist der Schritt (1 kg) klein gegenüber der Gesamtlast: Toleranz dann ≈ eine Wdh. (Last/30, Epley)
  const tol = off > 0 ? Math.max(inc, lastWeight / 30) : inc
  const near = scale && off <= 0 ? candidate === up(lastWeight) || candidate === down(lastWeight) || candidate === lastWeight : Math.abs(candidate - lastWeight) <= tol
  // Mit Skala: war das letzte Gewicht nicht darauf (neue Einstellung), wird es auf die Skala gesetzt
  const weight = near ? held : candidate
  return afterBreak({ weight: Math.max(lowest, weight), reps })
}

/** Mitte des Wdh.-Bereichs (abgerundet: 6–10 → 8, 12–15 → 13) */
export const midOf = (range: RepRange) => Math.floor((range.min + range.max) / 2)

/**
 * Zielwert Mitte: Ziel-e1RM = eine Wdh. mehr als der schwächste Satz mit dem Top-Gewicht (mit dessen RIR),
 * höher nur, wenn die Einheit insgesamt mehr hergab (höchstens MAX_E1RM_JUMP darüber). Kandidaten: die Stufen um das
 * gehaltene Gewicht und das Gewicht für die Mitte. Je Kandidat die machbaren Wdh. bei Ziel-RIR; gewählt wird
 * - mit Weight Match das gehaltene Gewicht, solange seine Wdh. im Bereich liegen (= Double Progression bis zur Obergrenze),
 * - sonst das Gewicht mit Wdh. am nächsten an der Mitte (bei Gleichstand das gehaltene bzw. schwerere).
 * Liegt keine Stufe im Bereich: über die Obergrenze erweitern (bis EXTEND_REPS) oder Sprung mit Hinweis.
 */
function suggestMid({ range, targetRir, sets, minReps, held, lowest, snap, up, down, weightMatch, expandRange }: {
  range: RepRange; targetRir: number; sets: LoggedSet[]; minReps: number; held: number; lowest: number
  snap: (w: number) => number; up: (w: number) => number; down: (w: number) => number; weightMatch: boolean; expandRange: boolean
}): Suggestion {
  const mid = midOf(range)
  // Ungedämpfter Epley (wie bei den Equipment-Grenzen): die Dämpfung ab 12 Wdh. ist für die 1RM-Schätzung gedacht und
  // würde den Wdh.-Verlust beim Wechsel der Gewichtsstufe überschätzen.
  const est = (w: number, reps: number, rir: number) => w * (1 + (reps + Math.max(0, rir)) / 30)
  const rirOf = (s: LoggedSet) => s.rir ?? FALLBACK_RIR
  const avg = sets.reduce((a, s) => a + est(s.weight, s.reps, rirOf(s)), 0) / sets.length
  const plusOne = Math.min(...sets.map((s) => est(s.weight, s.reps + 1, rirOf(s))))
  const cap = Math.min(...sets.map((s) => est(s.weight, s.reps, rirOf(s)))) * (1 + MAX_E1RM_JUMP)
  const goal = Math.max(plusOne, Math.min(avg, cap))
  const repsAt = (w: number) => Math.floor(30 * (goal / w - 1) - targetRir + 1e-9)

  const cands = new Set<number>([held])
  let d = held, u = held
  for (let i = 0; i < 3; i++) { d = Math.max(lowest, down(d)); cands.add(d) }
  for (let i = 0; i < 4; i++) { u = up(u); cands.add(u) }
  const atMid = snap(goal / (1 + (mid + targetRir) / 30))
  if (atMid >= lowest) cands.add(atMid)
  const list = [...cands].filter((w) => w > 0).sort((a, b) => a - b).map((w) => ({ w, r: repsAt(w) }))
  const inRange = list.filter((c) => c.r >= range.min && c.r <= range.max)
  const heldC = list.find((c) => c.w === held) ?? { w: held, r: repsAt(held) }

  if (weightMatch && heldC.r >= range.min && heldC.r <= range.max) return { weight: held, reps: heldC.r }
  if (inRange.length) {
    const score = (c: { w: number; r: number }) => Math.abs(c.r - mid)
    const best = inRange.reduce((a, c) => (score(c) < score(a) || (score(c) === score(a) && (c.w === held || (a.w !== held && c.w > a.w))) ? c : a))
    return { weight: best.w, reps: best.r }
  }

  // Keine Stufe im Bereich: die Stufen springen über den Bereich hinweg
  const lighter = [...list].reverse().find((c) => c.r > range.max)
  const heavier = list.find((c) => c.r < range.min)
  const extCap = expandRange ? extendCap(range) : range.max
  if (lighter && (!heavier || (expandRange && minReps < extCap && lighter.w >= held - 1e-6))) {
    // Leichtere Stufe mit Wdh. über dem Bereich (Ende der Geräteliste oder Erweiterung)
    if (!heavier) return { weight: lighter.w, reps: Math.min(extCap, lighter.r), note: 'gap' }
    return { weight: lighter.w, reps: Math.min(extCap, Math.max(range.max + 1, Math.min(lighter.r, minReps + 1))), note: 'extend', nextWeight: heavier.w }
  }
  if (heavier) return { weight: heavier.w, reps: expandRange ? Math.max(1, heavier.r) : range.min, note: 'gap', nextWeight: heavier.w }
  return { weight: held, reps: range.min }
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
  return Math.max(0, ...sets.filter((s) => !s.warmup && !s.segment).map((s) => e1rm(s.weight, s.reps, s.rir ?? fallbackRir)))
}

/**
 * Leistung einer Einheit für die Plateau-Erkennung: bestes Gewicht × Wiederholungen als 1RM-Schätzung **ohne**
 * RIR-Korrektur. Der Plan lässt über den Block die Wiederholungen steigen und den RIR sinken: wer ihn exakt
 * befolgt, hat dabei einen konstanten RIR-korrigierten e1RM, leistet aber mehr. Mit RIR-Korrektur wäre das
 * ein falsches Plateau (und ein Reset), ohne sie zählt es als Fortschritt.
 */
export function sessionPerformance(sets: LoggedSet[]): number {
  return Math.max(0, ...sets.filter((s) => !s.warmup && !s.segment).map((s) => e1rm(s.weight, s.reps, 0)))
}

/** Letzte Einheit einer Übung, getrennt in Aufwärm- und Arbeitssätze (Sortierung: Datum, dann finishedAt). */
export function previousSets(sessions: Session[], exerciseId: string): { warmups: LoggedSet[]; work: LoggedSet[] } {
  const last = sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt)
    .at(-1)
  const sets = last?.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? []
  // Drop-/Myo-Segmente gehören zum Satz davor: weder Vergleichszeile noch Grundlage der Progression
  return { warmups: sets.filter((s) => s.warmup), work: sets.filter((s) => !s.warmup && !s.segment) }
}

/** Abweichung zwischen Ist- und Plan-e1RM, ab der Folgesätze angepasst werden (±1 RIR liegt darunter, ±2 darüber). */
export const ADAPT_DEAD_ZONE = 0.035

/**
 * Ermüdung zwischen Arbeitssätzen: effektive Wdh. (Wdh. + RIR), die je Folgesatz mit gleichem Gewicht wegfallen.
 * Aus dem Trainingsverlauf des Nutzers (222 Satzpaare, gleiches Gewicht): Median 1, Mittel 1,15.
 */
export const FATIGUE_REPS = 1
/** Maximale Gewichtsänderung beim Kalibrieren (erster Satz einer Übung ohne Verlauf) */
const CALIBRATION_JUMP = 0.2

export interface DoneSet {
  weight: number; reps: number; rir: number
  /** Geplantes Gewicht; null/undefined = kein Plan (Übung ohne Verlauf): der Satz kalibriert */
  planWeight?: number | null
  planReps: number; planRir: number
}

/**
 * Gewicht und Wdh. der noch offenen Folgesätze (`nexts`, in Reihenfolge) nach einem abgehakten Satz.
 * Lief der Satz wie geplant (±1 RIR ist normale Schätzungenauigkeit), bleibt der Plan (alle null).
 * Sonst wird aus dem abgehakten Satz (Epley) gerechnet, mit Ermüdung (`FATIGUE_REPS` je Satz Abstand) und dem
 * Ziel-RIR jedes Satzes. Das Gewicht wird einmal für den nächsten Satz gewählt: das geplante bleibt, solange die
 * Wdh. im Zielbereich liegen (eine darunter ist erlaubt), sonst stufenweise angepasst, höchstens ±10 % (beim
 * Kalibrieren ohne Plan ±20 %, Basis = Gewicht des abgehakten Satzes). Spätere Sätze behalten es und verlieren
 * nur Wdh.; erst wenn sie unter den Bereich fallen, sinkt das Gewicht weiter.
 */
export function adaptNextSets(
  done: DoneSet,
  nexts: { planWeight: number | null; rir: number }[],
  range: RepRange, equipment: Equipment, unit: Settings['weightUnit'] = 'kg', scale?: WeightScale,
  /** Körperlast (kg): alle Gewichte hier sind Zusatzgewichte, gerechnet wird mit der Gesamtlast */
  bodyLoad = 0,
): ({ weight: number; reps: number } | null)[] {
  if (bodyLoad > 0) {
    const plus = (w: number | null | undefined) => (w == null ? w : w + bodyLoad)
    const res = adaptTotal(
      { ...done, weight: done.weight + bodyLoad, planWeight: plus(done.planWeight) },
      nexts.map((n) => ({ ...n, planWeight: plus(n.planWeight) as number | null })),
      range, equipment, unit, scale, bodyLoad,
    )
    return res.map((r) => (r ? { ...r, weight: Math.max(0, Math.round((r.weight - bodyLoad) * 1000) / 1000) } : r))
  }
  return adaptTotal(done, nexts, range, equipment, unit, scale, 0)
}

function adaptTotal(
  done: DoneSet, nexts: { planWeight: number | null; rir: number }[],
  range: RepRange, equipment: Equipment, unit: Settings['weightUnit'], scale: WeightScale | undefined, off: number,
): ({ weight: number; reps: number } | null)[] {
  const none = nexts.map(() => null)
  if (done.weight <= 0 || done.reps <= 0 || nexts.length === 0) return none
  const calibrating = done.planWeight == null
  if (!calibrating && done.planReps > 0) {
    const ratio = e1rm(done.weight, done.reps, done.rir) / e1rm(done.planWeight as number, done.planReps, done.planRir)
    if (Math.abs(ratio - 1) <= ADAPT_DEAD_ZONE) return none
  }
  const { snap, up, down, lowest } = loadSteps(equipment, unit, scale, off)
  // Innerhalb der Einheit reine Epley-Umrechnung relativ zum abgehakten Satz: im Backtest (332 Folgesätze) trifft sie
  // leichtere Folgesätze deutlich besser als die gedämpfte Variante (mittlerer Fehler 1,8 statt 3,5 eff. Wdh.)
  const doneEff = done.reps + Math.max(0, done.rir)
  const epleyRm = done.weight * (1 + doneEff / 30)
  const effAt = (w: number) => (w === done.weight ? doneEff : Math.max(1, (epleyRm / w - 1) * 30))
  const repsAt = (w: number, gap: number, rir: number) => Math.floor(effAt(w) - FATIGUE_REPS * gap + 1e-9) - rir
  const base = snap(calibrating ? done.weight : (nexts[0].planWeight ?? done.weight))
  const jump = calibrating ? CALIBRATION_JUMP : MAX_JUMP
  const floorW = Math.max(lowest, base * (1 - jump))
  const lower = (w: number, gap: number, rir: number) => {
    while (repsAt(w, gap, rir) < range.min - 1) {
      const d = down(w)
      if (d >= w || d < floorW) break
      w = d
    }
    return w
  }
  // Nächster Satz: zu schwer → senken, deutlich zu leicht → steigern, solange der Schritt im Zielbereich bleibt
  const r0 = nexts[0].rir
  let w = lower(Math.max(lowest, base), 1, r0)
  while (repsAt(w, 1, r0) > range.max) {
    const u = up(w)
    if (u <= w || u > base * (1 + jump) || repsAt(u, 1, r0) < range.min) break
    w = u
  }
  return nexts.map((n, k) => {
    if (k > 0) w = lower(w, k + 1, n.rir)
    return { weight: w, reps: Math.max(1, Math.min(range.max, repsAt(w, k + 1, n.rir))) }
  })
}
