import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useStore, sampleAt } from '../store/useStore'
import { fmt, fmtSmart } from '../format'
import {
  BOARD, CameraDirection, Dots, FollowZoom, INK_BLUE, INK_GREEN, Lines, Ring, planePolylines, rng, saddlePoint,
  saddlePolylines, spherePolylines,
} from './scene'

type Geo = 1 | 0 | -1
const OURS_COLOR = new Float32Array([0.18, 0.49, 0.36])
const BASE_R = 2.2

const GEO_TEXT: Record<Geo, { title: string; body: string; eq: string }> = {
  1: { title: 'k = +1: spazio chiuso', body: 'Come la superficie di una sfera: volume finito, senza bordi. Due rette parallele finiscono per incontrarsi.', eq: 'dℓ² = a²(t) (dθ² + sin²θ dφ²)' },
  0: { title: 'k = 0: spazio piatto', body: 'Geometria euclidea, infinita. È il caso Ω = 1, quello che osserviamo con buona approssimazione.', eq: 'dℓ² = a²(t) (dr² + r² dφ²)' },
  [-1]: { title: 'k = −1: spazio aperto', body: 'Curvatura negativa, come una sella: infinito, gli angoli di un triangolo sommano a meno di 180°.', eq: 'dℓ² = a²(t) (dθ² + sinh²θ dφ²)' },
}

export default function GeometryView() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const [mode, setMode] = useState<'model' | 'all'>('model')
  const [follow, setFollow] = useState(true)

  const aRef = 1 // oggi la scena ha dimensione piena; nel futuro la camera si allontana

  if (!result) return <div className="view-scroll busy">Simulazione in corso…</div>
  const d = result.derived
  const a = sampleAt(result, 'a', tRel)
  const s = BASE_R * a / aRef
  const kModel = d.k_sign as Geo
  const info = GEO_TEXT[kModel]
  const curvRadiusGpc = d.k_sign !== 0 ? (d.hubble_radius_mpc / Math.sqrt(Math.abs(d.omega_k))) / 1000 : null

  return (
    <>
      <Canvas camera={{ position: [5.2, 3.6, 6.4], fov: 42 }} dpr={[1, 2]} style={{ background: BOARD }}>
        <OrbitControls makeDefault enableDamping enableZoom={!follow} enablePan={false} />
        <CameraDirection trigger={mode} dir={mode === 'all' ? [0, 0.42, 1] : [5.2, 3.6, 6.4]} />
        {follow && <FollowZoom size={mode === 'all' ? Math.max(s / BASE_R, 0.6) * 2.1 : s / BASE_R} base={9} />}
        {mode === 'model'
          ? <Surface k={kModel} s={s} todayR={BASE_R / aRef} />
          : ([1, 0, -1] as Geo[]).map((k, i) => (
            <group key={k} position={[(i - 1) * 2.7 * Math.max(s, 0.6), 0, 0]}>
              <Surface k={k} s={s} todayR={BASE_R / aRef} label />
            </group>
          ))}
      </Canvas>

      <div className="overlay">
        {mode === 'model' ? (
          <>
            <h3>{info.title}</h3>
            <p>{info.body}</p>
            <p className="eq">{info.eq}</p>
            <p>
              Ωk = {fmt(d.omega_k, 4)}
              {curvRadiusGpc !== null ? ` · raggio di curvatura oggi ≈ ${fmtSmart(curvRadiusGpc, 3)} Gpc` : ' · raggio di curvatura infinito'}
            </p>
          </>
        ) : (
          <>
            <h3>Le tre geometrie di Robertson–Walker</h3>
            <p>Stesso fattore di scala a(t) = {fmt(a, 3)} per tutte: cambia solo il segno della curvatura k.</p>
            <p className="eq">ds² = c²dt² − a²(t) [ dr²/(1 − kr²) + r² dΩ² ]</p>
          </>
        )}
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Cosa mostrare">
          <button aria-pressed={mode === 'model'} onClick={() => setMode('model')}>Il modello scelto</button>
          <button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>Confronta k = +1, 0, −1</button>
        </div>
        <label className="check"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />Segui l'espansione</label>
      </div>

      <div className="legend3d">
        <span><i style={{ background: '#C23B3B' }} />galassie (coordinate comoventi fisse)</span>
        <span><i style={{ background: INK_GREEN }} />la nostra galassia</span>
        <span><i style={{ border: '1.5px dashed #C23B3B', background: 'transparent' }} />dimensione di oggi, a = 1</span>
      </div>
    </>
  )
}

function Surface({ k, s, todayR, label }: { k: Geo; s: number; todayR: number; label?: boolean }) {
  const lines = useMemo(() => (k === 1 ? spherePolylines() : k === 0 ? planePolylines() : saddlePolylines()), [k])
  const unitGal = useMemo(() => galaxiesOn(k), [k])
  const pos = useMemo(() => {
    const out = new Float32Array(unitGal.length)
    for (let i = 0; i < unitGal.length; i++) out[i] = unitGal[i] * s
    return out
  }, [unitGal, s])
  const ours = useMemo(() => new Float32Array([pos[0], pos[1], pos[2]]), [pos])
  const rest = useMemo(() => pos.slice(3), [pos])
  return (
    <group>
      <group scale={[s, s, s]}>
        <Lines polylines={lines} color={INK_BLUE} opacity={0.85} />
      </group>
      {!label && <Ring radius={todayR} />}
      <Dots positions={rest} radius={0.022 * Math.max(s, 0.25)} />
      <Dots positions={ours} colors={OURS_COLOR} radius={0.034 * Math.max(s, 0.25)} />
      {label && (
        <Html position={[0, -Math.max(s, 0.6) * 1.15 - 0.4, 0]} center>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, color: '#1D2433', whiteSpace: 'nowrap' }}>
            {k === 1 ? 'k = +1 · sfera' : k === 0 ? 'k = 0 · piano' : 'k = −1 · sella'}
          </div>
        </Html>
      )}
    </group>
  )
}

/** Posizioni comoventi unitarie delle galassie sulla superficie; la prima è la nostra. */
function galaxiesOn(k: Geo): Float32Array {
  const r = rng(7 + k)
  const N = 110
  const out = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    let p: [number, number, number]
    if (k === 1) {
      const u = r() * 2 - 1, ph = r() * Math.PI * 2, q = Math.sqrt(1 - u * u)
      p = i === 0 ? [0.42, 0.82, 0.39] : [q * Math.cos(ph), u, q * Math.sin(ph)]
    } else {
      const u = i === 0 ? 0.05 : r() * 1.9 - 0.95, v = i === 0 ? 0.05 : r() * 1.9 - 0.95
      p = k === 0 ? [u, 0, v] : saddlePoint(u, v)
    }
    // piccolo distacco dalla superficie per non intersecare le linee
    const len = Math.hypot(...p) || 1
    const lift = k === 1 ? 1.012 : 1
    out.set(k === 1 ? [p[0] / len * lift, p[1] / len * lift, p[2] / len * lift] : p, i * 3)
  }
  return out
}
