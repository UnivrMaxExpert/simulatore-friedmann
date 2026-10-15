import { useStore } from '../store/useStore'
import Sidebar from './Sidebar'
import Timeline from './Timeline'
import PlotsPanel from '../views/PlotsPanel'

/**
 * Pannello a scomparsa in basso. Chiuso: solo la linea del tempo e la freccia.
 * Aperto: parametri, risultati e grafici, sopra la linea del tempo.
 */
export default function Drawer() {
  const open = useStore(s => s.drawerOpen)
  const toggle = useStore(s => s.toggleDrawer)
  return (
    <section className="drawer" data-open={open} aria-label="Parametri e grafici">
      <div className="drawer-body" id="drawer-body" hidden={!open}>
        <Sidebar />
        <PlotsPanel />
      </div>
      <div className="drawer-bar">
        <button className="drawer-toggle" onClick={toggle} aria-expanded={open} aria-controls="drawer-body">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
            <path d="M2 9 L7 4 L12 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {open ? 'Chiudi' : 'Parametri e grafici'}
        </button>
        <Timeline />
      </div>
    </section>
  )
}
