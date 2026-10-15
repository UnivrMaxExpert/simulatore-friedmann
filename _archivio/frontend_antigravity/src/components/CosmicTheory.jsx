import React from 'react';
import { BookOpen, X } from 'lucide-react';

export default function CosmicTheory({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 7, 19, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div style={{
        background: '#090d16',
        border: '1px solid #334155',
        borderRadius: '16px',
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        color: '#e2e8f0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>Elementi di Cosmologia: Equazioni di Friedmann</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '14px', lineHeight: 1.6 }}>
          {/* Section 1 */}
          <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: '16px' }}>1. Le Tre Equazioni Fondamentali di Friedmann</h3>
            <div style={{ fontFamily: 'ui-monospace, monospace', background: '#050713', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: '4px 0' }}><b>(I)   à² = (8πG / 3) ρ a² - k c²</b>   (Equazione dell'energia)</p>
              <p style={{ margin: '4px 0' }}><b>(II)  ä = - (4πG / 3) a (ρ + 3P/c²)</b>  (Equazione dell'accelerazione)</p>
              <p style={{ margin: '4px 0' }}><b>(III) ρ̇ = - 3 (ȧ / a) (ρ + P/c²)</b>     (Conservazione dell'energia fluido cosmico)</p>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', color: '#f59e0b', fontSize: '16px' }}>2. Parametro di Hubble e Densità Critica ρ_c</h3>
            <p>Il tasso di espansione attuale e nel tempo è quantificato dal parametro di Hubble:</p>
            <div style={{ fontFamily: 'ui-monospace, monospace', background: '#050713', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <b>H(t) ≡ ȧ(t) / a(t)</b>
            </div>
            <p style={{ marginTop: '8px' }}>Se l'universo fosse piatto (k = 0), la densità coinciderebbe con la <b>densità critica</b>:</p>
            <div style={{ fontFamily: 'ui-monospace, monospace', background: '#050713', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <b>ρ_c(t) ≡ 3 H²(t) / (8πG)</b>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', color: '#c084fc', fontSize: '16px' }}>3. Parametro di Densità Ω e Geometria Spaziale (k)</h3>
            <p>Definendo <b>Ω(t) ≡ ρ(t) / ρ_c(t)</b>, la prima equazione di Friedmann si riscrive come:</p>
            <div style={{ fontFamily: 'ui-monospace, monospace', background: '#050713', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <b>Ω - 1 = k c² / (a²(t) H²(t))</b>
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li><b>Ω &gt; 1  ⟺  k = +1</b>: Spazio sferico chiuso a curvatura positiva. Se domina la materia, ricollassa (Big Crunch).</li>
              <li><b>Ω = 1  ⟺  k = 0</b>: Spazio piatto euclideo (densità critica esatta).</li>
              <li><b>Ω &lt; 1  ⟺  k = -1</b>: Spazio iperbolico aperto a curvatura negativa. Espansione infinita.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', color: '#10b981', fontSize: '16px' }}>4. Redshift Cosmologico e Metrica FLRW</h3>
            <p>Dalla metrica di Friedmann-Lemaître-Robertson-Walker lungo una geodetica nulla (ds² = 0) per la luce:</p>
            <div style={{ fontFamily: 'ui-monospace, monospace', background: '#050713', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <b>1 + z = λ_oss / λ_em = a(t₀) / a(t_e) = 1 / a(t_e)</b>  (con a(t₀) = 1 oggi)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              background: '#38bdf8',
              color: '#090d16',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              cursor: 'pointer'
            }}
          >
            Chiudi Scheda
          </button>
        </div>
      </div>
    </div>
  );
}
