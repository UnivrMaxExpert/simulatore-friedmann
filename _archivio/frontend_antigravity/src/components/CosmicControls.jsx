import React from 'react';
import { Sliders, RefreshCw, Zap } from 'lucide-react';

export default function CosmicControls({
  params,
  setParams,
  presets,
  onApplyPreset,
  onSimulate,
  loading,
  metadata
}) {
  const Omega_tot = (params.Omega_m + params.Omega_Lambda + params.Omega_r).toFixed(4);
  const Omega_k = (1.0 - Omega_tot).toFixed(4);

  let curvatureBadge = { text: 'Piatto (k=0)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  if (Omega_k < -0.005) {
    curvatureBadge = { text: 'Chiuso (k=+1)', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
  } else if (Omega_k > 0.005) {
    curvatureBadge = { text: 'Aperto (k=-1)', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' };
  }

  const handleSliderChange = (field, val) => {
    setParams(prev => ({ ...prev, [field]: parseFloat(val) }));
  };

  return (
    <div style={{
      background: '#090d16',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 600, fontSize: '15px' }}>
          <Sliders size={18} color="#38bdf8" />
          <span>Parametri Cosmologici</span>
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: curvatureBadge.color,
          background: curvatureBadge.bg,
          padding: '3px 8px',
          borderRadius: '999px',
          border: `1px solid ${curvatureBadge.color}44`
        }}>
          {curvatureBadge.text}
        </div>
      </div>

      {/* Preset selector */}
      <div>
        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Zap size={14} color="#f59e0b" /> Modelli Standard (Preset):
        </label>
        <select
          onChange={(e) => onApplyPreset(e.target.value)}
          defaultValue="lcdm_planck"
          style={{
            width: '100%',
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '7px 10px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* H0 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '3px' }}>
            <span>Costante di Hubble H₀:</span>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>{params.H0} km/s/Mpc</span>
          </div>
          <input
            type="range"
            min="20"
            max="120"
            step="0.5"
            value={params.H0}
            onChange={(e) => handleSliderChange('H0', e.target.value)}
            style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
        </div>

        {/* Omega_m */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '3px' }}>
            <span>Densità Materia Ω_m:</span>
            <span style={{ fontWeight: 600, color: '#f59e0b' }}>{params.Omega_m.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.01"
            value={params.Omega_m}
            onChange={(e) => handleSliderChange('Omega_m', e.target.value)}
            style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
          />
        </div>

        {/* Omega_Lambda */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '3px' }}>
            <span>Energia Oscura Ω_Λ:</span>
            <span style={{ fontWeight: 600, color: '#c084fc' }}>{params.Omega_Lambda.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.01"
            value={params.Omega_Lambda}
            onChange={(e) => handleSliderChange('Omega_Lambda', e.target.value)}
            style={{ width: '100%', accentColor: '#c084fc', cursor: 'pointer' }}
          />
        </div>

        {/* Omega_r */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '3px' }}>
            <span>Radiazione Ω_r:</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>{params.Omega_r.toFixed(5)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.05"
            step="0.0005"
            value={params.Omega_r}
            onChange={(e) => handleSliderChange('Omega_r', e.target.value)}
            style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
          />
        </div>

        {/* w equation of state */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '3px' }}>
            <span>Eq. Stato Dark Energy w:</span>
            <span style={{ fontWeight: 600, color: '#a855f7' }}>{params.w.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="-1.8"
            max="0.5"
            step="0.05"
            value={params.w}
            onChange={(e) => handleSliderChange('w', e.target.value)}
            style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Calculated totals */}
      <div style={{
        background: '#0f172a',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #1e293b',
        fontSize: '11px',
        color: '#94a3b8',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px'
      }}>
        <div>Ω_totale: <b style={{ color: '#f8fafc' }}>{Omega_tot}</b></div>
        <div>Ω_k (Curv.): <b style={{ color: curvatureBadge.color }}>{Omega_k}</b></div>
        {metadata && (
          <>
            <div>Età t₀: <b style={{ color: '#38bdf8' }}>{metadata.current_age_Gyr} Gyr</b></div>
            <div>Destino: <b style={{ color: metadata.fate === 'big_crunch' ? '#f43f5e' : '#10b981' }}>
              {metadata.fate === 'big_crunch' ? 'Big Crunch' : metadata.fate === 'accelerated_expansion' ? 'Esp. Accelerata' : 'Esp. Decelerata'}
            </b></div>
          </>
        )}
      </div>

      {/* Simulate Button */}
      <button
        onClick={onSimulate}
        disabled={loading}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #0284c7, #6366f1)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '14px',
          padding: '10px',
          borderRadius: '8px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1
        }}
      >
        <RefreshCw size={16} className={loading ? 'spin' : ''} />
        {loading ? 'Risolvendo Friedmann...' : 'Risolvi Equazioni di Friedmann'}
      </button>
    </div>
  );
}
