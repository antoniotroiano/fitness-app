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

/** Einheit der Strecke einer Übung (Meter, wenn nicht anders gewählt). Der Wert in `reps` steht in dieser Einheit, es wird nie umgerechnet. */
export type DistanceUnit = NonNullable<Exercise['distanceUnit']>
export const distanceUnitOf = (ex?: Pick<Exercise, 'distanceUnit'>): DistanceUnit => (ex?.distanceUnit === 'yd' ? 'yd' : 'm')

/** Kurzes Einheitenkürzel für Bereiche und Ziele („Wdh“, „Sek“, „m“, „yd“). `dist`: Strecken-Einheit der Übung. */
export const metricUnit = (metric?: Metric | string, dist?: DistanceUnit): string => (metric === 'time' ? 'Sek' : metric === 'distance' ? (dist === 'yd' ? 'yd' : 'm') : 'Wdh')
/** Spaltenkopf der Satztabelle. */
export const metricColumn = (metric?: Metric | string, dist?: DistanceUnit): string => (metric === 'time' ? 'Sek.' : metric === 'distance' ? (dist === 'yd' ? 'yd' : 'm') : 'Wdh.')
/** Langer Name für das Zahlenfeld („Wiederholungen“, „Sekunden“, „Meter“). */
export const metricLabel = (metric?: Metric | string, dist?: DistanceUnit): string => (metric === 'time' ? 'Sekunden' : metric === 'distance' ? (dist === 'yd' ? 'Yards' : 'Meter') : 'Wiederholungen')
