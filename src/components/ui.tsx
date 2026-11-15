import { useState, type ReactNode } from 'react'

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
    primary: 'bg-accent text-slate-900 font-semibold',
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
        active ? 'bg-accent text-slate-900 border-accent font-semibold' : 'bg-surface2 text-muted border-line')}>
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
      <header className="safe-top sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-line">
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

export function BottomSheet({ open, onClose, children, title, tall }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; tall?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div onClick={(e) => e.stopPropagation()}
        className={cx('relative w-full max-w-2xl mx-auto bg-surface rounded-t-3xl border-t border-line pt-5 px-5 safe-bottom',
          tall ? 'h-[92%] flex flex-col' : 'max-h-[85%] overflow-y-auto')}>
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4 shrink-0" />
        {title && <h2 className="font-bold text-lg mb-3 shrink-0">{title}</h2>}
        {tall ? <div className="flex-1 min-h-0 overflow-y-auto pb-5">{children}</div> : <div className="pb-5">{children}</div>}
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
