import type { MediaTips } from './types'
import { TIPS_PART0 } from './tips-part0'
import { TIPS_PART1 } from './tips-part1'
import { TIPS_PART2 } from './tips-part2'

/** Deutsche Tipps, häufige Fehler, Atmung (und Anleitungen neu ergänzter Übungen), übersetzt aus free-exercise-db-with-videos (MIT). */
export const TIPS: Record<string, MediaTips> = { ...TIPS_PART0, ...TIPS_PART1, ...TIPS_PART2 }

export const tipsFor = (exerciseId: string): MediaTips | undefined => TIPS[exerciseId]
