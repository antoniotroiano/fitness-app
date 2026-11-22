import { Icon, type IconName } from '../../components/icons'
import { cx } from '../../components/ui'

export function MenuRow({ icon, label, desc, danger, onClick }: { icon: IconName; label: string; desc?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cx('w-full flex items-center gap-3 py-3.5 text-left active:opacity-70', danger && 'text-danger')}>
      <Icon name={icon} />
      <span className="flex-1 min-w-0"><span className="block text-sm font-medium">{label}</span>{desc && <span className="block text-xs text-muted">{desc}</span>}</span>
    </button>
  )
}
