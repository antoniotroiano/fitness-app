const pad = (n: number) => String(n).padStart(2, '0')

export const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayStr = () => fmt(new Date())
export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return fmt(d)
}
/** Montag der Woche */
export const weekStart = (s: string) => {
  const d = parse(s)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return fmt(d)
}
export const monthKey = (s: string) => s.slice(0, 7)
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const weekdayIndex = (s: string) => (parse(s).getDay() + 6) % 7
export const daysBetween = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)

export function formatDate(s: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) {
  return parse(s).toLocaleDateString('de-DE', opts)
}
export function formatMonth(key: string) {
  return parse(`${key}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}
