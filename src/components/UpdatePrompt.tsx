import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { BottomSheet, Button } from './ui'
import { CHANGELOG, changelogItems } from '../data/changelog'
import { APP_VERSION } from '../data/version'
import { changesSince } from '../engine/release'
import { getLastSeenVersion, saveLastSeenVersion } from '../db/db'
import { t } from '../i18n'

const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * Zwei Stufen: (1) Banner „Neue Version bereit“, sobald ein neuer Service Worker wartet; ein Tipp aktiviert ihn und
 * lädt die App neu (IndexedDB bleibt unberührt). (2) Nach dem Neuladen einmalig „Was ist neu“ für alle Versionen
 * seit der zuletzt gesehenen. Eine Erstinstallation zeigt nichts und merkt sich nur die aktuelle Version.
 */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return
      // Installierte PWAs werden selten neu geladen: regelmäßig und beim Zurückkehren in die App nachsehen
      const check = () => { if (navigator.onLine) void reg.update().catch(() => {}) }
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    },
  })
  const [news, setNews] = useState<{ version: string; items: string[] }[]>([])

  useEffect(() => {
    let alive = true
    getLastSeenVersion().then((seen) => {
      if (!alive) return
      const fresh = changesSince(CHANGELOG, seen, APP_VERSION)
      if (fresh.length) setNews(fresh.map((e) => ({ version: e.version, items: changelogItems(e) })))
      else if (seen !== APP_VERSION) void saveLastSeenVersion(APP_VERSION)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const closeNews = () => { setNews([]); void saveLastSeenVersion(APP_VERSION) }

  return (
    <>
      {needRefresh && (
        <div role="status" className="fixed top-0 inset-x-0 z-50 safe-top">
          <div className="max-w-2xl mx-auto m-2 rounded-2xl bg-surface border border-line shadow-lg p-3 flex items-center gap-3">
            <div className="flex-1 text-sm">
              <div className="font-semibold">{t('Neue Version verfügbar')}</div>
              <div className="text-muted text-xs">{t('Deine Daten bleiben erhalten.')}</div>
            </div>
            <Button onClick={() => void updateServiceWorker(true)}>{t('Aktualisieren')}</Button>
          </div>
        </div>
      )}
      <BottomSheet open={news.length > 0} onClose={closeNews} title={t('Das ist neu')}>
        <div className="space-y-4">
          {news.map((e) => (
            <div key={e.version}>
              <div className="text-sm font-semibold mb-1">{t('Version')} {e.version}</div>
              <ul className="list-disc pl-5 space-y-1 text-sm">{e.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
          <Button className="w-full" onClick={closeNews}>{t('Verstanden')}</Button>
        </div>
      </BottomSheet>
    </>
  )
}
