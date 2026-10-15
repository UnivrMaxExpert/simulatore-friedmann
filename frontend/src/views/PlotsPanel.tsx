import { useMemo, useState } from 'react'
import Plot, { AXIS } from '../components/Plot'
import { useStore, sampleAt } from '../store/useStore'
import type { SimulateResponse } from '../api/types'
import { COLORS, fmt } from '../format'

type XMode = 'rel' | 'bb'
type Side = 'H' | 'omega' | 'q'

const COMPACT = { margin: { l: 50, r: 12, t: 6, b: 36 } }

/** a(t) a sinistra (con i modelli in confronto), H / Ωi / q a destra. Il cursore rosso segue la linea del tempo. */
export default function PlotsPanel() {
  const result = useStore(s => s.result)
  const saved = useStore(s => s.saved)
  const tRel = useStore(s => s.tRel)
  const [xmode, setXmode] = useState<XMode>('rel')
  const [logA, setLogA] = useState(false)
  const [side, setSide] = useState<Side>('omega')

  const xOf = (r: SimulateResponse) => (xmode === 'bb' && r.derived.age_gyr !== null ? r.series.t_gyr : r.series.t_rel_gyr)

  const aData = useMemo(() => {
    if (!result) return []
    const traces: object[] = saved.map(m => ({
      x: xOf(m.result), y: m.result.series.a, type: 'scatter', mode: 'lines', name: m.name, line: { color: m.color, width: 1.8 },
    }))
    traces.push({ x: xOf(result), y: result.series.a, type: 'scatter', mode: 'lines', name: 'modello corrente', line: { color: COLORS.blue, width: 2.6 } })
    return traces
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, saved, xmode])

  if (!result) return null
  const s = result.series
  const x = xOf(result)
  const age = result.derived.age_gyr
  const useBB = xmode === 'bb' && age !== null
  const cursorX = useBB ? tRel + age! : tRel
  const todayX = useBB ? age! : 0
  const aNow = sampleAt(result, 'a', tRel)
  const xaxis = { ...AXIS, title: { ...AXIS.title, text: useBB ? 't dal Big Bang (Gyr)' : 't − t₀ (Gyr)' } }
  const shapes = [
    { type: 'line', x0: todayX, x1: todayX, yref: 'paper', y0: 0, y1: 1, line: { color: COLORS.rail, width: 1 } },
    { type: 'line', x0: cursorX, x1: cursorX, yref: 'paper', y0: 0, y1: 1, line: { color: COLORS.red, width: 1.5, dash: 'dot' } },
  ]

  let sideData: object[] = []
  let sideY: object = {}
  let sideExtra: object = {}
  if (side === 'H') {
    sideData = [
      { x, y: s.H.map(h => (h > 0 ? h : null)), name: 'H > 0', line: { color: COLORS.blue, width: 2 } },
      { x, y: s.H.map(h => (h < 0 ? -h : null)), name: '|H| in contrazione', line: { color: COLORS.red, width: 2, dash: 'dash' } },
    ]
    sideY = { type: 'log', title: { ...AXIS.title, text: 'H (km/s/Mpc)' }, range: hRange(s.H, result.params.H0) }
    sideExtra = { showlegend: s.H.some(h => h < 0) }
  } else if (side === 'omega') {
    sideData = [
      { x, y: s.omega_m, name: 'Ωm', line: { color: COLORS.matter, width: 2 } },
      { x, y: s.omega_r, name: 'Ωr', line: { color: COLORS.radiation, width: 2 } },
      { x, y: s.omega_lambda, name: 'ΩΛ', line: { color: COLORS.lambda, width: 2 } },
      { x, y: s.omega_k, name: 'Ωk', line: { color: COLORS.curvature, width: 2, dash: 'dot' } },
    ]
    sideY = { title: { ...AXIS.title, text: 'Ωi(t)' }, range: clampRange([s.omega_m, s.omega_r, s.omega_lambda, s.omega_k]) }
    sideExtra = { legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 11.5 } } }
  } else {
    sideData = [{ x, y: s.q, name: 'q', line: { color: COLORS.ink, width: 2 } }]
    sideY = { title: { ...AXIS.title, text: 'q = −ä a / ȧ²' }, range: clampRange([s.q], -1.6, 1.6) }
    sideExtra = {
      showlegend: false,
      annotations: [{ xref: 'paper', x: 0.02, y: -0.1, yanchor: 'top', xanchor: 'left', text: 'accelera', showarrow: false, font: { color: COLORS.lambda, size: 11.5 } }],
    }
    shapes.push({ type: 'rect', x0: 0, x1: 1, y0: -10, y1: 0, line: { width: 0, color: '' }, xref: 'paper', fillcolor: COLORS.lambda, opacity: 0.07 } as never)
  }

  return (
    <div className="plots">
      <div className="plot-card">
        <div className="card-head">
          <h3>Fattore di scala a(t) <small className="num">al cursore a = {fmt(aNow, 3)}</small></h3>
          <div className="card-tools">
            <div className="seg small" role="group" aria-label="Asse dei tempi">
              <button aria-pressed={xmode === 'rel'} onClick={() => setXmode('rel')}>da oggi</button>
              <button aria-pressed={xmode === 'bb'} onClick={() => setXmode('bb')}>dal Big Bang</button>
            </div>
            <label className="check small"><input type="checkbox" checked={logA} onChange={e => setLogA(e.target.checked)} />log</label>
          </div>
        </div>
        <div className="plot-body">
          <Plot
            height="100%"
            data={[...aData, { x: [cursorX], y: [aNow], type: 'scatter', mode: 'markers', marker: { color: COLORS.red, size: 8 }, showlegend: false, hoverinfo: 'skip' }]}
            layout={{
              ...COMPACT, xaxis,
              yaxis: { ...AXIS, title: { ...AXIS.title, text: 'a(t)' }, type: logA ? 'log' : 'linear', ...(logA ? {} : { range: [0, aMax(result, saved.map(m => m.result))] }) },
              shapes, showlegend: saved.length > 0, legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 11.5 } },
            }}
          />
        </div>
      </div>
      <div className="plot-card">
        <div className="card-head">
          <div className="seg small" role="group" aria-label="Grafico">
            <button aria-pressed={side === 'omega'} onClick={() => setSide('omega')}>Ωi(t)</button>
            <button aria-pressed={side === 'H'} onClick={() => setSide('H')}>H(t)</button>
            <button aria-pressed={side === 'q'} onClick={() => setSide('q')}>q(t)</button>
          </div>
        </div>
        <div className="plot-body">
          <Plot
            height="100%"
            data={sideData.map(t => ({ ...t, type: 'scatter', mode: 'lines' }))}
            layout={{ ...COMPACT, xaxis, yaxis: { ...AXIS, ...sideY }, shapes, ...sideExtra }}
          />
        </div>
      </div>
    </div>
  )
}

function clampRange(arrs: (number | null)[][], lo = -1.5, hi = 2.5): [number, number] {
  let mn = Infinity, mx = -Infinity
  for (const a of arrs) for (const v of a) if (v !== null && Number.isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v) }
  mn = Math.max(mn, lo); mx = Math.min(mx, hi)
  const pad = (mx - mn) * 0.06 || 0.1
  return [mn - pad, mx + pad]
}

/** H diverge al Big Bang: mostra da poco sotto il minimo fino a ~40 H0 (log10) */
function hRange(H: number[], H0: number): [number, number] {
  const abs = H.map(Math.abs).filter(h => h > 0)
  const mn = Math.min(...abs)
  return [Math.log10(mn * 0.7), Math.log10(Math.max(H0 * 40, mn * 10))]
}

/** i modelli con big rip arrivano ad a = 1000: limita l'asse (la scala log li mostra interi) */
function aMax(cur: SimulateResponse, others: SimulateResponse[]) {
  const m = Math.max(...[cur, ...others].flatMap(r => r.series.a))
  return Math.min(m, 15) * 1.05
}
