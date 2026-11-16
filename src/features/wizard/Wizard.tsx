import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  Equipment, Experience, Goal, MuscleId, Priority, ProgramConfig, RepScheme, Split, TimeBudget, Program,
} from '../../types'
import { Button, Card, Chip, Page, cx } from '../../components/ui'
import { MUSCLES } from '../../data/muscles'
import { EQUIPMENT_LABEL, exerciseById } from '../../data/exercises'
import { generate } from '../../engine/planGenerator'
import { alternatives } from '../../engine/swap'
import { saveProgram, useAllExercises } from '../../db/db'
import { ExercisePicker, IdentityFields } from './shared'
import { BottomSheet } from '../../components/ui'
import { muscleLabel } from '../../data/muscles'

const DEFAULT: ProgramConfig = {
  mode: 'auto', goal: 'hypertrophy', days: 4, split: 'none', time: '60-90', repScheme: 'static',
  focus: {}, deload: true, experience: 'intermediate', name: '', icon: '🏋️', color: '#38bdf8',
}

type StepId = 'mode' | 'goal' | 'days' | 'split' | 'time' | 'rep' | 'focus' | 'deload' | 'exp' | 'equipment' | 'identity' | 'preview'
const AUTO_STEPS: StepId[] = ['mode', 'goal', 'days', 'split', 'time', 'rep', 'focus', 'deload', 'exp', 'equipment', 'identity', 'preview']

const TITLES: Record<StepId, string> = {
  mode: 'Wie möchtest du starten?', goal: 'Was ist dein Ziel?', days: 'Trainingstage pro Woche',
  split: 'Welcher Split?', time: 'Zeit pro Session', rep: 'Rep-Ranges pro Woche',
  focus: 'Muskelfokus', deload: 'Deload-Wochen', exp: 'Trainingserfahrung', equipment: 'Verfügbares Equipment',
  identity: 'Name, Icon & Farbe', preview: 'Dein Plan',
}

function Option({ active, title, desc, onClick }: { active: boolean; title: string; desc?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('w-full text-left rounded-2xl border p-4', active ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
      <div className="font-semibold text-sm">{title}</div>
      {desc && <div className="text-xs text-muted mt-1">{desc}</div>}
    </button>
  )
}

export default function Wizard() {
  const nav = useNavigate()
  const [cfg, setCfg] = useState<ProgramConfig>(DEFAULT)
  const [step, setStep] = useState(0)
  const all = useAllExercises()
  const id = AUTO_STEPS[step]
  const set = (p: Partial<ProgramConfig>) => setCfg((c) => ({ ...c, ...p }))

  const next = () => {
    if (id === 'mode' && cfg.mode === 'manual') { nav('/new/manual'); return }
    setStep((s) => Math.min(AUTO_STEPS.length - 1, s + 1))
  }
  const back = () => (step === 0 ? nav(-1) : setStep((s) => s - 1))

  const highCount = Object.values(cfg.focus).filter((p) => p === 'high').length
  const lowCount = Object.values(cfg.focus).filter((p) => p === 'low').length
  const setFocus = (m: MuscleId, p: Priority) => {
    const cur = cfg.focus[m]
    const focus = { ...cfg.focus }
    if (cur === p) delete focus[m]
    else if ((p === 'high' && highCount >= 5) || (p === 'low' && lowCount >= 5 && cur !== 'low')) return
    else focus[m] = p
    set({ focus })
  }

  const equipmentAll = Object.keys(EQUIPMENT_LABEL).filter((k) => k !== 'cardio') as Equipment[]
  const equipment = cfg.equipment ?? equipmentAll
  const toggleEq = (e: Equipment) => {
    const next = equipment.includes(e) ? equipment.filter((x) => x !== e) : [...equipment, e]
    set({ equipment: next.length ? next : equipment })
  }

  const canNext = id !== 'identity' || cfg.name.trim().length > 0

  return (
    <Page title={TITLES[id]} back={back}
      right={<span className="text-xs text-muted">{step + 1}/{AUTO_STEPS.length}</span>}>
      <div className="h-1 rounded bg-surface2 overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${((step + 1) / AUTO_STEPS.length) * 100}%` }} />
      </div>

      {id === 'mode' && (
        <div className="space-y-3">
          <Option active={cfg.mode === 'auto'} title="App erstellt einen Plan" desc="Du beantwortest ein paar Fragen, wir bauen das Programm." onClick={() => set({ mode: 'auto' })} />
          <Option active={cfg.mode === 'manual'} title="Selbst erstellen" desc="Du wählst Workouts und Übungen selbst aus." onClick={() => set({ mode: 'manual' })} />
        </div>
      )}

      {id === 'goal' && (
        <div className="space-y-3">
          {([
            ['hypertrophy', 'Muskelaufbau', 'Mehr Volumen, moderate bis hohe Wiederholungen.'],
            ['strength', 'Maximalkraft', 'Schwerere Gewichte, niedrigere Wiederholungen.'],
            ['both', 'Beides', 'Mischung aus Kraft und Aufbau.'],
          ] as [Goal, string, string][]).map(([v, t, d]) => (
            <Option key={v} active={cfg.goal === v} title={t} desc={d} onClick={() => set({ goal: v })} />
          ))}
        </div>
      )}

      {id === 'days' && (
        <div className="flex gap-2 justify-between">
          {[2, 3, 4, 5, 6].map((d) => (
            <button key={d} onClick={() => set({ days: d })}
              className={cx('flex-1 aspect-square rounded-2xl text-2xl font-bold border', cfg.days === d ? 'bg-accent text-accent-fg border-accent' : 'bg-surface border-line')}>{d}</button>
          ))}
        </div>
      )}

      {id === 'split' && (
        <div className="space-y-3">
          {([
            ['fullBody', 'Full Body', 'Jede Einheit trainiert den ganzen Körper.'],
            ['ulfb', 'Upper / Lower / Full Body', 'Oberkörper- und Unterkörpertage im Wechsel.'],
            ['ppl', 'Push / Pull / Legs', 'Drücken, Ziehen und Beine getrennt.'],
            ['none', 'Keine Präferenz', 'Die App wählt passend zu deinen Trainingstagen.'],
          ] as [Split, string, string][]).map(([v, t, d]) => (
            <Option key={v} active={cfg.split === v} title={t} desc={d} onClick={() => set({ split: v })} />
          ))}
        </div>
      )}

      {id === 'time' && (
        <div className="space-y-3">
          {([['u20', 'Bis 20 min'], ['20-40', '20–40 min'], ['40-60', '40–60 min'], ['60-90', '60–90 min'], ['90-120', '90–120 min'], ['o120', 'Über 120 min']] as [TimeBudget, string][]).map(([v, t]) => (
            <Option key={v} active={cfg.time === v} title={t} onClick={() => set({ time: v })} />
          ))}
        </div>
      )}

      {id === 'rep' && (
        <div className="space-y-3">
          {([
            ['static', 'Static', 'Gleiches Rep-Ziel jede Woche.'],
            ['linear', 'Linear', 'Wiederholungen sinken, Gewichte steigen über das Programm.'],
            ['reverseLinear', 'Reverse Linear', 'Wiederholungen steigen, Gewichte sinken über das Programm.'],
            ['undulating', 'Undulating', 'Wöchentlicher Wechsel zwischen schwer/wenige und leicht/viele Wiederholungen.'],
          ] as [RepScheme, string, string][]).map(([v, t, d]) => (
            <Option key={v} active={cfg.repScheme === v} title={t} desc={d} onClick={() => set({ repScheme: v })} />
          ))}
        </div>
      )}

      {id === 'focus' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Bis zu 5 Muskeln mit höherer und bis zu 5 mit niedrigerer Priorität. Alle anderen bleiben normal. ({highCount}/5 hoch · {lowCount}/5 niedrig)</p>
          {(['upper', 'lower'] as const).map((region) => (
            <div key={region}>
              <div className="text-xs uppercase tracking-wide text-muted mb-2">{region === 'upper' ? 'Oberkörper' : 'Unterkörper'}</div>
              <div className="space-y-2">
                {MUSCLES.filter((m) => m.region === region).map((m) => (
                  <Card key={m.id} className="flex items-center justify-between !p-3">
                    <span className="text-sm">{m.label}</span>
                    <div className="flex gap-2">
                      <Chip active={cfg.focus[m.id] === 'low'} onClick={() => setFocus(m.id, 'low')}>Niedriger</Chip>
                      <Chip active={cfg.focus[m.id] === 'high'} onClick={() => setFocus(m.id, 'high')}>Höher</Chip>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {id === 'deload' && (
        <div className="space-y-3">
          <Option active={cfg.deload} title="Ja, mit Deload" desc="Nach 4 Trainingswochen folgt eine Woche mit halbem Volumen und mehr Reserve." onClick={() => set({ deload: true })} />
          <Option active={!cfg.deload} title="Nein" desc="Durchgehend ohne Entlastungswoche." onClick={() => set({ deload: false })} />
        </div>
      )}

      {id === 'exp' && (
        <div className="space-y-3">
          {([
            ['none', 'Keine', 'Du fängst gerade erst an.'],
            ['beginner', 'Anfänger', 'Bis ca. 1 Jahr regelmäßiges Training.'],
            ['intermediate', 'Mittlere Stufe', '1–3 Jahre Erfahrung.'],
            ['advanced', 'Fortgeschritten', 'Mehr als 3 Jahre, gute Technik und Erholungsgefühl.'],
          ] as [Experience, string, string][]).map(([v, t, d]) => (
            <Option key={v} active={cfg.experience === v} title={t} desc={d} onClick={() => set({ experience: v })} />
          ))}
        </div>
      )}

      {id === 'equipment' && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Nur Übungen mit diesem Equipment werden vorgeschlagen.</p>
          <div className="flex flex-wrap gap-2">
            {equipmentAll.map((e) => <Chip key={e} active={equipment.includes(e)} onClick={() => toggleEq(e)}>{EQUIPMENT_LABEL[e]}</Chip>)}
          </div>
        </div>
      )}

      {id === 'identity' && (
        <IdentityFields name={cfg.name} icon={cfg.icon} color={cfg.color} onChange={(v) => set(v)} />
      )}

      {id === 'preview' && <Preview cfg={{ ...cfg, equipment }} all={all} onSaved={() => nav('/workouts')} />}

      {id !== 'preview' && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-bg/90 backdrop-blur border-t border-line safe-bottom">
          <div className="max-w-2xl mx-auto"><Button className="w-full" disabled={!canNext} onClick={next}>Weiter</Button></div>
        </div>
      )}
    </Page>
  )
}

function Preview({ cfg, all, onSaved }: { cfg: ProgramConfig; all: ReturnType<typeof useAllExercises>; onSaved: () => void }) {
  const generated = useMemo(() => generate(cfg, all).program, [cfg, all])
  const [days, setDays] = useState(generated.days)
  const [swap, setSwap] = useState<{ d: number; i: number } | null>(null)
  const [add, setAdd] = useState<number | null>(null)

  const cur = swap ? exerciseById(days[swap.d].exercises[swap.i].exerciseId, all) : undefined
  const alts = cur ? alternatives(cur, all, days[swap!.d].exercises.map((e) => e.exerciseId), cfg.equipment) : []

  const replace = (exId: string) => {
    if (!swap) return
    setDays((ds) => ds.map((d, di) => di !== swap.d ? d : {
      ...d, exercises: d.exercises.map((e, ei) => ei === swap.i ? { ...e, exerciseId: exId } : e),
    }))
    setSwap(null)
  }

  const save = async () => {
    const program: Omit<Program, 'id' | 'createdAt' | 'active'> = { ...generated, days }
    await saveProgram(program)
    onSaved()
  }

  return (
    <div className="space-y-4 pb-24">
      {days.map((d, di) => (
        <Card key={d.id}>
          <div className="font-semibold mb-2">{d.name}</div>
          <ul className="divide-y divide-line">
            {d.exercises.map((e, ei) => {
              const ex = exerciseById(e.exerciseId, all)
              return (
                <li key={e.exerciseId} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{ex?.name}</div>
                    <div className="text-xs text-muted">{e.sets} × {e.repMin}–{e.repMax} · {ex?.primary.map(muscleLabel).join(', ')}</div>
                  </div>
                  <button onClick={() => setSwap({ d: di, i: ei })} className="text-xs text-accent whitespace-nowrap">Austauschen</button>
                </li>
              )
            })}
          </ul>
          <button className="text-xs text-accent mt-2" onClick={() => setAdd(di)}>+ Übung hinzufügen</button>
        </Card>
      ))}

      <BottomSheet open={!!swap} onClose={() => setSwap(null)} title={cur ? `Ersatz für ${cur.name}` : ''}>
        <p className="text-xs text-muted mb-2">Gleiche Muskelgruppe: {cur?.primary.map(muscleLabel).join(', ')}</p>
        <ul className="divide-y divide-line">
          {alts.map((a) => (
            <li key={a.id}>
              <button className="w-full text-left py-3" onClick={() => replace(a.id)}>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted">{EQUIPMENT_LABEL[a.equipment]}</div>
              </button>
            </li>
          ))}
          {!alts.length && <li className="py-4 text-sm text-muted">Keine Alternative mit deinem Equipment.</li>}
        </ul>
      </BottomSheet>

      <ExercisePicker open={add !== null} onClose={() => setAdd(null)} exercises={all} allowCardio={false}
        onPick={(e) => {
          if (add === null) return
          setDays((ds) => ds.map((d, di) => di !== add ? d : {
            ...d, exercises: [...d.exercises, { exerciseId: e.id, sets: 3, repMin: e.compound ? 6 : 10, repMax: e.compound ? 10 : 15, rir: 2 }],
          }))
        }} />

      <div className="fixed bottom-0 inset-x-0 p-4 bg-bg/90 backdrop-blur border-t border-line safe-bottom">
        <div className="max-w-2xl mx-auto"><Button className="w-full" onClick={save}>Plan speichern</Button></div>
      </div>
    </div>
  )
}
