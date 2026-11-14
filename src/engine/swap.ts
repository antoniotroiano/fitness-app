import type { Equipment, Exercise } from '../types'

/** Alternativen für dieselbe Hauptmuskelgruppe, bevorzugt gleiches Bewegungsmuster. */
export function alternatives(
  current: Exercise, all: Exercise[], excludeIds: string[] = [], equipment?: Equipment[],
): Exercise[] {
  const main = current.primary[0]
  return all
    .filter((e) => !e.cardio && e.id !== current.id && !excludeIds.includes(e.id))
    .filter((e) => e.primary.includes(main))
    .filter((e) => !equipment || equipment.includes(e.equipment))
    .sort((a, b) => score(b, current) - score(a, current))
}

function score(e: Exercise, cur: Exercise): number {
  return (e.pattern === cur.pattern ? 2 : 0) + (e.compound === cur.compound ? 1 : 0)
    + (e.primary[0] === cur.primary[0] ? 1 : 0)
}
