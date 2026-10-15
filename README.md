# Simulatore di Friedmann 3D

Simulatore della dinamica dell'universo basato sulle equazioni di Friedmann, con visualizzazioni 3D interattive.
Progetto per il corso *Elementi di Cosmologia e Relatività Generale* — Università di Verona.

## Avvio (un solo comando)
Prerequisito: **Python ≥ 3.9** (su Windows, se manca, `avvia.bat` prova a installarlo da solo con winget).

```bash
python avvia.py
```
Su Windows basta il doppio clic su `avvia.bat`. Al primo avvio crea l'ambiente virtuale e installa le dipendenze Python (qualche minuto, serve Internet), poi apre il browser. `Ctrl+C` chiude tutto.

- **Senza Node.js** usa l'interfaccia già compilata in `frontend/dist`, servita dal backend su `http://127.0.0.1:8000`.
- **Con Node.js ≥ 18** avvia l'interfaccia in modalità sviluppo su `http://127.0.0.1:5173` (le modifiche al codice si vedono subito).
- Dopo aver modificato `frontend/src`, `python avvia.py --compila` aggiorna `frontend/dist` (da includere nel commit).

## Struttura
```
backend/     API FastAPI + fisica (NumPy/SciPy)     → Antigravity
frontend/    Webapp React + Three.js + Plotly        → Claude
docs/        Contratto API
COORDINAMENTO.md   decisioni, stato, problemi, log tra i due agenti (unico file di coordinamento)
avvia.py     avvio con un comando (avvia_app.py: backend + interfaccia compilata)
_archivio/   versioni precedenti non più usate
```

## Backend
Realizzato in Python (≥ 3.9) con **FastAPI**, **NumPy** e **SciPy**. Espone le rotte conformi al contratto API v1.0 (`/api/health`, `/api/presets`, `/api/simulate`, `/api/grid`).

### Metodo Numerico (II° Equazione di Friedmann)
La I° equazione $\dot{a} = H_0 a E(a)$ si arresta matematicamente dove $\dot{a} = 0$, impedendo di seguire l'evoluzione oltre il turnaround nei modelli chiusi o nei modelli con rimbalzo.
Per superare questa limitazione, il motore integra direttamente la **II° equazione di Friedmann (equazione dell'accelerazione)** espressa come sistema dinamico del primo ordine in $(a, v)$ dove $v = \dot{a}$:

$$\begin{cases}
\frac{da}{dt} = v \\
\frac{dv}{dt} = -\frac{H_0^2}{2} \left[ 2\Omega_r a^{-3} + \Omega_m a^{-2} + (1 + 3w)\Omega_\Lambda a^{-(2+3w)} \right]
\end{cases}$$

In questa formulazione la curvatura $k$ non interviene nella derivata (entra solo come costante d'integrazione/vincolo d'energia nella I° equazione).
- **Integrazione**: `scipy.integrate.solve_ivp` (Runge-Kutta di ordine elevato, tolleranze assolute e relative $\le 10^{-8}$) a partire dalle condizioni odierne $a(t_0) = 1$, $v(t_0) = H_0$.
- **Integrazione retrograda (passato)**: traccia $t < t_0$ rilevando tramite *event functions* se l'origine è un **Big Bang** ($a \to 0$ in tempo finito) oppure un **Rimbalzo** ($v = 0$ con $a_{min} > 0$) o un **passato eterno** (es. de Sitter puro). L'età dell'universo è raffinata integrando il tratto primordiale con quadratura adattiva `scipy.integrate.quad`.
- **Integrazione diretta (futuro)**: traccia $t > t_0$ rilevando se il destino cosmico è un **Big Crunch** (inversione $v = 0$ al turnaround e collasso $a \to 0$ con $H(t) < 0$), un **Big Rip** ($w < -1$, divergenza a $a = 1000$ in tempo finito), o un'**espansione accelerata/eterna**.
- **Superficie 3D a(t, param)**: l'endpoint `POST /api/grid` vettorizza la sweep sui parametri cosmologici generando la griglia temporale $a(t, \text{param})$ in meno di 0.3 secondi.

### Test e Certificazione
Una suite completa di unit test con `pytest` (`backend/tests/test_friedmann.py`) certifica la convergenza e la precisione numerica rispetto a tutti i modelli cosmologici noti:
- **Planck 2018 $\Lambda$CDM**: età $13.79 \pm 0.05\text{ Gyr}$, $q_0 \approx -0.53$, $z_{acc} \approx 0.63$.
- **Einstein-de Sitter**: età analitica esatta $\frac{2}{3H_0} = 9.31\text{ Gyr}$, $q = 0.5$.
- **Universo di Radiazione**: età analitica esatta $\frac{1}{2H_0} = 6.98\text{ Gyr}$.
- **Universo Chiuso**: tempo di Big Crunch esatto $46.55\text{ Gyr}$ ($\Omega_m=3, H_0=70$) e $H < 0$ in contrazione.
- **Rimbalzo**: rilevamento $a_{min} = 0.611$ ($\Omega_m=0.3, \Omega_\Lambda=1.9$).
- **Big Rip**: divergenza a $t \approx 35.8\text{ Gyr}$ ($w = -1.5$).

## Frontend
React 18 + Vite + TypeScript. Scene 3D con Three.js (`@react-three/fiber`), grafici con Plotly.js, formule con KaTeX.

Due pagine:
- **Simulatore**: a sinistra parametri (H₀, Ωm, ΩΛ, Ωr, w) e modelli delle lezioni; al centro la scena 3D con tre modalità
  (*Spazio curvo*: la geometria k = +1/0/−1 che si dilata con a(t); *Galassie e orizzonti*: legge di Hubble, raggio di Hubble e
  orizzonte della particella; *Superficie a(t)*: tutte le soluzioni al variare di un parametro); sotto, a(t) con confronto tra modelli
  e Ωi(t) / H(t) / q(t); in basso la linea del tempo con «play».
- Galassie disegnate come modelli 3D procedurali (spirali ed ellittiche): si allontanano con a(t) ma non si espandono.
- **Teoria**: le equazioni delle lezioni, con pulsanti che caricano il modello corrispondente nel simulatore.

Se il backend non è attivo, il frontend calcola tutto nel browser con un integratore RK4 sulla II° equazione di Friedmann
(badge "MOCK" in alto a destra). Solo frontend: `python avvia.py --mock`.
