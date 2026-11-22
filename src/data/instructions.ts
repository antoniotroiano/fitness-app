import type { Exercise } from '../types'
import { t } from '../i18n'
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

const FALLBACK = (): string[] => [t('Für diese Übung liegt noch keine Anleitung vor.')]

/** `en`: englische Schritte (aus `instructionsEn.ts`, nur bei Sprache „en“ geladen); fehlt ein Eintrag, gilt Deutsch. */
export function instructionsFor(ex: Pick<Exercise, 'id' | 'cardio' | 'custom' | 'description'>, en?: Record<string, string[]>): string[] {
  if (ex.custom) return ex.description ? ex.description.split('\n').filter(Boolean) : [t('Für diese Übung hast du noch keine Beschreibung eingetragen. Du kannst sie unter Bearbeiten ergänzen.')]
  if (ex.cardio) return [t('Wähle ein Tempo, das du über die gesamte Dauer halten kannst.'), t('Trage Dauer und Distanz ein.')]
  return en?.[ex.id] ?? INSTRUCTIONS[ex.id] ?? FALLBACK()
}
