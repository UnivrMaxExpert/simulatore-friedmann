import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useStore, sampleAt } from '../store/useStore'
import { A_FIRST_GALAXIES, GalaxyField, type GalaxyItem } from './galaxyModels'
import { fmt, fmtSmart } from '../format'
import {
  BOARD, CameraDirection, Dots, FollowZoom, INK_BLUE, INK_GREEN, INK_RED, Label3D, Lines, Navigation, Ring, STAR, planePolylines, rng, saddlePoint,
  SADDLE_C, saddlePolylines, spherePolylines,
} from './scene'

type Geo = 1 | 0 | -1
const OURS_COLOR = new Float32Array([0.36, 0.84, 0.63])
const HOME: [number, number, number] = [4.5, 3.1, 5.5]
/** raggio a schermo di una galassia (non in scala: quelle vere sarebbero invisibili) */
const GALAXY_R = 0.12
const BASE_R = 2.2

const GEO_TEXT: Record<Geo, { title: string; body: string; eq: string }> = {
  1: { title: 'k = +1: spazio chiuso', body: 'Come la superficie di una sfera: volume finito, senza bordi. Due rette parallele finiscono per incontrarsi.', eq: 'dℓ² = a²(t) (dθ² + sin²θ dφ²)' },
  0: { title: 'k = 0: spazio piatto', body: 'Geometria euclidea, infinita. È il caso Ω = 1, quello che osserviamo con buona approssimazione.', eq: 'dℓ² = a²(t) (dr² + r² dφ²)' },
  [-1]: { title: 'k = −1: spazio aperto', body: 'Curvatura negativa, come una sella: infinito, gli angoli di un triangolo sommano a meno di 180°.', eq: 'dℓ² = a²(t) (dθ² + sinh²θ dφ²)' },
}

export default function SpaceScene() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const [mode, setMode] = useState<'model' | 'all'>('model')
  const [follow, setFollow] = useState(false)
  const resetCamera = useStore(s => s.resetCamera)

  const aRef = 1 // oggi la scena ha dimensione piena; nel futuro la camera si allontana

  if (!result) return <p className="busy center">Simulazione in corso…</p>
  const d = result.derived
  const a = sampleAt(result, 'a', tRel)
  const s = BASE_R * a / aRef
  const kModel = d.k_sign as Geo
  const info = GEO_TEXT[kModel]
  const curvRadiusGpc = d.k_sign !== 0 ? (d.hubble_radius_mpc / Math.sqrt(Math.abs(d.omega_k))) / 1000 : null

  return (
    <>
      <Canvas camera={{ position: HOME, fov: 45 }} dpr={[1, 2]} style={{ background: BOARD }}>
        <Navigation home={HOME} />
        <CameraDirection trigger={mode} dir={mode === 'all' ? [0, 0.42, 1] : HOME} distance={mode === 'all' ? 16 : Math.hypot(...HOME)} />
        {follow && <FollowZoom size={mode === 'all' ? Math.max(s / BASE_R, 0.6) * 2.1 : s / BASE_R} base={7.8} />}
        {mode === 'model'
          ? <Surface k={kModel} s={s} a={a} todayR={BASE_R / aRef} />
          : ([1, 0, -1] as Geo[]).map((k, i) => (
            <group key={k} position={[(i - 1) * 2.7 * Math.max(s, 0.6), 0, 0]}>
              <Surface k={k} s={s} a={a} todayR={BASE_R / aRef} label />
            </group>
          ))}
      </Canvas>

      <div className="overlay card">
        {mode === 'model' ? (
          <>
            <h3>{info.title}</h3>
            <p>{info.body}</p>
            <p className="hint">La griglia è lo spazio stesso, disegnato con una dimensione in meno. Le galassie sono ferme sulla griglia: è la griglia che si dilata con a(t).</p>
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
        <label className="check" title="La camera si allontana da sola quando l'universo cresce"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />Inquadratura automatica</label>
        <button className="btn ghost" onClick={resetCamera}>Ricentra</button>
      </div>

      <div className="legend3d">
        {a < A_FIRST_GALAXIES
          ? <span><i style={{ background: '#8A939E' }} />z &gt; 10: le galassie non si sono ancora formate</span>
          : <span><i style={{ background: STAR }} />galassie: si allontanano ma non si espandono (sono legate dalla gravità)</span>}
        <span><i style={{ background: INK_GREEN }} />la Via Lattea</span>
        <span><i style={{ border: `1.5px dashed ${INK_RED}`, background: 'transparent' }} />dimensione di oggi, a = 1</span>
        <span className="muted">trascina per ruotare · rotella per lo zoom · tasto destro o frecce per spostarti</span>
      </div>
    </>
  )
}

function Surface({ k, s, a, todayR, label }: { k: Geo; s: number; a: number; todayR: number; label?: boolean }) {
  const lines = useMemo(() => (k === 1 ? spherePolylines() : k === 0 ? planePolylines() : saddlePolylines()), [k])
  const unitGal = useMemo(() => galaxiesOn(k), [k])
  const pos = useMemo(() => {
    const out = new Float32Array(unitGal.length)
    for (let i = 0; i < unitGal.length; i++) out[i] = unitGal[i] * s
    return out
  }, [unitGal, s])
  const ours = useMemo(() => new Float32Array([pos[0], pos[1], pos[2]]), [pos])
  const rest = useMemo(() => pos.slice(3), [pos])
  // modelli 3D delle galassie: posizione ∝ a(t), dimensione costante
  const items = useMemo<GalaxyItem[]>(() => {
    const out: GalaxyItem[] = []
    for (let i = 0; i < pos.length / 3; i++) {
      const ux = unitGal[3 * i], uy = unitGal[3 * i + 1], uz = unitGal[3 * i + 2]
      const normal: [number, number, number] = k === 1 ? [ux, uy, uz] : k === 0 ? [0, 1, 0] : [-2 * SADDLE_C * ux, 1, 2 * SADDLE_C * uz]
      out.push({ position: [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]], normal, seed: i * 13 + 5, tint: i === 0 ? INK_GREEN : STAR })
    }
    return out
  }, [pos, unitGal, k])
  const formed = a >= A_FIRST_GALAXIES
  return (
    <group>
      <group scale={[s, s, s]}>
        <Lines polylines={lines} color={INK_BLUE} opacity={0.6} />
      </group>
      {!label && <>
        <Ring radius={todayR} />
        <Label3D position={[todayR * 0.71, 0, todayR * 0.71]} color={INK_RED}>oggi, a = 1</Label3D>
        <Label3D position={k === 1 ? [0, s * 1.18, 0] : [s * 1.02, k === 0 ? 0 : SADDLE_C * s, -s * 1.02]} color="#9FB3EA">
          {k === 1 ? 'spazio chiuso (k = +1)' : k === 0 ? 'spazio piatto (k = 0)' : 'spazio aperto (k = −1)'}
        </Label3D>
      </>}
      {formed
        ? <GalaxyField items={items} radius={GALAXY_R} />
        : <>
          <Dots positions={rest} radius={0.012} />
          <Dots positions={ours} colors={OURS_COLOR} radius={0.016} />
        </>}
      {label && (
        <Html position={[0, -Math.max(s, 0.6) * 1.15 - 0.4, 0]} center>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, color: '#E8ECF4', whiteSpace: 'nowrap' }}>
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
  const N = 70
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
