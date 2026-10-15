import { useStore, sampleNullable } from '../store/useStore'
import type { CosmoParams } from '../api/types'
import { COLORS, FATE_LABEL, FATE_TEXT, GEOMETRY_LABEL, ORIGIN_LABEL, fmt, fmtSmart } from '../format'

interface ParamDef {
  key: keyof CosmoParams
  sym: string
  label: string
  hint?: string
  min: number
  max: number
  step: number
  inputMin: number
  inputMax: number
  digits: number
}

const PARAMS: ParamDef[] = [
  { key: 'H0', sym: 'H₀', label: 'costante di Hubble', hint: 'km/s/Mpc', min: 20, max: 150, step: 0.1, inputMin: 20, inputMax: 150, digits: 2 },
  { key: 'omega_m', sym: 'Ωm', label: 'materia (barionica + oscura)', min: 0, max: 3, step: 0.001, inputMin: 0, inputMax: 5, digits: 4 },
  { key: 'omega_lambda', sym: 'ΩΛ', label: 'energia oscura', min: -1.5, max: 3, step: 0.001, inputMin: -2, inputMax: 5, digits: 4 },
  { key: 'omega_r', sym: 'Ωr', label: 'radiazione', min: 0, max: 1, step: 0.0001, inputMin: 0, inputMax: 2, digits: 5 },
  { key: 'w', sym: 'w', label: 'equazione di stato', hint: 'p = wρc²', min: -2.5, max: 0, step: 0.01, inputMin: -2.5, inputMax: 0, digits: 2 },
]

export default function Sidebar() {
  const params = useStore(s => s.params)
  const setParam = useStore(s => s.setParam)
  const presets = useStore(s => s.presets)
  const presetId = useStore(s => s.presetId)
  const applyPreset = useStore(s => s.applyPreset)
  const tFuture = useStore(s => s.tFuture)
  const setTFuture = useStore(s => s.setTFuture)
  const result = useStore(s => s.result)
  const error = useStore(s => s.error)
  const saved = useStore(s => s.saved)
  const saveCurrent = useStore(s => s.saveCurrent)
  const removeSaved = useStore(s => s.removeSaved)

  const ok = 1 - params.omega_m - params.omega_r - params.omega_lambda
  const kSign = Math.abs(ok) < 1e-4 ? 0 : ok > 0 ? -1 : 1
  const preset = presets.find(p => p.id === presetId)
  const d = result?.derived

  return (
    <aside className="sidebar">
      <div className="section">
        <h2>Modello</h2>
        <select className="preset-select" value={presetId ?? ''} onChange={e => applyPreset(e.target.value)} aria-label="Modello predefinito">
          <option value="" disabled>Parametri personalizzati</option>
          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="preset-desc">{preset?.description ?? 'Hai modificato i parametri a mano: scegli un modello per ripartire da un caso noto.'}</p>
      </div>

      <div className="section">
        <h2>Parametri di oggi <small>t = t₀, a = 1</small></h2>
        {PARAMS.map(p => (
          <ParamControl key={p.key} def={p} value={params[p.key]} onChange={v => setParam(p.key, v)} />
        ))}
        <div className="derived-k">
          <span>Ωk = 1 − Ωm − Ωr − ΩΛ = <b className="num">{fmt(ok, 4)}</b></span>
          <span>k = {kSign > 0 ? '+1' : kSign}</span>
        </div>
        <div className="param" style={{ marginTop: 14 }}>
          <label htmlFor="p-fut">Orizzonte futuro <span className="hint">Gyr dopo oggi</span></label>
          <input id="p-fut" type="number" min={1} max={500} value={tFuture} onChange={e => setTFuture(clamp(+e.target.value, 1, 500))} />
          <input type="range" min={5} max={200} step={1} value={Math.min(tFuture, 200)} onChange={e => setTFuture(+e.target.value)} aria-label="Orizzonte futuro" />
        </div>
      </div>

      <Composition />

      {error && <div className="error" role="alert">{error}</div>}

      {d && (
        <div className="section">
          <h2>Risultati</h2>
          <div className="facts">
            <div className="fact wide">
              <div className="fate" data-fate={d.fate}>{FATE_LABEL[d.fate]}</div>
              <div className="l">{FATE_TEXT[d.fate]}{d.t_end_gyr !== null ? ` Fine a t ≈ ${fmt(d.t_end_gyr, 1)} Gyr.` : ''}</div>
            </div>
            <div className="fact">
              <div className="v">{d.age_gyr !== null ? fmt(d.age_gyr, 2) : '—'}</div>
              <div className="l">{d.age_gyr !== null ? <>età, Gyr <span className="obs">(misurata 13,8)</span></> : `età non definita: ${ORIGIN_LABEL[d.origin]}`}</div>
            </div>
            <div className="fact">
              <div className="v">{fmt(d.q0, 3)}</div>
              <div className="l">q₀ · {d.accelerating_now ? 'accelera' : 'decelera'}</div>
            </div>
            <div className="fact">
              <div className="v">{GEOMETRY_LABEL[d.geometry]}</div>
              <div className="l">k = {d.k_sign > 0 ? '+1' : d.k_sign}, Ω = {fmt(d.omega_total, 3)}</div>
            </div>
            <div className="fact">
              <div className="v">{fmt(d.hubble_time_gyr, 2)}</div>
              <div className="l">tempo di Hubble 1/H₀, Gyr</div>
            </div>
            <div className="fact">
              <div className="v">{d.z_acc !== null ? fmt(d.z_acc, 2) : '—'}</div>
              <div className="l">z inizio accelerazione</div>
            </div>
            <div className="fact">
              <div className="v">{fmtSmart(d.rho_crit_0_g_cm3, 3)}</div>
              <div className="l">ρc,0 in g/cm³</div>
            </div>
            {d.a_max !== null && (
              <div className="fact">
                <div className="v">{fmt(d.a_max, 3)}</div>
                <div className="l">a massimo (inversione)</div>
              </div>
            )}
            {d.a_min !== null && (
              <div className="fact">
                <div className="v">{fmt(d.a_min, 3)}</div>
                <div className="l">a minimo (rimbalzo)</div>
              </div>
            )}
          </div>
          {result!.warnings.filter(w => !w.includes('MOCK')).map(w => <p key={w} className="warn">{w}</p>)}
        </div>
      )}

      <div className="section">
        <h2>Confronto</h2>
        <button className="btn" onClick={saveCurrent} disabled={!result}>Aggiungi il modello al confronto</button>
        {saved.length > 0 ? (
          <ul className="saved">
            {saved.map(m => (
              <li key={m.id}>
                <i style={{ background: m.color }} />
                <span title={m.name}>{m.name}</span>
                <button onClick={() => removeSaved(m.id)} aria-label={`Rimuovi ${m.name}`}>✕</button>
              </li>
            ))}
          </ul>
        ) : <p className="preset-desc">I modelli aggiunti compaiono nel grafico di a(t), sovrapposti a quello corrente: utile per confrontare l'età di universi diversi.</p>}
      </div>
    </aside>
  )
}

function ParamControl({ def, value, onChange }: { def: ParamDef; value: number; onChange: (v: number) => void }) {
  const id = `p-${def.key}`
  return (
    <div className="param">
      <label htmlFor={id}>
        <span className="sym">{def.sym}</span>{def.label}{def.hint && <span className="hint"> ({def.hint})</span>}
      </label>
      <input
        id={id} type="number" step={def.step} min={def.inputMin} max={def.inputMax}
        value={+value.toFixed(def.digits)}
        onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(clamp(v, def.inputMin, def.inputMax)) }}
      />
      <input
        type="range" min={def.min} max={def.max} step={def.step} value={clamp(value, def.min, def.max)}
        onChange={e => onChange(+e.target.value)} aria-label={`${def.sym} ${def.label}`}
      />
    </div>
  )
}

/** Barra della densità al tempo del cursore: mostra Ω rispetto alla densità critica (Ω = 1). */
function Composition() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  if (!result) return null
  const om = sampleNullable(result, 'omega_m', tRel) ?? 0
  const or = sampleNullable(result, 'omega_r', tRel) ?? 0
  const ol = sampleNullable(result, 'omega_lambda', tRel) ?? 0
  const ok = sampleNullable(result, 'omega_k', tRel) ?? 0
  const pos = [om, or, Math.max(ol, 0)]
  const tot = pos.reduce((a, b) => a + b, 0)
  const scale = Math.max(tot, 1) * 1.04
  const isToday = Math.abs(tRel) < 0.05
  return (
    <div className="section">
      <h2>Densità {isToday ? 'oggi' : `a t₀ ${tRel >= 0 ? '+' : '−'} ${fmt(Math.abs(tRel), 1)} Gyr`} <small>in unità di ρc(t)</small></h2>
      <div style={{ position: 'relative' }}>
        <div className="compo" role="img" aria-label={`Ωm ${fmt(om)}, Ωr ${fmt(or)}, ΩΛ ${fmt(ol)}, Ωk ${fmt(ok)}`}>
          <span style={{ width: `${om / scale * 100}%`, background: COLORS.matter }} />
          <span style={{ width: `${or / scale * 100}%`, background: COLORS.radiation }} />
          <span style={{ width: `${Math.max(ol, 0) / scale * 100}%`, background: COLORS.lambda }} />
        </div>
        <div style={{ position: 'absolute', left: `${100 / scale}%`, top: -4, bottom: -4, borderLeft: `2px solid ${COLORS.red}` }} title="Ω = 1 (densità critica)" />
      </div>
      <div className="compo-legend num">
        <span><i style={{ background: COLORS.matter }} />Ωm {fmt(om, 3)}</span>
        <span><i style={{ background: COLORS.radiation }} />Ωr {fmtSmart(or, 3)}</span>
        <span><i style={{ background: COLORS.lambda }} />ΩΛ {fmt(ol, 3)}</span>
        <span><i style={{ background: COLORS.curvature }} />Ωk {fmt(ok, 3)}</span>
        <span style={{ color: COLORS.red }}>| Ω = 1</span>
      </div>
    </div>
  )
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)
