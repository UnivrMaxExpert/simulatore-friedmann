import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useStore, sampleAt } from '../store/useStore'
import { fmt, fmtSmart } from '../format'
import { interpNullable, particleHorizon } from '../physics/horizon'
import { BOARD, Dots, FollowZoom, INK_GREEN, INK_RED, Label3D, Lines, Navigation, rng, spherePolylines } from './scene'
import { A_FIRST_GALAXIES, GalaxyField, type GalaxyItem } from './galaxyModels'

const N = 1600
const R_C = 3.6      // raggio della regione simulata (comovente), in unità c/H0: contiene l'orizzonte di oggi
const VIEW_R = 2.7   // raggio a schermo della regione oggi
const N_ARROWS = 18
const HORIZON = '#F2B263'
const HOME: [number, number, number] = [4.5, 3.5, 5.7]
const LY_PER_MPC = 3.2616e-3 // miliardi di anni luce per Mpc
const N_MODELS = 90          // le galassie più vicine sono disegnate come modelli 3D, le altre come punti
const GALAXY_R = 0.1       // raggio a schermo di una galassia (non in scala)
const toHex = (c: [number, number, number]) => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')

/** gradiente blu → viola → rosso per v/c ∈ [0, 1] (oltre 1: rosso) */
function velColor(f: number): [number, number, number] {
  const t = Math.min(Math.max(f, 0), 1)
  const stops: [number, number, number][] = [[0.48, 0.64, 1.0], [0.71, 0.55, 1.0], [1.0, 0.42, 0.42]]
  const seg = t < 0.5 ? 0 : 1, lt = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const A = stops[seg], B = stops[seg + 1]
  return [A[0] + (B[0] - A[0]) * lt, A[1] + (B[1] - A[1]) * lt, A[2] + (B[2] - A[2]) * lt]
}
const FAINT: [number, number, number] = [0.27, 0.31, 0.39]

export default function GalaxiesScene() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const [coords, setCoords] = useState<'physical' | 'comoving'>('physical')
  const [arrows, setArrows] = useState(false)
  const [follow, setFollow] = useState(false)
  const resetCamera = useStore(s => s.resetCamera)

  // posizioni comoventi (unità c/H0), uniformi nella palla di raggio R_C; la prima siamo noi, al centro
  const comoving = useMemo(() => {
    const r = rng(42)
    const out = new Float32Array(N * 3)
    for (let i = 1; i < N; i++) {
      let x, y, z
      do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1 } while (x * x + y * y + z * z > 1)
      out.set([x * R_C, y * R_C, z * R_C], i * 3)
    }
    // ordina per distanza da noi: i primi sono i più vicini
    const idx = Array.from({ length: N - 1 }, (_, i) => i + 1)
      .sort((p, q) => Math.hypot(out[3 * p], out[3 * p + 1], out[3 * p + 2]) - Math.hypot(out[3 * q], out[3 * q + 1], out[3 * q + 2]))
    const sorted = new Float32Array(N * 3)
    idx.forEach((j, n) => sorted.set(out.subarray(3 * j, 3 * j + 3), 3 * (n + 1)))
    return sorted
  }, [])
  const sphere = useMemo(() => spherePolylines(14, 8, 56), [])
  const chiSeries = useMemo(() => (result ? particleHorizon(result) : []), [result])

  const a = result ? sampleAt(result, 'a', tRel) : 1
  const H = result ? sampleAt(result, 'H', tRel) : 70
  const H0 = result?.params.H0 ?? 70
  const E = H / H0
  const xHubble = Math.abs(a * E) > 1e-9 ? 1 / Math.abs(a * E) : Infinity // raggio di Hubble comovente c/(aH), unità c/H0
  const chi = result ? interpNullable(result.series.t_rel_gyr, chiSeries, tRel) : null

  // dalle coordinate comoventi allo schermo
  const k = coords === 'comoving' ? VIEW_R / R_C : (VIEW_R / R_C) * a

  const { positions, colors, visible, arrowLines, items } = useMemo(() => {
    const positions = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    let visible = 0
    for (let i = 0; i < N; i++) {
      const x = comoving[3 * i], y = comoving[3 * i + 1], z = comoving[3 * i + 2]
      positions[3 * i] = x * k; positions[3 * i + 1] = y * k; positions[3 * i + 2] = z * k
      const r = Math.hypot(x, y, z)
      const seen = chi === null || r <= chi
      if (seen && i > 0) visible++
      colors.set(i === 0 ? [0.36, 0.84, 0.63] : seen ? velColor(Math.abs(E * a) * r) : FAINT, 3 * i)
    }
    // frecce v = H d per alcune galassie a distanze crescenti (lunghezza ∝ v/c, limitata)
    const arrowLines: number[][][] = []
    for (let j = 0; j < N_ARROWS; j++) {
      const th = (j / N_ARROWS) * Math.PI * 2
      const rr = 0.25 + 1.6 * ((j * 7) % N_ARROWS) / N_ARROWS
      const dir = [Math.cos(th), 0, Math.sin(th)]
      const start = dir.map(c => c * rr * k)
      const len = 0.55 * Math.min(Math.abs(E * a * rr), 2.5) * Math.sign(E)
      const end = start.map((c, m) => c + dir[m] * len)
      const side = [-dir[2], 0, dir[0]]
      const tip1 = end.map((c, m) => c - dir[m] * 0.12 * Math.sign(len) + side[m] * 0.06)
      const tip2 = end.map((c, m) => c - dir[m] * 0.12 * Math.sign(len) - side[m] * 0.06)
      arrowLines.push([start, end], [end, tip1], [end, tip2])
    }
    // modelli 3D per noi + le N_MODELS galassie più vicine; punti per tutte le altre
    const items: GalaxyItem[] = []
    for (let i = 0; i <= N_MODELS; i++) {
      items.push({
        position: [positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]], seed: i * 17 + 1,
        tint: i === 0 ? '#5BD6A0' : !(chi === null || Math.hypot(comoving[3 * i], comoving[3 * i + 1], comoving[3 * i + 2]) <= chi)
          ? toHex(FAINT)
          : toHex(velColor(Math.round(Math.abs(E * a) * Math.hypot(comoving[3 * i], comoving[3 * i + 1], comoving[3 * i + 2]) * 12) / 12)),
      })
    }
    return { positions, colors, visible, arrowLines, items }
  }, [comoving, k, E, a, chi])
  const formed = a >= A_FIRST_GALAXIES
  // le galassie hanno dimensione fisica costante: in coordinate comoventi appaiono 1/a volte più grandi (limitato)
  const galaxyR = coords === 'physical' ? GALAXY_R : GALAXY_R * Math.min(1 / Math.max(a, 1e-3), 2.5)
  const dotStart = formed ? N_MODELS + 1 : 0
  const dotPositions = useMemo(() => positions.subarray(3 * dotStart), [positions, dotStart])
  const dotColors = useMemo(() => colors.subarray(3 * dotStart), [colors, dotStart])

  if (!result) return <p className="busy center">Simulazione in corso…</p>
  const hubbleScreen = xHubble * k
  const horizonScreen = chi !== null ? chi * k : null
  const hubbleGly = (299792.458 / Math.abs(H)) * LY_PER_MPC
  const horizonGly = chi !== null ? chi * a * (299792.458 / H0) * LY_PER_MPC : null // distanza propria a(t)·χ

  return (
    <>
      <Canvas camera={{ position: HOME, fov: 45 }} dpr={[1, 2]} style={{ background: BOARD }}>
        <Navigation home={HOME} />
        {follow && coords === 'physical' && <FollowZoom size={Math.max(a, 0.05)} base={8.1} />}
        <Dots positions={dotPositions} colors={dotColors} radius={0.013 * Math.max(k * R_C / VIEW_R, 0.25)} />
        {formed && <GalaxyField items={items} radius={galaxyR} />}
        {Number.isFinite(hubbleScreen) && hubbleScreen < 80 && (
          <>
            <group scale={[hubbleScreen, hubbleScreen, hubbleScreen]}>
              <Lines polylines={sphere} color={INK_RED} opacity={0.35} />
            </group>
            <Label3D position={[hubbleScreen * 0.72, hubbleScreen * 0.72, 0]} color={INK_RED}>raggio di Hubble: oltre, v &gt; c</Label3D>
          </>
        )}
        {horizonScreen !== null && horizonScreen < 80 && (
          <>
            <group scale={[horizonScreen, horizonScreen, horizonScreen]}>
              <Lines polylines={sphere} color={HORIZON} opacity={0.45} />
            </group>
            <Label3D position={[-horizonScreen * 0.72, horizonScreen * 0.72, 0]} color={HORIZON}>orizzonte: il limite di ciò che vediamo</Label3D>
          </>
        )}
        <Label3D position={[0, -0.35, 0]} color={INK_GREEN}>noi</Label3D>
        {arrows && <Lines polylines={arrowLines} color={INK_GREEN} />}
      </Canvas>

      <div className="overlay card">
        <h3>Galassie e orizzonti</h3>
        <p>
          {coords === 'comoving'
            ? 'Coordinate comoventi: si toglie l\'espansione, le galassie restano ferme. Si vede che nell\'era accelerata la sfera di Hubble si restringe: sempre più galassie si allontanano più veloci della luce.'
            : 'Distanze fisiche d = a(t)·r: tutto si allontana da tutto, secondo v = H d. Noi siamo al centro, ma ogni galassia vedrebbe la stessa cosa.'}
        </p>
        <p className="num">
          <b style={{ color: HORIZON }}>Orizzonte della particella</b>{' '}
          {horizonGly !== null ? `≈ ${fmtSmart(horizonGly, 3)} miliardi di anni luce: vediamo ${visible} galassie su ${N - 1}` : 'non definito: questo universo non ha un Big Bang'}
        </p>
        <p className="num">
          <b style={{ color: INK_RED }}>Raggio di Hubble</b> c/H ≈ {fmtSmart(hubbleGly, 3)} miliardi di anni luce: oltre, v &gt; c
        </p>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Coordinate">
          <button aria-pressed={coords === 'physical'} onClick={() => setCoords('physical')}>Distanze fisiche</button>
          <button aria-pressed={coords === 'comoving'} onClick={() => setCoords('comoving')}>Comoventi</button>
        </div>
        <label className="check"><input type="checkbox" checked={arrows} onChange={e => setArrows(e.target.checked)} />Velocità v = H d</label>
        {coords === 'physical' && <label className="check" title="La camera si allontana da sola quando l'universo cresce"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />Inquadratura automatica</label>}
        <button className="btn ghost" onClick={resetCamera}>Ricentra</button>
      </div>

      <div className="legend3d">
        <span>v/c: 0<span className="gradient-bar" />≥ 1</span>
        <span><i style={{ background: 'rgb(69,79,99)' }} />non ancora osservabili</span>
        <span><i style={{ background: INK_GREEN }} />la Via Lattea, al centro</span>
        <span>{formed ? 'galassie non in scala' : 'z > 10: le galassie non si sono ancora formate'}</span>
        <span>a = {fmt(a, 3)}</span>
      </div>
    </>
  )
}
