import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore, sampleAt } from '../store/useStore'
import { fmt, fmtSmart } from '../format'
import { BOARD, Dots, FollowZoom, INK_GREEN, INK_RED, Lines, rng, spherePolylines } from './scene'

const N = 900
const R_C = 1.2      // raggio della regione simulata, in unità del raggio di Hubble di oggi c/H0 (comovente)
const VIEW_R = 2.4   // raggio a schermo della regione oggi
const N_ARROWS = 16

/** gradiente blu → viola → rosso per v/c ∈ [0, 1] (oltre 1: rosso) */
function velColor(f: number): [number, number, number] {
  const t = Math.min(Math.max(f, 0), 1)
  const stops: [number, number, number][] = [[0.137, 0.275, 0.627], [0.549, 0.357, 0.659], [0.761, 0.231, 0.231]]
  const seg = t < 0.5 ? 0 : 1, lt = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const A = stops[seg], B = stops[seg + 1]
  return [A[0] + (B[0] - A[0]) * lt, A[1] + (B[1] - A[1]) * lt, A[2] + (B[2] - A[2]) * lt]
}

export default function GalaxiesView() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const [coords, setCoords] = useState<'physical' | 'comoving'>('physical')
  const [arrows, setArrows] = useState(true)
  const [follow, setFollow] = useState(true)

  // posizioni comoventi (unità c/H0), uniformi nella palla di raggio R_C; la prima è la nostra (al centro)
  const comoving = useMemo(() => {
    const r = rng(42)
    const out = new Float32Array(N * 3)
    for (let i = 1; i < N; i++) {
      let x, y, z
      do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1 } while (x * x + y * y + z * z > 1)
      out.set([x * R_C, y * R_C, z * R_C], i * 3)
    }
    return out
  }, [])
  const sphere = useMemo(() => spherePolylines(12, 7, 48), [])

  const aRef = 1 // oggi la scena ha dimensione piena; nel futuro la camera si allontana

  const a = result ? sampleAt(result, 'a', tRel) : 1
  const H = result ? sampleAt(result, 'H', tRel) : 70
  const H0 = result?.params.H0 ?? 70
  const E = H / H0
  const xHubble = Math.abs(a * E) > 1e-9 ? 1 / Math.abs(a * E) : Infinity // raggio di Hubble comovente, unità c/H0

  // fattore di scala dalle coordinate comoventi allo schermo
  const k = coords === 'comoving' ? VIEW_R / R_C : (VIEW_R / R_C) * a / aRef

  const { positions, colors, beyond, arrowLines } = useMemo(() => {
    const positions = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    let beyond = 0
    for (let i = 0; i < N; i++) {
      const x = comoving[3 * i], y = comoving[3 * i + 1], z = comoving[3 * i + 2]
      positions[3 * i] = x * k; positions[3 * i + 1] = y * k; positions[3 * i + 2] = z * k
      const vc = Math.abs(E * a) * Math.hypot(x, y, z) // v/c = H d / c
      if (vc > 1 && i > 0) beyond++
      colors.set(i === 0 ? [0.18, 0.49, 0.36] : velColor(vc), 3 * i)
    }
    // frecce di velocità v = H d (in coordinate fisiche) per alcune galassie a distanze crescenti
    const arrowLines: number[][][] = []
    for (let j = 0; j < N_ARROWS; j++) {
      const th = (j / N_ARROWS) * Math.PI * 2
      const rr = R_C * (0.15 + 0.8 * ((j * 7) % N_ARROWS) / N_ARROWS)
      const p = [Math.cos(th) * rr, 0, Math.sin(th) * rr]
      const vc = E * a * rr
      const len = 0.5 * Math.min(vc, 2.5) * Math.sign(E) // lunghezza ∝ v/c (limitata per leggibilità)
      const dir = [Math.cos(th), 0, Math.sin(th)]
      const start = p.map(c => c * k)
      const end = start.map((c, m) => c + dir[m] * len)
      // punta
      const side = [-dir[2], 0, dir[0]]
      const tip1 = end.map((c, m) => c - dir[m] * 0.12 * Math.sign(len) + side[m] * 0.06)
      const tip2 = end.map((c, m) => c - dir[m] * 0.12 * Math.sign(len) - side[m] * 0.06)
      arrowLines.push([start, end], [end, tip1], [end, tip2])
    }
    return { positions, colors, beyond, arrowLines }
  }, [comoving, k, E, a])

  if (!result) return <div className="view-scroll busy">Simulazione in corso…</div>
  const hubbleScreen = xHubble * k
  const hubbleGly = (299792.458 / Math.abs(H)) * 3.2616e-3 // Mpc → Gly

  return (
    <>
      <Canvas camera={{ position: [4.6, 3.4, 5.6], fov: 45 }} dpr={[1, 2]} style={{ background: BOARD }}>
        <OrbitControls makeDefault enableDamping enableZoom={!follow || coords === 'comoving'} enablePan={false} />
        {follow && coords === 'physical' && <FollowZoom size={(VIEW_R * a / aRef) / VIEW_R} base={8.2} />}
        <Dots positions={positions} colors={colors} radius={0.026 * Math.max(k * R_C / VIEW_R, 0.3)} />
        {Number.isFinite(hubbleScreen) && hubbleScreen < 60 && (
          <group scale={[hubbleScreen, hubbleScreen, hubbleScreen]}>
            <Lines polylines={sphere} color={INK_RED} opacity={0.35} />
          </group>
        )}
        {arrows && <Lines polylines={arrowLines} color={INK_GREEN} />}
      </Canvas>

      <div className="overlay">
        <h3>Legge di Hubble: v = H d</h3>
        <p>
          {coords === 'physical'
            ? 'Distanze fisiche d = a(t)·r: le galassie restano ferme nelle loro coordinate comoventi ma lo spazio tra loro cresce.'
            : 'Coordinate comoventi r = d/a(t): la griglia di galassie è fissa e si vede cambiare la sfera di Hubble.'}
        </p>
        <p className="num">
          H = {fmtSmart(H, 3)} km/s/Mpc · raggio di Hubble c/H ≈ {fmtSmart(hubbleGly, 3)} miliardi di anni luce
        </p>
        <p className="num">
          {beyond} galassie su {N - 1} si allontanano più veloci della luce (fuori dalla sfera rossa).
        </p>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Coordinate">
          <button aria-pressed={coords === 'physical'} onClick={() => setCoords('physical')}>Fisiche</button>
          <button aria-pressed={coords === 'comoving'} onClick={() => setCoords('comoving')}>Comoventi</button>
        </div>
        <label className="check"><input type="checkbox" checked={arrows} onChange={e => setArrows(e.target.checked)} />Velocità</label>
        {coords === 'physical' && <label className="check"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />Segui l'espansione</label>}
      </div>

      <div className="legend3d">
        <span>v/c: 0<span className="gradient-bar" />≥ 1</span>
        <span><i style={{ background: INK_GREEN }} />noi, al centro</span>
        <span><i style={{ border: `1.5px solid ${INK_RED}`, background: 'transparent' }} />sfera di Hubble, v = c</span>
        <span>a(t) = {fmt(a, 3)}</span>
      </div>
    </>
  )
}
