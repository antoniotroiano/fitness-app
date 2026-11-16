import { useEffect, useRef, useState, type ReactNode } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl bg-surface border border-line p-4', className)}>{children}</div>
}

export function Button({
  children, onClick, variant = 'primary', className, disabled, type = 'button', 'aria-label': ariaLabel,
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger'
  className?: string; disabled?: boolean; type?: 'button' | 'submit'; 'aria-label'?: string
}) {
  const v = {
    primary: 'bg-accent text-accent-fg font-semibold',
    ghost: 'bg-surface2 text-fg',
    danger: 'bg-red-500/15 text-red-500',
  }[variant]
  return (
    <button type={type} disabled={disabled} onClick={onClick} aria-label={ariaLabel}
      className={cx('rounded-xl px-4 py-3 text-sm active:opacity-70 disabled:opacity-40', v, className)}>
      {children}
    </button>
  )
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('rounded-full px-3 py-1.5 text-xs whitespace-nowrap border',
        active ? 'bg-accent text-accent-fg border-accent font-semibold' : 'bg-surface2 text-muted border-line')}>
      {children}
    </button>
  )
}

export function Collapsible({
  title, subtitle, children, defaultOpen = false, storeKey,
}: { title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean; storeKey?: string }) {
  const [open, setOpen] = useState(() => {
    try {
      const v = storeKey ? localStorage.getItem(`open:${storeKey}`) : null
      return v === null ? defaultOpen : v === '1'
    } catch { return defaultOpen }
  })
  const toggle = () => {
    setOpen(!open)
    try { if (storeKey) localStorage.setItem(`open:${storeKey}`, open ? '0' : '1') } catch { /* ignore */ }
  }
  return (
    <section className="rounded-2xl bg-surface border border-line overflow-hidden">
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between p-4 text-left">
        <span>
          <span className="block font-semibold">{title}</span>
          {subtitle && <span className="block text-xs text-muted mt-0.5">{subtitle}</span>}
        </span>
        <span className={cx('text-muted transition-transform', open && 'rotate-90')}>›</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-line pt-3">{children}</div>}
    </section>
  )
}

export function Page({ title, children, back, right }: { title: string; children: ReactNode; back?: () => void; right?: ReactNode }) {
  return (
    <div className="min-h-full pb-28">
      <header className="safe-top sticky top-0 z-10 bg-bg border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          {back && <button onClick={back} className="text-accent text-xl -ml-1" aria-label="Zurück">‹</button>}
          <h1 className="font-bold text-lg flex-1 truncate">{title}</h1>
          {right}
        </div>
      </header>
      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">{children}</div>
    </div>
  )
}

const CLOSE_DRAG = 100

/** Bottom-Sheet: schließt per Wischen nach unten (Griff/Titelzeile), ✕ oder Tipp auf den Hintergrund. */
export function BottomSheet({ open, onClose, children, title, tall, height, header }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: string; tall?: boolean
  /** Feste Höhe, z. B. '75%' des Bildschirms */
  height?: string
  /** Eigene Kopfzeile statt Griff + Titel + ✕ (Griff bleibt als Wisch-Fläche) */
  header?: ReactNode
}) {
  const [dy, setDy] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const start = useRef<number | null>(null)
  const dyRef = useRef(0)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(t)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 280)
    return () => clearTimeout(t)
  }, [open])

  if (!mounted) return null

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    start.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (start.current === null) return
    dyRef.current = Math.max(0, e.clientY - start.current)
    setDy(dyRef.current)
  }
  const end = () => {
    if (start.current === null) return
    start.current = null
    setDragging(false)
    const far = dyRef.current > CLOSE_DRAG
    dyRef.current = 0
    setDy(0)
    if (far) onClose()
  }
  const maxH = 'calc(100% - env(safe-area-inset-top) - 12px)'

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" style={{ opacity: shown ? 1 : 0 }} />
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
        style={{
          ...(height ? { height, maxHeight: maxH } : tall ? { height: maxH } : { maxHeight: maxH }),
          transform: shown ? `translateY(${dy}px)` : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className={cx('relative w-full max-w-2xl mx-auto bg-surface rounded-t-3xl border-t border-line px-5 safe-bottom flex flex-col')}>
        <div onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
          className="shrink-0 pt-3 pb-2 -mx-5 px-5 cursor-grab" style={{ touchAction: 'none' }}>
          <div className="w-10 h-1 bg-line rounded-full mx-auto mb-3" />
          {header ?? (
            <div className="flex items-center gap-3 min-h-8">
              {title && <h2 className="font-bold text-lg flex-1 min-w-0 truncate">{title}</h2>}
              {!title && <span className="flex-1" />}
              <button type="button" onClick={onClose} aria-label="Schließen"
                className="w-8 h-8 shrink-0 rounded-full bg-surface2 text-muted flex items-center justify-center text-sm">✕</button>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-5 overscroll-contain">{children}</div>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => <Chip key={o.value} active={o.value === value} onClick={() => onChange(o.value)}>{o.label}</Chip>)}
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl bg-surface2 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  )
}

export const inputCls =
  'w-full rounded-xl bg-surface2 border border-line px-3 py-2.5 text-sm outline-none focus:border-accent'
