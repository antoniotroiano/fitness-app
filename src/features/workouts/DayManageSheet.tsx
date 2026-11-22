import { useEffect, useRef, useState } from 'react'
import { BottomSheet, Button, inputCls } from '../../components/ui'
import { exportWorkoutJson, importWorkoutJson, saveProgramLayout } from '../../db/db'
import { downloadText, safeFileName } from '../../utils/download'
import { duplicateDay, renameDay, scheduleDay, unscheduleDay } from '../../engine/programAdmin'
import type { Program } from '../../types'
import { MenuRow } from './MenuRow'

/** Ein Workout (Tag) des Programms verwalten: umbenennen, duplizieren, aus dem Wochenplan nehmen bzw. einplanen. */
export function DayManageSheet({ program, dayIdx, open, onClose, onUnscheduled }: {
  program: Program; dayIdx: number; open: boolean; onClose: () => void
  /** nach „aus dem Wochenplan nehmen“ (der Wochenplatz gehört dann nicht mehr zum Workout) */
  onUnscheduled?: () => void
}) {
  const day = program.days[dayIdx]
  const [name, setName] = useState('')
  useEffect(() => { if (open && day) setName(day.name) }, [open, day])
  if (!day || program.id === undefined) return null
  const id = program.id
  const scheduled = program.weekSlots.includes(dayIdx)
  const canUnschedule = scheduled && program.weekSlots.filter((x) => x !== 'rest').length > 1
  const canSchedule = !scheduled && program.weekSlots.includes('rest')
  const save = (days: Program['days'], weekSlots: Program['weekSlots']) => { void saveProgramLayout(id, { days, weekSlots }); onClose() }
  return (
    <BottomSheet open={open} onClose={onClose} title="Workout verwalten">
      <div className="space-y-3">
        <label className="block text-xs text-muted">Name
          <input className={`${inputCls} mt-1`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <Button className="w-full" disabled={!name.trim() || name.trim() === day.name}
          onClick={() => save(renameDay(program.days, dayIdx, name), program.weekSlots)}>Umbenennen</Button>
        <div className="divide-y divide-line">
          <MenuRow icon="copy" label="Workout duplizieren" desc="Kopie ohne Wochenplatz, danach einplanen oder anpassen"
            onClick={() => save(duplicateDay(program.days, dayIdx), program.weekSlots)} />
          <MenuRow icon="data" label="Workout exportieren" desc="Datei mit Übungen, Zielen und eigenen Übungen"
            onClick={async () => {
              const r = await exportWorkoutJson(id, dayIdx)
              if (r) downloadText(`liftlab-workout-${safeFileName(r.name)}.json`, r.json, 'application/json')
              onClose()
            }} />
          {scheduled ? (
            <MenuRow icon="archive" label="Aus dem Wochenplan nehmen"
              desc={canUnschedule ? 'Der Platz wird zum Ruhetag, das Workout bleibt erhalten' : 'Nicht möglich: das letzte eingeplante Workout'}
              onClick={() => { if (canUnschedule) { save(program.days, unscheduleDay(program.weekSlots, dayIdx)); onUnscheduled?.() } }} />
          ) : (
            <MenuRow icon="calendar" label="In den Wochenplan setzen"
              desc={canSchedule ? 'Nimmt den ersten freien Ruhetag' : 'Kein Ruhetag frei: erst ein Workout herausnehmen'}
              onClick={() => { if (canSchedule) save(program.days, scheduleDay(program.weekSlots, dayIdx)) }} />
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

/** Menüzeile „Workout importieren“: Datei wählen, als nicht eingeplantes Workout an das Programm hängen. */
export function WorkoutImportRow({ programId, onDone }: { programId: number; onDone: (r: { dayIdx: number; added: number }) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const pick = async (f?: File) => {
    if (!f) return
    try {
      const r = await importWorkoutJson(programId, await f.text())
      setMsg('')
      onDone(r)
    } catch (e) { setMsg(`Fehler: ${(e as Error).message}`) }
  }
  return (
    <>
      <input ref={input} type="file" accept=".json" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      <MenuRow icon="data" label="Workout importieren" desc={msg || 'Datei eines exportierten Workouts, wird als nicht eingeplantes Workout angelegt'} onClick={() => input.current?.click()} />
    </>
  )
}
