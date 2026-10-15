import { useCallback, useEffect, useMemo, useState } from 'react'
import Plot, { AXIS } from '../components/Plot'
import { api, ApiError } from '../api/client'
import type { CosmoParams, GridResponse, SweepParam } from '../api/types'
import { useStore } from '../store/useStore'
import { COLORS, FATE_LABEL, fmt } from '../format'

const PARAM_INFO: Record<SweepParam, { label: string; min: number; max: number }> = {
  omega_m: { label: 'Ωm', min: 0.05, max: 3 },
  omega_lambda: { label: 'ΩΛ', min: -1, max: 2.5 },
  omega_r: { label: 'Ωr', min: 0, max: 1 },
  w: { label: 'w', min: -2, max: -0.34 },
  H0: { label: 'H₀', min: 40, max: 100 },
}

interface Example { id: string; label: string; param: SweepParam; min: number; max: number; flat: boolean; override: Partial<CosmoParams>; tMax: number }
const EXAMPLES: Example[] = [
  { id: 'curv', label: 'Da aperto a chiuso (solo materia)', param: 'omega_m', min: 0.05, max: 3, flat: false, override: { omega_lambda: 0, omega_r: 0, w: -1 }, tMax: 45 },
  { id: 'flat', label: 'Universi piatti, Ωm + ΩΛ = 1', param: 'omega_m', min: 0.02, max: 1, flat: true, override: { omega_r: 0, w: -1 }, tMax: 30 },
  { id: 'lambda', label: 'Quanta energia oscura (Ωm = 0,3)', param: 'omega_lambda', min: -0.6, max: 2, flat: false, override: { omega_m: 0.3, omega_r: 0, w: -1 }, tMax: 30 },
  { id: 'w', label: 'Equazione di stato w', param: 'w', min: -1.6, max: 0, flat: false, override: { omega_m: 0.3, omega_lambda: 0.7, omega_r: 0 }, tMax: 30 },
]
const STEPS = 36
const T_MIN = -14
const A_CAP = 4
const COLORSCALE = [[0, '#16224A'], [0.35, '#3D6BE0'], [0.7, '#B48CFF'], [1, '#FF6B6B']]

/** Superficie a(t, parametro): ogni sezione è una soluzione delle equazioni di Friedmann. */
export default function SurfacePanel() {
  const params = useStore(s => s.params)
  const [exId, setExId] = useState<string>(EXAMPLES[0].id)
  const [param, setParam] = useState<SweepParam>(EXAMPLES[0].param)
  const [min, setMin] = useState(EXAMPLES[0].min)
  const [max, setMax] = useState(EXAMPLES[0].max)
  const [grid, setGrid] = useState<GridResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const ex = EXAMPLES.find(e => e.id === exId)
  const override = ex?.override ?? {}

  const compute = useCallback(async (q: { param: SweepParam; min: number; max: number; flat: boolean; base: CosmoParams; tMax: number }) => {
    setBusy(true); setErr(null)
    try {
      setGrid(await api.grid({
        base: q.base, sweep: { param: q.param, min: q.min, max: q.max, steps: STEPS },
        t_rel_min_gyr: T_MIN, t_rel_max_gyr: q.tMax, n_time: 160, keep_flat: q.flat,
      }))
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Calcolo della superficie non riuscito.') }
    setBusy(false)
  }, [])

  const chooseExample = (id: string) => {
    setExId(id)
    const e = EXAMPLES.find(x => x.id === id)
    if (!e) return // "parametri della barra laterale": si ricalcola con il pulsante
    setParam(e.param); setMin(e.min); setMax(e.max)
    void compute({ param: e.param, min: e.min, max: e.max, flat: e.flat, base: { ...params, ...e.override }, tMax: e.tMax })
  }
  const recompute = () =>
    void compute({ param, min, max, flat: ex?.flat ?? false, base: { ...params, ...override }, tMax: ex?.tMax ?? 30 })

  // primo calcolo: l'esempio più eloquente, con il big crunch per Ωm > 1
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chooseExample(EXAMPLES[0].id) }, [])

  const data = useMemo(() => {
    if (!grid) return []
    const z = grid.a.map(row => row.map(v => (v === null || v > A_CAP ? null : v)))
    const label = PARAM_INFO[grid.param].label
    const traces: object[] = [{
      type: 'surface', x: grid.t_rel_gyr, y: grid.param_values, z,
      colorscale: COLORSCALE, cmin: 0, cmax: A_CAP, showscale: false,
      contours: { z: { show: true, usecolormap: false, color: 'rgba(232,236,244,0.35)', width: 1, start: 0.5, end: A_CAP, size: 0.5 } },
      hovertemplate: 't − t₀ = %{x:.1f} Gyr<br>' + label + ' = %{y:.3f}<br>a = %{z:.3f}<extra></extra>',
      lighting: { ambient: 0.85, diffuse: 0.4, specular: 0.05 },
    }, {
      type: 'scatter3d', mode: 'lines', x: grid.param_values.map(() => 0), y: grid.param_values, z: grid.param_values.map(() => 1),
      line: { color: COLORS.red, width: 5 }, name: 'oggi, a = 1', hoverinfo: 'skip',
    }]
    // il modello della barra laterale, se appartiene alla famiglia mostrata
    const same = Object.keys(override).every(k => k === grid.param || override[k as keyof CosmoParams] === params[k as keyof CosmoParams])
    const cur = params[grid.param]
    if (same && cur >= grid.param_values[0] && cur <= grid.param_values[grid.param_values.length - 1]) {
      let best = 0
      grid.param_values.forEach((v, i) => { if (Math.abs(v - cur) < Math.abs(grid.param_values[best] - cur)) best = i })
      traces.push({ type: 'scatter3d', mode: 'lines', x: grid.t_rel_gyr, y: grid.t_rel_gyr.map(() => grid.param_values[best]), z: z[best], line: { color: COLORS.green, width: 7 }, name: 'modello della barra laterale', hoverinfo: 'skip' })
    }
    return traces
  }, [grid, params, override])

  const fates = useMemo(() => {
    if (!grid) return []
    const out: { from: number; to: number; fate: keyof typeof FATE_LABEL }[] = []
    grid.fate.forEach((f, i) => {
      const last = out[out.length - 1]
      if (last && last.fate === f) last.to = grid.param_values[i]
      else out.push({ from: grid.param_values[i], to: grid.param_values[i], fate: f })
    })
    return out
  }, [grid])

  return (
    <>
      <Plot
        height="100%"
        data={data}
        layout={{
          margin: { l: 0, r: 0, t: 0, b: 0 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          scene: {
            xaxis: { ...AXIS, title: { text: 't − t₀ (Gyr)' }, backgroundcolor: '#0C1222', showbackground: true },
            yaxis: { ...AXIS, title: { text: grid ? PARAM_INFO[grid.param].label : '' }, backgroundcolor: '#0C1222', showbackground: true },
            zaxis: { ...AXIS, title: { text: 'a(t)' }, range: [0, A_CAP], backgroundcolor: '#0A0F1C', showbackground: true },
            camera: { eye: { x: -1.3, y: 1.8, z: 0.8 } },
            domain: { x: [0.26, 1], y: [0, 1] },
            aspectmode: 'manual', aspectratio: { x: 1.4, y: 1, z: 0.7 },
          },
          legend: { orientation: 'h', x: 1, xanchor: 'right', y: 0, yanchor: 'bottom' },
        }}
      />
      <div className="overlay card surface-controls">
        <h3>Superficie a(t, parametro)</h3>
        <p>Ogni sezione della superficie è una soluzione delle equazioni di Friedmann: un parametro varia, gli altri restano fissi.</p>
        <div className="controls-row">
          <label className="field">Famiglia di universi
            <select value={exId} onChange={e => chooseExample(e.target.value)}>
              {EXAMPLES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              <option value="custom">Parametri della barra laterale</option>
            </select>
          </label>
          {exId === 'custom' && <>
            <label className="field">varia
              <select value={param} onChange={e => { const p = e.target.value as SweepParam; setParam(p); setMin(PARAM_INFO[p].min); setMax(PARAM_INFO[p].max) }}>
                {(Object.keys(PARAM_INFO) as SweepParam[]).map(p => <option key={p} value={p}>{PARAM_INFO[p].label}</option>)}
              </select>
            </label>
            <label className="field">da<input type="number" step="0.05" value={min} onChange={e => setMin(+e.target.value)} /></label>
            <label className="field">a<input type="number" step="0.05" value={max} onChange={e => setMax(+e.target.value)} /></label>
            <button className="btn primary" onClick={recompute} disabled={busy}>{busy ? 'Calcolo…' : 'Calcola'}</button>
          </>}
        </div>
        {err && <div className="error" role="alert">{err}</div>}
      </div>
      {busy && <div className="scene-busy" role="status">Calcolo della superficie: {STEPS} universi…</div>}
      {grid && (
        <div className="legend3d num">
          {fates.map((f, i) => <span key={i}>{PARAM_INFO[grid.param].label} {fmt(f.from, 2)}–{fmt(f.to, 2)}: <b>{FATE_LABEL[f.fate]}</b></span>)}
        </div>
      )}
    </>
  )
}
