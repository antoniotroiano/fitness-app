import type { Exercise } from '../types'
import { PUSH } from './instr/push'
import { PULL } from './instr/pull'
import { LEGS } from './instr/legs'
import { EXTRA } from './instr/extra'
import { TIPS } from './media/tips'

/** Kurze, selbst formulierte Ausführungsanleitungen pro Übungs-ID. */
const MEDIA_STEPS: Record<string, string[]> = Object.fromEntries(
  Object.entries(TIPS).flatMap(([id, t]) => (t.steps?.length ? [[id, t.steps]] : [])),
)
export const INSTRUCTIONS: Record<string, string[]> = { ...MEDIA_STEPS, ...PUSH, ...PULL, ...LEGS, ...EXTRA }

const FALLBACK: string[] = ['Für diese Übung liegt noch keine Anleitung vor.']

export function instructionsFor(ex: Pick<Exercise, 'id' | 'cardio' | 'custom' | 'description'>): string[] {
  if (ex.custom) return ex.description ? ex.description.split('\n').filter(Boolean) : ['Für diese Übung hast du noch keine Beschreibung eingetragen. Du kannst sie unter Bearbeiten ergänzen.']
  if (ex.cardio) return ['Wähle ein Tempo, das du über die gesamte Dauer halten kannst.', 'Trage Dauer und Distanz ein.']
  return INSTRUCTIONS[ex.id] ?? FALLBACK
}
