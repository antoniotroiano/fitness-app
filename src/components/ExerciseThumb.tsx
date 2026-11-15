import type { Exercise } from '../types'
import { MuscleThumb } from './MuscleFigure'

/** Einheitliches Vorschaubild einer Übung: Figur mit markierten Muskeln. */
export function ExerciseThumb({ ex, size = 56 }: { ex: Exercise; size?: number }) {
  if (ex.cardio) {
    return (
      <div className="rounded-xl bg-surface border border-line flex items-center justify-center text-2xl" style={{ width: size, height: size }}>🏃</div>
    )
  }
  return <MuscleThumb primary={ex.primary} secondary={ex.secondary} size={size} />
}
