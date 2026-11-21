import { useMemo, useState } from 'react'
import type { Equipment, Exercise, MuscleId } from '../../types'
import { Icon, PROGRAM_ICONS, programIconName } from '../../components/icons'
import { BottomSheet, Chip, inputCls } from '../../components/ui'
import { MUSCLES, muscleLabel } from '../../data/muscles'
import { EQUIPMENT_LABEL, searchText } from '../../data/exercises'
import { ExercisePhoto } from '../../components/ExerciseMedia'

export const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#fb923c', '#2dd4bf']

export function IdentityFields({
  name, icon, color, onChange,
}: {
  name: string; icon: string; color: string
  onChange: (v: { name?: string; icon?: string; color?: string }) => void
}) {
  return (
    <div className="space-y-4">
      <input className={inputCls} placeholder="Name des Programms" value={name} maxLength={40}
        onChange={(e) => onChange({ name: e.target.value })} />
      <div>
        <div className="text-xs text-muted mb-2">Icon</div>
        <div className="flex flex-wrap gap-2">
          {PROGRAM_ICONS.map((i) => (
            <button key={i} type="button" onClick={() => onChange({ icon: i })}
              aria-label={i} aria-pressed={programIconName(icon) === i}
              className={`w-11 h-11 rounded-xl bg-surface2 border flex items-center justify-center ${programIconName(icon) === i ? 'border-accent' : 'border-line'}`}><Icon name={i} size={22} /></button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted mb-2">Farbe</div>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => onChange({ color: c })}
              style={{ background: c }}
              className={`w-9 h-9 rounded-full border-2 ${c === color ? 'border-fg' : 'border-transparent'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ExercisePicker({
  open, onClose, exercises, onPick, title = 'Übung wählen', allowCardio = true, defaultMuscle,
}: {
  open: boolean; onClose: () => void; exercises: Exercise[]; onPick: (e: Exercise) => void
  title?: string; allowCardio?: boolean; defaultMuscle?: MuscleId
}) {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | 'all' | 'cardio'>(defaultMuscle ?? 'all')
  const [eq, setEq] = useState<Equipment | 'all'>('all')
  const list = useMemo(() => exercises.filter((e) => {
    if (e.cardio && !allowCardio) return false
    if (muscle === 'cardio' ? !e.cardio : muscle !== 'all' && !e.primary.includes(muscle)) return false
    if (eq !== 'all' && e.equipment !== eq) return false
    return q.trim().toLowerCase().split(/\s+/).every((w) => searchText(e).includes(w))
  }), [exercises, q, muscle, eq, allowCardio])

  return (
    <BottomSheet open={open} onClose={onClose} title={title} tall>
      <input className={inputCls} placeholder="Suchen…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
        <Chip active={muscle === 'all'} onClick={() => setMuscle('all')}>Alle</Chip>
        {allowCardio && <Chip active={muscle === 'cardio'} onClick={() => setMuscle('cardio')}>Cardio</Chip>}
        {MUSCLES.map((m) => <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(m.id)}>{m.label}</Chip>)}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
        <Chip active={eq === 'all'} onClick={() => setEq('all')}>Alle Geräte</Chip>
        {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).filter((k) => k !== 'cardio').map((k) => (
          <Chip key={k} active={eq === k} onClick={() => setEq(k)}>{EQUIPMENT_LABEL[k]}</Chip>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {list.map((e) => (
          <li key={e.id}>
            <button className="w-full text-left py-2.5 flex items-center gap-3" onClick={() => { onPick(e); onClose() }}>
              <ExercisePhoto ex={e} size={48} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{e.name}</span>
                <span className="block text-xs text-muted">
                  {e.cardio ? 'Cardio' : e.primary.map(muscleLabel).join(', ')} · {EQUIPMENT_LABEL[e.equipment]}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!list.length && <li className="py-6 text-center text-sm text-muted">Keine Übung gefunden</li>}
      </ul>
    </BottomSheet>
  )
}
