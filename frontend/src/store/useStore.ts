import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import { LESSON_PRESETS } from '../physics/presets'
import type { CosmoParams, Preset, SimulateResponse } from '../api/types'

export type Tab = 'simulatore' | 'teoria'
export type SceneMode = 'space' | 'galaxies' | 'surface'

export interface SavedModel {
  id: number
  name: string
  color: string
  params: CosmoParams
  result: SimulateResponse
}

const COMPARE_COLORS = ['#5BD6A0', '#F2B263', '#FF8FB1', '#6FD3E8', '#D8E36A']

interface State {
  tab: Tab
  scene: SceneMode
  drawerOpen: boolean
  cameraReset: number
  params: CosmoParams
  tFuture: number
  presetId: string | null
  presets: Preset[]
  result: SimulateResponse | null
  loading: boolean
  error: string | null
  /** cursore temporale condiviso, tempo relativo a oggi (Gyr) */
  tRel: number
  playing: boolean
  speed: number
  saved: SavedModel[]
  setTab: (t: Tab) => void
  setScene: (m: SceneMode) => void
  toggleDrawer: () => void
  resetCamera: () => void
  /** dalla Teoria: carica un modello e (facoltativo) una vista, poi va al simulatore */
  tryModel: (presetId: string, scene?: SceneMode) => void
  setParam: <K extends keyof CosmoParams>(k: K, v: CosmoParams[K]) => void
  setParams: (p: Partial<CosmoParams>) => void
  setTFuture: (t: number) => void
  applyPreset: (id: string) => void
  loadPresets: () => Promise<void>
  simulate: () => Promise<void>
  setTRel: (t: number) => void
  setPlaying: (p: boolean) => void
  setSpeed: (s: number) => void
  saveCurrent: () => void
  removeSaved: (id: number) => void
}

export const DEFAULT_PARAMS: CosmoParams = { H0: 67.66, omega_m: 0.3111, omega_r: 9e-5, omega_lambda: 0.6889, w: -1 }

let simSeq = 0
let savedSeq = 1

export const useStore = create<State>((set, get) => ({
  tab: 'simulatore',
  scene: 'space',
  drawerOpen: false,
  cameraReset: 0,
  params: DEFAULT_PARAMS,
  tFuture: 40,
  presetId: 'planck18',
  presets: LESSON_PRESETS,
  result: null,
  loading: false,
  error: null,
  tRel: 0,
  playing: false,
  speed: 1,
  saved: [],

  setTab: tab => set({ tab }),
  setScene: scene => set({ scene }),
  toggleDrawer: () => set(s => ({ drawerOpen: !s.drawerOpen })),
  resetCamera: () => set(s => ({ cameraReset: s.cameraReset + 1 })),
  tryModel: (presetId, scene) => {
    get().applyPreset(presetId)
    // la superficie non mostra il singolo modello: in quel caso torna allo spazio curvo
    const next = scene ?? (get().scene === 'surface' ? 'space' : get().scene)
    set({ tab: 'simulatore', scene: next, playing: false })
  },
  setParam: (k, v) => { set(s => ({ params: { ...s.params, [k]: v }, presetId: null })); scheduleSim() },
  setParams: p => { set(s => ({ params: { ...s.params, ...p }, presetId: null })); scheduleSim() },
  setTFuture: tFuture => { set({ tFuture }); scheduleSim() },
  applyPreset: id => {
    const pr = get().presets.find(p => p.id === id)
    if (!pr) return
    set({ params: { ...pr.params, omega_r: pr.params.omega_r ?? 0, w: pr.params.w ?? -1 }, presetId: id, tRel: 0 })
    scheduleSim(0)
  },
  // i preset sono contenuto didattico: li gestisce il frontend (CR-1 in COORDINAMENTO.md)
  loadPresets: async () => { set({ presets: LESSON_PRESETS }) },
  simulate: async () => {
    const seq = ++simSeq
    set({ loading: true })
    try {
      const { params, tFuture } = get()
      const result = await api.simulate({ ...params, t_future_gyr: tFuture, n_points: 800 })
      if (seq !== simSeq) return
      const tr = result.series.t_rel_gyr
      const tRel = Math.min(Math.max(get().tRel, tr[0]), tr[tr.length - 1])
      set({ result, loading: false, error: null, tRel })
    } catch (e) {
      if (seq !== simSeq) return
      set({ loading: false, error: e instanceof ApiError ? e.message : 'Simulazione non riuscita: controlla che il backend sia avviato.' })
    }
  },
  setTRel: tRel => set({ tRel }),
  setPlaying: playing => set({ playing }),
  setSpeed: speed => set({ speed }),
  saveCurrent: () => {
    const { result, params, saved, presetId, presets } = get()
    if (!result) return
    const id = savedSeq++
    const name = presets.find(p => p.id === presetId)?.name
      ?? `Ωm ${params.omega_m.toFixed(2)} · ΩΛ ${params.omega_lambda.toFixed(2)}${params.w !== -1 ? ` · w ${params.w.toFixed(2)}` : ''}`
    set({ saved: [...saved, { id, name, params, result, color: COMPARE_COLORS[(id - 1) % COMPARE_COLORS.length] }].slice(-5) })
  },
  removeSaved: id => set(s => ({ saved: s.saved.filter(m => m.id !== id) })),
}))

let timer: ReturnType<typeof setTimeout> | undefined
function scheduleSim(delay = 160) {
  clearTimeout(timer)
  timer = setTimeout(() => void useStore.getState().simulate(), delay)
}

/** Interpola una serie del risultato al tempo tRel corrente */
export function sampleAt(res: SimulateResponse, key: 'a' | 'H' | 'z' | 'adot' | 't_gyr' | 'rho_total', tRel: number): number {
  const xs = res.series.t_rel_gyr, ys = res.series[key]
  if (tRel <= xs[0]) return ys[0]
  if (tRel >= xs[xs.length - 1]) return ys[ys.length - 1]
  let lo = 0, hi = xs.length - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= tRel) lo = m; else hi = m }
  const f = (tRel - xs[lo]) / (xs[hi] - xs[lo] || 1)
  return ys[lo] + f * (ys[hi] - ys[lo])
}

export function sampleNullable(res: SimulateResponse, key: 'q' | 'omega_m' | 'omega_r' | 'omega_lambda' | 'omega_k', tRel: number): number | null {
  const xs = res.series.t_rel_gyr, ys = res.series[key]
  let lo = 0, hi = xs.length - 1
  if (tRel <= xs[0]) return ys[0]
  if (tRel >= xs[hi]) return ys[hi]
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= tRel) lo = m; else hi = m }
  const a = ys[lo], b = ys[hi]
  if (a === null || b === null) return a ?? b
  const f = (tRel - xs[lo]) / (xs[hi] - xs[lo] || 1)
  return a + f * (b - a)
}
