import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { HashRouter, NavLink, Route, Routes, useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import { useSettings } from './db/db'
import { BottomSheet, cx } from './components/ui'
import { Icon, type IconName } from './components/icons'
import Dashboard from './features/dashboard/Dashboard'
import Workouts from './features/workouts/Workouts'
import WorkoutPreview from './features/workouts/WorkoutPreview'
import ProgramPage from './features/workouts/ProgramPage'
import { WeightPage, MeasuresPage } from './features/body/Body'
import { de } from './i18n/de'

/** Seiten, die nicht beim Start gebraucht werden, laden als eigene Chunks. */
const Logger = lazy(() => import('./features/workouts/Logger'))
const Wizard = lazy(() => import('./features/wizard/Wizard'))
const ManualBuilder = lazy(() => import('./features/wizard/ManualBuilder'))
const More = lazy(() => import('./features/more/More'))
const HistoryPage = lazy(() => import('./features/history/HistoryPage'))
const SessionEditorPage = lazy(() => import('./features/history/SessionEditor'))
const named = <M extends Record<string, unknown>>(load: () => Promise<M>, key: keyof M) =>
  lazy(() => load().then((m) => ({ default: m[key] as ComponentType })))
const loadMore = () => import('./features/more/More')
const loadStats = () => import('./features/stats/StatsPages')
const ExerciseStatsPage = named(loadStats, 'ExerciseStatsPage')
const MuscleStatsPage = named(loadStats, 'MuscleStatsPage')
const BodyStatsPage = named(loadStats, 'BodyStatsPage')
const UnitsPage = named(loadMore, 'UnitsPage')
const RestSettingsPage = named(loadMore, 'RestSettingsPage')
const WarmupSettingsPage = named(loadMore, 'WarmupSettingsPage')
const WorkoutSettingsPage = named(loadMore, 'WorkoutSettingsPage')
const ProfilePage = named(loadMore, 'ProfilePage')
const LibraryPage = named(loadMore, 'LibraryPage')
const AboutPage = named(loadMore, 'AboutPage')
const HelpPage = named(loadMore, 'HelpPage')
const DataPage = named(loadMore, 'DataPage')

function PageFallback() {
  return <div role="status" aria-label={de.common.loading} className="p-8 text-center text-sm text-muted">{de.common.loading}</div>
}

function useTheme() {
  const { theme } = useSettings()
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches))
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

function Tab({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink to={to} end={to === '/'} replace
      className={({ isActive }) => cx('flex-1 flex flex-col items-center gap-0.5 py-2 text-2xs', isActive ? 'text-accent' : 'text-muted')}>
      <Icon name={icon} size={24} />{label}
    </NavLink>
  )
}

function Shell() {
  useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const [sheet, setSheet] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const positions = useRef<Record<string, number>>({})
  const pathRef = useRef(loc.pathname)
  const navType = useNavigationType()
  // Scrollposition pro Seite merken; beim Zurück (Wischgeste/Back) wiederherstellen, sonst nach oben
  useLayoutEffect(() => {
    pathRef.current = loc.pathname
    const el = scroller.current
    if (!el) return
    const target = navType === 'POP' ? positions.current[loc.pathname] ?? 0 : 0
    el.scrollTop = target
    if (target === 0) return
    // Inhalt lädt teils asynchron (Datenbank): bis zu 1 s nachziehen, bis die Seite hoch genug ist
    let frames = 0
    let raf = requestAnimationFrame(function tick() {
      el.scrollTop = target
      if (Math.abs(el.scrollTop - target) > 1 && frames++ < 60) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [loc.pathname, navType])
  const go = (to: string) => { setSheet(false); nav(to) }
  const hideTabs = loc.pathname.startsWith('/workout/') || loc.pathname.startsWith('/workout-preview/') || loc.pathname.startsWith('/new') || loc.pathname.startsWith('/history/') || loc.pathname.startsWith('/program/')

  const items = [
    { icon: 'weight' as IconName, label: 'Gewicht eintragen', to: '/weight' },
    { icon: 'measures' as IconName, label: 'Maße eintragen', to: '/measures' },
    { icon: 'program' as IconName, label: 'Neues Programm', to: '/new' },
    { icon: 'workouts' as IconName, label: 'Einzelnes Workout erstellen', to: '/new/manual?single=1' },
  ]

  return (
    <div ref={scroller} className="h-full overflow-y-auto"
      onScroll={(e) => { positions.current[pathRef.current] = e.currentTarget.scrollTop }}>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/workout/:slot" element={<Logger />} />
        <Route path="/workout-preview/:slot" element={<WorkoutPreview />} />
        <Route path="/program/:id" element={<ProgramPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<SessionEditorPage />} />
        <Route path="/new" element={<Wizard />} />
        <Route path="/new/manual" element={<ManualBuilder />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/measures" element={<MeasuresPage />} />
        <Route path="/stats/exercise/:id" element={<ExerciseStatsPage />} />
        <Route path="/stats/muscle/:id" element={<MuscleStatsPage />} />
        <Route path="/stats/body/:key" element={<BodyStatsPage />} />
        <Route path="/more" element={<More />} />
        <Route path="/more/workouts" element={<WorkoutSettingsPage />} />
        <Route path="/more/workouts/rest" element={<RestSettingsPage />} />
        <Route path="/more/workouts/warmup" element={<WarmupSettingsPage />} />
        <Route path="/more/units" element={<UnitsPage />} />
        <Route path="/more/profile" element={<ProfilePage />} />
        <Route path="/more/library" element={<LibraryPage />} />
        <Route path="/more/data" element={<DataPage />} />
        <Route path="/more/about" element={<AboutPage />} />
        <Route path="/more/help" element={<HelpPage />} />
      </Routes>
      </Suspense>

      {!hideTabs && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line safe-bottom-tight">
          <div className="max-w-2xl mx-auto flex items-center">
            <Tab to="/" label="Dashboard" icon="dashboard" />
            <Tab to="/workouts" label="Workouts" icon="calendar" />
            <button onClick={() => setSheet(true)} aria-label="Hinzufügen"
              className="-mt-3 w-12 h-12 shrink-0 rounded-full bg-accent text-accent-fg text-2xl font-light shadow-md active:scale-95">＋</button>
            <Tab to="/more/library" label="Übungen" icon="library" />
            <Tab to="/more" label={de.nav.more} icon="more" />
          </div>
        </nav>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Hinzufügen">
        <div className="grid grid-cols-2 gap-3">
          {items.map((i) => (
            <button key={i.to} onClick={() => go(i.to)}
              className="rounded-2xl bg-surface2 p-4 text-left active:opacity-70">
              <Icon name={i.icon} size={26} />
              <div className="text-sm font-medium mt-2">{i.label}</div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

export default function App() {
  return <HashRouter><Shell /></HashRouter>
}
