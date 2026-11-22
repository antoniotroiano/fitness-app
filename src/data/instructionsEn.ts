import { PUSH_EN } from './instr-en/push'
import { PULL_EN } from './instr-en/pull'
import { LEGS_EN } from './instr-en/legs'
import { EXTRA_EN } from './instr-en/extra'
import { TIPS_EN } from './media-en/tips'

/** Englische Gegenstücke zu `instructions.ts` (gleiche IDs, gleiche Schrittzahl). Wird nur bei Sprache „en“ geladen. */
const MEDIA_STEPS_EN: Record<string, string[]> = Object.fromEntries(
  Object.entries(TIPS_EN).flatMap(([id, t]) => (t.steps?.length ? [[id, t.steps]] : [])),
)
export const INSTRUCTIONS_EN: Record<string, string[]> = { ...MEDIA_STEPS_EN, ...PUSH_EN, ...PULL_EN, ...LEGS_EN, ...EXTRA_EN }
