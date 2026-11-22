import type { MediaTips } from '../media/types'
import { TIPS_EN_PART0 } from './tips-part0'
import { TIPS_EN_PART1 } from './tips-part1'
import { TIPS_EN_PART2 } from './tips-part2'

/** Englische Tipps, häufige Fehler, Atmung (und Schritte neu ergänzter Übungen); Gegenstück zu `../media/tips.ts`. Wird nur bei Sprache „en“ geladen. */
export const TIPS_EN: Record<string, MediaTips> = { ...TIPS_EN_PART0, ...TIPS_EN_PART1, ...TIPS_EN_PART2 }
