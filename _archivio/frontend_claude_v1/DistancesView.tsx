import { useEffect, useMemo, useState } from 'react'
import Plot, { AXIS } from '../components/Plot'
import { api, ApiError } from '../api/client'
import type { CosmoParams, DistancesResponse } from '../api/types'
import { useStore } from '../store/useStore'
import { COLORS, fmt } from '../format'

interface Series { name: string; color: string; d: DistancesResponse; H0: number }

export default function DistancesView() {
  const params = useStore(s => s.params)
  const saved = useStore(s => s.saved)
  const [zMax, setZMax] = useState(3)
  const [series, setSeries] = useState<Series[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const models: { name: string; color: string; p: CosmoParams }[] = [
      ...saved.map(m => ({ name: m.name, color: m.color, p: m.params })),
      { name: 'modello corrente', color: COLORS.blue, p: params },
    ]
    const id = setTimeout(async () => {
      try {
        const out = await Promise.all(models.map(async m => ({ name: m.name, color: m.color, H0: m.p.H0, d: await api.distances({ ...m.p, z_max: zMax, n: 240 }) })))
        if (alive) { setSeries(out); setErr(null) }
      } catch (e) { if (alive) setErr(e instanceof ApiError ? e.message : 'Calcolo delle distanze non riuscito.') }
    }, 200)
    return () => { alive = false; clearTimeout(id) }
  }, [params, saved, zMax])

  const cur = series[series.length - 1]
  const lines = (key: keyof DistancesResponse, extra: object = {}) =>
    series.map(s => ({ x: s.d.z, y: s.d[key], type: 'scatter', mode: 'lines', name: s.name, line: { color: s.color, width: s.name === 'modello corrente' ? 2.6 : 1.8 }, ...extra }))

  const hubble = useMemo(() => {
    if (!cur) return []
    // Diagramma di Hubble "storico": velocità apparente cz contro distanza di luminosità, vicino a noi
    const zLim = Math.min(zMax, 0.5)
    const idx = cur.d.z.map((z, i) => (z <= zLim ? i : -1)).filter(i => i >= 0)
    const dl = idx.map(i => cur.d.luminosity_distance_mpc[i])
    const cz = idx.map(i => 299792.458 * cur.d.z[i])
    const maxD = Math.max(...dl.filter((v): v is number => v !== null), 1)
    return [
      { x: dl, y: cz, type: 'scatter', mode: 'lines', name: 'cz contro D_L (modello)', line: { color: COLORS.blue, width: 2.6 } },
      { x: [0, maxD], y: [0, cur.H0 * maxD], type: 'scatter', mode: 'lines', name: `v = H₀ d, H₀ = ${fmt(cur.H0, 1)}`, line: { color: COLORS.red, width: 1.8, dash: 'dash' } },
    ]
  }, [cur, zMax])

  return (
    <div className="view-scroll">
      <div className="controls-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 className="view-title">Distanze cosmologiche e legge di Hubble</h2>
          <p className="lede" style={{ margin: 0 }}>Il redshift misura di quanto si è espanso l'universo da quando la luce è partita: 1 + z = a(t₀)/a(tₑ).</p>
        </div>
        <label className="field">redshift massimo z
          <input type="number" min={0.1} max={1100} step={0.5} value={zMax} onChange={e => setZMax(Math.min(1100, Math.max(0.1, +e.target.value)))} />
        </label>
      </div>
      {err && <div className="error" role="alert">{err}</div>}
      {cur?.d.warnings?.map(w => <p key={w} className="warn">{w}</p>)}
      <div className="plot-grid">
        <div className="plot-card">
          <h3>Tre distanze dello stesso oggetto</h3>
          <p>Comovente D_C, di luminosità D_L = (1+z) D_M, di diametro angolare D_A = D_M/(1+z).</p>
          {cur && <Plot data={[
            { x: cur.d.z, y: cur.d.comoving_distance_mpc, name: 'D_C comovente', line: { color: COLORS.ink, width: 2 } },
            { x: cur.d.z, y: cur.d.luminosity_distance_mpc, name: 'D_L luminosità', line: { color: COLORS.blue, width: 2.4 } },
            { x: cur.d.z, y: cur.d.angular_diameter_distance_mpc, name: 'D_A diametro angolare', line: { color: COLORS.amber, width: 2 } },
          ].map(t => ({ ...t, type: 'scatter', mode: 'lines' }))}
            layout={{ xaxis: { ...AXIS, title: { ...AXIS.title, text: 'z' } }, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'Mpc' } } }} />}
        </div>
        <div className="plot-card">
          <h3>Legge di Hubble, universo vicino</h3>
          <p>Per z ≲ 0,1 la velocità apparente cz cresce linearmente con la distanza; più lontano la relazione si curva.</p>
          <Plot data={hubble} layout={{ xaxis: { ...AXIS, title: { ...AXIS.title, text: 'D_L (Mpc)' } }, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'cz (km/s)' } } }} />
        </div>
        <div className="plot-card">
          <h3>Modulo di distanza μ(z)</h3>
          <p>È il grafico delle supernovae Ia che ha rivelato l'accelerazione: confronta i modelli salvati.</p>
          <Plot data={lines('distance_modulus')} layout={{ xaxis: { ...AXIS, title: { ...AXIS.title, text: 'z' }, type: 'log' }, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'μ = 5 log₁₀(D_L / 10 pc)' } }, legend: { y: -0.3 } }} />
        </div>
        <div className="plot-card">
          <h3>Tempo di ritorno della luce</h3>
          <p>Quanto tempo fa è partita la luce che riceviamo da redshift z.</p>
          <Plot data={lines('lookback_time_gyr')} layout={{ xaxis: { ...AXIS, title: { ...AXIS.title, text: 'z' } }, yaxis: { ...AXIS, title: { ...AXIS.title, text: 'Gyr' } }, legend: { y: -0.3 } }} />
        </div>
      </div>
    </div>
  )
}
