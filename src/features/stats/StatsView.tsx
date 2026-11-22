import { useMemo } from 'react'
import { Chip, Stat } from '../../components/ui'
import { groupByMonth, summary, type Point } from '../../engine/stats'
import { formatDate, formatMonth } from '../../utils/dates'
import { TimeSeries } from './TimeSeries'
import { de } from '../../i18n/de'
import { t } from '../../i18n'

export function StatsView<M extends string>({
  metrics, metric, onMetric, daily, bar, fmt, showAveraging = true,
}: {
  metrics: { value: M; label: string }[]; metric: M; onMetric: (m: M) => void
  daily: Point[]; bar: boolean; fmt: (v: number) => string; showAveraging?: boolean
}) {
  return (
    <div className="space-y-4">
      {metrics.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {metrics.map((m) => <Chip key={m.value} active={m.value === metric} onClick={() => onMetric(m.value)}>{m.label}</Chip>)}
        </div>
      )}
      <TimeSeries daily={daily} bar={bar} fmt={fmt} defaultPeriod="1W" showAveraging={showAveraging}
        stats={(shown) => {
          const sum = summary(shown, bar)
          return (
            <div className="flex gap-2">
              <Stat label="Ø" value={fmt(sum.avg)} />
              <Stat label={bar ? t('Bester Tag') : de.common.best} value={fmt(sum.best)} />
              {bar && <Stat label={t('Gesamt')} value={fmt(sum.total)} />}
            </div>
          )
        }}
        below={(visible) => <History points={visible} fmt={fmt} />} />
    </div>
  )
}

function History({ points, fmt }: { points: Point[]; fmt: (v: number) => string }) {
  const history = useMemo(() => groupByMonth(points), [points])
  return (
    <div>
      {history.map((g) => (
        <div key={g.month} className="mb-3">
          <div className="text-xs uppercase tracking-wide text-muted mb-1">{formatMonth(g.month)}</div>
          <ul className="divide-y divide-line rounded-xl bg-surface2 px-3">
            {g.items.map((p) => (
              <li key={p.date} className="flex justify-between py-2.5 text-sm">
                <span>{formatDate(p.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="font-semibold">{fmt(p.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!history.length && <p className="text-sm text-muted text-center py-4">{t('Keine Einträge')}</p>}
    </div>
  )
}
