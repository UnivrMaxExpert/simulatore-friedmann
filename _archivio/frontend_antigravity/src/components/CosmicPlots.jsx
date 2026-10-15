import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function CosmicPlots({ simulationData, currentTimeIndex }) {
  if (!simulationData) return null;

  const times = simulationData.times_Gyr || [];
  const scaleFactors = simulationData.scale_factor_a || [];
  const todayIndex = simulationData.metadata?.t_today_index || 0;

  // Downsample for chart responsiveness if > 150 points
  const step = Math.max(1, Math.floor(times.length / 100));
  const sampledTimes = [];
  const sampledA = [];
  const sampledIndexMap = [];

  for (let i = 0; i < times.length; i += step) {
    sampledTimes.push(times[i].toFixed(1));
    sampledA.push(scaleFactors[i]);
    sampledIndexMap.push(i);
  }

  // Current active time indicator
  const currentTime = times[currentTimeIndex] !== undefined ? times[currentTimeIndex].toFixed(1) : 0;
  const currentA = scaleFactors[currentTimeIndex] !== undefined ? scaleFactors[currentTimeIndex] : 1;

  const dataA = {
    labels: sampledTimes,
    datasets: [
      {
        label: 'Fattore di Scala a(t)',
        data: sampledA,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2.5
      }
    ]
  };

  const optionsA = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `a(t) = ${ctx.parsed.y.toFixed(3)} (t = ${ctx.label} Gyr)`
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Tempo Cosmico t [Miliardi di Anni (Gyr)]', color: '#94a3b8' },
        ticks: { color: '#64748b', maxTicksLimit: 8 },
        grid: { color: 'rgba(51, 65, 85, 0.3)' }
      },
      y: {
        title: { display: true, text: 'Fattore di scala a(t)', color: '#94a3b8' },
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        min: 0
      }
    }
  };

  // Omegas plot
  const omegas = simulationData.omega_components || {};
  const sampledOmM = [];
  const sampledOmL = [];
  const sampledOmR = [];
  for (let idx of sampledIndexMap) {
    sampledOmM.push(omegas.Omega_m_t ? omegas.Omega_m_t[idx] : 0);
    sampledOmL.push(omegas.Omega_Lambda_t ? omegas.Omega_Lambda_t[idx] : 0);
    sampledOmR.push(omegas.Omega_r_t ? omegas.Omega_r_t[idx] : 0);
  }

  const dataOmegas = {
    labels: sampledTimes,
    datasets: [
      {
        label: 'Ω_m (Materia)',
        data: sampledOmM,
        borderColor: '#f59e0b',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Ω_Λ (Energia Oscura)',
        data: sampledOmL,
        borderColor: '#c084fc',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Ω_r (Radiazione)',
        data: sampledOmR,
        borderColor: '#ef4444',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  };

  const optionsOmegas = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1', boxWidth: 14 }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 't [Gyr]', color: '#94a3b8' },
        ticks: { color: '#64748b', maxTicksLimit: 8 },
        grid: { color: 'rgba(51, 65, 85, 0.3)' }
      },
      y: {
        title: { display: true, text: 'Densità Relativa Ω_i(t)', color: '#94a3b8' },
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        min: 0,
        max: 1.1
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
      {/* Plot 1: a(t) */}
      <div style={{
        background: '#090d16',
        borderRadius: '10px',
        padding: '12px 14px',
        border: '1px solid #1e293b',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Evoluzione Temporale a(t)</span>
          <span style={{ fontSize: '11px', color: '#38bdf8', background: '#0284c722', padding: '2px 8px', borderRadius: '4px', border: '1px solid #0284c744' }}>
            Attuale: t = {currentTime} Gyr | a = {Number(currentA).toFixed(3)}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: '140px' }}>
          <Line data={dataA} options={optionsA} />
        </div>
      </div>

      {/* Plot 2: Omegas */}
      <div style={{
        background: '#090d16',
        borderRadius: '10px',
        padding: '12px 14px',
        border: '1px solid #1e293b',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Frazioni di Densità Ω(t) nel Tempo</span>
        </div>
        <div style={{ flex: 1, minHeight: '140px' }}>
          <Line data={dataOmegas} options={optionsOmegas} />
        </div>
      </div>
    </div>
  );
}
