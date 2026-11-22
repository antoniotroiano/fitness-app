import type { Program, Session } from '../../types'

/** Name der Einheit: Trainingstag des Programms, sonst „Training“ (importiert oder Programm gelöscht). */
export function sessionTitle(s: Session, programs: Program[]): string {
  const p = programs.find((x) => x.id === s.programId)
  return p?.days[s.dayIndex]?.name ?? (s.programId === null ? 'Importiertes Training' : 'Training')
}

export const sessionProgram = (s: Session, programs: Program[]) => programs.find((x) => x.id === s.programId)
