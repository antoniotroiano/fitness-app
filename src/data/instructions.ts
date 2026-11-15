import type { Exercise } from '../types'
import { PUSH } from './instr/push'
import { PULL } from './instr/pull'
import { LEGS } from './instr/legs'
import { EXTRA } from './instr/extra'

/** Kurze, selbst formulierte Ausführungsanleitungen pro Übungs-ID. */
export const INSTRUCTIONS: Record<string, string[]> = { ...PUSH, ...PULL, ...LEGS, ...EXTRA }

const FALLBACK: string[] = ['Für diese Übung liegt noch keine Anleitung vor.']

export function instructionsFor(ex: Pick<Exercise, 'id' | 'cardio'>): string[] {
  if (ex.cardio) return ['Wähle ein Tempo, das du über die gesamte Dauer halten kannst.', 'Trage Dauer und Distanz ein.']
  return INSTRUCTIONS[ex.id] ?? FALLBACK
}
