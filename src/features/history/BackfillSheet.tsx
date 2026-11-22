import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet, Button, Chip, inputCls } from '../../components/ui'
import { usePrograms, useSessions, useWeekState } from '../../db/db'
import { maxReachedWeek, weekOptions } from '../../engine/weekCycle'
import { todayStr } from '../../utils/dates'
import { t } from '../../i18n'

/** Route-Parameter eines nachgetragenen Workouts: `p<Programm>-d<Tag>@<Datum>@<Woche>` (siehe Logger `parseParam`). */
export const backfillParam = (programId: number, dayIdx: number, date: string, week: number) => `p${programId}-d${dayIdx}@${date}@${week}`

/** Workout nachtragen: Datum, Programm, Trainingstag und Woche wählen, dann im Logger erfassen. */
export function BackfillSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const programs = usePrograms()
  const sessions = useSessions()
  const week = useWeekState()
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [programId, setProgramId] = useState<number | null>(null)
  const [day, setDay] = useState(0)
  const [wk, setWk] = useState<number | null>(null)

  const program = programs.find((p) => p.id === programId) ?? programs.find((p) => p.active) ?? programs[0]
  const currentWeek = !program ? 0 : program.active ? week.week : maxReachedWeek(program, sessions, 0)
  const options = useMemo(() => (program ? weekOptions(program, sessions, currentWeek) : []), [program, sessions, currentWeek])
  // Beim Öffnen und Programmwechsel zurücksetzen
  useEffect(() => { if (open) { setDate(todayStr()); setDay(0); setWk(null) } }, [open])
  useEffect(() => { setDay(0); setWk(null) }, [program?.id])

  const selWeek = wk ?? currentWeek
  const go = () => {
    if (!program || program.id === undefined || !date || date > today) return
    onClose()
    nav(`/workout/${backfillParam(program.id, Math.min(day, program.days.length - 1), date, selWeek)}`)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('Workout nachtragen')}>
      {!program ? <p className="text-sm text-muted">{t('Es gibt noch kein Programm, aus dem ein Workout nachgetragen werden könnte.')}</p> : (
        <div className="space-y-4">
          <p className="text-xs text-muted">{t('Das Workout wird wie ein normales erfasst und mit dem gewählten Datum und der gewählten Woche gespeichert. Der Wochenplan bleibt unverändert, Vorschläge beruhen auf dem Stand zu diesem Datum.')}</p>
          <label className="block text-xs text-muted">{t('Datum')}
            <input type="date" className={`${inputCls} mt-1`} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          {programs.length > 1 && (
            <div>
              <div className="text-xs text-muted mb-1.5">{t('Programm')}</div>
              <div className="flex flex-wrap gap-2">
                {programs.map((p) => <Chip key={p.id} active={p.id === program.id} onClick={() => setProgramId(p.id ?? null)}>{p.name}</Chip>)}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted mb-1.5">Workout</div>
            <div className="flex flex-wrap gap-2">
              {program.days.map((d, i) => <Chip key={d.id} active={i === day} onClick={() => setDay(i)}>{d.name}</Chip>)}
            </div>
          </div>
          <label className="block text-xs text-muted">{t('Programmwoche')}
            <select className={`${inputCls} mt-1`} value={selWeek} onChange={(e) => setWk(Number(e.target.value))}>
              {options.map((o) => <option key={o.week} value={o.week}>{o.block > 0 ? `Block ${o.block + 1} · ` : ''}{o.label}</option>)}
            </select>
          </label>
          <Button className="w-full" disabled={!date || date > today} onClick={go}>{t('Erfassen')}</Button>
        </div>
      )}
    </BottomSheet>
  )
}
