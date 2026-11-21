import type { Exercise, RestCategory, Settings } from '../types'
import { MUSCLES } from '../data/muscles'

/**
 * Pausen-Defaults in Sekunden (alle in den Einstellungen änderbar).
 * Grundlage: Schoenfeld et al. 2016 (3 vs. 1 min: mehr Kraft und Hypertrophie bei Trainierten),
 * Singer et al. 2024, "Give it a rest" (Frontiers in Sports and Active Living: kleiner Vorteil für Pausen > 60 s,
 * ab > 90 s für Hypertrophie kein weiterer Unterschied; längere Pausen erhalten bei Verbundübungen das Volumen),
 * ACSM: 2-3 min Hauptübungen, 1-2 min Assistenzübungen.
 */
export const DEFAULT_REST: Record<RestCategory, number> = {
  compoundUpper: 150,
  compoundLower: 180,
  isoUpper: 90,
  isoLower: 90,
  core: 60,
}

export const REST_LABEL: Record<RestCategory, string> = {
  compoundUpper: 'Verbund Oberkörper',
  compoundLower: 'Verbund Unterkörper',
  isoUpper: 'Isolation Oberkörper',
  isoLower: 'Isolation Unterkörper',
  core: 'Core',
}

export const REST_CATEGORIES = Object.keys(DEFAULT_REST) as RestCategory[]

export function restCategory(ex: Exercise): RestCategory {
  if (ex.pattern === 'core') return 'core'
  const region = MUSCLES.find((m) => m.id === ex.primary[0])?.region ?? 'upper'
  if (ex.compound) return region === 'lower' ? 'compoundLower' : 'compoundUpper'
  return region === 'lower' ? 'isoLower' : 'isoUpper'
}

type RestSettings = Pick<Settings, 'restSeconds' | 'warmupRestBetween' | 'warmupRestLast'>

/** Satzart für die Pause: Arbeitssatz, Aufwärmsatz mit weiteren Aufwärmsätzen danach, letzter Aufwärmsatz. */
export type RestAfter = 'work' | 'warmup' | 'lastWarmup'

/** Standard: kurz zwischen Aufwärmsätzen (leichte Last), länger vor dem ersten Arbeitssatz (Heuristik). */
export const DEFAULT_WARMUP_REST_BETWEEN = 30
export const DEFAULT_WARMUP_REST_LAST = 90

export function restSecondsFor(ex: Exercise, settings: RestSettings, after: RestAfter, override?: number): number {
  if (after === 'warmup') return settings.warmupRestBetween ?? DEFAULT_WARMUP_REST_BETWEEN
  if (after === 'lastWarmup') return settings.warmupRestLast ?? DEFAULT_WARMUP_REST_LAST
  if (override && override > 0) return override
  return settings.restSeconds[restCategory(ex)] ?? DEFAULT_REST[restCategory(ex)]
}

export function formatRest(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m} min` : m === 0 ? `${s} s` : `${m}:${String(s).padStart(2, '0')} min`
}
