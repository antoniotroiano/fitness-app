import { useState } from 'react'
import type { Exercise } from '../types'
import { posterUrl } from '../data/media'
import { ExerciseThumb } from './ExerciseThumb'

/** Übungsbild (Poster aus free-exercise-db-with-videos); ohne Bild oder bei Ladefehler das eigene Piktogramm. */
export function ExercisePhoto({ ex, size = 56 }: { ex: Exercise; size?: number }) {
  const url = ex.image ?? posterUrl(ex.id)
  const [failed, setFailed] = useState(false)
  if (!url || failed) return <ExerciseThumb ex={ex} size={size} />
  return (
    <img src={url} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)}
      className="rounded-xl bg-surface border border-line object-cover object-center shrink-0" style={{ width: size, height: size }} />
  )
}

/** Großes Bild im Info-Sheet (Platz für ein späteres Video, siehe docs/IDEAS-VIDEOS.md). */
export function ExerciseHero({ ex }: { ex: Exercise }) {
  const url = ex.image ?? posterUrl(ex.id)
  const [failed, setFailed] = useState(false)
  if (!url || failed) return null
  return (
    <img src={url} alt={ex.name} onError={() => setFailed(true)}
      className="w-full aspect-video object-cover rounded-2xl bg-surface2 border border-line mb-4" />
  )
}
