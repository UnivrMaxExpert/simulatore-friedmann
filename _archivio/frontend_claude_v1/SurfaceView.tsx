import { useCallback, useEffect, useMemo, useState } from 'react'
import Plot, { AXIS } from '../components/Plot'
import { api, ApiError } from '../api/client'
import type { CosmoParams, GridResponse, SweepParam } from '../api/types'
import { useStore } from '../store/useStore'
import { COLORS, FATE_LABEL, fmt } from '../format'

const PARAM_INFO: Record<SweepParam, { label: string; min: number; max: number }> = {
  omega_m: { label: 'Ωm (materia)', min: 0.05, max: 3 },
  omega_lambda: { label: 'ΩΛ (energia oscura)', min: -1, max: 2.5 },
  omega_r: { label: 'Ωr (radiazione)', min: 0, max: 1 },
  w: { label: 'w (equazione di stato)', min: -2, max: -0.34 },
  H0: { label: 'H₀ (km/s/Mpc)', min: 40, max: 100 },
}

interface Example { label: string; param: SweepParam; min: number; max: number; flat: boolean; override: Partial<CosmoParams>; tMax?: number }
const EXAMPLES: Example[] = [
  { label: 'Da aperto a chiuso, senza ΩΛ', param: 'omega_m', min: 0.05, max: 3, flat: false, override: { omega_lambda: 0, omega_r: 0, w: -1 }, tMax: 45 },
  { label: 'Universi piatti', param: 'omega_m', min: 0.02, max: 1, flat: true, override: { omega_r: 0, w: -1 } },
  { label: 'Quanta energia oscura', param: 'omega_lambda', min: -0.6, max: 2, flat: false, override: { omega_m: 0.3, omega_r: 0, w: -1 } },
  { label: 'Equazione di stato w', param: 'w', min: -2, max: -0.34, flat: false, override: { omega_m: 0.3, omega_lambda: 0.7, omega_r: 0 } },
]

const LABEL: Record<keyof CosmoParams, string> = { H0: 'H₀', omega_m: 'Ωm', omega_lambda: 'ΩΛ', omega_r: 'Ωr', w: 'w' }

const COLORSCALE = [[0, '#DCE4F5'], [0.35, '#2346A0'], [0.7, '#7A4FA0'], [1, '#C23B3B']]

export default function SurfaceView() {
  const params = useStore(s => s.params)
  const [param, setParam] = useState<SweepParam>('omega_m')
  const [min, setMin] = useState(PARAM_INFO.omega_m.min)
  const [max, setMax] = useState(PARAM_INFO.omega_m.max)
  const [steps, setSteps] = useState(36)
  const [keepFlat, setKeepFlat] = useState(false)
  const [tMin, setTMin] = useState(-14)
  const [tMax, setTMax] = useState(30)
  const [aCap, setACap] = useState(4)
  const [grid, setGrid] = useState<GridResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [override, setOverride] = useState<Partial<CosmoParams>>(EXAMPLES[0].override)
  const base = useMemo(() => ({ ...params, ...override }), [params, override])

  const compute = useCallback(async (o?: { param: SweepParam; min: number; max: number; flat: boolean; base: CosmoParams; tMax: number }) => {
    setBusy(true); setErr(null)
    const q = o ?? { param, min, max, flat: keepFlat, base, tMax }
    try {
      setGrid(await api.grid({
        base: q.base, sweep: { param: q.param, min: q.min, max: q.max, steps }, t_rel_min_gyr: tMin, t_rel_max_gyr: q.tMax, n_time: 160, keep_flat: q.flat,
      }))
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Calcolo della superficie non riuscito.') }
    setBusy(false)
  }, [base, param, min, max, steps, tMin, tMax, keepFlat])

  const runExample = (ex: Example) => {
    const tm = ex.tMax ?? 30
    setParam(ex.param); setMin(ex.min); setMax(ex.max); setKeepFlat(ex.flat); setOverride(ex.override); setTMax(tm)
    void compute({ param: ex.param, min: ex.min, max: ex.max, flat: ex.flat, base: { ...params, ...ex.override }, tMax: tm })
  }

  // primo calcolo all'apertura della vista: l'esempio più eloquente (big crunch per Ωm > 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { runExample(EXAMPLES[0]) }, [])

  const onParamChange = (p: SweepParam) => { setParam(p); setMin(PARAM_INFO[p].min); setMax(PARAM_INFO[p].max) }

  const data = useMemo(() => {
    if (!grid) return []
    const z = grid.a.map(row => row.map(v => (v === null || v > aCap ? null : v)))
    const traces: object[] = [{
      type: 'surface', x: grid.t_rel_gyr, y: grid.param_values, z,
      colorscale: COLORSCALE, cmin: 0, cmax: aCap, showscale: true,
      colorbar: { title: { text: 'a(t)', side: 'right' }, thickness: 12, len: 0.6, tickfont: { size: 11 } },
      contours: { z: { show: true, usecolormap: false, color: 'rgba(29,36,51,0.35)', width: 1, start: 0.5, end: aCap, size: 0.5 } },
      hovertemplate: 't − t₀ = %{x:.1f} Gyr<br>' + PARAM_INFO[grid.param].label + ' = %{y:.3f}<br>a = %{z:.3f}<extra></extra>',
      lighting: { ambient: 0.85, diffuse: 0.4, specular: 0.05 },
    }]
    // linea di oggi (a = 1 a t = t0) su tutti i modelli
    traces.push({ type: 'scatter3d', mode: 'lines', x: grid.param_values.map(() => 0), y: grid.param_values, z: grid.param_values.map(() => 1), line: { color: COLORS.red, width: 5 }, name: 'oggi, a = 1', hoverinfo: 'skip' })
    // il modello corrente, solo se gli altri parametri coincidono con quelli della barra laterale
    const cur = params[grid.param]
    const sameBase = Object.keys(override).every(k => k === grid.param || override[k as keyof CosmoParams] === params[k as keyof CosmoParams])
    if (sameBase && cur >= Math.min(...grid.param_values) && cur <= Math.max(...grid.param_values)) {
      let best = 0
      grid.param_values.forEach((v, i) => { if (Math.abs(v - cur) < Math.abs(grid.param_values[best] - cur)) best = i })
      traces.push({ type: 'scatter3d', mode: 'lines', x: grid.t_rel_gyr, y: grid.t_rel_gyr.map(() => grid.param_values[best]), z: z[best], line: { color: COLORS.green, width: 7 }, name: 'modello corrente', hoverinfo: 'skip' })
    }
    return traces
  }, [grid, aCap, params, override])

  const fates = useMemo(() => {
    if (!grid) return []
    const out: { from: number; to: number; fate: string }[] = []
    grid.fate.forEach((f, i) => {
      const last = out[out.length - 1]
      if (last && last.fate === f) last.to = grid.param_values[i]
      else out.push({ from: grid.param_values[i], to: grid.param_values[i], fate: f })
    })
    return out
  }, [grid])

  return (
    <div className="view-scroll">
      <h2 className="view-title">Superficie a(t, parametro)</h2>
      <p className="lede">
        Ogni sezione della superficie è una soluzione delle equazioni di Friedmann: si fa variare <b>un parametro alla volta</b> tenendo fissi gli altri
        al valore della barra laterale. Tutte le curve passano per a = 1 oggi (linea rossa); la linea verde è il modello corrente.
      </p>
      <div className="controls-row" style={{ alignItems: 'center' }}>
        <span className="busy">Esempi:</span>
        {EXAMPLES.map(ex => <button key={ex.label} className="btn" onClick={() => runExample(ex)} disabled={busy}>{ex.label}</button>)}
      </div>
      {Object.keys(override).length > 0 && (
        <p className="lede">
          Parametri fissati dall'esempio: {Object.entries(override).filter(([k]) => k !== param).map(([k, v]) => `${LABEL[k as keyof CosmoParams]} = ${v}`).join(', ')}.{' '}
          <button className="btn" style={{ padding: '2px 8px' }} onClick={() => setOverride({})}>Usa i parametri della barra laterale</button>
        </p>
      )}
      <div className="controls-row">
        <label className="field">Parametro
          <select value={param} onChange={e => onParamChange(e.target.value as SweepParam)}>
            {(Object.keys(PARAM_INFO) as SweepParam[]).map(p => <option key={p} value={p}>{PARAM_INFO[p].label}</option>)}
          </select>
        </label>
        <label className="field">da<input type="number" step="0.05" value={min} onChange={e => setMin(+e.target.value)} /></label>
        <label className="field">a<input type="number" step="0.05" value={max} onChange={e => setMax(+e.target.value)} /></label>
        <label className="field">valori<input type="number" min={5} max={80} value={steps} onChange={e => setSteps(Math.round(Math.min(80, Math.max(5, +e.target.value))))} /></label>
        <label className="field">t − t₀ da (Gyr)<input type="number" value={tMin} onChange={e => setTMin(+e.target.value)} /></label>
        <label className="field">fino a (Gyr)<input type="number" value={tMax} onChange={e => setTMax(+e.target.value)} /></label>
        <label className="field">a massimo mostrato<input type="number" step="0.5" min={1} value={aCap} onChange={e => setACap(Math.max(1, +e.target.value))} /></label>
        {param !== 'omega_lambda' && param !== 'H0' && param !== 'w' && (
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={keepFlat} onChange={e => setKeepFlat(e.target.checked)} />Mantieni piatto (ΩΛ = 1 − Ωm − Ωr)</label>
        )}
        <button className="btn primary" onClick={() => void compute()} disabled={busy}>{busy ? 'Calcolo…' : 'Calcola superficie'}</button>
      </div>
      {err && <div className="error" role="alert">{err}</div>}
      <div className="plot-card">
        <Plot
          height={560}
          data={data}
          layout={{
            margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: {
              xaxis: { ...AXIS, title: { text: 't − t₀ (Gyr)' }, backgroundcolor: '#FFFFFF', showbackground: true },
              yaxis: { ...AXIS, title: { text: grid ? PARAM_INFO[grid.param].label : '' }, backgroundcolor: '#FFFFFF', showbackground: true },
              zaxis: { ...AXIS, title: { text: 'a(t)' }, range: [0, aCap], backgroundcolor: '#F7F8F9', showbackground: true },
              camera: { eye: { x: -1.3, y: 1.8, z: 0.9 } },
              aspectmode: 'manual', aspectratio: { x: 1.4, y: 1, z: 0.7 },
            },
            legend: { orientation: 'h', x: 0, y: 1, yanchor: 'top' },
          }}
        />
        {grid && (
          <p style={{ padding: '6px 0 8px' }}>
            Destino lungo l'asse del parametro: {fates.map((f, i) => (
              <span key={i}>{i > 0 && ' · '}{fmt(f.from, 2)}–{fmt(f.to, 2)}: <b>{FATE_LABEL[f.fate as keyof typeof FATE_LABEL]}</b></span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}
