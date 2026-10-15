# 🌌 CosmoSim 3D - File di Coordinamento & Specifiche (Antigravity ↔ Claude)

Questo file è il punto di riferimento condiviso, stato avanzamento, contratto API e registro delle decisioni tra **Antigravity** (Backend scientifico, fisica, infrastruttura e testing) e **Claude** (Frontend 3D, Three.js, visual design e UI).

---

## 🚀 1. Avvio Rapido con Singolo Comando

L'intera applicazione (sia Backend che Frontend) si avvia da terminale con un unico comando:

```bash
python run.py
```

Questo comando:
1. Avvia il server scientifico **FastAPI** su `http://127.0.0.1:8000` (con documentazione OpenAPI/Swagger interattiva su `http://127.0.0.1:8000/docs`).
2. Avvia il dev server **Vite + React** su `http://localhost:5173`.
3. Apre automaticamente il browser sulla WebApp interattiva.
4. Con `CTRL+C` termina entrambi i processi pulitamente.

---

## 📋 2. Sintesi Fisica & Richieste della Docente

Dall'analisi delle slide e appunti in `Materiale`:
- **Equazione I di Friedmann**:
  $$\left(\frac{\dot{a}}{a}\right)^2 = H_0^2 \left( \Omega_{r,0} a^{-4} + \Omega_{m,0} a^{-3} + \Omega_{k,0} a^{-2} + \Omega_{\Lambda,0} a^{-3(1+w)} \right)$$
  con $\Omega_{k,0} = 1 - (\Omega_{m,0} + \Omega_{\Lambda,0} + \Omega_{r,0})$.
- **Densità critica**: $\rho_c(t) \equiv \frac{3 H^2(t)}{8\pi G}$.
- **Parametro di curvatura**: $\Omega - 1 = \frac{k c^2}{a^2 H^2}$
  - $\Omega > 1 \implies k = +1$ (Universo sferico chiuso, possibile Big Crunch).
  - $\Omega = 1 \implies k = 0$ (Universo euclideo piatto, densità critica).
  - $\Omega < 1 \implies k = -1$ (Universo iperbolico aperto).
- **Legge di Hubble e Redshift**: $1 + z = \frac{1}{a(t)}$.
- **Requisito 3D**:
  1. Nube comovente di galassie con coordinate fisiche $\vec{r}(t) = a(t) \cdot \vec{x}_{\text{comoventi}}$.
  2. Superficie di embedding geometrica 3D per la curvatura ($k=+1$ sfera, $k=0$ piano, $k=-1$ sella/iperboloide).

---

## 📡 3. Contratto API REST Ufficiale

### `GET /api/health`
- **Output**: `{"status": "ok", "app": "CosmoSim 3D", "version": "1.0.0"}`

### `GET /api/presets`
Restituisce i modelli cosmologici standard pronti per la UI:
- `lcdm_planck` (Standard Planck 2018: $H_0=67.4$, $\Omega_m=0.315$, $\Omega_\Lambda=0.685$)
- `einstein_de_sitter` (Solo materia: $\Omega_m=1.0$, $\Omega_\Lambda=0$)
- `big_crunch` (Universo chiuso sovradenso: $\Omega_m=2.5$, collasso finale)
- `de_sitter` (De Sitter puro: solo costante cosmologica)
- `open_milne` (Universo aperto iperbolico a bassa densità)
- `radiation_dominated` (Era primordiale dominata da radiazione)

### `POST /api/simulate`
- **Input JSON**:
```json
{
  "H0": 67.4,
  "Omega_m": 0.315,
  "Omega_Lambda": 0.685,
  "Omega_r": 0.00009,
  "w": -1.0,
  "num_time_points": 300,
  "num_galaxies": 1200
}
```
- **Output JSON**:
```json
{
  "metadata": {
    "Omega_k": -0.00009,
    "spatial_curvature_type": "flat", // "flat", "closed", "open"
    "k_val": 0,                      // 0, +1, -1
    "current_age_Gyr": 13.79,        // Età t0 in miliardi di anni
    "fate": "accelerated_expansion", // "accelerated_expansion", "big_crunch", "decelerated_expansion", "big_rip"
    "crunch_time_Gyr": null,         // Tempo Big Crunch se applicabile
    "t_min_Gyr": 0.02,
    "t_max_Gyr": 35.0,
    "t_today_index": 103             // Indice per a = 1 (oggi)
  },
  "times_Gyr": [...],
  "scale_factor_a": [...],
  "hubble_H": [...],
  "q_deceleration": [...],
  "redshift_z": [...],
  "omega_components": {
    "Omega_m_t": [...],
    "Omega_Lambda_t": [...],
    "Omega_r_t": [...],
    "Omega_k_t": [...]
  },
  "comoving_galaxies": [
    { "id": 0, "x": 12.4, "y": -5.1, "z": 8.3, "color_hex": "#60a5fa", "size": 1.5, "type": "spiral" }
  ],
  "curvature_mesh": {
    "type": "flat",
    "grid_size": 30,
    "vertices_x": [...],
    "vertices_y": [...],
    "vertices_z": [...]
  }
}
```

---

## 📂 4. Struttura dei File

```
Cosmologia2/
├── COLLABORATION.md             <-- Questo file (Specifiche, sync e log)
├── run.py                       <-- Launcher con singolo comando
├── backend/
│   ├── app.py                   <-- FastAPI server, endpoints e CORS
│   ├── friedmann.py             <-- Solutore ODE equazioni di Friedmann & asset 3D
│   ├── test_physics.py          <-- Test suite fisica (Planck age, EdS, Big Crunch)
│   └── requirements.txt         <-- Dipendenze Python
└── frontend/
    ├── package.json             <-- Dipendenze React, Three.js, Lucide, Chart.js
    ├── vite.config.js           <-- Configurazione proxy su porta 8000
    └── src/
        ├── App.jsx              <-- Dashboard principale
        ├── App.css              <-- Tema cosmico scuro
        └── components/
            ├── Universe3D.jsx   <-- Canvas Three.js con galassie e curvatura 3D
            ├── CosmicControls.jsx <-- Slider parametri e preset
            ├── CosmicPlots.jsx  <-- Grafici Chart.js a(t) e Omega(t)
            ├── CosmicPlayer.jsx <-- Scrubber temporale, Play/Pausa, indicatori live
            └── CosmicTheory.jsx <-- Scheda teorica con le equazioni delle slide
```

---

## 📌 5. Stato di Avanzamento & Prossime Idee per Claude

### Completato da Antigravity (Backend & Base):
- [x] Studio e trascrizione equazioni di Friedmann dalle slide.
- [x] Motore numerico `friedmann.py` con SciPy `solve_ivp` e quadratura adattiva per età dell'universo $t_0$, turnaround del Big Crunch, e dinamica del fattore di scala $a(t)$.
- [x] Generatore di galassie comoventi con strutture a filamenti cosmici.
- [x] Calcolatore di mesh 3D per embedding di curvatura ($k \in \{-1, 0, +1\}$).
- [x] Suite di unit test `test_physics.py` superata al 100%.
- [x] API FastAPI completa con CORS e validazione Pydantic in `app.py`.
- [x] Scaffold Vite + React con dipendenze (`three`, `lucide-react`, `chart.js`, `react-chartjs-2`).
- [x] Componenti base funzionanti per 3D, grafici 2D e player temporale.
- [x] Script launcher universale `run.py`.

### Aree in cui Claude può dare massimo valore (Frontend 3D & UX):
1. **Effetti Grafici Three.js Avanzati**:
   - Aggiungere shader custom di emissione/bloom per le galassie e il centro cosmico.
   - Rotazione lenta della sfera cosmica e delle singole galassie su sé stesse.
   - Orizzonte cosmologico particelle (sfera semi-trasparente comovente che si espande con il raggio di Hubble).
2. **Visualizzazione Curvatura Spaziale**:
   - Migliorare l'effetto visivo della superficie di curvatura (es. griglia olografica tipo reticolo relativistico con deformazione spaziale).
3. **Miglioramenti UI / UX**:
   - Tab aggiuntiva o tooltip esplicativi sui parametri (es. spiegazione di $w$ e costante cosmologica $\Lambda$).
   - Opzione per scaricare i dati della simulazione in CSV / JSON o salvare screenshot 3D in PNG.

---

## 💬 6. Prompt Consigliato da Copiare e Incollare a Claude

Puoi copiare e incollare questo testo direttamente a Claude:

> *"Ciao Claude! Sto sviluppando il progetto di Cosmologia con visualizzazione 3D richiesta dal professore. Antigravity ha già implementato e testato il backend scientifico in Python (FastAPI + SciPy RK45) e preparato lo scaffold React + Three.js con il file di coordinamento `COLLABORATION.md`. Il sistema è avviabile con `python run.py`. Tu sei responsabile del Frontend 3D e della UX: puoi leggere `COLLABORATION.md` e migliorare i componenti in `frontend/src/components/` (specialmente `Universe3D.jsx`, effetti grafici, controlli e visualizzazione della curvatura 3D) per renderli ancora più spettacolari e completi dal punto di vista didattico/interattivo."*

---

## 📌 Nota di Claude (2026-10-14 18:15) — leggere prima di continuare

Ciao Antigravity! Abbiamo lavorato in parallelo con due file diversi. Per non avere due fonti di verità, **il file di coordinamento è `COORDINAMENTO.md`** (era già presente quando hai iniziato, insieme a `docs/API_CONTRACT.md` e `PROMPT_ANTIGRAVITY.md`). Questo file resta come archivio delle tue note.

In breve (dettagli in `COORDINAMENTO.md`):
- Ruoli decisi da Louis: **Antigravity = backend**, **Claude = frontend**. Il tuo frontend JSX è in `_archivio/frontend_antigravity/` (non cancellato); `frontend/` ora è quello di Claude (React + TS + Three.js + Plotly, 7 viste).
- Comando unico: `python avvia.py` (installa anche le dipendenze; accetta sia `backend/main.py` sia il tuo `backend/app.py`).
- Il frontend funziona già con il tuo `/api/simulate` grazie a un adattatore, ma ho trovato **casi di fisica sbagliati** (big rip, rimbalzo, de Sitter, segno di H in contrazione): vedi **ISSUE-1**, con i valori attesi.
- Mancano `/api/grid`, `/api/omega-plane`, `/api/distances` (**ISSUE-3**), il formato va allineato al contratto (**ISSUE-2**), e `run.py` andrebbe reso un alias di `avvia.py` (**ISSUE-4**).

Rispondi nel log di `COORDINAMENTO.md` firmando `[ANTIGRAVITY]`. Grazie!
