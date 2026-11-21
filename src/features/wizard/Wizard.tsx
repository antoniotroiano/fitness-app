import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  Equipment, Exercise, Experience, Goal, MuscleId, Priority, ProgramConfig, RepScheme, Split, TimeBudget, Program,
} from '../../types'
import type { ReactNode } from 'react'
import { BottomBar, Button, Card, Page, Segmented, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { MuscleThumb } from '../../components/MuscleFigure'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { de } from '../../i18n/de'
import { BLOCK_WEEK_OPTIONS, blockWeeksOf, recommendedRepScheme, weeklyOverview } from '../../engine/periodization'
import { LevelIcon, SplitPicto, TimeIcon } from './pictos'
import { MUSCLES } from '../../data/muscles'
import { EQUIPMENT_LABEL, exerciseById } from '../../data/exercises'
import { generate } from '../../engine/planGenerator'
import { alternatives, swapPlanned } from '../../engine/swap'
import { saveProgram, useAllExercises } from '../../db/db'
import { ExercisePicker, IdentityFields } from './shared'
import { BottomSheet } from '../../components/ui'
import { muscleLabel } from '../../data/muscles'

const DEFAULT: ProgramConfig = {
  mode: 'auto', goal: 'hypertrophy', days: 4, split: 'none', time: '60-90', repScheme: 'static',
  focus: {}, deload: true, experience: 'intermediate', name: '', icon: 'workouts', color: '#38bdf8',
}

type StepId = 'mode' | 'goal' | 'days' | 'split' | 'time' | 'rep' | 'focus' | 'deload' | 'exp' | 'equipment' | 'identity' | 'preview'
const AUTO_STEPS: StepId[] = ['mode', 'goal', 'days', 'split', 'time', 'rep', 'focus', 'deload', 'exp', 'equipment', 'identity', 'preview']

const TITLES: Record<StepId, string> = {
  mode: 'Start', goal: 'Ziel', days: 'Trainingstage', split: 'Split', time: 'Zeit pro Session', rep: 'Rep-Ranges',
  focus: 'Muskelfokus', deload: 'Blocklänge & Deload', exp: 'Erfahrung', equipment: 'Equipment',
  identity: 'Name, Icon & Farbe', preview: 'Dein Plan',
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="shrink-0 w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center">{children}</span>
}

function Option({ active, title, desc, icon, lead, bare, onClick }: {
  active: boolean; title: string; desc?: string; icon?: IconName; lead?: ReactNode; bare?: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cx('w-full text-left rounded-2xl border p-4 flex items-center gap-3', active ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
      {bare ? lead : (icon || lead) && <Badge>{lead ?? <Icon name={icon!} size={20} />}</Badge>}
      <div className="min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        {desc && <div className="text-xs text-muted mt-1">{desc}</div>}
      </div>
    </button>
  )
}

const EQUIPMENT_ICON: Record<Exclude<Equipment, 'cardio'>, IconName> = {
  barbell: 'workouts', dumbbell: 'dumbbell', cable: 'cable', machine: 'machine', smith: 'smith',
  kettlebell: 'kettlebell', band: 'band', bodyweight: 'pushup',
}

function RoundBtn({ icon, label, onClick, disabled, active }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} aria-pressed={active}
      className={cx('w-10 h-10 rounded-full border flex items-center justify-center shrink-0',
        active ? 'bg-accent text-accent-fg border-accent' : 'bg-surface2 border-line', disabled && 'opacity-40')}>
      <Icon name={icon} size={20} />
    </button>
  )
}

export default function Wizard() {
  const nav = useNavigate()
  const [cfg, setCfg] = useState<ProgramConfig>(DEFAULT)
  const [step, setStep] = useState(0)
  const [repAuto, setRepAuto] = useState(true)
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
  const allSelected = equipment.length === equipmentAll.length
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

      <h2 className="text-lg font-semibold leading-snug">{de.wizard.q[id]}</h2>

      {id === 'mode' && (
        <div className="space-y-3">
          <Option active={cfg.mode === 'auto'} icon="sparkles" title="App erstellt einen Plan" desc="Du beantwortest ein paar Fragen, wir bauen das Programm." onClick={() => set({ mode: 'auto' })} />
          <Option active={cfg.mode === 'manual'} icon="sliders" title="Selbst erstellen" desc="Du wählst Workouts und Übungen selbst aus." onClick={() => set({ mode: 'manual' })} />
        </div>
      )}

      {id === 'goal' && (
        <div className="space-y-3">
          {([
            ['hypertrophy', 'Muskelhypertrophie', 'Mehr Volumen, moderate bis hohe Wiederholungen.', 'workouts'],
            ['strength', 'Maximalkraft', 'Schwerere Gewichte, niedrigere Wiederholungen.', 'bolt'],
            ['both', 'Beides', 'Mischung aus Kraft und Aufbau.', 'sparkles'],
          ] as [Goal, string, string, IconName][]).map(([v, t, d, i]) => (
            <Option key={v} active={cfg.goal === v} icon={i} title={t} desc={d} onClick={() => set({ goal: v })} />
          ))}
        </div>
      )}

      {id === 'days' && (
        <div className="flex flex-col items-center gap-2 py-8">
          <div className="flex items-center gap-8">
            <RoundBtn icon="minus" label="Weniger" disabled={cfg.days <= 2} onClick={() => set({ days: Math.max(2, cfg.days - 1) })} />
            <span className="text-7xl font-bold tabular-nums w-20 text-center" aria-live="polite">{cfg.days}</span>
            <RoundBtn icon="plus" label="Mehr" disabled={cfg.days >= 6} onClick={() => set({ days: Math.min(6, cfg.days + 1) })} />
          </div>
          <div className="text-sm text-muted">{de.wizard.perWeek}</div>
        </div>
      )}

      {id === 'split' && (
        <div className="space-y-3">
          {([
            ['fullBody', 'Full Body', 'Jede Einheit trainiert den ganzen Körper.'],
            ['ulfb', 'Upper / Lower / Full Body', 'Oberkörper- und Unterkörpertage im Wechsel.'],
            ['ppl', 'Push / Pull / Legs', 'Drücken, Ziehen und Beine getrennt.'],
            ['none', de.wizard.auto, de.wizard.autoDesc],
          ] as [Split, string, string][]).map(([v, t, d]) => (
            <Option key={v} active={cfg.split === v} bare lead={<SplitPicto split={v} />} title={t} desc={d} onClick={() => set({ split: v })} />
          ))}
        </div>
      )}

      {id === 'time' && (
        <div className="space-y-3">
          {([['u20', 'Bis 20 min'], ['20-40', '20–40 min'], ['40-60', '40–60 min'], ['60-90', '60–90 min'], ['90-120', '90–120 min'], ['o120', 'Über 120 min']] as [TimeBudget, string][]).map(([v, t]) => (
            <Option key={v} active={cfg.time === v} lead={<TimeIcon time={v} />} title={t} onClick={() => set({ time: v })} />
          ))}
        </div>
      )}

      {id === 'rep' && (
        <div className="space-y-3">
          {([
            ['static', 'Static', 'Gleiches Rep-Ziel jede Woche.', 'repStatic'],
            ['linear', 'Linear', 'Wiederholungen sinken, Gewichte steigen über das Programm.', 'repLinear'],
            ['reverseLinear', 'Reverse Linear', 'Wiederholungen steigen, Gewichte sinken über das Programm.', 'repReverse'],
            ['undulating', 'Undulating', 'Wöchentlicher Wechsel zwischen schwer/wenige und leicht/viele Wiederholungen.', 'repWave'],
            ['rotating', 'Wechselnde Bereiche', 'Enge Bereiche (3 Wdh.), die jede Übung wöchentlich wechselt. Jeder Tag hat schwere und leichte Übungen.', 'repWave'],
          ] as [RepScheme, string, string, IconName][]).map(([v, t, d, i]) => (
            <Option key={v} active={!repAuto && cfg.repScheme === v} icon={i} title={t} desc={d} onClick={() => { setRepAuto(false); set({ repScheme: v }) }} />
          ))}
          <Option active={repAuto} icon="sparkles" title={de.wizard.auto} desc={de.wizard.autoDesc} onClick={() => setRepAuto(true)} />
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
                  <Card key={m.id} className="flex items-center gap-3 !p-3">
                    <MuscleThumb primary={[m.id]} secondary={[]} size={40} />
                    <span className="text-sm flex-1 min-w-0">{m.label}</span>
                    <div className="flex gap-2">
                      <RoundBtn icon="thumbDown" label={`${m.label}: niedrigere Priorität`} active={cfg.focus[m.id] === 'low'} onClick={() => setFocus(m.id, 'low')} />
                      <RoundBtn icon="thumbUp" label={`${m.label}: höhere Priorität`} active={cfg.focus[m.id] === 'high'} onClick={() => setFocus(m.id, 'high')} />
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
          <div>
            <div className="text-sm font-medium mb-2">Trainingswochen pro Block</div>
            <Segmented value={String(blockWeeksOf(cfg))} onChange={(v) => set({ blockWeeks: Number(v) })}
              options={BLOCK_WEEK_OPTIONS.map((n) => ({ value: String(n), label: `${n} Wochen` }))} />
            <p className="text-xs text-muted mt-2">Über den Block steigt die Intensität (weniger Reserve, mehr Sätze). Länger lohnt sich vor allem mit Trainingserfahrung.</p>
          </div>
          <Option active={cfg.deload} icon="shield" title="Ja, mit Deload" desc={`Nach ${blockWeeksOf(cfg)} Trainingswochen folgt eine Woche mit halbem Volumen und mehr Reserve.`} onClick={() => set({ deload: true })} />
          <Option active={!cfg.deload} icon="ban" title="Nein" desc={`Durchgehend ohne Entlastungswoche, der Verlauf wiederholt sich alle ${blockWeeksOf(cfg)} Wochen.`} onClick={() => set({ deload: false })} />
        </div>
      )}

      {id === 'exp' && (
        <div className="space-y-3">
          {([
            ['none', 'Keine', 'Du fängst gerade erst an.', 1],
            ['beginner', 'Anfänger', 'Bis ca. 1 Jahr regelmäßiges Training.', 2],
            ['intermediate', 'Mittlere Stufe', '1–3 Jahre Erfahrung.', 3],
            ['advanced', 'Fortgeschritten', 'Mehr als 3 Jahre, gute Technik und Erholungsgefühl.', 4],
          ] as [Experience, string, string, number][]).map(([v, t, d, l]) => (
            <Option key={v} active={cfg.experience === v} lead={<LevelIcon level={l} size={22} />} title={t} desc={d} onClick={() => set({ experience: v })} />
          ))}
        </div>
      )}

      {id === 'equipment' && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Nur Übungen mit diesem Equipment werden vorgeschlagen.</p>
          <button type="button" disabled={allSelected} aria-pressed={allSelected} onClick={() => set({ equipment: equipmentAll })}
            className={cx('w-full rounded-xl border px-4 py-2.5 text-sm font-medium flex items-center justify-between', allSelected ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
            {de.wizard.selectAll}
            {allSelected && <Icon name="check" size={18} />}
          </button>
          <div className="grid grid-cols-2 gap-3">
            {equipmentAll.map((e) => {
              const on = equipment.includes(e)
              return (
                <button key={e} type="button" aria-pressed={on} onClick={() => toggleEq(e)}
                  className={cx('relative rounded-2xl border p-4 flex flex-col items-center gap-2', on ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
                  <Badge><Icon name={EQUIPMENT_ICON[e as keyof typeof EQUIPMENT_ICON]} size={22} /></Badge>
                  <span className="text-sm font-medium">{EQUIPMENT_LABEL[e]}</span>
                  {on && <span className="absolute top-2 right-2 text-accent"><Icon name="check" size={16} /></span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {id === 'identity' && (
        <IdentityFields name={cfg.name} icon={cfg.icon} color={cfg.color} onChange={(v) => set(v)} />
      )}

      {id === 'preview' && <Preview cfg={{ ...cfg, equipment, repScheme: repAuto ? recommendedRepScheme(cfg.goal, cfg.experience) : cfg.repScheme }} all={all} onSaved={() => nav('/workouts')} />}

      {id !== 'preview' && (
        <BottomBar><Button className="w-full" disabled={!canNext} onClick={next}>Weiter</Button></BottomBar>
      )}
    </Page>
  )
}

function Preview({ cfg, all, onSaved }: { cfg: ProgramConfig; all: ReturnType<typeof useAllExercises>; onSaved: () => void }) {
  const generated = useMemo(() => generate(cfg, all).program, [cfg, all])
  const [days, setDays] = useState(generated.days)
  const [swap, setSwap] = useState<{ d: number; i: number } | null>(null)
  const [add, setAdd] = useState<number | null>(null)
  const [searchAll, setSearchAll] = useState(false)

  const cur = swap ? exerciseById(days[swap.d].exercises[swap.i].exerciseId, all) : undefined
  const alts = cur ? alternatives(cur, all, days[swap!.d].exercises.map((e) => e.exerciseId), cfg.equipment) : []

  const replace = (exId: string) => {
    if (!swap) return
    const to = exerciseById(exId, all)
    if (!to) return
    setDays((ds) => ds.map((d, di) => di !== swap.d ? d : {
      ...d, exercises: d.exercises.map((e, ei) => {
        if (ei !== swap.i) return e
        // Sätze/Wdh.-Bereich passend zur neuen Übung (nicht die der getauschten übernehmen)
        const others = d.exercises.filter((_, j) => j !== ei).map((o) => exerciseById(o.exerciseId, all)).filter((x): x is Exercise => !!x)
        return swapPlanned(e, exerciseById(e.exerciseId, all), to, cfg, others)
      }),
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
                <li key={e.exerciseId} className="py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    {ex && <ExercisePhoto ex={ex} size={56} />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{ex?.name}</div>
                      <div className="text-xs text-muted truncate">{ex?.primary.map(muscleLabel).join(', ')}</div>
                    </div>
                    <button onClick={() => setSwap({ d: di, i: ei })} className="text-xs text-accent whitespace-nowrap">Austauschen</button>
                  </div>
                  {ex && !ex.cardio && (
                    <div className="flex gap-2 overflow-x-auto snap-x no-scrollbar -mx-1 px-1">
                      {weeklyOverview(e, cfg, ex, ei).map((w) => (
                        <div key={w.week} className={cx('snap-start shrink-0 w-28 rounded-xl border p-2 text-xs', w.isDeload ? 'border-dashed border-line' : 'border-transparent bg-surface2')}>
                          <div className="font-semibold mb-1">{w.isDeload ? de.wizard.deload : de.wizard.week(w.week + 1)}</div>
                          <div className="text-muted">{w.sets} Sätze</div>
                          <div className="text-muted">{w.repMin}–{w.repMax} {ex.metric === 'time' ? 'Sek' : 'Wdh'}</div>
                          <div className="text-muted">RIR {w.rir}{w.failure ? ' · letzter bis Versagen' : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
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
              <button className="w-full text-left py-2.5 flex items-center gap-3" onClick={() => replace(a.id)}>
                <ExercisePhoto ex={a} size={48} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{a.name}</span>
                  <span className="block text-xs text-muted">{EQUIPMENT_LABEL[a.equipment]}</span>
                </span>
              </button>
            </li>
          ))}
          {!alts.length && <li className="py-4 text-sm text-muted">Keine Alternative mit deinem Equipment.</li>}
        </ul>
        <Button variant="ghost" className="w-full mt-3" onClick={() => setSearchAll(true)}>Weitere Ersatzübung suchen</Button>
      </BottomSheet>

      <ExercisePicker open={searchAll} onClose={() => setSearchAll(false)} exercises={all}
        title="Ersatzübung suchen" onPick={(e) => replace(e.id)} />

      <ExercisePicker open={add !== null} onClose={() => setAdd(null)} exercises={all}
        onPick={(e) => {
          if (add === null) return
          setDays((ds) => ds.map((d, di) => di !== add ? d : {
            ...d, exercises: [...d.exercises, { exerciseId: e.id, sets: 3, repMin: e.compound ? 6 : 10, repMax: e.compound ? 10 : 15, rir: 2 }],
          }))
        }} />

      <BottomBar><Button className="w-full" onClick={save}>Plan speichern</Button></BottomBar>
    </div>
  )
}
