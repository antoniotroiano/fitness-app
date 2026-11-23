import { useEffect, useState, type ReactNode } from 'react'
import { useHistoryLayer } from '../utils/historyLayer'
import { t } from '../i18n'

/**
 * Seite, die von rechts hereinschiebt (mit abgedunkeltem Hintergrund).
 * Hat einen eigenen History-Eintrag: Wisch-/Browser-Zurück schließt zuerst das Panel.
 */
export function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useHistoryLayer(open, onClose)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(t)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 260)
    return () => clearTimeout(t)
  }, [open])

  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-250" style={{ opacity: shown ? 1 : 0 }} onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-bg flex flex-col transition-transform duration-250 ease-out"
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)' }}>
        <header className="safe-top shrink-0 bg-bg border-b border-line">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={onClose} aria-label={t('Zurück')} className="text-accent text-xl -ml-1">‹</button>
            <h1 className="font-bold text-lg flex-1 truncate">{title}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 safe-bottom">{children}</div>
      </div>
    </div>
  )
}
