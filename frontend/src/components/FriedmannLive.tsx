import { useMemo } from 'react'
import katex from 'katex'
import { useStore, sampleAt } from '../store/useStore'
import { COLORS, fmt } from '../format'

/**
 * «Le equazioni di Friedmann con i tuoi parametri»: le tre equazioni scritte con i valori del pannello
 * e con a(t) al tempo del cursore. Cambiano in tempo reale muovendo i cursori dei parametri o la linea del tempo.
 */

const C = { r: COLORS.radiation, m: COLORS.matter, k: COLORS.curvature, l: COLORS.lambda }

/** numero in TeX, con la virgola italiana e la notazione scientifica per valori molto piccoli o grandi */
function n(v: number, sig = 3): string {
  if (!Number.isFinite(v)) return '\\infty'
  if (v === 0) return '0'
  const av = Math.abs(v)
  if (av < 1e-3 || av >= 1e5) {
    const [m, e] = v.toExponential(Math.min(sig, 2) - 1).split('e')
    return `${m.replace('.', '{,}')}\\cdot 10^{${Number(e)}}`
  }
  const s = Number(v.toPrecision(sig)).toString()
  return s.replace('.', '{,}')
}
const col = (c: string, body: string) => `{\\color{${c}}${body}}`
/** termine con segno: "+ x" o "- x" */
const sgn = (v: number, body: string, first = false) => (v < 0 ? ` - ${body.replace(/^-/, '')}` : first ? body : ` + ${body}`)

function Tex({ t }: { t: string }) {
  const html = useMemo(() => katex.renderToString(t, { displayMode: true, throwOnError: false }), [t])
  return <div className="fl-tex" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function FriedmannLive() {
  const p = useStore(s => s.params)
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const a = result ? sampleAt(result, 'a', tRel) : 1
  const ok = 1 - p.omega_m - p.omega_r - p.omega_lambda
  const eL = -3 * (1 + p.w) // esponente dell'energia oscura

  // termini della I equazione, in unità di H0²
  const tr = p.omega_r * a ** -4
  const tm = p.omega_m * a ** -3
  const tk = ok * a ** -2
  const tl = p.omega_lambda * a ** eL
  const E2 = tr + tm + tk + tl
  const H = E2 > 0 ? p.H0 * Math.sqrt(E2) : NaN

  // II equazione: ä/a in unità di H0²
  const ur = -tr          // −½·2Ωr a⁻⁴
  const um = -0.5 * tm
  const ul = -0.5 * (1 + 3 * p.w) * tl
  const acc = ur + um + ul
  const q = E2 > 0 ? -acc / E2 : NaN

  const aStr = 'a'

  const I1 = `H^2 = H_0^2\\left[${col(C.r, '\\Omega_r a^{-4}')} + ${col(C.m, '\\Omega_m a^{-3}')} + ${col(C.k, '\\Omega_k a^{-2}')} + ${col(C.l, '\\Omega_\\Lambda a^{-3(1+w)}')}\\right]`
  const I2 = `= H_0^2\\left[${col(C.r, `${n(p.omega_r)}\\,${aStr}^{-4}`)}${sgn(p.omega_m, col(C.m, `${n(p.omega_m)}\\,${aStr}^{-3}`))}${sgn(ok, col(C.k, `${n(Math.abs(ok))}\\,${aStr}^{-2}`))}${sgn(p.omega_lambda, col(C.l, eL === 0 ? n(Math.abs(p.omega_lambda)) : `${n(Math.abs(p.omega_lambda))}\\,${aStr}^{${n(eL)}}`))}\\right]`
  const I3 = `= H_0^2\\left[${col(C.r, n(tr))}${sgn(tm, col(C.m, n(tm)))}${sgn(tk, col(C.k, n(Math.abs(tk))))}${sgn(tl, col(C.l, n(Math.abs(tl))))}\\right] = ${n(E2, 4)}\\,H_0^2`
  const I4 = E2 > 0 ? `\\Rightarrow\\ |H| = ${n(p.H0, 4)}\\cdot\\sqrt{${n(E2, 4)}} = ${n(H, 4)}\\ \\tfrac{\\text{km/s}}{\\text{Mpc}}` : '\\Rightarrow\\ H^2 < 0:\\ \\text{questo valore di } a \\text{ non viene raggiunto}'

  const II1 = `\\frac{\\ddot a}{a} = -\\frac{H_0^2}{2}\\left[${col(C.r, '2\\Omega_r a^{-4}')} + ${col(C.m, '\\Omega_m a^{-3}')} + ${col(C.l, '(1+3w)\\,\\Omega_\\Lambda a^{-3(1+w)}')}\\right]`
  const II2 = `= H_0^2\\left[${col(C.r, n(ur))}${sgn(um, col(C.m, n(Math.abs(um))))}${sgn(ul, col(C.l, n(Math.abs(ul))))}\\right] = ${n(acc, 4)}\\,H_0^2`

  const III1 = `\\rho \\propto a^{-3(1+w)}:\\quad ${col(C.r, `\\rho_r = \\rho_{r,0}\\,a^{-4}`)},\\ \\ ${col(C.m, `\\rho_m = \\rho_{m,0}\\,a^{-3}`)},\\ \\ ${col(C.l, `\\rho_\\Lambda = \\rho_{\\Lambda,0}\\,a^{${n(eL)}}`)}`
  const III2 = `${col(C.r, `\\frac{\\rho_r}{\\rho_{r,0}} = ${n(a ** -4)}`)},\\quad ${col(C.m, `\\frac{\\rho_m}{\\rho_{m,0}} = ${n(a ** -3)}`)},\\quad ${col(C.l, `\\frac{\\rho_\\Lambda}{\\rho_{\\Lambda,0}} = ${n(a ** eL)}`)}`

  return (
    <div className="section friedmann-live">

      <div className="fl-eq">
        <div className="fl-title"><b>I</b> — quanto velocemente si espande</div>
        <Tex t={I1} />
        <Tex t={I2} />
        <Tex t={I3} />
        <Tex t={I4} />
      </div>

      <div className="fl-eq">
        <div className="fl-title"><b>II</b> — se l'espansione accelera o rallenta</div>
        <Tex t={II1} />
        <Tex t={II2} />
        <p className="fl-verdict" data-acc={acc > 0}>
          {acc > 0 ? 'ä > 0: l\'espansione accelera' : acc < 0 ? 'ä < 0: l\'espansione rallenta' : 'ä = 0'}
          {Number.isFinite(q) && <> · q = −ä a / ȧ² = {fmt(q, 3)}</>}
          {p.w < -1 / 3 && p.omega_lambda > 0 && <> · l'energia oscura (w = {fmt(p.w, 2)} &lt; −1/3) spinge</>}
        </p>
      </div>

      <div className="fl-eq">
        <div className="fl-title"><b>III</b> — come si diluisce ogni componente mentre l'universo cresce</div>
        <Tex t={III1} />
        <Tex t={III2} />
      </div>
    </div>
  )
}
