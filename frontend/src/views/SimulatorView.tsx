import { lazy, Suspense } from 'react'

const GalaxiesScene = lazy(() => import('./GalaxiesScene'))


/** La scena 3D a tutto schermo: le galassie che si allontanano, con raggio di Hubble e orizzonte. */
export default function SimulatorView() {
  return (
    <div className="stage-scene">
      <Suspense fallback={<p className="busy center">Caricamento della scena…</p>}>
        <GalaxiesScene />
      </Suspense>
    </div>
  )
}
