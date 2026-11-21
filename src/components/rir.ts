/** Farbe (CSS-Variable) für einen RIR-Wert: rot nur für RIR 0 (Versagen), sonst eine neutrale Skala in einer Farbe. */
export function rirColor(rir: number): string {
  if (rir <= 0) return 'var(--rir-red)'
  return 'var(--rir-neutral)'
}
