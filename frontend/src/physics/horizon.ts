import type { SimulateResponse } from '../api/types'
import { KMS_MPC_TO_INV_GYR } from './mock'

/**
 * Orizzonte della particella in coordinate comoventi, in unità di c/H0:
 *   χ_p(t) = c ∫₀ᵗ dt' / a(t')   →   χ_p · H0/c = H0 ∫₀ᵗ dt'/a
 * È il raggio della regione da cui la luce ha fatto in tempo ad arrivarci dal Big Bang (lezione #3).
 * Integrazione a trapezi lungo la serie; il primo tratto 0 < t < t₁ si aggiunge analiticamente con a ∝ tⁿ.
 * Senza Big Bang l'orizzonte non è definito → null.
 */
export function particleHorizon(res: SimulateResponse): (number | null)[] {
  const { t_gyr: t, a } = res.series
  if (res.derived.origin !== 'big_bang' || res.derived.age_gyr === null) return t.map(() => null)
  const H0g = res.params.H0 * KMS_MPC_TO_INV_GYR
  const out: (number | null)[] = new Array(t.length).fill(null)
  // primo punto con t > 0
  let i0 = 0
  while (i0 < t.length - 1 && !(t[i0] > 0 && a[i0] > 0)) i0++
  if (i0 >= t.length - 1) return out
  let n = Math.log(a[i0 + 1] / a[i0]) / Math.log(t[i0 + 1] / t[i0])
  if (!Number.isFinite(n) || n <= 0) n = 0.5
  n = Math.min(n, 0.9)
  let chi = (t[i0] / (a[i0] * (1 - n))) * H0g
  out[i0] = chi
  for (let i = i0 + 1; i < t.length; i++) {
    if (!(a[i] > 0)) break
    chi += segmentIntegral(t[i - 1], a[i - 1], t[i], a[i]) * H0g
    out[i] = chi
  }
  return out
}

export function interpNullable(xs: number[], ys: (number | null)[], x: number): number | null {
  if (x <= xs[0]) return ys[0]
  const last = xs.length - 1
  if (x >= xs[last]) return ys[last]
  let lo = 0, hi = last
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m }
  const p = ys[lo], q = ys[hi]
  if (p === null || q === null) return p ?? q
  return p + ((x - xs[lo]) / (xs[hi] - xs[lo] || 1)) * (q - p)
}

/**
 * ∫ dt/a su un tratto della serie. Se a varia molto nel tratto (campionamento rado vicino al Big Bang),
 * la regola dei trapezi sbaglia di molto: si usa allora la legge di potenza locale a ∝ tⁿ, esatta per materia e radiazione.
 */
function segmentIntegral(t0: number, a0: number, t1: number, a1: number) {
  const trap = 0.5 * (1 / a0 + 1 / a1) * (t1 - t0)
  const ratio = a1 / a0
  if (t0 > 0 && t1 > t0 && (ratio > 1.2 || ratio < 1 / 1.2)) {
    const n = Math.log(ratio) / Math.log(t1 / t0)
    if (Number.isFinite(n) && n > 0 && n < 0.98) return (t1 / a1 - t0 / a0) / (1 - n)
  }
  return trap
}
