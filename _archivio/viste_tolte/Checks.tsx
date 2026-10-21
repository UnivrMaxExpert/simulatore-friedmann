import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { computeChecks, relDiff } from '../physics/check'
import { fmt, whenLabel } from '../format'

const TOL = 5e-3 // 0,5 %: entro questa soglia formula e simulazione coincidono

const show = (v: number) => {
  const av = Math.abs(v)
  if (av !== 0 && (av < 1e-3 || av >= 1e5)) return v.toExponential(3).replace('.', ',')
  return v.toLocaleString('it-IT', { maximumSignificantDigits: 5 })
}

/**
 * «Formule ↔ simulatore»: per il modello scelto ricalcola le grandezze con le formule delle lezioni
 * (soluzioni esatte o la I equazione) e le mette accanto a quelle del simulatore, che integra la II equazione.
 * Le righe «al cursore» cambiano spostando la linea del tempo.
 */
export default function Checks() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const checks = useMemo(() => (result ? computeChecks(result, tRel) : []), [result, tRel])
  if (!result || checks.length === 0) return null
  const cursorLabel = whenLabel(tRel)

  return (
    <div className="section">
      <ul className="checks">
        {checks.map(c => {
          const r = relDiff(c)
          const ok = r < TOL
          return (
            <li key={c.id} data-ok={ok}>
              <div className="check-head">
                <span>{c.label}{c.atCursor && <em> · {cursorLabel}</em>}</span>
                <span className="check-mark" aria-label={ok ? 'coincide' : 'differenza'}>{ok ? '✓' : '≠'}</span>
              </div>
              <div className="check-formula">{c.formula}</div>
              <div className="check-vals num">
                <span>formula <b>{show(c.expected)}</b></span>
                <span>simulatore <b>{show(c.simulated)}</b></span>
                {c.unit && <span className="muted">{c.unit}</span>}
                <span className="muted">Δ {r < 1e-6 ? '< 0,0001' : fmt(r * 100, r < 1e-3 ? 4 : 2)} %</span>
              </div>
              <div className="check-src">{c.source}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
