/**
 * Modelli 3D procedurali di galassie (spirali ed ellittiche) fatti di particelle.
 * Generati nel codice: nessun file da scaricare, funzionano offline.
 *
 * Nota di fisica, utile all'orale: le galassie sono sistemi legati dalla gravità e NON si espandono con a(t).
 * Per questo nelle scene la loro posizione scala con a(t) ma la loro dimensione resta costante.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { rng } from './scene'

export type GalaxyKind = 'spiral' | 'elliptical'

interface Template { kind: GalaxyKind; geometry: THREE.BufferGeometry }

/** distribuzione gaussiana (Box–Muller) */
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r())
}

function spiralGeometry(seed: number, arms: number, spin: number, n = 900): THREE.BufferGeometry {
  const r = rng(seed)
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  const nBulge = Math.floor(n * 0.2)
  for (let i = 0; i < n; i++) {
    let x, y, z, c
    if (i < nBulge) {
      // nucleo: sferoide compatto e luminoso
      x = gauss(r) * 0.13; y = gauss(r) * 0.07; z = gauss(r) * 0.13
      c = 0.85 + 0.15 * r()
    } else {
      // bracci a spirale logaritmica, con dispersione che cresce verso l'esterno
      const rad = Math.pow(r(), 0.75)
      const branch = ((i % arms) / arms) * Math.PI * 2
      const ang = branch + rad * spin
      const sc = 0.05 + 0.1 * rad
      x = Math.cos(ang) * rad + gauss(r) * sc
      z = Math.sin(ang) * rad + gauss(r) * sc
      y = gauss(r) * 0.03 * (1 - 0.6 * rad)
      c = 0.4 + 0.35 * r()
    }
    pos.set([x, y, z], i * 3)
    col.set([c, c, c], i * 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

function ellipticalGeometry(seed: number, axes: [number, number, number], n = 650): THREE.BufferGeometry {
  const r = rng(seed)
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    // profilo concentrato verso il centro (simile a un profilo di de Vaucouleurs)
    const rad = Math.pow(r(), 2.2)
    const u = r() * 2 - 1, ph = r() * Math.PI * 2, q = Math.sqrt(1 - u * u)
    pos.set([q * Math.cos(ph) * rad * axes[0], u * rad * axes[1], q * Math.sin(ph) * rad * axes[2]], i * 3)
    const c = 1 - 0.55 * Math.min(rad * 1.6, 1)
    col.set([c, c, c], i * 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

let templates: Template[] | null = null
function getTemplates(): Template[] {
  if (!templates) {
    templates = [
      { kind: 'spiral', geometry: spiralGeometry(11, 2, 5.5) },
      { kind: 'spiral', geometry: spiralGeometry(12, 2, 3.8) },
      { kind: 'spiral', geometry: spiralGeometry(13, 3, 5.0) },
      { kind: 'spiral', geometry: spiralGeometry(14, 4, 4.2) },
      { kind: 'elliptical', geometry: ellipticalGeometry(15, [0.75, 0.6, 0.7]) },
      { kind: 'elliptical', geometry: ellipticalGeometry(16, [0.85, 0.4, 0.55]) },
    ]
  }
  return templates
}

let dotTexture: THREE.Texture | null = null
function getDotTexture() {
  if (!dotTexture) {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    dotTexture = new THREE.CanvasTexture(c)
  }
  return dotTexture
}

/** Materiali condivisi (cache globale): colore e dimensione dei punti, quantizzata per non crearne uno a ogni fotogramma. */
const materialCache = new Map<string, THREE.PointsMaterial>()
function getMaterial(tint: string, radius: number, opacity: number) {
  const size = Math.round(radius * 0.075 * 4000) / 4000
  const key = `${tint}|${size}|${opacity}`
  let m = materialCache.get(key)
  if (!m) {
    m = new THREE.PointsMaterial({
      color: new THREE.Color(tint), vertexColors: true, size, sizeAttenuation: true,
      map: getDotTexture(), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    materialCache.set(key, m)
  }
  return m
}

export interface GalaxyItem {
  position: [number, number, number]
  /** normale al disco (se assente, orientamento casuale) */
  normal?: [number, number, number]
  seed: number
  tint: string
}

/**
 * Disegna un insieme di galassie. `radius` è il raggio a schermo di ogni galassia (costante: non si espandono).
 */
export function GalaxyField({ items, radius, opacity = 0.9 }: { items: GalaxyItem[]; radius: number; opacity?: number }) {
  const tpl = getTemplates()

  // orientamento: il disco attorno alla normale data, con un'inclinazione casuale
  const oriented = useMemo(() => items.map(it => {
    const r = rng(it.seed * 7 + 3)
    const n = new THREE.Vector3(...(it.normal ?? [r() - 0.5, r() - 0.5, r() - 0.5])).normalize()
    const tilt = new THREE.Euler((r() - 0.5) * 1.1, r() * Math.PI * 2, (r() - 0.5) * 1.1)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
    q.multiply(new THREE.Quaternion().setFromEuler(tilt))
    return { ...it, quaternion: q, template: tpl[it.seed % tpl.length] }
  }), [items, tpl])

  return (
    <group>
      {oriented.map((it, i) => (
        <points key={i} geometry={it.template.geometry} material={getMaterial(it.tint, radius, opacity)} position={it.position} quaternion={it.quaternion} scale={radius} />
      ))}
    </group>
  )
}

/** Le prime galassie si formano dopo qualche centinaio di milioni di anni (z ≈ 10, a ≈ 0,09). */
export const A_FIRST_GALAXIES = 1 / 11
