/** Versionsvergleich (SemVer `x.y.z`, Zusätze wie `-beta` werden ignoriert) und „Was ist neu“-Auswahl. */

const parts = (v: string) => v.split('-')[0].split('.').map((n) => Number.parseInt(n, 10) || 0)

/** <0 wenn a älter als b, 0 gleich, >0 wenn a neuer. */
export function compareVersions(a: string, b: string): number {
  const pa = parts(a), pb = parts(b)
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/**
 * Einträge, die der Nutzer noch nicht gesehen hat: neuer als `lastSeen` und höchstens `current`.
 * Ohne `lastSeen` (Erstinstallation) gibt es nichts anzuzeigen.
 */
export function changesSince<T extends { version: string }>(log: T[], lastSeen: string | undefined, current: string): T[] {
  if (!lastSeen) return []
  return log.filter((e) => compareVersions(e.version, lastSeen) > 0 && compareVersions(e.version, current) <= 0)
}
