import type { Exercise } from '../types'

/**
 * Messgröße einer Übung: Wiederholungen (Standard), Zeit (Sekunden, Halten/Tragen) oder Distanz (Meter, Tragen/Schieben).
 * Bei Zeit und Distanz steht der Wert in `LoggedSet.reps`, es gibt kein 1RM/Volumen, kein Aufwärmen und keine
 * Wiederholungs-Schemata; das Gewicht (Zusatzlast) bleibt optional.
 */
export type Metric = NonNullable<Exercise['metric']>

export interface MetricRange { min: number; max: number }

/** Übung zählt keine Wiederholungen (Zeit oder Distanz). */
export const isRepless = (metric?: Metric | string): boolean => metric === 'time' || metric === 'distance'

/** Standardbereich je Messgröße; `undefined` = Wiederholungen (Bereich hängt von Ziel und Art ab). */
export const METRIC_RANGE: Partial<Record<Metric, MetricRange>> = {
  time: { min: 30, max: 60 },
  distance: { min: 20, max: 40 },
}
/** Schritt je Einheit, wenn die Obergrenze noch nicht erreicht ist: +5 s bzw. +5 m. */
export const METRIC_STEP: Partial<Record<Metric, number>> = { time: 5, distance: 5 }

/** Kurzes Einheitenkürzel für Bereiche und Ziele („Wdh“, „Sek“, „m“). */
export const metricUnit = (metric?: Metric | string): string => (metric === 'time' ? 'Sek' : metric === 'distance' ? 'm' : 'Wdh')
/** Spaltenkopf der Satztabelle. */
export const metricColumn = (metric?: Metric | string): string => (metric === 'time' ? 'Sek.' : metric === 'distance' ? 'm' : 'Wdh.')
/** Langer Name für das Zahlenfeld („Wiederholungen“, „Sekunden“, „Meter“). */
export const metricLabel = (metric?: Metric | string): string => (metric === 'time' ? 'Sekunden' : metric === 'distance' ? 'Meter' : 'Wiederholungen')
