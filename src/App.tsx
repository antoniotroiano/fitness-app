import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { useSettings } from './db/db'
import { BottomSheet, cx } from './components/ui'
import { Icon, type IconName } from './components/icons'
import Dashboard from './features/dashboard/Dashboard'
import Workouts from './features/workouts/Workouts'
import WorkoutPreview from './features/workouts/WorkoutPreview'
import Logger from './features/workouts/Logger'
import Wizard from './features/wizard/Wizard'
import ManualBuilder from './features/wizard/ManualBuilder'
import { WeightPage, MeasuresPage } from './features/body/Body'
import { ExerciseStatsPage, MuscleStatsPage } from './features/stats/StatsPages'
import More, { UnitsPage, RestSettingsPage, WarmupSettingsPage, WorkoutSettingsPage, ProfilePage, LibraryPage, AboutPage, HelpPage, DataPage } from './features/more/More'

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
    <NavLink to={to} end={to === '/'}
      className={({ isActive }) => cx('flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-accent' : 'text-muted')}>
      <Icon name={icon} size={24} />{label}
    </NavLink>
  )
}

function Shell() {
  useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const [sheet, setSheet] = useState(false)
  const go = (to: string) => { setSheet(false); nav(to) }
  const hideTabs = loc.pathname.startsWith('/workout/') || loc.pathname.startsWith('/workout-preview/') || loc.pathname.startsWith('/new')

  const items = [
    { icon: 'weight' as IconName, label: 'Gewicht eintragen', to: '/weight' },
    { icon: 'measures' as IconName, label: 'Maße eintragen', to: '/measures' },
    { icon: 'program' as IconName, label: 'Neues Programm', to: '/new' },
    { icon: 'workouts' as IconName, label: 'Einzelnes Workout erstellen', to: '/new/manual?single=1' },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/workout/:slot" element={<Logger />} />
        <Route path="/workout-preview/:slot" element={<WorkoutPreview />} />
        <Route path="/new" element={<Wizard />} />
        <Route path="/new/manual" element={<ManualBuilder />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/measures" element={<MeasuresPage />} />
        <Route path="/stats/exercise/:id" element={<ExerciseStatsPage />} />
        <Route path="/stats/muscle/:id" element={<MuscleStatsPage />} />
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

      {!hideTabs && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line safe-bottom-tight">
          <div className="max-w-2xl mx-auto flex items-center">
            <Tab to="/" label="Dashboard" icon="dashboard" />
            <Tab to="/workouts" label="Workouts" icon="calendar" />
            <button onClick={() => setSheet(true)} aria-label="Hinzufügen"
              className="-mt-6 w-14 h-14 rounded-full bg-accent text-accent-fg text-3xl font-light shadow-lg active:scale-95">＋</button>
            <Tab to="/more/library" label="Übungen" icon="library" />
            <Tab to="/more" label="More" icon="more" />
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
