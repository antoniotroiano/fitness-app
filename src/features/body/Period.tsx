import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Page } from '../../components/ui'
import { togglePeriod, usePeriodDays } from '../../db/db'
import { cycleSummary } from '../../engine/cycle'
import { formatDate, todayStr } from '../../utils/dates'
import { MonthCalendar } from '../dashboard/widgets'
import { t } from '../../i18n'

/** Mehr › Periode (PLAN-6 B16): Tage antippen markiert sie, Zykluslänge und nächster Beginn werden daraus geschätzt. */
export function PeriodPage() {
  const nav = useNavigate()
  const days = usePeriodDays()
  const today = todayStr()
  const set = useMemo(() => new Set(days), [days])
  const sum = useMemo(() => cycleSummary(days, today), [days, today])
  const until = sum.daysUntilNext

  return (
    <Page title={t('Periode')} back={() => nav('/more')}>
      <Card className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-xs text-muted">{t('Zyklustag')}</div><div className="text-lg font-bold">{sum.cycleDay ?? '–'}</div></div>
        <div><div className="text-xs text-muted">{t('Ø Zyklus')}</div><div className="text-lg font-bold">{sum.average ? t('{0} Tage', sum.average) : '–'}</div></div>
        <div>
          <div className="text-xs text-muted">{t('Nächster Beginn')}</div>
          <div className="text-lg font-bold">{sum.next ? formatDate(sum.next) : '–'}</div>
          {until !== null && <div className="text-2xs text-muted">{until > 0 ? t('in {0} Tagen', until) : until === 0 ? 'heute' : t('{0} Tage überfällig', -until)}</div>}
        </div>
      </Card>
      <Card>
        <MonthCalendar tracked={set} today={today} color="var(--period)" onSelect={(d) => { if (d <= today) void togglePeriod(d) }} />
        <p className="mt-3 text-xs text-muted">{t('Tippe auf einen Tag, um ihn zu markieren oder die Markierung zu entfernen. Die Schätzung ist ein Mittelwert der letzten Zyklen und keine medizinische Aussage. Alle Daten bleiben auf dem Gerät.')}</p>
      </Card>
    </Page>
  )
}
