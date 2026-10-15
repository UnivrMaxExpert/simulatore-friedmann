import { useStore, sampleAt } from '../store/useStore'
import { fmt, fmtSmart } from '../format'

export default function Timeline() {
  const result = useStore(s => s.result)
  const tRel = useStore(s => s.tRel)
  const setTRel = useStore(s => s.setTRel)
  const playing = useStore(s => s.playing)
  const setPlaying = useStore(s => s.setPlaying)
  const speed = useStore(s => s.speed)
  const setSpeed = useStore(s => s.setSpeed)
  if (!result) return <div className="timeline"><span className="busy">Simulazione in corso…</span></div>

  const tr = result.series.t_rel_gyr
  const t0 = tr[0], t1 = tr[tr.length - 1]
  const age = result.derived.age_gyr
  const a = sampleAt(result, 'a', tRel)
  const H = sampleAt(result, 'H', tRel)
  const z = sampleAt(result, 'z', tRel)
  const pct = (t: number) => `${((t - t0) / (t1 - t0)) * 100}%`

  const marks: { t: number; label: string; cls?: string }[] = [
    { t: t0, label: age !== null ? 'Big Bang' : `${fmt(t0, 0)} Gyr` },
    { t: 0, label: 'oggi', cls: 'today' },
  ]
  const d = result.derived
  if (d.t_acc_gyr !== null && age !== null) marks.push({ t: d.t_acc_gyr - age, label: 'inizia l\'accelerazione' })
  if (d.t_turnaround_gyr !== null && age !== null && d.t_turnaround_gyr - age < t1) marks.push({ t: d.t_turnaround_gyr - age, label: 'inversione' })
  if (d.fate === 'big_crunch' && d.t_end_gyr !== null) marks.push({ t: t1, label: 'Big Crunch' })
  else if (d.fate === 'big_rip' && d.t_end_gyr !== null && age !== null && d.t_end_gyr - age <= t1 + 1) marks.push({ t: t1, label: 'Big Rip' })
  else marks.push({ t: t1, label: `+${fmt(t1, 0)} Gyr` })

  const togglePlay = () => {
    if (!playing && tRel >= t1 - 1e-6) setTRel(t0)
    setPlaying(!playing)
  }

  return (
    <div className="timeline">
      <button className="play" aria-pressed={playing} onClick={togglePlay} aria-label={playing ? 'Pausa' : 'Riproduci l\'evoluzione'}>
        {playing
          ? <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" /></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1 L13 7 L3 13 Z" fill="currentColor" /></svg>}
      </button>
      <select className="speed" value={speed} onChange={e => setSpeed(+e.target.value)} aria-label="Velocità">
        <option value={0.25}>0,25×</option>
        <option value={0.5}>0,5×</option>
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={4}>4×</option>
      </select>
      <div className="track">
        <input
          type="range" min={t0} max={t1} step="any" value={tRel}
          onChange={e => { setPlaying(false); setTRel(+e.target.value) }}
          aria-label="Tempo cosmico"
        />
        <div className="marks">
          {placeMarks(marks.filter(m => m.t >= t0 && m.t <= t1), t0, t1).map(m => (
            <span key={m.label} className={m.cls} style={{ left: pct(m.t), top: m.row * 15, transform: m.t === t0 ? 'none' : m.t === t1 ? 'translateX(-100%)' : undefined }}>{m.label}</span>
          ))}
        </div>
      </div>
      <div className="readout">
        <div><b>{age !== null ? fmt(tRel + age, 2) : fmt(tRel, 2)}</b><span>{age !== null ? 't dal Big Bang, Gyr' : 't − t₀, Gyr'}</span></div>
        <div><b>{fmt(a, 3)}</b><span>a(t)</span></div>
        <div><b>{fmtSmart(z, 3)}</b><span>redshift z</span></div>
        <div><b>{fmtSmart(H, 3)}</b><span>H, km/s/Mpc</span></div>
      </div>
    </div>
  )
}

/** Evita che le etichette si sovrappongano: quelle troppo vicine vanno sulla seconda riga. */
function placeMarks<T extends { t: number; label: string }>(marks: T[], t0: number, t1: number) {
  const sorted = [...marks].sort((a, b) => a.t - b.t)
  const lastEnd = [-Infinity, -Infinity]
  return sorted.map(m => {
    const x = (m.t - t0) / (t1 - t0)
    const half = m.label.length * 0.0042 // larghezza stimata, frazione della traccia
    const start = m.t === t0 ? x : m.t === t1 ? x - 2 * half : x - half
    const row = start > lastEnd[0] ? 0 : 1
    lastEnd[row] = start + 2 * half + 0.01
    return { ...m, row }
  })
}
