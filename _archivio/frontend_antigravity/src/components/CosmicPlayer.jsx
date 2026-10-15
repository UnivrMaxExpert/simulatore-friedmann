import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock } from 'lucide-react';

export default function CosmicPlayer({
  simulationData,
  currentTimeIndex,
  setCurrentTimeIndex,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed
}) {
  if (!simulationData) return null;

  const times = simulationData.times_Gyr || [];
  const scaleFactors = simulationData.scale_factor_a || [];
  const hubble = simulationData.hubble_H || [];
  const redshifts = simulationData.redshift_z || [];
  const qs = simulationData.q_deceleration || [];
  const maxIdx = times.length - 1;
  const todayIdx = simulationData.metadata?.t_today_index || 0;

  const curTime = times[currentTimeIndex] !== undefined ? times[currentTimeIndex] : 0;
  const curA = scaleFactors[currentTimeIndex] !== undefined ? scaleFactors[currentTimeIndex] : 1;
  const curH = hubble[currentTimeIndex] !== undefined ? hubble[currentTimeIndex] : 0;
  const curZ = redshifts[currentTimeIndex] !== undefined ? redshifts[currentTimeIndex] : 0;
  const curQ = qs[currentTimeIndex] !== undefined ? qs[currentTimeIndex] : 0;

  return (
    <div style={{
      background: 'rgba(9, 13, 22, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tempo Cosmico (t)</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>{curTime.toFixed(2)} Gyr</div>
        </div>
        <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fattore di Scala a(t)</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>{curA.toFixed(3)}</div>
        </div>
        <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Parametro di Hubble H(t)</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#c084fc' }}>{curH.toFixed(1)} <span style={{ fontSize: '10px' }}>km/s/Mpc</span></div>
        </div>
        <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Redshift Osservato (z)</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: curZ >= 0 ? '#ef4444' : '#10b981' }}>
            {curZ > 50 ? '> 50' : curZ.toFixed(2)}
          </div>
        </div>
        <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Decelerazione q(t)</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: curQ < 0 ? '#10b981' : '#f43f5e' }}>
            {curQ.toFixed(2)} {curQ < 0 ? '(accel.)' : '(decel.)'}
          </div>
        </div>
      </div>

      {/* Scrubber & Player Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Play / Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? '#e11d48' : '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title={isPlaying ? 'Pausa' : 'Riproduci simulazione'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
        </button>

        {/* Reset to Big Bang */}
        <button
          onClick={() => { setIsPlaying(false); setCurrentTimeIndex(0); }}
          style={{
            background: '#1e293b',
            color: '#cbd5e1',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Inizio (Big Bang)"
        >
          <RotateCcw size={12} /> Big Bang
        </button>

        {/* Jump to Today */}
        <button
          onClick={() => { setIsPlaying(false); setCurrentTimeIndex(todayIdx); }}
          style={{
            background: '#1e293b',
            color: '#38bdf8',
            border: '1px solid #0284c766',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Oggi (a=1)"
        >
          <Clock size={12} /> Oggi (a=1)
        </button>

        {/* Slider */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="0"
            max={maxIdx}
            value={currentTimeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTimeIndex(parseInt(e.target.value));
            }}
            style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
        </div>

        {/* Speed Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0.5, 1.0, 2.0, 4.0].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              style={{
                background: playbackSpeed === s ? '#38bdf8' : '#1e293b',
                color: playbackSpeed === s ? '#0f172a' : '#cbd5e1',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                padding: '4px 7px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
