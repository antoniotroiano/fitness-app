import { useEffect, useRef, useState } from 'react'
import { cx } from '../../components/ui'
import { rirColor } from '../../components/rir'

interface Props {
  field: 'weight' | 'reps'
  label: string
  value: string
  rir: string
  /** RIR-Leiste zeigen (bei Drop-/Myo-Segmenten nicht) */
  showRir?: boolean
  /** Teilwiederholungen (nur Feld Wdh.) */
  partial?: string
  onPartial?: (v: string) => void
  /** Meldet den Wechsel zwischen vollen und Teilwiederholungen (Tabellenfeld zeigt dann die Teilung) */
  onTarget?: (partial: boolean) => void
  onValue: (v: string) => void
  onRir: (v: string) => void
  onConfirm: () => void
  onClose: () => void
  /** Zusatzzeile unter dem Wert (z. B. Scheiben pro Seite) */
  hint?: string
}

/** Am unteren Rand angedocktes Zahlenfeld (nicht modal, die Tabelle bleibt sichtbar). */
export function NumpadSheet({ field, label, value, rir, showRir = true, partial = '', onPartial, onTarget, onValue, onRir, onConfirm, onClose, hint }: Props) {
  // Erste Eingabe ersetzt den vorhandenen Wert
  const fresh = useRef(true)
  const isWeight = field === 'weight'
  // Wdh.-Feld: volle Wdh. oder Teilwiederholungen eingeben
  const [target, setTarget] = useState<'full' | 'partial'>('full')
  const editPartial = !isWeight && target === 'partial' && !!onPartial
  const shown = editPartial ? partial : value
  const write = (v: string) => (editPartial ? onPartial!(v) : onValue(v))
  // Kurzer Hinweis über dem Zahlenfeld, welche Art gerade eingegeben wird
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1300)
    return () => clearTimeout(t)
  }, [toast])
  const switchTo = (t: 'full' | 'partial') => {
    if (t === target) return
    fresh.current = true
    setTarget(t)
    onTarget?.(t === 'partial')
    setToast(t === 'partial' ? 'Teilwiederholungen' : 'Volle Wiederholungen')
  }
  const split = !isWeight && !!onPartial

  const press = (k: string) => {
    const base = fresh.current ? '' : shown
    fresh.current = false
    if (k === ',') {
      if (!isWeight || base.includes('.')) return
      write((base || '0') + '.')
      return
    }
    if (base.length >= (isWeight ? 6 : 3)) return
    write(base === '0' ? k : base + k)
  }
  const back = () => { fresh.current = false; write(shown.slice(0, -1)) }

  const key = 'h-12 rounded-xl bg-surface2 text-xl font-medium active:bg-line'
  return (
    <div data-numpad className="fixed bottom-0 inset-x-0 z-40">
      {toast && (
        <div className="absolute bottom-full inset-x-0 mb-2 flex justify-center pointer-events-none" role="status">
          <span className="rounded-full bg-fg text-bg text-xs font-semibold px-3 py-1.5 shadow-lg">{toast}</span>
        </div>
      )}
      <div className="max-w-2xl mx-auto bg-surface border-t border-x border-line rounded-t-2xl p-3 safe-bottom shadow-2xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-muted">{editPartial ? 'Teilwdh.' : label}</div>
          <div className="text-2xl font-semibold tabular-nums">{shown || '–'}</div>
          <button onClick={onClose} aria-label="Schließen" className="text-muted text-xl px-2">✕</button>
        </div>
        {hint && isWeight && <div className="px-1 -mt-2 text-xs text-muted text-right" aria-live="polite">{hint}</div>}
        {!isWeight && showRir && (
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-muted mr-1">RIR</span>
            {['0', '1', '2', '3', '4', '5', '6'].map((n) => (
              <button key={n} onClick={() => onRir(n)} aria-label={`RIR ${n === '6' ? '6 oder mehr' : n}`}
                className={cx('flex-1 h-9 rounded-lg text-sm font-semibold border', rir === n ? 'text-accent-fg border-transparent' : 'border-transparent bg-surface2')}
                style={rir === n ? { background: rirColor(Number(n)), borderColor: rirColor(Number(n)) } : { color: rirColor(Number(n)) }}>
                {n === '6' ? '6+' : n}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {['1', '2', '3'].map((k) => <button key={k} className={key} onClick={() => press(k)}>{k}</button>)}
          <button className={key} onClick={back} aria-label="Löschen">⌫</button>
          {['4', '5', '6'].map((k) => <button key={k} className={key} onClick={() => press(k)}>{k}</button>)}
          {split ? (
            <div className="flex rounded-xl overflow-hidden bg-surface2 text-base font-semibold" role="group" aria-label="Art der Wiederholungen">
              {(['full', 'partial'] as const).map((t, i) => (
                <button key={t} onClick={() => switchTo(t)} aria-pressed={target === t} aria-label={t === 'full' ? 'Volle Wiederholungen' : 'Teilwiederholungen'}
                  className={cx('flex-1', i === 1 && 'border-l border-line', target === t ? 'bg-accent/20 text-accent' : 'text-muted active:bg-line')}>
                  {t === 'full' ? 'V' : 'T'}
                </button>
              ))}
            </div>
          ) : null}
          <button onClick={onConfirm} aria-label="Bestätigen"
            className={cx('rounded-xl bg-accent text-accent-fg text-2xl font-bold', split ? 'col-start-4 row-start-3 row-span-2' : 'row-span-3')}>✓</button>
          {['7', '8', '9'].map((k) => <button key={k} className={key} onClick={() => press(k)}>{k}</button>)}
          <button className={cx(key, !isWeight && 'opacity-30')} disabled={!isWeight} onClick={() => press(',')}>,</button>
          <button className={key} onClick={() => press('0')}>0</button>
          <span />
        </div>
      </div>
    </div>
  )
}
