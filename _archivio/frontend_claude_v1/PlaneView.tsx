import { useCallback, useEffect, useMemo, useState } from 'react'
import Plot, { AXIS } from '../components/Plot'
import { api, ApiError } from '../api/client'
import type { OmegaPlaneResponse } from '../api/types'
import { useStore } from '../store/useStore'
import { COLORS, fmt } from '../format'

const RANGE = { om_min: 0, om_max: 3, ol_min: -1.5, ol_max: 3 }
const AGE_SCALE = [[0, '#EEF1F8'], [0.25, '#AFC0E6'], [0.55, '#3D5DB5'], [1, '#141F4A']]

export default function PlaneView() {
  const params = useStore(s => s.params)
  const setParams = useStore(s => s.setParams)
  const [plane, setPlane] = useState<OmegaPlaneResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [view, setView] = useState<'2d' | '3d'>('2d')

  const load = useCallback(async (H0: number, w: number) => {
    setBusy(true); setErr(null)
    try { setPlane(await api.omegaPlane({ ...RANGE, n: 70, H0, w })) }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Calcolo del piano non riuscito.') }
    setBusy(false)
  }, [])

  // ricalcola solo quando cambiano i parametri che il piano non rappresenta
  const H0 = Math.round(params.H0 * 10) / 10, w = Math.round(params.w * 100) / 100
  useEffect(() => { const id = setTimeout(() => void load(H0, w), 250); return () => clearTimeout(id) }, [H0, w, load])

  const onClick = useCallback((ev: { points?: { x: number; y: number }[] }) => {
    const p = ev.points?.[0]
    if (p && typeof p.x === 'number' && typeof p.y === 'number') setParams({ omega_m: +p.x.toFixed(3), omega_lambda: +p.y.toFixed(3) })
  }, [setParams])

  const { data2d, data3d, annotations } = useMemo(() => {
    if (!plane) return { data2d: [], data3d: [], annotations: [] }
    const b = plane.boundaries
    const line = (pts: [number, number][], name: string, color: string, dash = 'solid') => ({
      x: pts.map(p => p[0]), y: pts.map(p => p[1]), type: 'scatter', mode: 'lines', name,
      line: { color, width: 2.2, dash }, hoverinfo: 'skip',
    })
    const data2d: object[] = [
      {
        type: 'heatmap', x: plane.omega_m, y: plane.omega_lambda, z: plane.age_gyr,
        colorscale: AGE_SCALE, zsmooth: 'best', hoverongaps: false, zauto: false, zmin: 4, zmax: 30, showlegend: false,
        colorbar: { title: { text: 'età (Gyr)', side: 'right' }, thickness: 12, len: 0.75 },
        hovertemplate: 'Ωm = %{x:.2f}<br>ΩΛ = %{y:.2f}<br>età = %{z:.2f} Gyr<extra>clic per usare questo modello</extra>',
      },
      {
        type: 'contour', x: plane.omega_m, y: plane.omega_lambda, z: plane.age_gyr, showscale: false,
        contours: { coloring: 'none', showlabels: true, labelfont: { size: 10.5, color: '#FFFFFF' }, start: 6, end: 30, size: 2 },
        line: { color: 'rgba(255,255,255,0.55)', width: 1 }, hoverinfo: 'skip', showlegend: false,
      },
      line(b.flat, 'piatto, Ωm + ΩΛ = 1', COLORS.ink),
      line(b.accel_now, 'q₀ = 0: oggi accelera sopra', COLORS.lambda, 'dash'),
      line(b.recollapse, 'confine big crunch', COLORS.red),
      line(b.no_big_bang, 'confine senza Big Bang', COLORS.amber),
      {
        x: [params.omega_m], y: [params.omega_lambda], type: 'scatter', mode: 'markers', name: 'modello corrente',
        marker: { size: 13, color: COLORS.green, line: { color: '#FFFFFF', width: 2 } }, hovertemplate: 'modello corrente<extra></extra>',
      },
    ]
    const label = (x: number, y: number, text: string, color: string) => ({ x, y, text, showarrow: false, font: { size: 12.5, color }, bgcolor: 'rgba(255,255,255,0.8)' })
    const annotations = [
      label(0.45, 2.75, 'nessun Big Bang', COLORS.amber),
      label(2.45, -1.25, 'ricollassa (big crunch)', COLORS.red),
      label(2.55, 0.55, 'chiuso, k = +1', COLORS.ink),
      label(0.35, -0.2, 'aperto, k = −1', COLORS.ink),
    ]
    const data3d: object[] = [{
      type: 'surface', x: plane.omega_m, y: plane.omega_lambda, z: plane.age_gyr, colorscale: AGE_SCALE,
      colorbar: { title: { text: 'età (Gyr)' }, thickness: 12, len: 0.6 }, cmin: 4, cmax: 30,
      hovertemplate: 'Ωm = %{x:.2f}<br>ΩΛ = %{y:.2f}<br>età = %{z:.2f} Gyr<extra></extra>',
      contours: { z: { show: true, usecolormap: false, color: 'rgba(255,255,255,.6)', size: 2, start: 4, end: 40 } },
    }]
    return { data2d, data3d, annotations }
  }, [plane, params.omega_m, params.omega_lambda])

  const age = plane ? nearestAge(plane, params.omega_m, params.omega_lambda) : null

  return (
    <div className="view-scroll">
      <div className="controls-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="view-title">Il piano Ωm–ΩΛ</h2>
          <p className="lede" style={{ marginBottom: 0 }}>
            Ogni punto è un universo diverso: il colore è la sua età. Le linee dividono il piano in base a geometria (k), destino e presenza del Big Bang.
            <b> Fai clic su un punto</b> per simulare quel modello. H₀ = {fmt(params.H0, 1)}, w = {fmt(params.w, 2)}, Ωr trascurata.
          </p>
        </div>
        <div className="seg" role="group" aria-label="Vista">
          <button aria-pressed={view === '2d'} onClick={() => setView('2d')}>Mappa</button>
          <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>Superficie 3D dell'età</button>
        </div>
      </div>
      {err && <div className="error" role="alert">{err}</div>}
      <div className="plot-card">
        {busy && !plane && <p className="busy">Calcolo del piano…</p>}
        {view === '2d' ? (
          <Plot
            height={580}
            data={data2d}
            onClick={onClick}
            layout={{
              xaxis: { ...AXIS, title: { ...AXIS.title, text: 'Ωm' }, range: [RANGE.om_min, RANGE.om_max] },
              yaxis: { ...AXIS, title: { ...AXIS.title, text: 'ΩΛ' }, range: [RANGE.ol_min, RANGE.ol_max] },
              annotations, plot_bgcolor: '#E6E9EE', legend: { y: -0.13 },
            }}
          />
        ) : (
          <Plot
            height={580}
            data={data3d}
            layout={{
              margin: { l: 0, r: 0, t: 0, b: 0 },
              scene: {
                xaxis: { ...AXIS, title: { text: 'Ωm' } }, yaxis: { ...AXIS, title: { text: 'ΩΛ' } }, zaxis: { ...AXIS, title: { text: 'età (Gyr)' } },
                camera: { eye: { x: 1.5, y: -1.6, z: 0.9 } },
              },
            }}
          />
        )}
        <p style={{ paddingBottom: 8 }}>
          Modello corrente: Ωm = {fmt(params.omega_m, 3)}, ΩΛ = {fmt(params.omega_lambda, 3)}
          {age !== null ? `, età ≈ ${fmt(age, 2)} Gyr` : ', nessun Big Bang'}.
          Le aree grigie non hanno un Big Bang: l'età non è definita.
        </p>
      </div>
    </div>
  )
}

function nearestAge(p: OmegaPlaneResponse, om: number, ol: number) {
  const idx = (arr: number[], v: number) => arr.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(arr[best] - v) ? i : best), 0)
  return p.age_gyr[idx(p.omega_lambda, ol)]?.[idx(p.omega_m, om)] ?? null
}
