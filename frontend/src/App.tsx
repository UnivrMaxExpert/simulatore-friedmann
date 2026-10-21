import { lazy, Suspense, useEffect } from 'react'
import { onModeChange, startHealthPolling } from './api/client'
import { useStore, type Tab } from './store/useStore'
import Drawer from './components/Drawer'

const SimulatorView = lazy(() => import('./views/SimulatorView'))
const TheoryView = lazy(() => import('./views/TheoryView'))

const TABS: { id: Tab; label: string }[] = [
  { id: 'simulatore', label: 'Simulatore' },
  { id: 'teoria', label: 'Teoria' },
]

export default function App() {
  const tab = useStore(s => s.tab)
  const setTab = useStore(s => s.setTab)

  useEffect(() => {
    const off = onModeChange(() => {
      void useStore.getState().simulate() // il risultato cambia sorgente: ricalcola
    })
    const stop = startHealthPolling()
    void useStore.getState().loadPresets()
    return () => { off(); stop() }
  }, [])

  usePlayback()

  return (
    <div className="app" data-tab={tab}>
      <main className="stage" role="tabpanel">
        <Suspense fallback={<p className="busy center">Caricamento…</p>}>
          {tab === 'simulatore' && <SimulatorView />}
          {tab === 'teoria' && <TheoryView />}
        </Suspense>
      </main>

      <header className="hud-top">
        <div className="brand">
          <h1>Simulatore di Friedmann</h1>
        </div>
        <nav className="tabs" role="tablist" aria-label="Pagine">
          {TABS.map(t => (
            <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

      </header>

      {tab === 'simulatore' && <Drawer />}
    </div>
  )
}

/** Avanza il cursore temporale quando "play" è attivo: l'intera storia scorre in ~24 s a velocità 1×. */
function usePlayback() {
  const playing = useStore(s => s.playing)
  useEffect(() => {
    if (!playing) return
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); last = now
      const { result, tRel, speed, setTRel, setPlaying } = useStore.getState()
      if (result) {
        const tr = result.series.t_rel_gyr
        const span = tr[tr.length - 1] - tr[0]
        const next = tRel + dt * speed * span / 24
        if (next >= tr[tr.length - 1]) { setTRel(tr[tr.length - 1]); setPlaying(false); return }
        setTRel(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
}
