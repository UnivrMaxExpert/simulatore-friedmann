/**
 * MOCK del backend — fisica semplificata in TypeScript (decisione D9 in COORDINAMENTO.md).
 * Usato SOLO quando il backend non risponde. Implementa lo stesso contratto (docs/API_CONTRACT.md)
 * con un integratore RK4 a passo adattivo sulla II° equazione di Friedmann.
 * I numeri "ufficiali" sono quelli del backend (SciPy).
 */
import type { CosmoParams, Fate, GridRequest, GridResponse, Origin, SimulateRequest, SimulateResponse } from '../api/types'

export const KMS_MPC_TO_INV_GYR = 1.0227121650537077e-3 // 1 km/s/Mpc in 1/Gyr
export const C_KMS = 299792.458
const A_START = 1e-4

interface Term { O: number; n: number; acc: number } // Ω, esponente a^-n, (1+3w)

function terms(p: CosmoParams) {
  const ok = 1 - p.omega_m - p.omega_r - p.omega_lambda
  const list: Term[] = [
    { O: p.omega_r, n: 4, acc: 2 },
    { O: p.omega_m, n: 3, acc: 1 },
    { O: p.omega_lambda, n: 3 * (1 + p.w), acc: 1 + 3 * p.w },
  ]
  return { ok, list }
}

const E2 = (p: CosmoParams, a: number) => {
  const { ok, list } = terms(p)
  let s = ok * a ** -2
  for (const t of list) if (t.O !== 0) s += t.O * a ** -t.n
  return s
}

/** ä in 1/Gyr² (a adimensionale) */
function accel(p: CosmoParams, a: number, H0g: number) {
  let s = 0
  for (const t of terms(p).list) if (t.O !== 0) s += t.O * t.acc * a ** (1 - t.n)
  return -(H0g * H0g / 2) * s
}

/** q(a) = −ä a / ȧ² espresso tramite E²: q = Σ Ω_i(1+3w_i)a^-n_i / (2E²) */
function qOfA(p: CosmoParams, a: number) {
  let s = 0
  for (const t of terms(p).list) if (t.O !== 0) s += t.O * t.acc * a ** -t.n
  const e2 = E2(p, a)
  return e2 === 0 ? null : s / (2 * e2)
}

type Pt = [number, number, number] // t_rel, a, adot

function rk4(p: CosmoParams, H0g: number, a: number, v: number, dt: number): [number, number] {
  const f = (aa: number, vv: number): [number, number] => [vv, accel(p, aa, H0g)]
  const k1 = f(a, v)
  const k2 = f(a + dt / 2 * k1[0], v + dt / 2 * k1[1])
  const k3 = f(a + dt / 2 * k2[0], v + dt / 2 * k2[1])
  const k4 = f(a + dt * k3[0], v + dt * k3[1])
  return [a + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), v + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])]
}

const stepSize = (a: number, v: number, maxStep: number) =>
  Math.min(Math.max(0.002 * a / Math.max(Math.abs(v), 1e-12), 1e-10), maxStep)

const onlyDarkEnergy = (p: CosmoParams) =>
  p.omega_m < 1e-12 && p.omega_r < 1e-12 && 1 - p.omega_m - p.omega_r - p.omega_lambda < 1e-6 && p.w <= -1 + 1e-9

function interp(xs: number[], ys: number[], x: number) {
  if (x <= xs[0]) return ys[0]
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1]
  let lo = 0, hi = xs.length - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m }
  const f = (x - xs[lo]) / (xs[hi] - xs[lo] || 1)
  return ys[lo] + f * (ys[hi] - ys[lo])
}

export function mockSimulate(req: SimulateRequest): SimulateResponse {
  const p: CosmoParams = { H0: req.H0, omega_m: req.omega_m, omega_r: req.omega_r ?? 0, omega_lambda: req.omega_lambda, w: req.w ?? -1 }
  const tFuture = req.t_future_gyr ?? 40
  const nPts = req.n_points ?? 600
  const H0g = p.H0 * KMS_MPC_TO_INV_GYR
  const { ok } = terms(p)
  const warnings: string[] = ['Dati MOCK calcolati nel browser (backend non raggiungibile).']

  // ---- passato: integrazione all'indietro da oggi ----
  const back: Pt[] = [[0, 1, H0g]]
  let a = 1, v = H0g, t = 0
  let origin: Origin = 'big_bang'
  let aMin: number | null = null
  let ageExtra = 0
  for (let i = 0; i < 400000; i++) {
    const dt = stepSize(a, v, 0.05)
    const [na, nv] = rk4(p, H0g, a, v, -dt)
    if (nv <= 0) { // ȧ si annulla andando indietro → rimbalzo
      origin = 'bounce'; aMin = na; back.push([t - dt, na, 0]); break
    }
    a = na; v = nv; t -= dt
    back.push([t, a, v])
    if (a <= A_START) {
      // tratto mancante 0 < a < A_START: a ∝ t^(2/n) con n del termine dominante
      let best = { val: -Infinity, n: 3 }
      for (const tm of [...terms(p).list, { O: ok, n: 2, acc: 0 }]) if (tm.O > 0 && tm.n > 0) {
        const val = tm.O * a ** -tm.n; if (val > best.val) best = { val, n: tm.n }
      }
      ageExtra = (2 / best.n) * a / v
      if (onlyDarkEnergy(p)) origin = 'eternal_past'
      break
    }
    if (-t > 300) { origin = 'eternal_past'; break }
  }
  const age = origin === 'big_bang' ? -t + ageExtra : null

  // ---- futuro ----
  const fwd: Pt[] = []
  a = 1; v = H0g; t = 0
  let turnT: number | null = null, aMax: number | null = null
  let crunch = false
  const advance = (maxStep: number) => {
    const dt = stepSize(a, v, maxStep)
    const [na, nv] = rk4(p, H0g, a, v, dt)
    if (v > 0 && nv <= 0 && turnT === null) { turnT = t + dt; aMax = na }
    a = na; v = nv; t += dt
  }
  for (let i = 0; i < 400000 && t < tFuture; i++) {
    advance(0.05)
    if (a <= A_START && v < 0) { crunch = true; break }
    if (a >= 1e3) break
    fwd.push([t, a, v])
  }
  // classificazione del destino oltre l'orizzonte mostrato
  let fate: Fate
  let tEndRel: number | null = crunch ? t : null
  let recollapses = crunch || turnT !== null || v < 0
  if (!recollapses) for (let la = Math.log(a); la < Math.log(1e6); la += 0.02) if (E2(p, Math.exp(la)) <= 0) { recollapses = true; break }
  if (recollapses) {
    fate = 'big_crunch'
    for (let i = 0; i < 400000 && !crunch && t < 1e5; i++) { advance(1); if (a <= A_START && v < 0) { crunch = true; tEndRel = t } }
  } else if (p.w < -1 && p.omega_lambda > 0) {
    fate = 'big_rip'
    for (let i = 0; i < 400000 && a < 1e8 && t < 1e5; i++) advance(Infinity)
    tEndRel = a >= 1e8 ? t : null
  } else {
    const qInf = qOfA(p, 1e8)
    fate = qInf !== null && qInf < -1e-3 ? 'accelerating_expansion' : 'eternal_expansion'
  }

  // ---- unione e ricampionamento uniforme in t ----
  const pts = [...back.reverse(), ...fwd]
  const ts = pts.map(x => x[0]), as = pts.map(x => x[1]), vs = pts.map(x => x[2])
  const t0 = ts[0], t1 = ts[ts.length - 1]
  const tr: number[] = []
  for (let i = 0; i < nPts; i++) tr.push(t0 + (t1 - t0) * i / (nPts - 1))
  // assicura che oggi (t=0) sia campionato
  let t0i = 0
  for (let i = 0; i < nPts; i++) if (Math.abs(tr[i]) < Math.abs(tr[t0i])) t0i = i
  tr[t0i] = 0

  const S = {
    t_gyr: [] as number[], t_rel_gyr: tr, a: [] as number[], adot: [] as number[], H: [] as number[], z: [] as number[],
    q: [] as (number | null)[], omega_m: [] as (number | null)[], omega_r: [] as (number | null)[],
    omega_lambda: [] as (number | null)[], omega_k: [] as (number | null)[], rho_total: [] as number[],
  }
  const nDE = 3 * (1 + p.w)
  for (const tt of tr) {
    const aa = interp(ts, as, tt), vv = interp(ts, vs, tt)
    const Ht = vv / aa
    const Er2 = (Ht / H0g) ** 2
    S.t_gyr.push(age !== null ? tt + age : tt)
    S.a.push(aa); S.adot.push(vv); S.H.push(Ht / KMS_MPC_TO_INV_GYR); S.z.push(1 / aa - 1)
    const rm = p.omega_m * aa ** -3, rr = p.omega_r * aa ** -4, rl = p.omega_lambda * aa ** -nDE
    S.rho_total.push(rm + rr + rl)
    if (Er2 === 0) { S.q.push(null); S.omega_m.push(null); S.omega_r.push(null); S.omega_lambda.push(null); S.omega_k.push(null) }
    else {
      S.q.push(-accel(p, aa, H0g) * aa / (vv * vv))
      S.omega_m.push(rm / Er2); S.omega_r.push(rr / Er2); S.omega_lambda.push(rl / Er2); S.omega_k.push(ok * aa ** -2 / Er2)
    }
  }

  // ---- inizio dell'accelerazione ----
  let zAcc: number | null = null, tAcc: number | null = null
  const q0 = qOfA(p, 1) ?? 0
  if (q0 < 0) {
    for (let i = t0i; i > 0; i--) {
      const qa = S.q[i], qb = S.q[i - 1]
      if (qa !== null && qb !== null && qa < 0 && qb >= 0) {
        const f = qa / (qa - qb)
        const aAcc = S.a[i] + f * (S.a[i - 1] - S.a[i])
        zAcc = 1 / aAcc - 1
        tAcc = S.t_gyr[i] + f * (S.t_gyr[i - 1] - S.t_gyr[i])
        break
      }
    }
  }

  const kSign = Math.abs(ok) < 1e-4 ? 0 : ok > 0 ? -1 : 1
  const h = p.H0 / 100
  if (origin === 'bounce') warnings.push('Nessun Big Bang: andando indietro nel tempo l\'universo rimbalza a un raggio minimo.')
  if (origin === 'eternal_past') warnings.push('a → 0 solo per t → −∞: l\'età non è definita.')

  return {
    params: { ...p, omega_k: ok },
    derived: {
      omega_k: ok, omega_total: 1 - ok, k_sign: kSign as -1 | 0 | 1,
      geometry: kSign === 0 ? 'flat' : kSign > 0 ? 'closed' : 'open',
      h, hubble_time_gyr: 1 / H0g, hubble_radius_mpc: C_KMS / p.H0, rho_crit_0_g_cm3: 1.8785e-29 * h * h,
      age_gyr: age, q0, accelerating_now: q0 < 0, fate, origin,
      t_end_gyr: tEndRel !== null ? (age !== null ? tEndRel + age : tEndRel) : null,
      a_max: aMax, t_turnaround_gyr: turnT !== null ? (age !== null ? turnT + age : turnT) : null,
      z_eq: p.omega_r > 0 && p.omega_m > 0 ? p.omega_m / p.omega_r - 1 : null,
      z_acc: zAcc, t_acc_gyr: tAcc, a_min: aMin,
    },
    series: S,
    t0_index: t0i,
    warnings,
  }
}

export function mockGrid(req: GridRequest): GridResponse {
  const { param, min, max, steps } = req.sweep
  const tg: number[] = []
  for (let i = 0; i < req.n_time; i++) tg.push(req.t_rel_min_gyr + (req.t_rel_max_gyr - req.t_rel_min_gyr) * i / (req.n_time - 1))
  const res: GridResponse = { param, param_values: [], t_rel_gyr: tg, a: [], fate: [], origin: [], age_gyr: [] }
  for (let s = 0; s < steps; s++) {
    const val = min + (max - min) * s / Math.max(steps - 1, 1)
    const p: CosmoParams = { ...req.base, [param]: val }
    if (req.keep_flat && param !== 'omega_lambda') p.omega_lambda = 1 - p.omega_m - p.omega_r
    const sim = mockSimulate({ ...p, t_future_gyr: Math.max(req.t_rel_max_gyr, 1), n_points: 400 })
    const tr = sim.series.t_rel_gyr, aa = sim.series.a
    res.param_values.push(val)
    res.a.push(tg.map(t => (t < tr[0] || t > tr[tr.length - 1]) ? null : interp(tr, aa, t)))
    res.fate.push(sim.derived.fate); res.origin.push(sim.derived.origin); res.age_gyr.push(sim.derived.age_gyr)
  }
  return res
}
