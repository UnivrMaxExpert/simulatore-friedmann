import type { SimulateResponse } from '../api/types'
import { KMS_MPC_TO_INV_GYR } from './mock'

/**
 * Confronto in tempo reale tra le formule delle lezioni e i numeri del simulatore.
 * Il simulatore integra numericamente la II equazione di Friedmann; qui gli stessi numeri
 * si ricavano in modo indipendente (soluzioni esatte, oppure la I equazione) e si confrontano.
 */
export interface Check {
  id: string
  label: string        // cosa si confronta
  formula: string      // la formula usata (testo con simboli Unicode)
  source: string       // da dove viene (lezione / equazione)
  expected: number     // valore dalla formula
  simulated: number    // valore del simulatore
  unit?: string
  atCursor?: boolean   // dipende dal tempo scelto sulla linea del tempo
}

const EPS = 1e-6
const near = (x: number, y: number) => Math.abs(x - y) < EPS

/** E²(a) = H²/H₀² dalla I equazione di Friedmann */
export function E2(res: SimulateResponse, a: number): number {
  const { omega_m: m, omega_r: r, omega_lambda: l, w, omega_k: k } = res.params
  return r * a ** -4 + m * a ** -3 + k * a ** -2 + l * a ** (-3 * (1 + w))
}

/** Età dalla I equazione: t₀ = ∫₀¹ da / (a H₀ E(a)), con a = u² per togliere la singolarità in a = 0. */
function ageFromFirstEquation(res: SimulateResponse): number | null {
  const H0g = res.params.H0 * KMS_MPC_TO_INV_GYR
  const N = 4000
  let s = 0
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N
    const a = u * u
    const e2 = E2(res, a)
    if (!(e2 > 0)) return null
    s += (2 * u) / (a * Math.sqrt(e2)) / N  // da = 2u du
  }
  return s / H0g
}

type Model =
  | { kind: 'eds' } | { kind: 'radiation' } | { kind: 'desitter' }
  | { kind: 'flat_lcdm'; m: number; l: number }
  | { kind: 'open_matter'; m: number } | { kind: 'closed_matter'; m: number }
  | { kind: 'ads'; L: number; k: number } | { kind: 'other' }

function classify(res: SimulateResponse): Model {
  const { omega_m: m, omega_r: r, omega_lambda: l, w, omega_k: k } = res.params
  const lam = Math.abs(w + 1) < EPS || near(l, 0)
  if (!lam) return { kind: 'other' }
  if (near(r, 0)) {
    if (near(l, 0)) {
      if (near(m, 1)) return { kind: 'eds' }
      if (m > 0 && m < 1) return { kind: 'open_matter', m }
      if (m > 1) return { kind: 'closed_matter', m }
    }
    if (near(m, 0) && near(k, 0) && l > 0) return { kind: 'desitter' }
    if (near(k, 0) && m > 0 && l > 0) return { kind: 'flat_lcdm', m, l }
    if (near(m, 0) && l < 0 && k > 0) return { kind: 'ads', L: -l, k }
  } else if (near(r, 1) && near(m, 0) && near(l, 0)) return { kind: 'radiation' }
  return { kind: 'other' }
}

/** Indice del campione più vicino al tempo del cursore (si confronta su un punto vero della soluzione, senza interpolare). */
function nearestIndex(xs: number[], x: number): number {
  let lo = 0, hi = xs.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid }
  return Math.abs(xs[lo] - x) <= Math.abs(xs[hi] - x) ? lo : hi
}

export function computeChecks(res: SimulateResponse, tRel: number): Check[] {
  const p = res.params
  const d = res.derived
  const H0g = p.H0 * KMS_MPC_TO_INV_GYR
  const tH = 1 / H0g
  const model = classify(res)
  const out: Check[] = []
  const S = res.series
  const i = nearestIndex(S.t_rel_gyr, tRel)
  const a = S.a[i]
  const t = S.t_gyr[i]

  // ---- al tempo del cursore ------------------------------------------------
  if (a > 1e-3 && a < 1e3) { // oltre a = 1000 (Big Rip) il simulatore ha già fermato l'integrazione
    out.push({
      id: 'H', atCursor: true,
      label: 'Parametro di Hubble',
      formula: 'H = H₀ √(Ωr a⁻⁴ + Ωm a⁻³ + Ωk a⁻² + ΩΛ a⁻³⁽¹⁺ʷ⁾)',
      source: 'I equazione di Friedmann',
      expected: p.H0 * Math.sqrt(Math.max(E2(res, a), 0)),
      simulated: Math.abs(S.H[i]),
      unit: 'km/s/Mpc',
    })
    const om = S.omega_m[i]
    if (p.omega_m > 0 && om !== null) {
      out.push({
        id: 'om', atCursor: true,
        label: 'Densità di materia',
        formula: 'Ωm(t) = Ωm a⁻³ / E²(a)',
        source: 'III equazione: ρ ∝ a⁻³⁽¹⁺ʷ⁾ con w = 0',
        expected: (p.omega_m * a ** -3) / E2(res, a),
        simulated: om,
      })
    }
  }

  // soluzione esatta a(t), dove esiste
  let aExact: number | null = null, aFormula = ''
  switch (model.kind) {
    case 'eds': aExact = (t / d.age_gyr!) ** (2 / 3); aFormula = 'a = (t/t₀)^(2/3)'; break
    case 'radiation': aExact = Math.sqrt(t / d.age_gyr!); aFormula = 'a = (t/t₀)^(1/2)'; break
    case 'desitter': aExact = Math.exp(H0g * S.t_rel_gyr[i]); aFormula = 'a = e^(H₀ (t − t₀))'; break
    case 'flat_lcdm':
      aExact = (model.m / model.l) ** (1 / 3) * Math.sinh(1.5 * Math.sqrt(model.l) * H0g * t) ** (2 / 3)
      aFormula = 'a = (Ωm/ΩΛ)^(1/3) sinh^(2/3)(3/2 √ΩΛ H₀ t)'; break
    case 'ads':
      aExact = Math.sqrt(model.k / model.L) * Math.sin(Math.sqrt(model.L) * H0g * t)
      aFormula = 'a = √(Ωk/|ΩΛ|) sin(√|ΩΛ| H₀ t)'; break
  }
  if (aExact !== null && Number.isFinite(aExact) && t > 0) {
    out.push({ id: 'a', atCursor: true, label: 'Fattore di scala', formula: aFormula, source: 'soluzione esatta delle equazioni di Friedmann', expected: aExact, simulated: a })
  }

  // ---- grandezze di oggi ---------------------------------------------------
  out.push({
    id: 'q0',
    label: 'Parametro di decelerazione oggi',
    formula: 'q₀ = Ωr + Ωm/2 + (1+3w)/2 · ΩΛ',
    source: 'II equazione: q = −ä a / ȧ²',
    expected: p.omega_r + p.omega_m / 2 + ((1 + 3 * p.w) / 2) * p.omega_lambda,
    simulated: d.q0,
  })

  if (d.age_gyr !== null) {
    let age: number | null = null, f = '', src = 'soluzione esatta'
    switch (model.kind) {
      case 'eds': age = (2 / 3) * tH; f = 't₀ = 2 / (3H₀)'; break
      case 'radiation': age = 0.5 * tH; f = 't₀ = 1 / (2H₀)'; break
      case 'flat_lcdm':
        age = (2 / (3 * Math.sqrt(model.l))) * Math.asinh(Math.sqrt(model.l / model.m)) * tH
        f = 't₀ = 2 / (3H₀√ΩΛ) · arcsinh √(ΩΛ/Ωm)'; break
      case 'open_matter': {
        const m = model.m
        age = (1 / (1 - m) - (m / (2 * (1 - m) ** 1.5)) * Math.acosh(2 / m - 1)) * tH
        f = 't₀ = [1/(1−Ωm) − Ωm/(2(1−Ωm)^(3/2)) · arccosh(2/Ωm − 1)] / H₀'; break
      }
      case 'closed_matter': {
        const m = model.m
        age = ((m / (2 * (m - 1) ** 1.5)) * Math.acos(2 / m - 1) - 1 / (m - 1)) * tH
        f = 't₀ = [Ωm/(2(Ωm−1)^(3/2)) · arccos(2/Ωm − 1) − 1/(Ωm−1)] / H₀'; src = 'soluzione esatta (cicloide)'; break
      }
      case 'ads':
        age = Math.asin(Math.sqrt(model.L / model.k)) / Math.sqrt(model.L) * tH
        f = 't₀ = arcsin √(|ΩΛ|/Ωk) / (√|ΩΛ| H₀)'; break
      default:
        age = ageFromFirstEquation(res)
        f = 't₀ = ∫₀¹ da / (a H₀ E(a))'; src = 'I equazione, integrata a parte'
    }
    if (age !== null) out.push({ id: 'age', label: 'Età dell\'universo', formula: f, source: src, expected: age, simulated: d.age_gyr, unit: 'Gyr' })
  }

  if (d.a_max !== null) {
    let amax: number | null = null, f = ''
    if (model.kind === 'closed_matter') { amax = model.m / (model.m - 1); f = 'a_max = Ωm / (Ωm − 1)' }
    else if (model.kind === 'ads') { amax = Math.sqrt(model.k / model.L); f = 'a_max = √(Ωk / |ΩΛ|)' }
    else {
      // primo zero di E²(a) per a > 1: lì ȧ = 0 nella I equazione
      let lo = 1, hi = 1
      while (E2(res, hi) > 0 && hi < 1e6) { lo = hi; hi *= 1.5 }
      if (E2(res, hi) <= 0) {
        for (let n = 0; n < 200; n++) { const mid = (lo + hi) / 2; if (E2(res, mid) > 0) lo = mid; else hi = mid }
        amax = (lo + hi) / 2; f = 'E²(a_max) = 0  (ȧ = 0 nella I equazione)'
      }
    }
    if (amax !== null) out.push({ id: 'amax', label: 'Massima espansione', formula: f, source: 'I equazione con ȧ = 0', expected: amax, simulated: d.a_max })
  }

  if (d.fate === 'big_crunch' && d.t_end_gyr !== null) {
    let tc: number | null = null, f = ''
    if (model.kind === 'closed_matter') { tc = (Math.PI * model.m) / (model.m - 1) ** 1.5 * tH; f = 't_crunch = π Ωm / (H₀ (Ωm − 1)^(3/2))' }
    else if (model.kind === 'ads') { tc = Math.PI / Math.sqrt(model.L) * tH; f = 't_crunch = π / (√|ΩΛ| H₀)' }
    if (tc !== null) out.push({ id: 'tc', label: 'Tempo del Big Crunch', formula: f, source: 'soluzione esatta', expected: tc, simulated: d.t_end_gyr, unit: 'Gyr' })
  }

  // inizio dell'accelerazione: q = 0 ⇔ Ωm a⁻³ + (1+3w) ΩΛ a⁻³⁽¹⁺ʷ⁾ = 0 (radiazione trascurabile a quell'epoca)
  if (d.z_acc !== null && p.omega_r < 1e-3 && p.omega_m > 0 && p.omega_lambda > 0 && p.w < -1 / 3) {
    const aAcc = (-p.omega_m / ((1 + 3 * p.w) * p.omega_lambda)) ** (-1 / (3 * p.w))
    out.push({
      id: 'zacc',
      label: 'Redshift di inizio accelerazione',
      formula: Math.abs(p.w + 1) < EPS ? 'z_acc = (2ΩΛ/Ωm)^(1/3) − 1' : 'z_acc: Ωm a⁻³ + (1+3w) ΩΛ a⁻³⁽¹⁺ʷ⁾ = 0',
      source: p.omega_r > 0 ? 'II equazione con ä = 0 (radiazione trascurata: a quell\'epoca conta pochissimo)' : 'II equazione con ä = 0',
      expected: 1 / aAcc - 1,
      simulated: d.z_acc,
    })
  }

  return out
}

export const relDiff = (c: Check) => Math.abs(c.simulated - c.expected) / Math.max(Math.abs(c.expected), 1e-9)
