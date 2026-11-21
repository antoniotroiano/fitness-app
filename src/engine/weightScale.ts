import type { WeightScale } from '../types'

/**
 * Verfügbare Gewichte eines Geräts (kg). Reine Funktionen: Vorschläge der Progression werden auf diese Stufen
 * gerundet. `range`: gleichmäßiges Raster von min bis max (Kabel, Maschine, Langhantel); `list`: beliebige
 * Einzelgewichte (Kurzhanteln, Kettlebells).
 */
const EPS = 1e-6
const clean = (n: number) => Math.round(n * 1000) / 1000

/** Liste sortiert, ohne Duplikate und ohne Werte ≤ 0 */
export function normalizeWeights(weights: number[]): number[] {
  return [...new Set(weights.filter((w) => Number.isFinite(w) && w > 0).map(clean))].sort((a, b) => a - b)
}

/** Höchster erreichbarer Rasterwert (max wird auf ein Vielfaches der Schrittweite ab min abgerundet). */
function rangeTop(s: Extract<WeightScale, { kind: 'range' }>): number {
  return clean(s.min + Math.floor((s.max - s.min) / s.step + EPS) * s.step)
}

export function minOfScale(s: WeightScale): number {
  if (s.kind === 'list') return normalizeWeights(s.weights)[0] ?? 0
  return s.min > 0 ? s.min : s.step
}

/** Nächstes verfügbares Gewicht (bei Gleichstand das höhere), geklemmt auf den Rand der Skala. */
export function snapToScale(w: number, s: WeightScale): number {
  if (s.kind === 'list') {
    const l = normalizeWeights(s.weights)
    if (l.length === 0) return w
    return l.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) - EPS || (Math.abs(Math.abs(x - w) - Math.abs(best - w)) <= EPS && x > best) ? x : best), l[0])
  }
  const top = rangeTop(s)
  const k = Math.round((w - s.min) / s.step + EPS)
  return clean(Math.min(top, Math.max(s.min, s.min + k * s.step)))
}

/** Größtes verfügbares Gewicht ≤ w (am unteren Rand: das kleinste). */
export function floorToScale(w: number, s: WeightScale): number {
  if (s.kind === 'list') {
    const l = normalizeWeights(s.weights)
    if (l.length === 0) return w
    return [...l].reverse().find((x) => x <= w + EPS) ?? l[0]
  }
  const k = Math.floor((w - s.min) / s.step + EPS)
  return clean(Math.min(rangeTop(s), Math.max(s.min, s.min + k * s.step)))
}

/** Nächsthöhere Stufe (strikt größer als w), am oberen Rand bleibt der Höchstwert. */
export function stepUp(w: number, s: WeightScale): number {
  if (s.kind === 'list') {
    const l = normalizeWeights(s.weights)
    if (l.length === 0) return w
    return l.find((x) => x > w + EPS) ?? l[l.length - 1]
  }
  const k = Math.floor((w - s.min) / s.step + EPS) + 1
  return clean(Math.min(rangeTop(s), Math.max(s.min, s.min + k * s.step)))
}

/** Nächstniedrigere Stufe (strikt kleiner als w), am unteren Rand bleibt der Mindestwert. */
export function stepDown(w: number, s: WeightScale): number {
  if (s.kind === 'list') {
    const l = normalizeWeights(s.weights)
    if (l.length === 0) return w
    return [...l].reverse().find((x) => x < w - EPS) ?? l[0]
  }
  const k = Math.ceil((w - s.min) / s.step - EPS) - 1
  return clean(Math.min(rangeTop(s), Math.max(s.min, s.min + k * s.step)))
}

/** Kleinster Abstand zweier Stufen (für Logik, die nur eine Schrittweite kennt). */
export function effectiveStep(s: WeightScale): number {
  if (s.kind === 'range') return s.step
  const l = normalizeWeights(s.weights)
  if (l.length === 0) return 1
  if (l.length === 1) return l[0]
  return Math.min(...l.slice(1).map((x, i) => clean(x - l[i])))
}

/** Gültigkeit für Eingabe-Dialoge */
export function isValidScale(s: WeightScale): boolean {
  if (s.kind === 'list') return normalizeWeights(s.weights).length > 0
  return s.step > 0 && s.min >= 0 && s.max > s.min
}
