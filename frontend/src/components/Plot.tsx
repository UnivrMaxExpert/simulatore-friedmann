import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'
import { COLORS } from '../format'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  data: any[]
  layout?: any
  height?: number | string
  onClick?: (ev: any) => void
  config?: any
}

export const AXIS = {
  gridcolor: COLORS.line,
  zerolinecolor: COLORS.rail,
  linecolor: COLORS.rail,
  tickfont: { size: 11.5, color: COLORS.ink2 },
  title: { font: { size: 13, color: COLORS.ink } },
}

export const BASE_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: "'Instrument Sans', system-ui, sans-serif", color: COLORS.ink, size: 12.5 },
  margin: { l: 58, r: 16, t: 10, b: 46 },
  hoverlabel: { bgcolor: '#0E1526', bordercolor: COLORS.rail, font: { color: COLORS.ink } },
  legend: { orientation: 'h', y: -0.2, x: 0, font: { size: 12 } },
  separators: ',.',
}

export default function Plot({ data, layout, height = 300, onClick, config }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const lay = deepMerge(BASE_LAYOUT, layout ?? {})
    void Plotly.react(el, data, lay, { displaylogo: false, responsive: true, locale: 'it', modeBarButtonsToRemove: ['lasso2d', 'select2d'], ...config })
  }, [data, layout, config])

  useEffect(() => {
    const el = ref.current as any
    if (!el || !onClick) return
    el.on?.('plotly_click', onClick)
    return () => el.removeAllListeners?.('plotly_click')
  }, [onClick, data])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => Plotly.Plots.resize(el))
    ro.observe(el)
    return () => { ro.disconnect(); Plotly.purge(el) }
  }, [])

  return <div ref={ref} style={{ width: '100%', height }} />
}

function deepMerge(a: any, b: any): any {
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return b ?? a
  const out: any = { ...a }
  for (const k of Object.keys(b)) out[k] = k in a && typeof b[k] === 'object' && b[k] !== null && !Array.isArray(b[k]) ? deepMerge(a[k], b[k]) : b[k]
  return out
}
