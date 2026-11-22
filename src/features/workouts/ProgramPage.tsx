import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BottomSheet, Button, Card, Page, cx } from '../../components/ui'
import { Icon, ProgramBadge, type IconName } from '../../components/icons'
import { activateProgram, archiveProgram, copyProgram, deleteProgram, restoreProgram, updateProgram, usePrograms, useProgramsLoaded } from '../../db/db'
import { ProgramSettingsSheet } from './ProgramSettingsSheet'
import WorkoutPreview from './WorkoutPreview'

export function MenuRow({ icon, label, desc, danger, onClick }: { icon: IconName; label: string; desc?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cx('w-full flex items-center gap-3 py-3.5 text-left active:opacity-70', danger && 'text-danger')}>
      <Icon name={icon} />
      <span className="flex-1 min-w-0"><span className="block text-sm font-medium">{label}</span>{desc && <span className="block text-xs text-muted">{desc}</span>}</span>
    </button>
  )
}

/** Ein Programm der Bibliothek: Tage als Leiste, darunter die Übungen des gewählten Tags; ⋯ mit allen Programm-Aktionen. */
export default function ProgramPage() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const nav = useNavigate()
  const loaded = useProgramsLoaded() !== undefined
  const programs = usePrograms()
  const program = programs.find((p) => p.id === id)
  const [pick, setPick] = useState(0)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  useEffect(() => { setPick(0) }, [id])
  const tabsRef = useRef<HTMLDivElement>(null)
  const tabEls = useRef<(HTMLButtonElement | null)[]>([])
  const [bar, setBar] = useState({ left: 0, width: 0 })
  const count = program ? program.weekSlots.length + program.days.filter((_, i) => !program.weekSlots.includes(i)).length : 0
  // Balken unter den gewählten Tab setzen und den Tab in den sichtbaren Bereich scrollen
  useLayoutEffect(() => {
    const el = tabEls.current[Math.min(pick, Math.max(count - 1, 0))]
    if (!el) return
    setBar({ left: el.offsetLeft, width: el.offsetWidth })
    const box = tabsRef.current
    if (box) box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' })
  }, [pick, count, program?.days])

  if (!program) {
    return (
      <Page title="Programm" back={() => nav('/workouts')}>
        <Card>{loaded ? 'Dieses Programm gibt es nicht (mehr).' : 'Lädt …'}</Card>
      </Page>
    )
  }

  const scheduled = program.weekSlots.map((slot, i) => ({ key: `s${i}`, slot, i }))
  const extra = program.days.map((d, i) => ({ d, i })).filter(({ i }) => !program.weekSlots.includes(i))
  const chips = [
    ...scheduled.map(({ key, slot, i }) => ({ key, rest: slot === 'rest', label: slot === 'rest' ? 'Pause' : program.days[slot as number].name, param: `p${id}-s${i}` })),
    ...extra.map(({ d, i }) => ({ key: `d${i}`, rest: false, label: d.name, param: `p${id}-d${i}` })),
  ]
  const cur = chips[Math.min(pick, chips.length - 1)]
  const close = () => setMenu(false)

  return (
    <Page title={program.name} back={() => nav('/workouts')}
      right={<button onClick={() => setMenu(true)} aria-label="Programm-Menü" className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-fg active:opacity-70"><Icon name="menu" /></button>}>
      <div className="flex items-center gap-2 text-xs text-muted">
        <ProgramBadge icon={program.icon} color={program.color} size={24} />
        <span>{program.active ? 'Aktives Programm' : program.archived ? 'Archiviert' : 'Inaktiv'} · {program.days.length} Workouts</span>
      </div>

      <div ref={tabsRef} className="relative flex gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 border-b border-line" role="tablist" aria-label="Workouts des Programms">
        {chips.map((c, n) => (
          <button key={c.key} role="tab" aria-selected={cur?.key === c.key} onClick={() => setPick(n)}
            ref={(el) => { tabEls.current[n] = el }}
            className={cx('shrink-0 py-2.5 text-sm font-medium whitespace-nowrap transition-colors', cur?.key === c.key ? 'text-fg' : 'text-muted')}>
            {c.label}
          </button>
        ))}
        <span aria-hidden className="absolute bottom-0 h-0.5 rounded-full bg-fg transition-[left,width] duration-300 ease-out"
          style={{ left: bar.left, width: bar.width, opacity: bar.width ? 1 : 0 }} />
      </div>

      {cur?.rest ? <Card className="text-sm text-muted">Ruhetag, an diesem Tag ist kein Training geplant.</Card> : cur && <WorkoutPreview key={cur.param} param={cur.param} embedded />}

      <BottomSheet open={menu} onClose={close} title={program.name}>
        <div className="divide-y divide-line">
          <MenuRow icon="sliders" label="Programm bearbeiten" desc="Name, Blocklänge, Deload, Programm-Ende" onClick={() => { close(); setEditing(true) }} />
          <MenuRow icon="copy" label="Programm duplizieren" onClick={async () => { close(); const n = await copyProgram(id); if (n) nav(`/program/${n}`, { replace: true }) }} />
          {!program.active && <MenuRow icon="check" label="Programm aktivieren" desc="Wird zum aktiven Programm" onClick={async () => { close(); await activateProgram(id); nav('/workouts') }} />}
          {program.archived
            ? <MenuRow icon="archive" label="Aus dem Archiv holen" onClick={async () => { close(); await restoreProgram(id) }} />
            : <MenuRow icon="archive" label="Programm archivieren" desc={program.active ? 'Das neueste andere Programm wird aktiv' : undefined} onClick={async () => { close(); await archiveProgram(id); if (program.active) nav('/workouts') }} />}
          <MenuRow icon="trash" danger label="Programm löschen" desc="Geloggte Einheiten bleiben erhalten" onClick={() => { close(); setConfirmDel(true) }} />
        </div>
      </BottomSheet>

      <BottomSheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Programm löschen?">
        <p className="text-sm text-muted mb-4">„{program.name}“ wird endgültig gelöscht. Bereits geloggte Einheiten bleiben im Verlauf.</p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDel(false)}>Abbrechen</Button>
          <Button variant="danger" className="flex-1" onClick={async () => { setConfirmDel(false); await deleteProgram(id); nav('/workouts', { replace: true }) }}>Löschen</Button>
        </div>
      </BottomSheet>

      <ProgramSettingsSheet program={editing ? program : null} onClose={() => setEditing(false)}
        onSave={async (p) => { await updateProgram(p); setEditing(false) }} />
    </Page>
  )
}
