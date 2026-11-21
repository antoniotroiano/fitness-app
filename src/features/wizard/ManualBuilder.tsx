import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { PlannedExercise, WorkoutDay } from '../../types'
import { Button, Card, Page, inputCls } from '../../components/ui'
import { exerciseById } from '../../data/exercises'
import { db, saveProgram, useActiveProgram, useAllExercises } from '../../db/db'
import { weekSlots } from '../../engine/planGenerator'
import { ExercisePicker, IdentityFields } from './shared'

/** Ganzzahlfeld, das sich leeren lässt: der Wert wird erst übernommen, wenn eine gültige Zahl drinsteht, beim Verlassen wird zurückgesetzt. */
function IntInput({ value, min = 1, max, className, onValue }: { value: number; min?: number; max?: number; className: string; onValue: (n: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => { setText((t) => (Number(t) === value ? t : String(value))) }, [value])
  return (
    <input type="number" inputMode="numeric" min={min} max={max} className={className} value={text}
      onChange={(ev) => {
        setText(ev.target.value)
        const n = Number(ev.target.value)
        if (ev.target.value !== '' && Number.isFinite(n) && n >= min) onValue(max ? Math.min(max, Math.round(n)) : Math.round(n))
      }}
      onBlur={() => setText(String(value))} />
  )
}

export default function ManualBuilder() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const single = params.get('single') === '1'
  const active = useActiveProgram()
  const all = useAllExercises()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('workouts')
  const [color, setColor] = useState('#38bdf8')
  const [days, setDays] = useState<WorkoutDay[]>([{ id: 'day-0', name: 'Workout A', exercises: [] }])
  const [picker, setPicker] = useState<number | null>(null)

  const update = (di: number, fn: (d: WorkoutDay) => WorkoutDay) =>
    setDays((ds) => ds.map((d, i) => (i === di ? fn(d) : d)))
  const patchEx = (di: number, ei: number, p: Partial<PlannedExercise>) =>
    update(di, (d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === ei ? { ...e, ...p } : e)) }))

  const valid = days.length > 0 && days.every((d) => d.exercises.length > 0) && (single ? !!days[0].name.trim() : !!name.trim())

  const save = async () => {
    if (single && active?.id) {
      // Workout an das aktive Programm anhängen; erster freier Ruhetag wird zum Workout-Slot
      const dayIndex = active.days.length
      const slots = [...active.weekSlots]
      const restIdx = slots.findIndex((s) => s === 'rest')
      if (restIdx !== -1 && slots.filter((s) => s === 'rest').length > 1) slots[restIdx] = dayIndex
      await db.programs.update(active.id, {
        days: [...active.days, { ...days[0], id: `day-${dayIndex}` }], weekSlots: slots,
      })
    } else {
      await saveProgram({
        name: single ? days[0].name : name, icon, color, config: null,
        days: days.map((d, i) => ({ ...d, id: `day-${i}` })), weekSlots: weekSlots(days.length),
      })
    }
    nav('/workouts')
  }

  return (
    <Page title={single ? 'Neues Workout' : 'Programm selbst erstellen'} back={() => nav(-1)}>
      {!single && <Card><IdentityFields name={name} icon={icon} color={color}
        onChange={(v) => { if (v.name !== undefined) setName(v.name); if (v.icon) setIcon(v.icon); if (v.color) setColor(v.color) }} /></Card>}

      {days.map((d, di) => (
        <Card key={d.id} className="space-y-3">
          <div className="flex gap-2">
            <input className={inputCls} value={d.name} placeholder="Name des Workouts"
              onChange={(e) => update(di, (x) => ({ ...x, name: e.target.value }))} />
            {!single && days.length > 1 && (
              <button className="text-danger text-sm px-2" onClick={() => setDays((ds) => ds.filter((_, i) => i !== di))}>Löschen</button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {d.exercises.map((e, ei) => (
              <li key={`${e.exerciseId}-${ei}`} className="py-2.5 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium">{exerciseById(e.exerciseId, all)?.name}</span>
                  <button className="text-xs text-danger" onClick={() => update(di, (x) => ({ ...x, exercises: x.exercises.filter((_, i) => i !== ei) }))}>Entfernen</button>
                </div>
                {!exerciseById(e.exerciseId, all)?.cardio && (
                  <div className="flex gap-2 items-center text-xs text-muted">
                    <label className="flex items-center gap-1">Sätze
                      <IntInput max={10} className={`${inputCls} !w-16 !py-1.5`} value={e.sets} onValue={(n) => patchEx(di, ei, { sets: n })} /></label>
                    <label className="flex items-center gap-1">Reps
                      <IntInput className={`${inputCls} !w-14 !py-1.5`} value={e.repMin} onValue={(n) => patchEx(di, ei, { repMin: n })} />–
                      <IntInput className={`${inputCls} !w-14 !py-1.5`} value={e.repMax} onValue={(n) => patchEx(di, ei, { repMax: n })} /></label>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="w-full" onClick={() => setPicker(di)}>+ Übung hinzufügen</Button>
        </Card>
      ))}

      {!single && days.length < 6 && (
        <Button variant="ghost" className="w-full" onClick={() =>
          setDays((ds) => [...ds, { id: `day-${ds.length}`, name: `Workout ${String.fromCharCode(65 + ds.length)}`, exercises: [] }])}>
          + Workout hinzufügen
        </Button>
      )}

      <ExercisePicker open={picker !== null} onClose={() => setPicker(null)} exercises={all}
        onPick={(e) => {
          if (picker === null) return
          update(picker, (d) => ({
            ...d, exercises: [...d.exercises, {
              exerciseId: e.id, sets: e.cardio ? 1 : 3, repMin: e.compound ? 6 : 10, repMax: e.compound ? 10 : 15, rir: 2,
            }],
          }))
        }} />

      <div className="fixed bottom-0 inset-x-0 p-4 bg-bg/90 backdrop-blur border-t border-line safe-bottom">
        <div className="max-w-2xl mx-auto"><Button className="w-full" disabled={!valid} onClick={save}>Speichern</Button></div>
      </div>
    </Page>
  )
}
