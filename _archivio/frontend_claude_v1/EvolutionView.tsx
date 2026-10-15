import { useMemo, useState } from 'react'
import Plot, { AXIS } from '../components/Plot'
import { useStore, sampleAt } from '../store/useStore'
import type { SimulateResponse } from '../api/types'
import { COLORS, fmt } from '../format'

type XMode = 'rel' | 'bb'

export default function EvolutionView() {
  const result = useStore(s => s.result)
  const saved = useStore(s => s.saved)
  const tRel = useStore(s => s.tRel)
  const [xmode, setXmode] = useState<XMode>('rel')
  const [logA, setLogA] = useState(false)

  const xOf = (r: SimulateResponse) => (xmode === 'bb' ? r.series.t_gyr : r.series.t_rel_gyr)
  const xTitle = xmode === 'bb' ? 't dal Big Bang (Gyr)' : 't − t₀ (Gyr)'
  const age = result?.derived.age_gyr ?? null
  const cursorX = xmode === 'bb' && age !== null ? tRel + age : tRel

  const aData = useMemo(() => {
    if (!result) return []
    const traces: object[] = saved.map(m => ({
      x: xOf(m.result), y: m.result.series.a, type: 'scatter', mode: 'lines', name: m.name,
      line: { color: m.color, width: 1.8 },
    }))
    traces.push({ x: xOf(result), y: result.series.a, type: 'scatter', mode: 'lines', name: 'modello corrente', line: { color: COLORS.blue, width: 2.6 } })
    return traces
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, saved, xmode])

  if (!result) return <div className="view-scroll busy">Simulazione in corso…</div>
  const s = result.series
  const x = xOf(result)
  const aNow = sampleAt(result, 'a', tRel)
  const cursorShape = { type: 'line', x0: cursorX, x1: cursorX, yref: 'paper', y0: 0, y1: 1, line: { color: COLORS.red, width: 1.5, dash: 'dot' } }
  const todayX = xmode === 'bb' && age !== null ? age : 0
  const todayShape = { type: 'line', x0: todayX, x1: todayX, yref: 'paper', y0: 0, y1: 1, line: { color: COLORS.rail, width: 1 } }
  const xaxis = { ...AXIS, title: { ...AXIS.title, text: xTitle } }

  return (
    <div className="view-scroll">
      <div className="controls-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 className="view-title">Evoluzione nel tempo</h2>
          <p className="lede" style={{ margin: 0 }}>Il cursore rosso segue la linea del tempo in basso. La linea grigia è oggi.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="seg" role="group" aria-label="Asse dei tempi">
            <button aria-pressed={xmode === 'rel'} onClick={() => setXmode('rel')}>Allinea a oggi</button>
            <button aria-pressed={xmode === 'bb'} onClick={() => setXmode('bb')}>Dal Big Bang</button>
          </div>
          <label className="check"><input type="checkbox" checked={logA} onChange={e => setLogA(e.target.checked)} />a in scala log</label>
        </div>
      </div>

      <div className="plot-grid">
        <div className="plot-card span2">
          <h3>Fattore di scala a(t)</h3>
          <p>Risolve la I° e la II° equazione di Friedmann con a(t₀) = 1. Al cursore: a = {fmt(aNow, 3)}.</p>
          <Plot
            height={340}
            data={[...aData, { x: [cursorX], y: [aNow], type: 'scatter', mode: 'markers', marker: { color: COLORS.red, size: 9 }, showlegend: false, hoverinfo: 'skip' }]}
            layout={{ xaxis, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'a(t)' }, type: logA ? 'log' : 'linear', ...(logA ? {} : { range: [0, aMax(result, saved.map(m => m.result))] }) }, shapes: [todayShape, cursorShape], legend: { y: -0.22 } }}
          />
        </div>

        <div className="plot-card">
          <h3>Parametro di Hubble H(t) = ȧ/a</h3>
          <p>Scala logaritmica, in km/s/Mpc.</p>
          <Plot
            data={[{ x, y: s.H.map(h => (h > 0 ? h : null)), type: 'scatter', mode: 'lines', line: { color: COLORS.blue, width: 2 }, name: 'H > 0' },
              { x, y: s.H.map(h => (h < 0 ? -h : null)), type: 'scatter', mode: 'lines', line: { color: COLORS.red, width: 2, dash: 'dash' }, name: '|H| in contrazione' }]}
            layout={{ xaxis, yaxis: { ...AXIS, type: 'log', title: { ...AXIS.title, text: 'H (km/s/Mpc)' }, range: hRange(s.H, result.params.H0) }, shapes: [todayShape, cursorShape], showlegend: s.H.some(h => h < 0) }}
          />
        </div>

        <div className="plot-card">
          <h3>Parametri di densità Ωᵢ(t)</h3>
          <p>Ωᵢ = ρᵢ / ρc(t). La somma vale sempre 1 con Ωk = −kc²/(a²H²).</p>
          <Plot
            data={[
              { x, y: s.omega_m, name: 'Ωm materia', line: { color: COLORS.matter, width: 2 } },
              { x, y: s.omega_r, name: 'Ωr radiazione', line: { color: COLORS.radiation, width: 2 } },
              { x, y: s.omega_lambda, name: 'ΩΛ energia oscura', line: { color: COLORS.lambda, width: 2 } },
              { x, y: s.omega_k, name: 'Ωk curvatura', line: { color: COLORS.curvature, width: 2, dash: 'dot' } },
            ].map(t => ({ ...t, type: 'scatter', mode: 'lines' }))}
            layout={{ xaxis, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'Ω' }, range: clampRange([s.omega_m, s.omega_r, s.omega_lambda, s.omega_k]) }, shapes: [todayShape, cursorShape], legend: { y: -0.3 } }}
          />
        </div>

        <div className="plot-card span2">
          <h3>Parametro di decelerazione q(t) = −ä a / ȧ²</h3>
          <p>Sotto lo zero l'espansione accelera: serve p &lt; −ρc²/3, cioè energia oscura dominante.</p>
          <Plot
            height={260}
            data={[{ x, y: s.q, type: 'scatter', mode: 'lines', line: { color: COLORS.ink, width: 2 }, name: 'q' }]}
            layout={{
              xaxis, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'q' }, range: clampRange([s.q], -1.6, 1.6) },
              shapes: [
                todayShape, cursorShape,
                { type: 'rect', xref: 'paper', x0: 0, x1: 1, y0: -10, y1: 0, fillcolor: COLORS.lambda, opacity: 0.07, line: { width: 0 } },
              ],
              annotations: [{ xref: 'paper', x: 0.01, y: -0.12, yanchor: 'top', xanchor: 'left', text: 'accelera', showarrow: false, font: { color: COLORS.lambda, size: 12 } },
                { xref: 'paper', x: 0.01, y: 0.12, yanchor: 'bottom', xanchor: 'left', text: 'decelera', showarrow: false, font: { color: COLORS.muted, size: 12 } }],
              showlegend: false,
            }}
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

/** H diverge al Big Bang: mostra da poco sotto il minimo fino a ~40 H0 (in log10) */
function hRange(H: number[], H0: number): [number, number] {
  const abs = H.map(Math.abs).filter(h => h > 0)
  const mn = Math.min(...abs)
  return [Math.log10(mn * 0.7), Math.log10(Math.max(H0 * 40, mn * 10))]
}

/** Limite dell'asse a(t): i modelli con big rip arrivano ad a = 1000 e schiaccerebbero tutto il resto (usa la scala log per vederli interi). */
function aMax(cur: SimulateResponse, others: SimulateResponse[]) {
  const m = Math.max(...[cur, ...others].flatMap(r => r.series.a))
  return Math.min(m, 15) * 1.05
}
