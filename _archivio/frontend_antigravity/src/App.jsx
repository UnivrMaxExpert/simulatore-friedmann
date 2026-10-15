import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Universe3D from './components/Universe3D';
import CosmicControls from './components/CosmicControls';
import CosmicPlots from './components/CosmicPlots';
import CosmicPlayer from './components/CosmicPlayer';
import CosmicTheory from './components/CosmicTheory';
import { Sparkles, Globe, Layers, BookOpen, AlertCircle } from 'lucide-react';

export default function App() {
  const [params, setParams] = useState({
    H0: 67.4,
    Omega_m: 0.315,
    Omega_Lambda: 0.685,
    Omega_r: 0.00009,
    w: -1.0,
    num_time_points: 300,
    num_galaxies: 1200
  });

  const [presets, setPresets] = useState([]);
  const [simulationData, setSimulationData] = useState(null);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [viewMode, setViewMode] = useState('galaxies'); // 'galaxies' | 'curvature'
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Fetch Presets on Mount
  useEffect(() => {
    fetch('/api/presets')
      .then(res => res.json())
      .then(data => {
        setPresets(data);
      })
      .catch(err => {
        console.error('Error fetching presets:', err);
      });
  }, []);

  // 2. Initial Simulation on Mount
  useEffect(() => {
    runSimulation(params);
  }, []);

  // 3. Playback timer
  useEffect(() => {
    let interval = null;
    if (isPlaying && simulationData) {
      const maxIdx = simulationData.times_Gyr.length - 1;
      const delay = Math.max(16, 50 / playbackSpeed);

      interval = setInterval(() => {
        setCurrentTimeIndex(prev => {
          if (prev >= maxIdx) {
            setIsPlaying(false);
            return maxIdx;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, simulationData]);

  const runSimulation = async (simParams = params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simParams)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Errore nella simulazione');
      }
      const data = await res.json();
      setSimulationData(data);
      // Reset index to today
      if (data.metadata?.t_today_index !== undefined) {
        setCurrentTimeIndex(data.metadata.t_today_index);
      } else {
        setCurrentTimeIndex(0);
      }
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetId) => {
    const selected = presets.find(p => p.id === presetId);
    if (selected) {
      const updated = {
        ...params,
        ...selected.params
      };
      setParams(updated);
      runSimulation(updated);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#050713' }}>
      {/* Top Navbar */}
      <header style={{
        height: '56px',
        background: '#090d16',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={22} color="#38bdf8" />
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            CosmoSim 3D <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8' }}>| Dinamica FLRW & Friedmann</span>
          </h1>
        </div>

        {/* View mode toggle & Theory button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mode Switcher */}
          <div style={{
            background: '#0f172a',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={() => setViewMode('galaxies')}
              style={{
                background: viewMode === 'galaxies' ? '#0284c7' : 'transparent',
                color: viewMode === 'galaxies' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Globe size={14} /> Galassie 3D
            </button>
            <button
              onClick={() => setViewMode('curvature')}
              style={{
                background: viewMode === 'curvature' ? '#0284c7' : 'transparent',
                color: viewMode === 'curvature' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers size={14} /> Curvatura Spaziale (k)
            </button>
          </div>

          {/* Theory button */}
          <button
            onClick={() => setIsTheoryOpen(true)}
            style={{
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={14} /> Teoria & Equazioni
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '320px 1fr 380px',
        gap: '12px',
        padding: '12px',
        overflow: 'hidden'
      }}>
        {/* Left Column: Controls & Presets */}
        <div style={{ overflowY: 'auto' }}>
          <CosmicControls
            params={params}
            setParams={setParams}
            presets={presets}
            onApplyPreset={handleApplyPreset}
            onSimulate={() => runSimulation(params)}
            loading={loading}
            metadata={simulationData?.metadata}
          />
        </div>

        {/* Center Column: 3D Canvas + Time Scrubber Player */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* 3D Viewport */}
          <div style={{
            flex: 1,
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #1e293b',
            background: '#050713'
          }}>
            {error ? (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#090d16',
                padding: '16px 24px',
                borderRadius: '8px',
                border: '1px solid #f43f5e44'
              }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            ) : (
              <Universe3D
                simulationData={simulationData}
                currentTimeIndex={currentTimeIndex}
                viewMode={viewMode}
              />
            )}
          </div>

          {/* Bottom Player */}
          <CosmicPlayer
            simulationData={simulationData}
            currentTimeIndex={currentTimeIndex}
            setCurrentTimeIndex={setCurrentTimeIndex}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
          />
        </div>

        {/* Right Column: 2D Plots */}
        <div style={{ overflowY: 'auto' }}>
          <CosmicPlots
            simulationData={simulationData}
            currentTimeIndex={currentTimeIndex}
          />
        </div>
      </div>

      {/* Theory Modal */}
      <CosmicTheory
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />
    </div>
  );
}
