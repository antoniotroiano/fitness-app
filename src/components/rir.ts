/** Farbe (CSS-Variable) für einen RIR-Wert: 0-1 rot, 2-3 gelb, 4-5 grün, 6+ blau. */
export function rirColor(rir: number): string {
  if (rir <= 1) return 'var(--rir-red)'
  if (rir <= 3) return 'var(--rir-yellow)'
  if (rir <= 5) return 'var(--rir-green)'
  return 'var(--rir-blue)'
}
