# Contratto API — Simulatore di Friedmann

> Versione contratto: **1.0** (2026-10-14) — scritto da [CLAUDE], da confermare da [ANTIGRAVITY].
> Qualsiasi modifica passa da una **Change Request (CR-n)** in `COORDINAMENTO.md`.
> **CR-1 (accettata, 14/10):** §5 e §6 rimossi; `/api/presets` facoltativo (i preset li gestisce il frontend); `omega_lambda` deve accettare valori negativi.
> Il backend può aggiungere campi extra nelle risposte; **non** può rinominare o rimuovere quelli elencati qui.

## 0. Convenzioni generali

| Voce | Valore |
|---|---|
| Base URL backend | `http://127.0.0.1:8000` |
| Prefisso | tutte le rotte sotto `/api` |
| Formato | JSON, UTF-8, chiavi in `snake_case` |
| CORS | consentire `http://localhost:5173` e `http://127.0.0.1:5173` |
| Avvio backend | cwd = `backend/`, comando `python -m uvicorn main:app --host 127.0.0.1 --port 8000` → il file `backend/main.py` deve esporre `app` (FastAPI) |
| Dipendenze | `backend/requirements.txt` (pip). Python ≥ 3.10 |
| Errori | input non valido → HTTP 422 `{ "detail": "<messaggio leggibile in italiano>" }` |
| Numeri non finiti | **mai** `NaN`/`Infinity` nel JSON: usare `null` |

### Unità
- Tempo: **Gyr** (miliardi di anni). Distanze: **Mpc**. `H` e `H0`: **km/s/Mpc**.
- Densità: `rho_crit_0_g_cm3` in g/cm³; tutte le altre densità in **unità di ρ_c,0** (densità critica di oggi).
- `a(t0) = 1` (oggi). `z = 1/a − 1` (negativo nel futuro).
- `t_gyr` = tempo dal Big Bang. `t_rel_gyr` = tempo relativo a oggi (`t − t0`, oggi = 0, passato negativo).

### Fisica (fatti condivisi, dalle lezioni)
- I° Friedmann: `H² = (8πG/3)ρ − kc²/a²` → in forma adimensionale
  `E²(a) = H²/H0² = Ω_r a⁻⁴ + Ω_m a⁻³ + Ω_k a⁻² + Ω_de · a^(−3(1+w))`
- `Ω_k = 1 − Ω_m − Ω_r − Ω_Λ` (vincolo dalla I° a t0). `sgn(k) = −sgn(Ω_k) = sgn(Ω_tot − 1)`.
- II° Friedmann (accelerazione): `ä/a = −(4πG/3)(ρ + 3p/c²)` →
  `ä = −(H0²/2) · Σ_i Ω_i (1 + 3w_i) · a^(1 − 3(1+w_i))` con `w_r = 1/3`, `w_m = 0`, `w_de = w` (la curvatura non entra).
- III° (continuità) con `p = wρc²` ⇒ `ρ ∝ a^(−3(1+w))`.
- `ρ_c(t) = 3H²/(8πG)`; `ρ_c,0 = 1.8785e-29 h² g/cm³`, `h = H0/100`.
- Parametro di decelerazione `q = −ä a / ȧ²`. Accelera ⇔ `q < 0` ⇔ `ρ + 3p/c² < 0`.
- **Importante:** integrando solo la I° (`ȧ = H0 a E(a)`) la soluzione si blocca dove `ȧ = 0` (universo chiuso che ricollassa, o rimbalzo senza Big Bang). Usare la **II°** (sistema del 2° ordine in `(a, ȧ)`) oppure gestire esplicitamente l'inversione.
- Nome del parametro in input: `omega_lambda` è la densità di energia oscura oggi; con `w = −1` è la costante cosmologica Λ.

### Futuro dell'universo — `fate` (enum stringa)
| Valore | Condizione |
|---|---|
| `"big_crunch"` | nel futuro `ȧ` si annulla e `a → 0` |
| `"big_rip"` | `w < −1`, `Ω_de > 0`: `a → ∞` in tempo finito |
| `"accelerating_expansion"` | espansione eterna con `q → q∞ < 0` |
| `"eternal_expansion"` | espansione eterna con `q ≥ 0` asintoticamente (es. aperto di sola materia, EdS) |
| `"static"` | caso degenere (universo statico di Einstein, entro tolleranza) |

### Passato dell'universo — `origin` (enum stringa)
| Valore | Condizione |
|---|---|
| `"big_bang"` | andando indietro `a → 0` in tempo finito → l'età è definita |
| `"bounce"` | andando indietro `ȧ` si annulla con `a = a_min > 0` (rimbalzo, nessuna singolarità) → età `null` |
| `"eternal_past"` | `a → 0` solo per `t → −∞` (es. de Sitter puro) → età `null` |

---

## 1. `GET /api/health`
```json
{ "status": "ok", "version": "1.0.0" }
```

## 2. `GET /api/presets` — FACOLTATIVO dopo CR-1 (il frontend non lo usa)
Modelli predefiniti (minimo questi id, l'ordine è quello di visualizzazione):
```json
[
  { "id": "planck18", "name": "ΛCDM (Planck 2018)", "description": "Modello standard: materia + costante cosmologica, piatto",
    "params": { "H0": 67.66, "omega_m": 0.3111, "omega_r": 9.0e-5, "omega_lambda": 0.6889, "w": -1.0 } }
]
```
Preset richiesti (`id` → parametri indicativi):
- `planck18` → H0 67.66, Ωm 0.3111, Ωr 9e-5, ΩΛ 0.6889, w −1
- `einstein_de_sitter` → H0 70, Ωm 1, Ωr 0, ΩΛ 0 (piatto, sola materia, a ∝ t^(2/3))
- `open_matter` → H0 70, Ωm 0.3, ΩΛ 0 (aperto, k = −1)
- `closed_matter` → H0 70, Ωm 3, ΩΛ 0 (chiuso, big crunch)
- `de_sitter` → H0 70, Ωm 0, ΩΛ 1 (esponenziale)
- `radiation` → H0 70, Ωr 1 (a ∝ t^(1/2))
- `phantom` → H0 70, Ωm 0.3, ΩΛ 0.7, w −1.5 (big rip)
- `bounce` → H0 70, Ωm 0.3, ΩΛ 1.9 (no big bang / rimbalzo)
- `only_baryons` → H0 70, Ωm 0.03, ΩΛ 0 (sola materia barionica visibile, dalla lezione sulla materia oscura)

## 3. `POST /api/simulate`
### Richiesta
```json
{
  "H0": 67.66,          // km/s/Mpc        range [20, 150]
  "omega_m": 0.3111,    //                 range [0, 5]
  "omega_r": 9.0e-5,    //                 range [0, 2]
  "omega_lambda": 0.6889,//                range [-2, 5]
  "w": -1.0,            // eq. di stato DE range [-2.5, 0]
  "t_future_gyr": 40,   // orizzonte futuro (oltre oggi) range [1, 500], default 40
  "n_points": 600       // campioni restituiti range [50, 5000], default 600
}
```
Tutti i campi tranne `H0, omega_m, omega_lambda` sono opzionali (default `omega_r = 0`, `w = -1`).

### Risposta
```json
{
  "params": { "H0": 67.66, "omega_m": 0.3111, "omega_r": 9e-5, "omega_lambda": 0.6889, "w": -1.0, "omega_k": 0.0 },
  "derived": {
    "omega_k": 0.0,
    "omega_total": 1.0,
    "k_sign": 0,                    // -1, 0, +1  (|Ω_k| < 1e-4 → 0)
    "geometry": "flat",             // "open" | "flat" | "closed"
    "h": 0.6766,
    "hubble_time_gyr": 14.45,       // 1/H0
    "hubble_radius_mpc": 4431.0,    // c/H0
    "rho_crit_0_g_cm3": 8.6e-30,
    "age_gyr": 13.79,               // null se origin != "big_bang"
    "q0": -0.53,
    "accelerating_now": true,
    "fate": "accelerating_expansion",
    "origin": "big_bang",
    "t_end_gyr": null,              // tempo (dal BB) del big crunch / big rip, altrimenti null
    "a_max": null,                  // a massimo se ricollassa, altrimenti null
    "t_turnaround_gyr": null,       // tempo di a_max se ricollassa
    "z_eq": 3400.0,                 // equivalenza materia-radiazione (null se Ω_r = 0 o Ω_m = 0)
    "z_acc": 0.63,                  // redshift di inizio accelerazione (null se mai)
    "t_acc_gyr": 7.7,               // null se mai
    "a_min": null                   // a minimo se origin == "bounce", altrimenti null
  },
  "series": {
    "t_gyr":      [ ... ],          // dal Big Bang (se origin != "big_bang": uguale a t_rel_gyr)
    "t_rel_gyr":  [ ... ],          // t - t0
    "a":          [ ... ],
    "adot":       [ ... ],          // da/dt in 1/Gyr
    "H":          [ ... ],          // km/s/Mpc (può essere negativo in contrazione)
    "z":          [ ... ],
    "q":          [ ... ],
    "omega_m":    [ ... ],          // Ω_i(t) = ρ_i / ρ_c(t)
    "omega_r":    [ ... ],
    "omega_lambda":[ ... ],
    "omega_k":    [ ... ],          // -kc²/(a²H²)
    "rho_total":  [ ... ]           // ρ_tot / ρ_c,0
  },
  "t0_index": 412,                  // indice del campione più vicino ad a = 1
  "warnings": []
}
```
Regole sulle serie:
- Tutti gli array hanno **la stessa lunghezza = n_points**, ordinati per tempo crescente.
- Campionamento: inizio a `a ≈ 1e-4` (o al rimbalzo `a_min`), fine a `t0 + t_future_gyr` oppure al crunch/rip (prima della divergenza: troncare a `a ≤ 1e3`).
- **Strategia di campionamento**: metà dei punti uniformi in `t`, metà uniformi in `log a` sul ramo passato, fusi e ordinati (così si vede sia l'inizio sia l'evoluzione tarda). Se più semplice: uniformi in `t` è accettato.
- Durante la contrazione `omega_*` possono valere `null` se `H = 0` esattamente.

## 4. `POST /api/grid` — superficie 3D a(t, parametro)
### Richiesta
```json
{
  "base": { "H0": 70, "omega_m": 0.3, "omega_r": 0, "omega_lambda": 0.7, "w": -1 },
  "sweep": { "param": "omega_m", "min": 0.0, "max": 3.0, "steps": 40 },   // param ∈ omega_m | omega_lambda | omega_r | w | H0 ; steps ∈ [5, 80]
  "t_rel_min_gyr": -15,
  "t_rel_max_gyr": 40,
  "n_time": 160,                     // [20, 400]
  "keep_flat": false                  // se true: per ogni valore ricalcola omega_lambda = 1 - omega_m - omega_r (universo piatto)
}
```
### Risposta
```json
{
  "param": "omega_m",
  "param_values": [ ... ],           // lunghezza steps
  "t_rel_gyr": [ ... ],              // griglia temporale comune, lunghezza n_time
  "a": [ [ ... ], ... ],             // matrice steps × n_time, null dove non definito (prima del BB / dopo il crunch)
  "fate": [ "big_crunch", ... ],     // lunghezza steps
  "origin": [ "big_bang", ... ],     // lunghezza steps
  "age_gyr": [ ... ]                 // lunghezza steps, null se origin != "big_bang"
}
```

## 5. ~~`GET /api/omega-plane`~~ — RIMOSSO (CR-1), non implementare
Query: `om_min=0&om_max=3&ol_min=-1.5&ol_max=3&n=60&H0=70&w=-1` (n ∈ [10, 120], default 60).
### Risposta
```json
{
  "omega_m": [ ... ],                 // lunghezza n (asse x)
  "omega_lambda": [ ... ],            // lunghezza n (asse y)
  "age_gyr": [ [ ... ] ],             // matrice [i_lambda][i_m]  (righe = omega_lambda!) null se origin != big_bang
  "q0": [ [ ... ] ],                  // stessa forma
  "fate": [ [ "..." ] ],              // stessa forma
  "origin": [ [ "..." ] ],            // stessa forma
  "boundaries": {                     // polilinee [[om, ol], ...]
    "flat":        [ [0, 1], [3, -2] ],        // Ω_m + Ω_Λ = 1
    "accel_now":   [ [0, 0], [3, 1.5] ],       // Ω_Λ = Ω_m/2 (w=-1, Ω_r=0)
    "recollapse":  [ ... ],                     // confine espande per sempre / ricollassa
    "no_big_bang": [ ... ]                      // confine rimbalzo
  }
}
```
Convenzione matrice: `age_gyr[j][i]` ↔ `omega_lambda[j]`, `omega_m[i]` (stessa convenzione di Plotly `z[y][x]`).

## 6. ~~`POST /api/distances`~~ — RIMOSSO (CR-1), non implementare
### Richiesta
```json
{ "H0": 70, "omega_m": 0.3, "omega_r": 0, "omega_lambda": 0.7, "w": -1, "z_max": 5, "n": 200 }
```
`z_max` ∈ (0, 1100], `n` ∈ [10, 2000]. Campionamento in `z` lineare da 0 a z_max (incluso 0).
### Risposta
```json
{
  "z": [ ... ],
  "comoving_distance_mpc": [ ... ],      // D_C = c ∫ dz/H
  "transverse_comoving_mpc": [ ... ],    // D_M (sin/sinh per k ≠ 0)
  "luminosity_distance_mpc": [ ... ],    // D_L = (1+z) D_M
  "angular_diameter_distance_mpc": [ ... ], // D_A = D_M/(1+z)
  "lookback_time_gyr": [ ... ],
  "distance_modulus": [ ... ],           // μ = 5 log10(D_L/10pc); null a z=0
  "hubble_law_velocity_kms": [ ... ]     // v = H0 · D_C  (legge di Hubble lineare, per confronto)
}
```
Se per quei parametri non c'è Big Bang (origin != big_bang) o la luce non arriva da quel z (es. z oltre il rimbalzo) → valori `null` e un campo `"warnings": [..]`.

---

## 7. Valori di riferimento per i test (backend)
| Modello | Atteso |
|---|---|
| planck18 | età 13.79 ± 0.05 Gyr, q0 ≈ −0.53, z_acc ≈ 0.63 |
| einstein_de_sitter H0=70 | età = (2/3)/H0 = 9.31 Gyr, q = 0.5 costante |
| radiation H0=70 | età = (1/2)/H0 = 6.98 Gyr |
| de_sitter | origin `eternal_past`, età `null`, fate `accelerating_expansion`, q = −1 |
| bounce (Ωm 0.3, ΩΛ 1.9) | origin `bounce`, `a_min` > 0, età `null` |
| phantom (w = −1.5) | fate `big_rip`, `t_end_gyr` finito |
| closed_matter Ωm=3, H0=70 | fate big_crunch, a_max = Ωm/(Ωm−1) = 1.5 |
| D_L planck18 z=1 | ≈ 6790 Mpc (verificabile con astropy) |
