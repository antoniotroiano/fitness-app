import type { Settings } from '../types'
import { LOCALE } from '../i18n'

export const KG_PER_LB = 0.45359237
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d

/** kg mit bis zu 2 Nachkommastellen (Mikro-Stufen wie 1,25 bleiben sichtbar), lb auf 0,1 gerundet. */
export const kgToDisplay = (kg: number, unit: Settings['weightUnit']) => (unit === 'lb' ? round(kg / KG_PER_LB) : round(kg, 2))
export const displayToKg = (v: number, unit: Settings['weightUnit']) => (unit === 'lb' ? v * KG_PER_LB : v)
export const formatWeight = (kg: number, unit: Settings['weightUnit']) => `${kgToDisplay(kg, unit)} ${unit}`

export const cmToDisplay = (cm: number, unit: Settings['lengthUnit']) => round(unit === 'in' ? cm / 2.54 : cm)
export const displayToCm = (v: number, unit: Settings['lengthUnit']) => (unit === 'in' ? v * 2.54 : v)

export const kmToDisplay = (km: number, unit: Settings['distanceUnit']) => round(unit === 'mi' ? km / 1.609344 : km, 2)
export const displayToKm = (v: number, unit: Settings['distanceUnit']) => (unit === 'mi' ? v * 1.609344 : v)

export function formatHeight(cm: number, unit: Settings['lengthUnit']) {
  if (unit === 'cm') return `${round(cm, 0)} cm`
  const totalIn = Math.round(cm / 2.54)
  return `${Math.floor(totalIn / 12)} ft ${totalIn % 12} in`
}

export function formatTime(date: Date, clock: Settings['clock']) {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: clock === '12h' })
}
