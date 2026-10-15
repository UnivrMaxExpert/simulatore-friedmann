/**
 * Adattatore per il formato di risposta che il backend di Antigravity usa oggi (vedi COLLABORATION.md, §3),
 * diverso dal contratto docs/API_CONTRACT.md. Converte la risposta nel formato del contratto, così il resto
 * del frontend non cambia. Quando il backend adotterà il contratto (ISSUE-2 in COORDINAMENTO.md) questo file
 * non verrà più usato: isLegacySimulate() restituirà false.
 */
import type { CosmoParams, Fate, SimulateRequest, SimulateResponse } from './types'
import { KMS_MPC_TO_INV_GYR, C_KMS } from '../physics/mock'

interface LegacySim {
  metadata: {
    Omega_k: number; k_val: number; current_age_Gyr: number; fate: string; crunch_time_Gyr: number | null
    t_today_index: number
  }
  times_Gyr: number[]
  scale_factor_a: number[]
  hubble_H: number[]
  q_deceleration: number[]
  redshift_z: number[]
  omega_components: { Omega_m_t: number[]; Omega_Lambda_t: number[]; Omega_r_t: number[]; Omega_k_t: number[] }
}

export const isLegacySimulate = (r: unknown): r is LegacySim =>
  typeof r === 'object' && r !== null && 'metadata' in r && 'scale_factor_a' in r

export function legacyRequestFields(req: SimulateRequest) {
  return {
    Omega_m: req.omega_m, Omega_Lambda: Math.max(req.omega_lambda, 0), Omega_r: req.omega_r,
    num_time_points: Math.min(req.n_points ?? 600, 1000), num_galaxies: 10,
  }
}

const FATE_MAP: Record<string, Fate> = {
  accelerated_expansion: 'accelerating_expansion',
  decelerated_expansion: 'eternal_expansion',
  big_crunch: 'big_crunch',
  big_rip: 'big_rip',
}

export function adaptLegacySimulate(r: LegacySim, req: SimulateRequest): SimulateResponse {
  const p: CosmoParams = { H0: req.H0, omega_m: req.omega_m, omega_r: req.omega_r ?? 0, omega_lambda: req.omega_lambda, w: req.w ?? -1 }
  const age = r.metadata.current_age_Gyr
  const a = r.scale_factor_a
  const t = r.times_Gyr
  // il backend restituisce sempre H ≥ 0: dopo l'inversione (a decrescente) H è negativo
  const iMax = a.indexOf(Math.max(...a))
  const contracting = r.metadata.fate === 'big_crunch'
  const H = r.hubble_H.map((h, i) => (contracting && i > iMax ? -h : h))
  const ok = 1 - p.omega_m - p.omega_r - p.omega_lambda
  const q0 = p.omega_r + p.omega_m / 2 + (1 + 3 * p.w) * p.omega_lambda / 2
  const h = p.H0 / 100
  const H0g = p.H0 * KMS_MPC_TO_INV_GYR

  // inizio dell'accelerazione dal cambio di segno di q nel passato
  let zAcc: number | null = null, tAcc: number | null = null
  const i0 = r.metadata.t_today_index
  if (q0 < 0) for (let i = i0; i > 0; i--) {
    const qa = r.q_deceleration[i], qb = r.q_deceleration[i - 1]
    if (qa < 0 && qb >= 0) { const f = qa / (qa - qb); const aa = a[i] + f * (a[i - 1] - a[i]); zAcc = 1 / aa - 1; tAcc = t[i] + f * (t[i - 1] - t[i]); break }
  }
  const fate = FATE_MAP[r.metadata.fate] ?? 'eternal_expansion'
  // dove E² ≈ 0 (inversione) il backend restituisce 0 per tutti gli Ωi: lì il valore non è definito
  const c = r.omega_components
  const undef = c.Omega_m_t.map((v, i) => v === 0 && c.Omega_Lambda_t[i] === 0 && c.Omega_r_t[i] === 0 && c.Omega_k_t[i] === 0)
  const clean = (arr: number[]) => arr.map((v, i) => (undef[i] ? null : v))
  const om = { Omega_m_t: clean(c.Omega_m_t), Omega_r_t: clean(c.Omega_r_t), Omega_Lambda_t: clean(c.Omega_Lambda_t), Omega_k_t: clean(c.Omega_k_t) }
  return {
    params: { ...p, omega_k: ok },
    derived: {
      omega_k: ok, omega_total: 1 - ok, k_sign: (r.metadata.k_val as -1 | 0 | 1),
      geometry: r.metadata.k_val === 0 ? 'flat' : r.metadata.k_val > 0 ? 'closed' : 'open',
      h, hubble_time_gyr: 1 / H0g, hubble_radius_mpc: C_KMS / p.H0, rho_crit_0_g_cm3: 1.8785e-29 * h * h,
      age_gyr: age, q0, accelerating_now: q0 < 0, fate, origin: 'big_bang',
      t_end_gyr: r.metadata.crunch_time_Gyr, a_max: contracting ? a[iMax] : null,
      t_turnaround_gyr: contracting ? t[iMax] : null,
      z_eq: p.omega_r > 0 && p.omega_m > 0 ? p.omega_m / p.omega_r - 1 : null,
      z_acc: zAcc, t_acc_gyr: tAcc, a_min: null,
    },
    series: {
      t_gyr: t, t_rel_gyr: t.map(x => x - age), a, adot: a.map((x, i) => x * H[i] * KMS_MPC_TO_INV_GYR), H,
      z: r.redshift_z, q: r.q_deceleration, omega_m: om.Omega_m_t, omega_r: om.Omega_r_t, omega_lambda: om.Omega_Lambda_t,
      omega_k: om.Omega_k_t, rho_total: a.map(x => p.omega_m * x ** -3 + p.omega_r * x ** -4 + p.omega_lambda * x ** (-3 * (1 + p.w))),
    },
    t0_index: i0,
    warnings: ['Risposta del backend nel formato provvisorio (non ancora allineato al contratto): alcuni campi sono ricostruiti dal frontend.'],
  }
}
