import type { Muscle, MuscleId } from '../types'
import { t } from '../i18n'

/** 22 Muskelgruppen. Reihenfolge = Anzeige in Filtern und Listen. */
export const MUSCLES: Muscle[] = [
  { id: 'chest', label: t('Brust'), region: 'upper' },
  { id: 'upperBack', label: t('Oberer Rücken'), region: 'upper' },
  { id: 'lats', label: 'Lats', region: 'upper' },
  { id: 'biceps', label: t('Bizeps'), region: 'upper' },
  { id: 'triceps', label: t('Trizeps'), region: 'upper' },
  { id: 'frontDelts', label: t('Vordere Schulter'), region: 'upper' },
  { id: 'sideDelts', label: t('Seitliche Schulter'), region: 'upper' },
  { id: 'lowerBack', label: t('Unterer Rücken'), region: 'upper' },
  { id: 'abs', label: t('Bauch'), region: 'lower' },
  { id: 'traps', label: t('Trapez'), region: 'upper' },
  { id: 'rearDelts', label: t('Hintere Schulter'), region: 'upper' },
  { id: 'forearms', label: t('Unterarme'), region: 'upper' },
  { id: 'obliques', label: t('Seitliche Bauchmuskeln'), region: 'lower' },
  { id: 'neck', label: t('Nacken'), region: 'upper' },
  { id: 'serratus', label: 'Serratus', region: 'upper' },
  { id: 'quads', label: t('Quadrizeps'), region: 'lower' },
  { id: 'glutes', label: t('Gesäß'), region: 'lower' },
  { id: 'hamstrings', label: 'Hamstrings', region: 'lower' },
  { id: 'calves', label: t('Waden'), region: 'lower' },
  { id: 'abductors', label: t('Abduktoren'), region: 'lower' },
  { id: 'adductors', label: t('Adduktoren'), region: 'lower' },
  { id: 'tibialis', label: t('Schienbein'), region: 'lower' },
]

export const muscleLabel = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.label ?? id

/** Gewichtung sekundärer Muskeln beim Zählen von Sets/Volumen */
export const SECONDARY_WEIGHT = 0.5
