import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../../components/ui'
import { exerciseById } from '../../data/exercises'
import { muscleLabel } from '../../data/muscles'
import { useAllExercises, useMeasures, useSessions, useSettings, useStatSessions, useWeights } from '../../db/db'
import { bodyLabel, bodySeries, type BodyKey } from '../../engine/body'
import { bodyUnit, formatBody } from '../body/format'
import {
  cardioDaily, exerciseDaily, isBar, METRIC_UNIT, muscleDaily, noLoadStats, volumeFactor,
  type CardioMetric, type ExerciseMetric, type MuscleMetric,
} from '../../engine/stats'
import type { MuscleId } from '../../types'
import { kgToDisplay, kmToDisplay } from '../../utils/units'
import { StatsView } from './StatsView'
import { de } from '../../i18n/de'
import { t } from '../../i18n'

const EX_METRICS: { value: ExerciseMetric; label: string }[] = [
  { value: 'rm1', label: '1RM' }, { value: 'rm3', label: '3RM' }, { value: 'rm10', label: '10RM' },
  { value: 'heaviest', label: de.stats.heaviest }, { value: 'totalVolume', label: de.stats.totalVolume },
  { value: 'bestSetVolume', label: de.stats.bestSetVolume }, { value: 'totalReps', label: de.stats.totalReps },
  { value: 'bestSetReps', label: de.stats.bestSetReps }, { value: 'totalSets', label: de.stats.totalSets },
]

const CARDIO_METRICS: { value: CardioMetric; label: string }[] = [
  { value: 'minutes', label: t('Dauer') }, { value: 'distance', label: t('Distanz') }, { value: 'pace', label: t('Tempo') },
]

function CardioStats({ id }: { id: string }) {
  const sessions = useSessions()
  const settings = useSettings()
  const [metric, setMetric] = useState<CardioMetric>('minutes')
  const daily = useMemo(() => cardioDaily(sessions, id, metric), [sessions, id, metric])
  const du = settings.distanceUnit
  const fmt = (v: number) => {
    if (metric === 'minutes') return `${Math.round(v)} min`
    if (metric === 'distance') return `${kmToDisplay(v, du)} ${du}`
    const perUnit = du === 'mi' ? v * 1.609344 : v
    const m = Math.floor(perUnit)
    return `${m}:${String(Math.round((perUnit - m) * 60) % 60).padStart(2, '0')} min/${du}`
  }
  return <StatsView metrics={CARDIO_METRICS} metric={metric} onMetric={setMetric} daily={daily} bar={isBar(metric)} fmt={fmt} />
}

export function ExerciseStatsPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const sessions = useStatSessions()
  const all = useAllExercises()
  const settings = useSettings()
  const [metric, setMetric] = useState<ExerciseMetric>('rm1')
  const ex = exerciseById(id, all)
  const daily = useMemo(() => exerciseDaily(sessions, id, metric, volumeFactor(exerciseById(id, all)), noLoadStats(exerciseById(id, all))), [sessions, id, metric, all])
  const unit = METRIC_UNIT[metric]
  const fmt = (v: number) =>
    unit === 'weight' ? `${Math.round(kgToDisplay(v, settings.weightUnit) * 10) / 10} ${settings.weightUnit}`
      : unit === 'reps' ? `${Math.round(v * 10) / 10}` : `${Math.round(v * 10) / 10}`

  return (
    <Page title={ex?.name ?? t('Übung')} back={() => nav(-1)}>
      {ex?.cardio
        ? <CardioStats id={id} />
        : <StatsView metrics={EX_METRICS} metric={metric} onMetric={setMetric} daily={daily} bar={isBar(metric)} fmt={fmt} />}
    </Page>
  )
}

export function MuscleStatsPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const sessions = useStatSessions()
  const all = useAllExercises()
  const settings = useSettings()
  const [metric, setMetric] = useState<MuscleMetric>(params.get('m') === 'volume' ? 'volume' : 'sets')
  const daily = useMemo(
    () => muscleDaily(sessions, id as MuscleId, metric, (x) => exerciseById(x, all)),
    [sessions, id, metric, all],
  )
  const fmt = (v: number) => metric === 'sets'
    ? `${Math.round(v * 10) / 10}`
    : `${Math.round(kgToDisplay(v, settings.weightUnit))} ${settings.weightUnit}`
  return (
    <Page title={muscleLabel(id as MuscleId)} back={() => nav(-1)}>
      <StatsView metrics={[{ value: 'sets', label: de.common.sets }, { value: 'volume', label: t('Volumen') }]}
        metric={metric} onMetric={setMetric} daily={daily} bar showAveraging fmt={fmt} />
    </Page>
  )
}

/** Detailseite für Gewicht, Körperfett, Maße und Verhältnisse (gleicher Aufbau wie die Übungsseiten). */
export function BodyStatsPage() {
  const { key = 'weight' } = useParams()
  const nav = useNavigate()
  const weights = useWeights()
  const measures = useMeasures()
  const settings = useSettings()
  const k = key as BodyKey
  const daily = useMemo(() => bodySeries(k, weights, measures), [k, weights, measures])
  const unit = bodyUnit(k, settings)
  const fmt = (v: number) => `${formatBody(k, v, settings)}${unit ? ` ${unit}` : ''}`
  return (
    <Page title={bodyLabel(k)} back={() => nav('/')}>
      <StatsView metrics={[{ value: 'v', label: bodyLabel(k) }]} metric="v" onMetric={() => undefined}
        daily={daily} bar={false} showAveraging={false} fmt={fmt} />
    </Page>
  )
}
