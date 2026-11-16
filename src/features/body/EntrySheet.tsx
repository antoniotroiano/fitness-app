import { useEffect, useRef, useState } from 'react'
import type { WeightEntry } from '../../types'
import { BottomSheet, Button, cx } from '../../components/ui'
import { NumberPad, applyKey } from '../../components/NumberPad'
import { deleteBodyEntry, saveBodyEntry } from '../../db/db'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { formatDate } from '../../utils/dates'

/** Sheet zum Bearbeiten von Gewicht und Körperfett eines Tages (Vergangenheit/heute). */
export function EntrySheet({ date, today, entry, unit, onClose }: {
  date: string | null; today: string; entry?: WeightEntry; unit: 'kg' | 'lb'; onClose: () => void
}) {
  const open = date !== null
  const future = date !== null && date > today
  const [kg, setKg] = useState('')
  const [bf, setBf] = useState('')
  const [field, setField] = useState<'kg' | 'bf'>('kg')
  const [confirmDel, setConfirmDel] = useState(false)
  const fresh = useRef(true)

  // Beim Öffnen mit vorhandenen Werten füllen
  useEffect(() => {
    if (date === null) return
    setKg(entry ? String(kgToDisplay(entry.kg, unit)) : '')
    setBf(entry?.bodyFat != null ? String(entry.bodyFat) : '')
    setField('kg')
    setConfirmDel(false)
    fresh.current = true
  }, [date, entry, unit])

  const press = (k: string) => {
    const set = field === 'kg' ? setKg : setBf
    const f = fresh.current
    fresh.current = false
    set((cur) => applyKey(cur, k, f, field === 'kg' ? 6 : 5))
  }
  const pick = (f: 'kg' | 'bf') => { setField(f); fresh.current = true }

  const kgNum = Number(kg.replace(',', '.'))
  const bfNum = Number(bf.replace(',', '.'))
  const canSave = !future && kgNum > 0 && (bf === '' || (bfNum > 0 && bfNum < 100))

  const save = async () => {
    if (!date || !canSave) return
    await saveBodyEntry(date, {
      kg: Math.round(displayToKg(kgNum, unit) * 10) / 10,
      bodyFat: bf === '' ? null : Math.round(bfNum * 10) / 10,
    })
    onClose()
  }
  const remove = async () => {
    if (!date || !entry) return
    if (!confirmDel) { setConfirmDel(true); return }
    await deleteBodyEntry(date)
    onClose()
  }

  const header = (
    <div className="flex items-center gap-3 min-h-8 border-b border-line pb-3 -mx-5 px-5">
      <button type="button" onClick={onClose} aria-label="Schließen"
        className="w-8 h-8 shrink-0 rounded-full bg-surface2 text-muted flex items-center justify-center text-sm">✕</button>
      <h2 className="flex-1 text-center font-bold truncate">
        {date ? formatDate(date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
      </h2>
      <button type="button" onClick={remove} disabled={future || !entry} aria-label="Eintrag löschen"
        className={cx('w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm',
          confirmDel ? 'bg-red-500 text-white' : 'bg-red-500/15 text-red-500', (future || !entry) && 'opacity-30')}>🗑</button>
    </div>
  )

  if (future) {
    return (
      <BottomSheet open={open} onClose={onClose} header={header} height="40%">
        <div className="text-center py-8 space-y-2">
          <div className="text-4xl">📅</div>
          <p className="font-semibold">Dieses Datum liegt in der Zukunft</p>
          <p className="text-sm text-muted">Klicke auf ein Datum, das schon war.</p>
        </div>
      </BottomSheet>
    )
  }

  const box = (f: 'kg' | 'bf', label: string, value: string, suffix: string) => (
    <button type="button" onClick={() => pick(f)}
      className={cx('flex-1 rounded-xl bg-surface2 border px-3 py-2 text-left', field === f ? 'border-accent' : 'border-line')}>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value || '–'} <span className="text-sm text-muted font-normal">{suffix}</span></div>
    </button>
  )

  return (
    <BottomSheet open={open} onClose={onClose} header={header} height="75%">
      <div className="space-y-3">
        {confirmDel && <p className="text-xs text-red-500 text-center">Nochmal auf 🗑 tippen, um den Eintrag endgültig zu löschen.</p>}
        <div className="flex gap-2">
          {box('kg', 'Weight', kg, unit)}
          {box('bf', 'Body fat', bf, '%')}
        </div>
        <Button className="w-full" onClick={save} disabled={!canSave}>Speichern</Button>
        <NumberPad onDigit={press} onComma={() => press(',')} onBack={() => press('back')} />
      </div>
    </BottomSheet>
  )
}
