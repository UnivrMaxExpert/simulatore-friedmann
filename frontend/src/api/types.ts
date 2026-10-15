// Tipi che rispecchiano docs/API_CONTRACT.md v1.0 — non rinominare i campi.

export type Fate =
  | 'big_crunch'
  | 'big_rip'
  | 'accelerating_expansion'
  | 'eternal_expansion'
  | 'static'

export type Origin = 'big_bang' | 'bounce' | 'eternal_past'

export interface CosmoParams {
  H0: number
  omega_m: number
  omega_r: number
  omega_lambda: number
  w: number
}

export interface SimulateRequest extends CosmoParams {
  t_future_gyr?: number
  n_points?: number
}

export interface Derived {
  omega_k: number
  omega_total: number
  k_sign: -1 | 0 | 1
  geometry: 'open' | 'flat' | 'closed'
  h: number
  hubble_time_gyr: number
  hubble_radius_mpc: number
  rho_crit_0_g_cm3: number
  age_gyr: number | null
  q0: number
  accelerating_now: boolean
  fate: Fate
  origin: Origin
  t_end_gyr: number | null
  a_max: number | null
  t_turnaround_gyr: number | null
  z_eq: number | null
  z_acc: number | null
  t_acc_gyr: number | null
  a_min: number | null
}

type Arr = (number | null)[]

export interface Series {
  t_gyr: number[]
  t_rel_gyr: number[]
  a: number[]
  adot: number[]
  H: number[]
  z: number[]
  q: Arr
  omega_m: Arr
  omega_r: Arr
  omega_lambda: Arr
  omega_k: Arr
  rho_total: number[]
}

export interface SimulateResponse {
  params: CosmoParams & { omega_k: number }
  derived: Derived
  series: Series
  t0_index: number
  warnings: string[]
}

export interface Preset {
  id: string
  name: string
  description: string
  params: CosmoParams
}

export type SweepParam = 'omega_m' | 'omega_lambda' | 'omega_r' | 'w' | 'H0'

export interface GridRequest {
  base: CosmoParams
  sweep: { param: SweepParam; min: number; max: number; steps: number }
  t_rel_min_gyr: number
  t_rel_max_gyr: number
  n_time: number
  keep_flat: boolean
}

export interface GridResponse {
  param: SweepParam
  param_values: number[]
  t_rel_gyr: number[]
  a: Arr[]
  fate: Fate[]
  origin: Origin[]
  age_gyr: (number | null)[]
}
