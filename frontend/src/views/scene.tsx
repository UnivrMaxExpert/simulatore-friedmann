// Elementi 3D condivisi della scena: colori, linee, punti, navigazione, etichette.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useStore } from '../store/useStore'
import * as THREE from 'three'

export const BOARD = '#060A14'      // spazio profondo
export const INK_BLUE = '#4E6FC4'   // griglia dello spazio
export const INK_RED = '#FF6B6B'    // raggio di Hubble, riferimenti
export const INK_GREEN = '#5BD6A0'  // la Via Lattea
export const STAR = '#FFD9B0'       // luce delle galassie

/** Linee da un array di polilinee [[x,y,z],...] */
export function Lines({ polylines, color = INK_BLUE, opacity = 1 }: { polylines: number[][][]; color?: string; opacity?: number }) {
  const geom = useMemo(() => {
    const pos: number[] = []
    for (const pl of polylines) for (let i = 0; i < pl.length - 1; i++) pos.push(...pl[i], ...pl[i + 1])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return g
  }, [polylines])
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </lineSegments>
  )
}

/** Molti punti come sferette istanziate (posizioni già scalate) */
export function Dots({ positions, colors, radius = 0.045 }: { positions: Float32Array; colors?: Float32Array; radius?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const n = positions.length / 3
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    for (let i = 0; i < n; i++) {
      dummy.position.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2])
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      if (colors) m.setColorAt(i, col.setRGB(colors[3 * i], colors[3 * i + 1], colors[3 * i + 2], THREE.SRGBColorSpace))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} key={n}>
      <sphereGeometry args={[radius, 10, 8]} />
      <meshBasicMaterial color={colors ? '#ffffff' : INK_RED} />
    </instancedMesh>
  )
}

/** Allontana la camera in modo morbido quando la scena cresce, mantenendo la direzione scelta dall'utente. */
export function FollowZoom({ size, base }: { size: number; base: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3 } | null }
  useFrame(() => {
    const target = controls?.target ?? new THREE.Vector3()
    const dir = camera.position.clone().sub(target)
    const want = base * Math.max(1, size)
    const len = dir.length()
    const next = len + (want - len) * 0.08
    camera.position.copy(target.clone().add(dir.multiplyScalar(next / len)))
  })
  return null
}

/** Riporta la camera a una direzione data quando cambia `trigger` (es. passaggio a un'altra modalità). */
export function CameraDirection({ dir, trigger, distance }: { dir: [number, number, number]; trigger: string; distance?: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update?: () => void } | null }
  useEffect(() => {
    const len = distance ?? camera.position.length()
    const d = new THREE.Vector3(...dir).normalize().multiplyScalar(len)
    camera.position.copy(d)
    controls?.target.set(0, 0, 0)
    controls?.update?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return null
}

/** Cerchio tratteggiato (riferimento) nel piano XZ */
export function Ring({ radius, color = INK_RED, y = 0 }: { radius: number; color?: string; y?: number }) {
  const ref = useRef<THREE.LineSegments>(null)
  const geom = useMemo(() => {
    const pos: number[] = []
    const N = 96
    for (let i = 0; i < N; i += 2) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2
      pos.push(Math.cos(a0), 0, Math.sin(a0), Math.cos(a1), 0, Math.sin(a1))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return g
  }, [])
  return (
    <lineSegments ref={ref} geometry={geom} scale={[radius, 1, radius]} position={[0, y, 0]}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  )
}

// ---------- generatori di superfici (coordinate unitarie, poi scalate) ----------
export function spherePolylines(nMer = 14, nPar = 9, seg = 64): number[][][] {
  const out: number[][][] = []
  for (let i = 0; i < nMer; i++) {
    const ph = (i / nMer) * Math.PI * 2
    const pl: number[][] = []
    for (let j = 0; j <= seg; j++) { const th = (j / seg) * Math.PI; pl.push([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]) }
    out.push(pl)
  }
  for (let i = 1; i < nPar; i++) {
    const th = (i / nPar) * Math.PI
    const pl: number[][] = []
    for (let j = 0; j <= seg; j++) { const ph = (j / seg) * Math.PI * 2; pl.push([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]) }
    out.push(pl)
  }
  return out
}

export function planePolylines(n = 14): number[][][] {
  const out: number[][][] = []
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n
    out.push([[u, 0, -1], [u, 0, 1]])
    out.push([[-1, 0, u], [1, 0, u]])
  }
  return out
}

/** Sella iperbolica y = c(u² − v²) */
export const SADDLE_C = 0.55
export function saddlePoint(u: number, v: number): [number, number, number] { return [u, SADDLE_C * (u * u - v * v), v] }
export function saddlePolylines(n = 14, seg = 40): number[][][] {
  const out: number[][][] = []
  for (let i = 0; i <= n; i++) {
    const c = -1 + (2 * i) / n
    const p1: number[][] = [], p2: number[][] = []
    for (let j = 0; j <= seg; j++) { const t = -1 + (2 * j) / seg; p1.push(saddlePoint(c, t)); p2.push(saddlePoint(t, c)) }
    out.push(p1, p2)
  }
  return out
}

/** generatore pseudo-casuale deterministico */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/**
 * Navigazione libera nella scena: trascina per ruotare, rotella per lo zoom, tasto destro (o frecce) per spostarsi.
 * Il pulsante «Ricentra» (store.cameraReset) riporta la camera alla posizione iniziale.
 */
export function Navigation({ home }: { home: [number, number, number] }) {
  const reset = useStore(s => s.cameraReset)
  const { camera, gl } = useThree()
  const ref = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  useEffect(() => {
    camera.position.set(...home)
    ref.current?.target.set(0, 0, 0)
    ref.current?.update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset])
  useEffect(() => { ref.current?.listenToKeyEvents?.(window) }, [gl])
  return (
    <OrbitControls
      ref={ref} makeDefault enableDamping dampingFactor={0.08}
      enablePan screenSpacePanning enableZoom zoomSpeed={0.9} minDistance={0.3} maxDistance={400} keyPanSpeed={20}
    />
  )
}

/** Etichetta testuale ancorata a un punto della scena 3D */
export function Label3D({ position, children, color = '#E8ECF4' }: { position: [number, number, number]; children: React.ReactNode; color?: string }) {
  return (
    <Html position={position} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className="label3d" style={{ color, borderColor: color }}>{children}</div>
    </Html>
  )
}
