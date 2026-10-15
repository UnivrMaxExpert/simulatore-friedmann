import { lazy, Suspense } from 'react'
import { useStore } from '../store/useStore'

const SpaceScene = lazy(() => import('./SpaceScene'))
const GalaxiesScene = lazy(() => import('./GalaxiesScene'))
const SurfacePanel = lazy(() => import('./SurfacePanel'))


/** La scena 3D a tutto schermo; la modalità si sceglie dalla barra in alto. */
export default function SimulatorView() {
  const mode = useStore(s => s.scene)
  return (
    <div className="stage-scene">
      <Suspense fallback={<p className="busy center">Caricamento della scena…</p>}>
        {mode === 'space' && <SpaceScene />}
        {mode === 'galaxies' && <GalaxiesScene />}
        {mode === 'surface' && <SurfacePanel />}
      </Suspense>
    </div>
  )
}
