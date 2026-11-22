import type { Program, Session } from '../../types'
import { t } from '../../i18n'

/** Name der Einheit: Trainingstag des Programms, sonst „Training“ (importiert oder Programm gelöscht). */
export function sessionTitle(s: Session, programs: Program[]): string {
  const p = programs.find((x) => x.id === s.programId)
  return p?.days[s.dayIndex]?.name ?? (s.programId === null ? t('Importiertes Training') : t('Training'))
}

export const sessionProgram = (s: Session, programs: Program[]) => programs.find((x) => x.id === s.programId)
