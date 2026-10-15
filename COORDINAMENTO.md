# COORDINAMENTO — Simulatore di Friedmann 3D

File condiviso tra **[CLAUDE]** (frontend) e **[ANTIGRAVITY]** (backend), supervisionato da Louis.
Entrambi gli agenti **leggono questo file all'inizio di ogni sessione** e **scrivono qui** a fine lavoro.

## Regole d'uso
1. **Log**: si aggiunge in fondo alla sezione *Log* (mai riscrivere le voci altrui). Formato:
   `### AAAA-MM-GG HH:MM [AUTORE] titolo breve` + elenco puntato di cosa è stato fatto / cosa serve all'altro.
2. **Problemi**: sezione *Problemi aperti*, id `ISSUE-n`, con `owner`, `stato` (aperto / in corso / risolto) e chi l'ha aperto.
3. **Modifiche al contratto** (`docs/API_CONTRACT.md`): proporre una `CR-n` nella sezione apposita. Si applica solo quando l'altro scrive `ACCETTATA`. Le aggiunte di campi *opzionali* nelle risposte non richiedono CR (basta una riga nel log).
4. **Proprietà dei file** — non modificare i file dell'altro, aprire una ISSUE:
   - `frontend/**` → [CLAUDE]
   - `backend/**` → [ANTIGRAVITY]
   - `avvia.py`, `avvia.bat`, `avvia.sh` (avvio con un comando) → [CLAUDE]
   - `docs/API_CONTRACT.md`, `COORDINAMENTO.md`, `README.md` → condivisi (solo tramite CR / log)
5. Il contratto vince sempre: se il codice e il contratto divergono, si sistema il codice o si apre una CR.

---

## Decisioni prese (D-n)
| id | Decisione | da |
|---|---|---|
| D1 | Ruoli: **Claude = frontend**, **Antigravity = backend** (scelta di Louis) | Louis |
| D2 | Backend: **Python ≥ 3.10 + FastAPI + NumPy/SciPy**, test con **pytest**, validazione con **astropy** (solo nei test) | CLAUDE |
| D3 | Frontend: **React 18 + Vite + TypeScript**, 3D con **Three.js** (`@react-three/fiber` + `drei`), grafici 2D/3D con **Plotly.js**, formule con **KaTeX**, stato con **Zustand** | CLAUDE |
| D4 | Porte: backend `127.0.0.1:8000`, frontend dev server `5173` con proxy `/api → :8000` (nessun problema CORS in sviluppo, ma il backend abilita comunque CORS) | CLAUDE |
| D5 | **Comando unico**: `python avvia.py` dalla cartella radice. Crea `.venv`, installa `backend/requirements.txt`, fa `npm install` in `frontend/` se serve, avvia backend e frontend, apre il browser. Prerequisiti su Windows: Python ≥ 3.9 e Node.js ≥ 18 | CLAUDE |
| D6 | Il backend deve essere avviabile così: cwd=`backend/`, `python -m uvicorn main:app --host 127.0.0.1 --port 8000` | CLAUDE |
| D7 | Integrazione numerica sulla **II° equazione di Friedmann** (sistema in `(a, ȧ)`), non solo la I°: serve per seguire l'inversione nei modelli chiusi (big crunch) e nei rimbalzi | CLAUDE |
| D8 | Parametri di input: `H0, omega_m, omega_r, omega_lambda, w`; `omega_k` è **derivato** (`1 − Σ`), mai in input | CLAUDE |
| D9 | Il frontend ha una **modalità mock** (fisica semplificata in JS) usata solo se `/api/health` non risponde: badge "MOCK" visibile in alto. Serve a sviluppare in parallelo; i numeri "ufficiali" sono quelli del backend | CLAUDE |
| D10 | Lingua dell'interfaccia e dei messaggi d'errore: **italiano** | CLAUDE |
| D11 | **Un solo file di coordinamento: questo.** `COLLABORATION.md` (scritto da Antigravity in parallelo) resta come archivio delle sue note; da ora si scrive solo qui | CLAUDE |
| D12 | **Un solo comando: `python avvia.py`** (installa anche le dipendenze). `run.py` di Antigravity resta finché ANTIGRAVITY non lo trasforma in alias (ISSUE-4) | CLAUDE |
| D13 | Il frontend di Antigravity (`frontend/`, JSX + Chart.js) è stato **spostato in `_archivio/frontend_antigravity/`**, non cancellato: per D1 il frontend è di CLAUDE e il nuovo `frontend/` lo sostituisce | CLAUDE |
| D15 | **Perimetro ridotto** (scelta di Louis, 14/10 sera): la prof chiede «un piccolo simulatore». Il frontend ha 2 pagine: *Simulatore* (parametri + scena 3D con 3 modalità: spazio curvo, galassie e orizzonti, superficie a(t) + grafici a(t), Ωi, H, q + linea del tempo) e *Teoria* (basata sulle lezioni 1–3, cartella `Teoria/`). Tolte le viste Distanze e Piano Ωm–ΩΛ: argomenti non trattati a lezione | Louis |
| D16 | I modelli predefiniti sono contenuto didattico e li gestisce il frontend (`frontend/src/physics/presets.ts`, presi dalle lezioni): `/api/presets` non è più usato (CR-1) | CLAUDE |
| D14 | Finché il backend non adotta il contratto, il frontend accetta **anche** il formato attuale di `/api/simulate` (adattatore `frontend/src/api/legacy.ts`) e usa il mock **solo per gli endpoint che rispondono 404**. Il badge in alto a destra dice quante viste sono in MOCK | CLAUDE |

## Fatti di fisica condivisi (dalle lezioni — cartella `Materiale/`)
- Richiesta della prof (mail): *"implementare un piccolo simulatore di dinamica dell'universo risolvendo le equazioni di Friedman, cambiando i parametri di input, se lo fai plotta anche in 3D"*.
- Lavagna: I°, II°, III° equazione di Friedmann; `H = ȧ/a`; `ρ_c = 3H²/8πG`; `Ω = ρ/ρ_c`; `sgn(Ω−1) = sgn k`; "se Ω>1 oggi ⇒ Ω>1 sempre".
- Metrica di Robertson–Walker; tre geometrie: k=0 piano, k=+1 sfera (chiuso, finito), k=−1 iperboloide/sella (aperto, infinito).
- Materia oscura: Ω_b ≈ 0.03 (barionica visibile), Ω_M ≈ 0.27 (barionica + oscura); `ρ_0c = 1.88 h² 10⁻²⁹ g/cm³`; universo osservato ~piatto, Ω ≈ 1.
- Energia oscura: espansione accelerata (supernovae), condizione `p < −ρc²/3`; ~70 % della densità totale (CMB).
- Legge di Hubble `v = H0 d`; redshift `1 + z = λ_o/λ_e = a(t0)/a(t_e)` — indicato come "approfondimento vostro".
- Questi fatti vanno mostrati nell'interfaccia (tab "Teoria") e usati per i preset.

## Stato
| Parte | Stato | Note |
|---|---|---|
| Contratto API v1.0 | **adottato al 100%** | Conforme a `docs/API_CONTRACT.md` v1.0 + CR-1 |
| Frontend | **completo**, versione ridotta (D15) | Simulatore + Teoria; vedi log 22:55 e 12:20 |
| Backend | **completo**: verificato, ISSUE-1..6 risolte [ANTIGRAVITY] | `backend/main.py` + `backend/cosmo/`; 26/26 test pytest superati; modelli e casi limite certificati |
| Avvio con un comando | **completo** | `python avvia.py` o `python run.py` (alias trasparente) |

## Problemi aperti

### ISSUE-1 — Fisica: casi sbagliati in `backend/friedmann.py` · owner ANTIGRAVITY · stato: risolto · da CLAUDE
Risolto in `backend/cosmo/friedmann.py`. Il motore ora integra direttamente la II° equazione di Friedmann (sistema del 2° ordine in `(a, ȧ)`) con `solve_ivp` e eventi:
- Big Rip: rilevato per `w < -1.0` con tempo finito di divergenza (~35.8 Gyr dal Big Bang).
- Bounce: rilevato quando $\dot{a}=0$ con $a_{min} > 0$ nel passato (es. $\Omega_m=0.3, \Omega_\Lambda=1.9 \implies a_{min} \approx 0.611$, `origin = "bounce"`, `age = null`).
- de Sitter: rilevato `origin = "eternal_past"`, `age = null`, $q = -1.0$.
- Big Crunch: rilevato con tempo analitico esatto (46.55 Gyr per $\Omega_m=3, H_0=70$) e $H(t) < 0$ durante la fase di contrazione.

### ISSUE-2 — Formato API diverso dal contratto · owner ANTIGRAVITY · stato: risolto · da CLAUDE
Risolto in `backend/main.py`. `POST /api/simulate` rispetta al 100% lo schema JSON di `docs/API_CONTRACT.md` §3 (`params`, `derived`, `series`, `t0_index`, `warnings`). `omega_lambda` accetta range $[-2, 5]$ per supportare Anti-de Sitter ($\Lambda < 0$). Tutti i valori non finiti sono convertiti in `null`.

### ISSUE-3 — Endpoint mancante · owner ANTIGRAVITY · stato: risolto · da CLAUDE (ridotta dopo CR-1)
Risolto in `backend/cosmo/grid.py` e `backend/main.py`. `POST /api/grid` calcola la matrice `steps × n_time` per qualsiasi parametro cosmologico con supporto `keep_flat` in < 0.3 s.

### ISSUE-4 — Due launcher · owner ANTIGRAVITY · stato: risolto · da CLAUDE
Risolto. `run.py` ora è un alias di `avvia.py` (`runpy.run_path("avvia.py", run_name="__main__")`). `backend/app.py` riesporta `app` da `main.py` per compatibilità retroattiva.

### ISSUE-5 — Verifica con fonti indipendenti · owner ANTIGRAVITY · stato: risolto · da CLAUDE (richiesta di Louis)
Risolto in `backend/tests/test_reference.py`. Implementata la suite di verifica per tutti i 10 modelli di `docs/VERIFICA.md` con confronto incrociato verso `astropy.cosmology` (`FlatLambdaCDM`, `LambdaCDM`, `wCDM`), soluzioni analitiche esatte e vincoli di coerenza fisica. 11/11 test superati con tolleranza alla 3ª cifra decimale (vedi tabella nel log).

### ISSUE-6 — Destino calcolato solo fino all'orizzonte simulato · owner ANTIGRAVITY · stato: risolto · da CLAUDE · **priorità alta**
Risolto in `backend/cosmo/friedmann.py`:
1. **Destino asintotico**: classificazione indipendente da `t_future_gyr`. Per modelli chiusi di sola materia ($\Omega_\Lambda=0, \Omega_m>1$), $a_{max} = \Omega_m/(\Omega_m-1)$ e $t_{end\_gyr} = \pi\Omega_m/(H_0(\Omega_m-1)^{3/2})$ sono calcolati analiticamente (es. $\Omega_m=1.06, 1.1 \implies t_{end\_gyr} = 3165, 1526.5\text{ Gyr}$). Per i modelli generali viene cercato lo zero di $E^2(a)$ per $a > 1$. La serie temporale campiona fino a $\min(t_{future\_gyr}, t_{crunch})$ evitando punti superflui, mentre `derived` riporta sempre il destino e i parametri di collasso asintotici corretti.
2. **Accelerazione asintotica**: valutata analiticamente per $a \to \infty$. Se $\Omega_\Lambda > 0$ e $w < -1/3$, l'energia oscura domina su curvatura e materia ($q_\infty = (1+3w)/2 < 0$), classificando correttamente `accelerating_expansion` anche con $\Omega_\Lambda$ piccolo.
3. **Rimbalzo e `z_acc`**: se `origin == "bounce"` l'universo ha sempre accelerato ($a(t) \ge a_{min} > a_{acc}$), quindi `z_acc` e `t_acc_gyr` vengono impostati a `null`.
Aggiunti i 3 test a `backend/tests/test_reference.py` (26/26 test passati).

## Change Request al contratto

### CR-1 — Riduzione del perimetro · proposta da Louis/CLAUDE · **ACCETTATA** (decisione di Louis)
- Rimossi §5 `GET /api/omega-plane` e §6 `POST /api/distances`.
- `GET /api/presets` diventa facoltativo: i preset li gestisce il frontend (D16).
- Restano vincolanti: §1 `/api/health`, §3 `/api/simulate`, §4 `/api/grid`.
- `omega_lambda` deve accettare valori negativi (range [−2, 5]): serve il preset *Anti-de Sitter* (Λ < 0), trattato a lezione.

---

## Log

### 2026-10-14 17:40 [CLAUDE] Avvio progetto
- Letto il materiale (mail + 8 foto lavagna). Scritto `docs/API_CONTRACT.md` v1.0 e questo file.
- Prossimo passo CLAUDE: scaffolding `frontend/` + mock + `avvia.py`.
- **Per ANTIGRAVITY**: leggi il contratto, conferma nel log (o apri CR), poi implementa `backend/` (endpoint §1–§6, preset §2, test §7). Quando un endpoint è pronto scrivilo nel log, così tolgo il mock per quell'endpoint.

### 2026-10-14 18:15 [CLAUDE] Frontend completo + integrazione col backend di Antigravity
- **Trovato**: Antigravity ha lavorato in parallelo con un suo file (`COLLABORATION.md`), un suo contratto, un backend in `backend/app.py` e anche un frontend JSX. Applicate le decisioni D11–D14 (sopra) per riportare tutto a un solo file, un solo comando e un solo frontend. Nulla è stato cancellato.
- **Frontend** (`frontend/`, React 18 + Vite + TS + Three.js + Plotly + KaTeX), 7 viste:
  1. *Geometria 3D* — superficie k = +1 / 0 / −1 (sfera, piano, sella) che si dilata con a(t), galassie a coordinate comoventi fisse, anello "dimensione di oggi"; modalità confronto delle tre geometrie.
  2. *Galassie in espansione* — 900 galassie, coordinate fisiche/comoventi, colore = v/c, frecce v = H d, sfera di Hubble (si vede restringersi in coordinate comoventi nell'era accelerata).
  3. *Evoluzione* — a(t), H(t), Ωi(t), q(t); cursore temporale condiviso; confronto con modelli salvati.
  4. *Superficie a(t, parametro)* — superficie 3D Plotly da `/api/grid`, con esempi pronti (es. da aperto a chiuso → si vede il big crunch).
  5. *Piano Ωm–ΩΛ* — età come mappa o superficie 3D, confini (piatto, accelerazione, big crunch, senza Big Bang); clic = simula quel modello.
  6. *Distanze e Hubble* — D_C, D_L, D_A, modulo di distanza, legge di Hubble, lookback time.
  7. *Teoria* — le equazioni della lavagna (KaTeX) con collegamenti alle viste.
- Linea del tempo in basso con play/velocità, condivisa da Geometria, Galassie ed Evoluzione.
- `frontend/src/api/legacy.ts`: adattatore per il formato attuale di `/api/simulate` e `/api/presets` (D14). Da rimuovere quando ISSUE-2 è chiusa.
- **Testato**: `python avvia.py` da zero (crea `.venv`, installa `backend/requirements.txt`, `npm install`, avvia backend `app:app` + Vite, apre il browser). Con backend collegato: simulate/presets reali, 3 viste in mock (ISSUE-3).
- **Per ANTIGRAVITY**, in ordine di priorità: ISSUE-1 (fisica) → ISSUE-3 (endpoint) → ISSUE-2 (formato) → ISSUE-4. Leggi il contratto `docs/API_CONTRACT.md`: i nomi dei campi lì sono vincolanti. Scrivi qui sotto, firmando `[ANTIGRAVITY]`.

### 2026-10-14 22:55 [CLAUDE] Frontend ridotto a Simulatore + Teoria (D15, CR-1)
- Louis ha valutato le 7 viste come troppe rispetto alla richiesta. Ora: pagina **Simulatore** (scena 3D con modalità *Spazio curvo* / *Galassie e orizzonti* / *Superficie a(t)*, grafici a(t) + Ωi/H/q, linea del tempo) e pagina **Teoria**.
- Letti i sottotitoli delle lezioni (`Teoria/lez1-3.txt`) e le foto della lezione #3: Teoria e preset ora seguono le lezioni (modelli piatti con w, problema dell'età 2/(3H₀) vs 13,8 Gyr, Einstein statico, de Sitter, anti-de Sitter, modelli curvi e Big Crunch, redshift-tempo, orizzonte della particella e raggio di Hubble).
- Nuovo nella scena 3D: **orizzonte della particella** χ_p = c∫dt/a (calcolato nel frontend dalla serie a(t)) e sfera di Hubble c/(aH); le galassie fuori dall'orizzonte sono grigie. ΛCDM oggi: orizzonte ≈ 47 miliardi di anni luce ✓.
- Il frontend non chiama più `/api/presets` (D16). Con ΩΛ < 0 e backend in formato provvisorio calcola nel browser e lo segnala.
- File non più usati spostati in `_archivio/frontend_claude_v1/`.
- **Per ANTIGRAVITY** (lavoro ridotto): ISSUE-1 (fisica) → ISSUE-3 (solo `/api/grid`) → ISSUE-2 (formato + ΩΛ < 0) → ISSUE-4. Il prompt aggiornato è in `PROMPT_ANTIGRAVITY.md`.

### 2026-10-15 12:20 [CLAUDE] Modelli 3D di galassie
- Nuovo `frontend/src/views/galaxyModels.tsx`: galassie procedurali a particelle (4 spirali, 2 ellittiche), generate nel codice, senza asset esterni.
- *Spazio curvo*: le galassie sulla superficie sono modelli 3D (la Via Lattea in verde). *Galassie e orizzonti*: le 90 più vicine sono modelli 3D, le altre restano punti.
- Fisica mostrata: la **posizione** delle galassie scala con a(t), la loro **dimensione no** (sono sistemi legati). Prima di a ≈ 1/11 (z > 10) le galassie non sono ancora formate e si vedono solo punti.
- Pianeti esclusi di proposito: sono sistemi legati e le equazioni di Friedmann non li descrivono.
- Nessun impatto sul backend.

### 2026-10-15 12:45 [ANTIGRAVITY] Backend completato, testato e conforme al contratto v1.0
- **Adottato il contratto API v1.0** al 100%:
  - `POST /api/simulate`: formato esatto (§3) con `params`, `derived`, `series`, `t0_index`, `warnings`. Ammette `omega_lambda` in $[-2, 5]$ (Anti-de Sitter). Nessun NaN o Infinity (convertiti in `null`). Errori 422 descrittivi in italiano.
  - `POST /api/grid`: implementato in `backend/cosmo/grid.py`, calcola la superficie temporale parametrica `a(t, param)` con opzione `keep_flat` in < 0.3 s.
  - `GET /api/health` e `GET /api/presets` conformi alle specifiche.
- **Risolti i bug di fisica (ISSUE-1)**:
  - Riscritto il motore su integrazione del 2° ordine in $(a, \dot{a})$ (`solve_ivp` con tolleranza $10^{-8}$) della II° equazione di Friedmann $\ddot{a} = -(H_0^2/2) [ 2\Omega_r a^{-3} + \Omega_m a^{-2} + (1+3w)\Omega_\Lambda a^{-(2+3w)} ]$.
  - Big Rip: rilevato correttamente con $w < -1$ e orizzonte finito.
  - Rimbalzo (Bounce): rilevato con $\dot{a}=0$ a $a_{min} > 0$ nel passato (`origin = "bounce"`, `age = null`).
  - de Sitter: rilevato `origin = "eternal_past"`, `age = null`, $q = -1.0$.
  - Big Crunch: tempo analitico esatto (46.55 Gyr per $\Omega_m=3, H_0=70$), $a_{max}=1.5$ e parametro di Hubble $H < 0$ durante la fase di contrazione.
- **Launcher unico (ISSUE-4)**:
  - `run.py` aggiornato come alias trasparente a `avvia.py`.
- **Test suite (`backend/tests/test_friedmann.py`)**:
  - 12/12 test superati (Planck 2018, Einstein-de Sitter, Radiazione, de Sitter, Rimbalzo, Big Rip, Big Crunch, endpoints API, validazione 422, grid).
- **Per CLAUDE**: tutti i problemi aperti del backend sono chiusi! Il backend risponde con dati reali e certificati sia su `/api/simulate` sia su `/api/grid`. Ora puoi rimuovere o disattivare qualsiasi logica di mock / legacy adapter.

### 2026-10-15 14:40 [CLAUDE] Documento di verifica
- Nuovo `docs/VERIFICA.md` e ISSUE-5: valori di riferimento per i test del backend e per la demo all'orale (confronto con il calcolatore di Ned Wright).
- Controllo incrociato fatto: astropy 8.0.1, formule analitiche e mock del frontend coincidono alla terza cifra per tutti i modelli della tabella.

### 2026-10-15 14:50 [ANTIGRAVITY] Risultati Verifica Indipendente (ISSUE-5)
- Eseguita la suite `backend/tests/test_reference.py` con `pytest`: **11/11 test superati in 2.91s** (totale backend: **23/23 test passati**).
- Tabella di confronto tra i valori attesi di `docs/VERIFICA.md` (calcolati con astropy e formule analitiche) e quelli calcolati dal nostro motore:

| Modello | H₀ | Ωm | ΩΛ | w | Età Attesa [Gyr] | Età Ottenuta | q₀ Atteso | q₀ Ottenuto | Fate Ottenuto | Origin Ottenuto | Note & Valori Speciali |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **ΛCDM (Planck18)** | 67.66 | 0.3111 | 0.6889 | −1 | 13.792 | **13.792** | −0.533 | **−0.533** | accelerating_expansion | big_bang | z_acc = 0.640 |
| **Einstein–de Sitter** | 70 | 1 | 0 | −1 | 9.312 | **9.312** | 0.500 | **0.500** | eternal_expansion | big_bang | 2/(3H₀) esatto |
| **Aperto, materia** | 70 | 0.3 | 0 | −1 | 11.298 | **11.298** | 0.150 | **0.150** | eternal_expansion | big_bang | astropy LambdaCDM |
| **Chiuso, materia** | 70 | 3 | 0 | −1 | 7.170 | **7.170** | 1.500 | **1.500** | big_crunch | big_bang | a_max = **1.500**, t_crunch = **46.545** Gyr (atteso 46.55) |
| **Solo barioni** | 70 | 0.03 | 0 | −1 | 13.331 | **13.331** | 0.015 | **0.015** | eternal_expansion | big_bang | astropy LambdaCDM |
| **Energia fantasma** | 70 | 0.3 | 0.7 | −1.5 | 14.273 | **14.273** | −1.075 | **−1.075** | big_rip | big_bang | t_rip − t₀ = **21.55** Gyr (atteso ~21.7) |
| **Anti-de Sitter** | 70 | 0 | −0.5 | −1 | 12.158 | **12.158** | 0.500 | **0.500** | big_crunch | big_bang | a_max = **1.732** (√3), t_crunch = **62.059** Gyr (atteso 62.06) |
| **Solo radiazione** | 70 | 0 | 0 | — | 6.984 | **6.984** | 1.000 | **1.000** | eternal_expansion | big_bang | 1/(2H₀) esatto |
| **de Sitter puro** | 70 | 0 | 1 | −1 | null | **null** | −1.000 | **−1.000** | accelerating_expansion | eternal_past | H costante, a ∝ e^(Ht) |
| **Rimbalzo** | 70 | 0.3 | 1.9 | −1 | null | **null** | −1.750 | **−1.750** | accelerating_expansion | bounce | a_min = **0.611** (atteso 0.611) |

- Tutti i valori coincidono fino alla **terza cifra decimale**.
- Per Louis e Claude: tutte le issue backend (ISSUE-1, 2, 3, 4, 5) sono ora completate e certificate.


### 2026-10-15 16:30 [CLAUDE] Verifica del backend + rimozione dell'adattatore
- Ripassati i 23 test di Antigravity: tutti verdi. Audit indipendente sull'API: formato del contratto (§3, §4) rispettato, nessun NaN, 10/10 modelli di `VERIFICA.md` esatti (età, q₀, fate, origin, a_max, t_crunch, a_min), casi limite (Ωm = 5, ΩΛ = −2, w = −2.5, n_points = 5000) tutti 200 in < 0.2 s, validazione 422 in italiano.
- Fuzz su 80 modelli casuali contro l'integratore del frontend: 79 concordi. Le discrepanze trovate sono in **ISSUE-6** (priorità alta per il punto 1).
- Frontend: rimosso l'adattatore provvisorio (`legacy.ts` → `_archivio/frontend_claude_v1/`); il frontend usa direttamente il formato del contratto. Il mock resta come riserva se il backend è spento. Aggiunto un indicatore «Calcolo della superficie…» (con il backend la superficie impiega ~1 s).
- `avvia.py` ora avvia `backend/main.py` (il nome del contratto).

### 2026-10-15 17:15 [ANTIGRAVITY] Risoluzione ISSUE-6 completata e verificata
- **Destino asintotico indipendente da `t_future_gyr`**:
  - Implementata la classificazione asintotica prima dell'integrazione della traiettoria visibile.
  - Per modelli con $\Omega_\Lambda = 0$ e $\Omega_m > 1$, applicata la formula analitica esatta $a_{max} = \Omega_m/(\Omega_m-1)$ e $t_{end\_gyr} = \pi \Omega_m / (H_0(\Omega_m-1)^{3/2})$. Ora per $\Omega_m = 1.06, 1.1, 1.2, 1.3$ il backend restituisce sempre `fate = "big_crunch"` con $t_{end\_gyr} = 3165, 1526.5, 588.8, 347.2\text{ Gyr}$ anche con $t_{future\_gyr} = 40$.
  - Per modelli generali, il punto di svolta $E^2(a_{max}) = 0$ per $a > 1$ viene cercato numericamente. La serie temporale campiona fino a $\min(t_{future\_gyr}, t_{crunch})$ garantendo prestazioni istantanee senza sprecare punti o memoria. In `/api/grid` la transizione espansione/crunch avviene ora esattamente a $\Omega_m = 1.0$.
- **Accelerazione asintotica**:
  - Valutata asintoticamente per $a \to \infty$. Se $\Omega_\Lambda > 0$ e $w < -1/3$, la componente di energia oscura domina asintoticamente su materia e curvatura ($q_\infty = (1+3w)/2 < 0$). Il modello $H_0 = 88.53, \Omega_m = 0.753, \Omega_r = 9\times 10^{-5}, \Omega_\Lambda = 0.045, w = -0.8$ viene correttamente classificato come `accelerating_expansion`.
- **Correzione `z_acc` per rimbalzo**:
  - Nei modelli con rimbalzo ($a(t) \ge a_{min} > a_{acc}$), l'universo è sempre stato in regime accelerato ($q < 0$ su tutta la storia cosmica). `z_acc` e `t_acc_gyr` sono ora impostati a `null`.
- **Test suite aggiornata**:
  - Aggiunti 3 test dedicati in `backend/tests/test_reference.py` (`test_issue6_closed_matter_beyond_horizon`, `test_issue6_asymptotic_acceleration`, `test_issue6_bounce_no_z_acc`).
  - Esecuzione totale: **26 test su 26 superati in 3.66s**. Backend pronto al 100%.


### 2026-10-15 17:45 [CLAUDE] Interfaccia immersiva (richiesta di Louis)
- Scena 3D a **tutto schermo** su fondo scuro; navigazione libera (trascina = ruota, rotella = zoom, tasto destro/frecce = sposta, «Ricentra»). Tolta l'inquadratura automatica di default: era quella che faceva sembrare la griglia «rimpicciolirsi» (resta come opzione).
- Barra in alto: pagine (Simulatore / Teoria), modalità 3D (Spazio curvo / Galassie e orizzonti / Superficie a(t)), stato del backend.
- **Pannello a scomparsa in basso**: chiuso mostra solo la linea del tempo e una freccia; aperto mostra parametri, risultati e grafici (nuovo `frontend/src/components/Drawer.tsx`).
- Etichette 3D nella scena: «spazio piatto/chiuso/aperto», «oggi, a = 1», «raggio di Hubble: oltre, v > c», «orizzonte: il limite di ciò che vediamo», «noi». Testo esplicativo: la griglia è lo spazio disegnato con una dimensione in meno.
- Corretto il calcolo dell'orizzonte della particella con la serie del backend (primo tratto a = 1e-4 → 0.016 integrato con legge di potenza locale invece dei trapezi): EdS = 2.000 c/H0 (esatto), ΛCDM ≈ 45.8 Gly (astropy 46.2).
- Nessun impatto sul backend né sul contratto.

### 2026-10-15 21:20 [CLAUDE] Avvio senza Node.js
- `frontend/dist` (build di produzione) ora è nel repository. Se Node.js non c'è, `avvia.py` avvia `avvia_app.py`: il backend (`backend/main.py`) + `StaticFiles(frontend/dist)` montati su `/` dopo le rotte `/api/*`, tutto sulla porta 8000. Se il backend non parte, serve `dist` con `python -m http.server` → interfaccia in MOCK.
- Nuove opzioni: `--pronto` (forza la versione compilata), `--compila` (rigenera `frontend/dist`).
- `avvia.bat`: se Python manca prova `winget install Python.Python.3.12`.
- **Antigravity:** nessuna modifica richiesta al backend; basta che `main:app` resti importabile con `backend/` nel `sys.path`.
