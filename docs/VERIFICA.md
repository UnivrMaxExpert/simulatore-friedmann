# Verifica dei risultati del backend

> Per **[ANTIGRAVITY]**. Scritto da [CLAUDE] il 15/10, su richiesta di Louis.
> Scopo: dimostrare (nei test e all'orale) che i numeri del simulatore sono giusti, confrontandoli con fonti indipendenti.
> Non copiare codice da altri progetti: usarli **solo come riferimento per verificare**, citandoli.

## 1. Fonti di confronto

| Fonte | Cosa fornisce | Come usarla |
|---|---|---|
| `astropy.cosmology` (`FlatLambdaCDM`, `LambdaCDM`, `wCDM`) | età, distanze, lookback time per modelli con Λ, curvatura e w costante | nei test pytest (vedi §3). Usare `Tcmb0=0` per avere Ωr = 0 |
| Calcolatore cosmologico di Ned Wright — https://ned.ipac.caltech.edu/help/cosmology_calc.html (articolo: Wright 2006, PASP 118, 1711, https://ar5iv.labs.arxiv.org/html/astro-ph/0609593) | età, D_L, D_A, lookback time | verifica manuale per la demo all'orale: stessi H₀, Ωm, ΩΛ → confrontare l'età |
| Soluzioni analitiche (lezione #3 e sotto) | casi esatti: EdS, radiazione, de Sitter, chiuso, anti-de Sitter | test esatti senza dipendenze |
| Integratore RK4 del frontend (`frontend/src/physics/mock.ts`) | tutti i casi, incluse le classificazioni `fate` / `origin` | terzo confronto indipendente; i valori sono nella colonna «mock» qui sotto |

## 2. Valori di riferimento (Ωr = 0, salvo dove indicato)

Calcolati il 15/10 con astropy 8.0.1 e confrontati con il mock del frontend e con le formule analitiche: **coincidono alla terza cifra decimale**.

| Modello | H₀ | Ωm | ΩΛ | w | età t₀ [Gyr] | q₀ | D_L(z=1) [Mpc] | lookback(z=1) [Gyr] | fate | origin | altro |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ΛCDM (Planck18) | 67.66 | 0.3111 | 0.6889 | −1 | **13.792** | −0.533 | 6792 | 7.936 | accelerating_expansion | big_bang | z_acc ≈ 0.64 |
| Einstein–de Sitter | 70 | 1 | 0 | −1 | **9.312** = 2/(3H₀) | 0.500 | 5018 | 6.020 | eternal_expansion | big_bang | |
| Aperto, solo materia | 70 | 0.3 | 0 | −1 | **11.298** | 0.150 | 5872 | 6.625 | eternal_expansion | big_bang | |
| Chiuso, solo materia | 70 | 3 | 0 | −1 | **7.170** | 1.500 | 3807 | 5.035 | big_crunch | big_bang | a_max = Ωm/(Ωm−1) = **1.5**; t_crunch = πΩm/(H₀(Ωm−1)^{3/2}) = **46.55** Gyr dal Big Bang |
| Solo barioni | 70 | 0.03 | 0 | −1 | **13.331** | 0.015 | 6361 | 6.944 | eternal_expansion | big_bang | |
| Energia fantasma | 70 | 0.3 | 0.7 | −1.5 | **14.273** | −1.075 | 7167 | 8.336 | big_rip | big_bang | t_rip − t₀ ≈ 21.7 Gyr (formula approssimata di Caldwell et al. 2003: 2/(3\|1+w\|H₀√(1−Ωm)) ≈ 22.2) |
| Anti-de Sitter | 70 | 0 | −0.5 | −1 | **12.158** | 0.500 | — | 6.373 | big_crunch | big_bang | esatto: a = √3·sin(√0.5·H₀t) → a_max = √3 = **1.732**, t_crunch = π/(√0.5·H₀) = **62.06** Gyr |
| Solo radiazione (Ωr = 1) | 70 | 0 | 0 | — | **6.984** = 1/(2H₀) | 1.000 | | | eternal_expansion | big_bang | a ∝ t^{1/2} |
| de Sitter | 70 | 0 | 1 | −1 | **null** | −1.000 | | | accelerating_expansion | **eternal_past** | H costante, a ∝ e^{H₀t} |
| Rimbalzo | 70 | 0.3 | 1.9 | −1 | **null** | −1.750 | | | accelerating_expansion | **bounce** | a_min ≈ **0.611** |

Conversione usata: 1 km/s/Mpc = 1.0227×10⁻³ Gyr⁻¹ → 1/H₀ = 13.968 Gyr per H₀ = 70.
Con Ωr = 9×10⁻⁵ (preset Planck18 del frontend) l'età di ΛCDM cambia di meno di 0.01 Gyr.

## 3. Test da scrivere (`backend/tests/test_reference.py`)

1. **Età**: per ogni riga con età finita, `abs(age - atteso) < 0.01` Gyr; per gli stessi parametri confronto diretto con astropy (`rtol=1e-3`).
2. **Classificazione**: `fate` e `origin` come nella tabella (sono i casi di ISSUE-1).
3. **Casi analitici**: EdS → q(t) = 0.5 costante; chiuso → `a_max` e `t_end_gyr` entro 0.5 %; anti-de Sitter → `a_max = √3`, `t_end_gyr = 62.06` entro 0.5 %.
4. **Distanze**: se e quando servono (oggi il contratto non le chiede più, CR-1), D_L(z=1) di ΛCDM = 6792 Mpc entro 1e-3.
5. **Coerenza**: `series.a[t0_index] ≈ 1`, H(t₀) = H₀, H < 0 dopo l'inversione nei modelli che ricollassano, nessun NaN/Infinity nel JSON.

## 4. Verifica manuale per l'orale (Louis)

Sul calcolatore di Wright inserire H₀ = 67.66, Ωm = 0.3111, «flat» → età ≈ 13.8 Gyr; nel simulatore lo stesso modello dà 13.79 Gyr.
Ripetere con H₀ = 70, Ωm = 1, ΩΛ = 0 → 9.31 Gyr: il «problema dell'età» della lezione #3.

Quando hai finito, scrivi nel log di `COORDINAMENTO.md` (firmando `[ANTIGRAVITY]`) l'esito dei test, con una tabella «atteso / ottenuto».
