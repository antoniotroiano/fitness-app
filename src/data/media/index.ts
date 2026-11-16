import map from './map.json'
import manifest from './manifest.json'

/** Übungsbilder (männliche Poster) aus free-exercise-db-with-videos (MIT), siehe THIRD_PARTY.md.
 *  `map.json`: App-Übungs-ID -> Repo-Slug, `manifest.json`: vorhandene Poster (von scripts/build-media.mjs erzeugt). */
export const MEDIA_MAP = map as Record<string, string>
const available = new Set<string>(manifest)

export function posterSlug(exerciseId: string): string | null {
  const slug = MEDIA_MAP[exerciseId]
  return slug && available.has(slug) ? slug : null
}

/** URL des Posters oder null, wenn für die Übung keins vorhanden ist. */
export function posterUrl(exerciseId: string): string | null {
  const slug = posterSlug(exerciseId)
  return slug ? `${import.meta.env.BASE_URL}exercise-media/poster/${slug}.jpg` : null
}
