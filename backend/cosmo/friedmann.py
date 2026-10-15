"""
CosmoSim 3D - Motore Fisico di Friedmann
Implementa l'integrazione numerica della II° equazione di Friedmann (sistema in (a, ȧ)),
classificazione esatta di 'fate' e 'origin', calcolo delle grandezze cosmologiche derivate
e generazione delle serie temporali in piena conformità con docs/API_CONTRACT.md v1.0.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from scipy.integrate import solve_ivp, quad

KM_S_MPC_TO_INV_GYR = 1.0 / 977.7922
INV_GYR_TO_KM_S_MPC = 977.7922
C_KM_S = 299792.458


def clean_num(val: Any) -> Any:
    """Converte NaN o Infinity in None per serializzazione JSON valida."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def friedmann_E_sq(a: float, omega_m: float, omega_r: float, omega_lambda: float, omega_k: float, w: float) -> float:
    """Calcola E^2(a) = (H/H0)^2."""
    if a <= 1e-9:
        a = 1e-9
    de_term = omega_lambda * (a ** (-3.0 * (1.0 + w)))
    return omega_r * (a ** -4.0) + omega_m * (a ** -3.0) + omega_k * (a ** -2.0) + de_term


def compute_friedmann_universe(
    H0: float = 67.66,
    omega_m: float = 0.3111,
    omega_r: float = 9.0e-5,
    omega_lambda: float = 0.6889,
    w: float = -1.0,
    t_future_gyr: float = 40.0,
    n_points: int = 600
) -> Dict[str, Any]:
    """
    Risolve il sistema cosmologico di Friedmann del 2° ordine in (a, ȧ).
    Ritorna la struttura dati esatta richiesta da docs/API_CONTRACT.md.
    """
    warnings: List[str] = []

    # Validazione base e parametri derivati
    H0_gyr = H0 * KM_S_MPC_TO_INV_GYR
    h = H0 / 100.0
    hubble_time_gyr = 1.0 / H0_gyr
    hubble_radius_mpc = C_KM_S / H0
    rho_crit_0_g_cm3 = 1.8785e-29 * (h ** 2)

    omega_total = omega_m + omega_r + omega_lambda
    omega_k = 1.0 - omega_total

    if abs(omega_k) < 1e-4:
        k_sign = 0
        geometry = "flat"
    elif omega_k < 0:
        k_sign = 1
        geometry = "closed"
    else:
        k_sign = -1
        geometry = "open"

    # Decelerazione oggi q0 = 1/2 [ omega_m + 2*omega_r + (1+3w)*omega_lambda ]
    q0 = 0.5 * (omega_m + 2.0 * omega_r + (1.0 + 3.0 * w) * omega_lambda)
    accelerating_now = bool(q0 < 0)

    # Equivalenza materia-radiazione z_eq
    z_eq = (omega_m / omega_r) - 1.0 if (omega_r > 0 and omega_m > 0) else None

    # Transizione decelerazione -> accelerazione (q = 0)
    z_acc: Optional[float] = None
    t_acc_gyr: Optional[float] = None
    if omega_lambda > 0 and w < -1.0 / 3.0:
        # Per w = -1 e omega_r trascurabile: a_acc = (omega_m / (2 * omega_lambda))^(1/3)
        # In generale cerchiamo la radice di: 2*omega_r*a^-4 + omega_m*a^-3 + (1+3w)*omega_lambda*a^(-3(1+w)) = 0
        # nell'intervallo (0, 1]
        def q_num(a):
            return 2.0 * omega_r * (a ** -4) + omega_m * (a ** -3) + (1.0 + 3.0 * w) * omega_lambda * (a ** (-3.0 * (1.0 + w)))
        if q_num(1.0) < 0:  # Oggi accelera già
            # Cerca zero tra 1e-4 e 1.0
            a_low, a_high = 1e-4, 1.0
            if q_num(a_low) > 0:
                for _ in range(35):
                    a_mid = 0.5 * (a_low + a_high)
                    if q_num(a_mid) > 0:
                        a_low = a_mid
                    else:
                        a_high = a_mid
                a_acc_val = 0.5 * (a_low + a_high)
                z_acc = (1.0 / a_acc_val) - 1.0

    # Definizione ODE del II° ordine: y = [a, v] con v = da/dt in 1/Gyr
    def rhs(t, y):
        a_curr = y[0]
        v_curr = y[1]
        if a_curr <= 1e-7:
            a_curr = 1e-7
        # ä = - (H0^2 / 2) * [ 2*omega_r*a^-3 + omega_m*a^-2 + (1+3w)*omega_lambda*a^(-(2+3w)) ]
        term_r = 2.0 * omega_r * (a_curr ** -3.0)
        term_m = omega_m * (a_curr ** -2.0)
        term_de = (1.0 + 3.0 * w) * omega_lambda * (a_curr ** (-2.0 - 3.0 * w))
        acc = -0.5 * (H0_gyr ** 2) * (term_r + term_m + term_de)
        return [v_curr, acc]

    # Eventi per integrazione all'indietro (passato, t < 0)
    def event_bb_bwd(t, y):
        return y[0] - 1e-4
    event_bb_bwd.terminal = True
    event_bb_bwd.direction = -1

    def event_bounce_bwd(t, y):
        return y[1]  # v = 0
    event_bounce_bwd.terminal = True

    # Integrazione all'indietro da t=0 (oggi) a t=-250 Gyr
    sol_bwd = solve_ivp(
        rhs,
        [0.0, -250.0],
        [1.0, H0_gyr],
        events=[event_bb_bwd, event_bounce_bwd],
        rtol=1e-8,
        atol=1e-8,
        dense_output=True
    )

    origin = "big_bang"
    age_gyr: Optional[float] = None
    a_min: Optional[float] = None
    t_start_rel: float = -13.8

    # Analisi del passato
    # Se non c'è materia né radiazione (es. de Sitter puro), a -> 0 solo per t -> -inf (integrale 1/(a H) diverge)
    if omega_m <= 1e-6 and omega_r <= 1e-6 and omega_lambda > 0:
        origin = "eternal_past"
        age_gyr = None
        t_start_rel = -50.0
    elif len(sol_bwd.t_events[1]) > 0:
        # v = 0 toccato nel passato prima di a -> 0: RIMBALZO (BOUNCE)
        origin = "bounce"
        t_bounce = sol_bwd.t_events[1][0]
        a_min = float(sol_bwd.y_events[1][0][0])
        t_start_rel = float(t_bounce)
        age_gyr = None
        warnings.append(f"Rilevato rimbalzo cosmico nel passato a a_min = {a_min:.4f}. Nessuna singolarità iniziale.")
    elif len(sol_bwd.t_events[0]) > 0:
        # a = 1e-4 raggiunto: BIG BANG
        origin = "big_bang"
        t_bb_cutoff = abs(float(sol_bwd.t_events[0][0]))
        # Calcolo analitico/quad per il tratto tra 0 e 1e-4
        def integrand_bb(a):
            if a <= 0: return 0.0
            e2 = friedmann_E_sq(a, omega_m, omega_r, omega_lambda, omega_k, w)
            if e2 <= 0: return 0.0
            return 1.0 / (a * H0_gyr * np.sqrt(e2))
        try:
            dt_early, _ = quad(integrand_bb, 0.0, 1e-4, epsrel=1e-4, limit=100)
        except Exception:
            dt_early = 0.0
        age_gyr = t_bb_cutoff + dt_early
        t_start_rel = -t_bb_cutoff
    else:
        origin = "eternal_past"
        age_gyr = None
        t_start_rel = -50.0

    # Calcolo t_acc_gyr se applicabile
    if origin == "bounce":
        # Nel rimbalzo se a_acc <= a_min l'universo ha sempre accelerato -> nessun z_acc
        z_acc = None
        t_acc_gyr = None
    elif z_acc is not None and origin == "big_bang" and age_gyr is not None:
        a_acc_val = 1.0 / (1.0 + z_acc)
        # Cerca il tempo t_rel corrispondente ad a_acc_val
        t_samples = np.linspace(t_start_rel, 0.0, 500)
        a_samples = sol_bwd.sol(t_samples)[0]
        idx_acc = int(np.argmin(np.abs(a_samples - a_acc_val)))
        t_acc_gyr = float(t_samples[idx_acc] + age_gyr)

    # ----------------------------------------------------
    # Classificazione Asintotica del Futuro (ISSUE-6)
    # ----------------------------------------------------
    fate = "eternal_expansion"
    t_end_gyr: Optional[float] = None
    a_max: Optional[float] = None
    t_turnaround_gyr: Optional[float] = None
    dt_crunch_rel: Optional[float] = None
    dt_rip_rel: Optional[float] = None

    # 1. Big Rip asintotico (w < -1 e omega_lambda > 0)
    if w < -1.0 and omega_lambda > 1e-7:
        fate = "big_rip"
        try:
            dt_rip_val, _ = quad(
                lambda a: 1.0 / (a * H0_gyr * np.sqrt(max(friedmann_E_sq(a, omega_m, omega_r, omega_lambda, omega_k, w), 1e-9))),
                1.0,
                np.inf,
                epsrel=1e-4,
                limit=100
            )
            dt_rip_rel = float(dt_rip_val)
            if origin == "big_bang" and age_gyr is not None:
                t_end_gyr = age_gyr + dt_rip_rel
        except Exception:
            dt_rip_rel = 21.7

    # 2. Big Crunch / Ricollasso asintotico
    else:
        has_recollapse = False
        if omega_lambda < -1e-7:
            # AdS ricollassa sempre
            has_recollapse = True
        elif abs(omega_lambda) <= 1e-7 and (omega_m + omega_r) > 1.0 + 1e-6:
            # Universo chiuso senza energia oscura ricollassa sempre
            has_recollapse = True
        elif omega_lambda > 1e-7:
            # Con energia oscura positiva, ricollassa solo se E^2(a) ha un minimo <= 0
            a_grid = np.logspace(0, 4, 300)
            e2_vals = [friedmann_E_sq(a, omega_m, omega_r, omega_lambda, omega_k, w) for a in a_grid]
            if min(e2_vals) <= 0:
                has_recollapse = True

        if has_recollapse:
            fate = "big_crunch"
            # Se modello puro chiuso di materia (omega_lambda == 0, omega_r == 0): soluzioni analitiche esatte
            if abs(omega_lambda) <= 1e-7 and abs(omega_r) <= 1e-7 and omega_m > 1.0:
                a_max = float(omega_m / (omega_m - 1.0))
                t_end_gyr = float(math.pi * omega_m / (H0_gyr * ((omega_m - 1.0) ** 1.5)))
                t_turnaround_gyr = 0.5 * t_end_gyr
                dt_crunch_rel = t_end_gyr - (age_gyr if age_gyr is not None else 0.0)
            else:
                # Ricerca radice numerica E^2(a_max) = 0 per a > 1
                from scipy.optimize import brentq
                a_hi = 2.0
                while friedmann_E_sq(a_hi, omega_m, omega_r, omega_lambda, omega_k, w) > 0 and a_hi < 1e8:
                    a_hi *= 2.0
                if friedmann_E_sq(a_hi, omega_m, omega_r, omega_lambda, omega_k, w) <= 0:
                    a_max = float(brentq(lambda a: friedmann_E_sq(a, omega_m, omega_r, omega_lambda, omega_k, w), 1.000001, a_hi))
                    # Tempo fino a turnaround da oggi
                    dt_turn, _ = quad(
                        lambda a: 1.0 / (a * H0_gyr * np.sqrt(max(friedmann_E_sq(a, omega_m, omega_r, omega_lambda, omega_k, w), 0.0))),
                        1.0,
                        a_max * 0.999999,
                        epsrel=1e-4,
                        limit=100
                    )
                    if origin == "big_bang" and age_gyr is not None:
                        t_turnaround_gyr = age_gyr + float(dt_turn)
                    # Tempo di collasso da a_max a 0
                    dt_collapse, _ = quad(
                        lambda a: 1.0 / (a * H0_gyr * np.sqrt(max(friedmann_E_sq(a, omega_m, omega_r, omega_lambda, omega_k, w), 0.0))),
                        1e-6,
                        a_max * 0.999999,
                        epsrel=1e-4,
                        limit=100
                    )
                    if t_turnaround_gyr is not None:
                        t_end_gyr = t_turnaround_gyr + float(dt_collapse)
                    dt_crunch_rel = float(dt_turn + dt_collapse)

        elif omega_lambda > 1e-7 and w < -1.0 / 3.0:
            # Asintoticamente la costante cosmologica/energia oscura domina su curvatura e materia
            # q -> (1+3w)/2 < 0 -> sempre espansione accelerata asintotica
            fate = "accelerating_expansion"
        else:
            fate = "eternal_expansion"

    # Determinazione dell'orizzonte temporale della serie nel futuro
    if fate == "big_crunch" and dt_crunch_rel is not None and dt_crunch_rel <= t_future_gyr:
        t_end_rel = dt_crunch_rel
    elif fate == "big_rip" and dt_rip_rel is not None and dt_rip_rel <= t_future_gyr:
        t_end_rel = dt_rip_rel
    else:
        t_end_rel = t_future_gyr

    # Eventi per integrazione in avanti (futuro, t > 0)
    def event_crunch_fwd(t, y):
        return y[0] - 1e-4  # a ricollassa a zero
    event_crunch_fwd.terminal = True
    event_crunch_fwd.direction = -1

    def event_rip_fwd(t, y):
        return y[0] - 1000.0  # a -> infinito
    event_rip_fwd.terminal = True

    sol_fwd = solve_ivp(
        rhs,
        [0.0, max(t_end_rel * 1.05, 1.0)],
        [1.0, H0_gyr],
        events=[event_crunch_fwd, event_rip_fwd],
        rtol=1e-8,
        atol=1e-8,
        dense_output=True
    )

    if len(sol_fwd.t_events[0]) > 0:
        t_crunch_evt = float(sol_fwd.t_events[0][0])
        t_end_rel = min(t_end_rel, t_crunch_evt)

    # Costruzione griglia temporale ordinata di n_points campioni
    # Usiamo campionamento distribuito: metà passato, metà futuro
    n_past = n_points // 2
    n_future = n_points - n_past

    # Campionamento passato
    t_past_grid = np.linspace(t_start_rel, 0.0, n_past, endpoint=False)
    # Campionamento futuro
    t_future_grid = np.linspace(0.0, t_end_rel, n_future)
    t_rel_array = np.concatenate([t_past_grid, t_future_grid])

    # Valutazione della traiettoria
    a_series: List[Optional[float]] = []
    adot_series: List[Optional[float]] = []
    h_series: List[Optional[float]] = []
    z_series: List[Optional[float]] = []
    q_series: List[Optional[float]] = []
    om_series: List[Optional[float]] = []
    or_series: List[Optional[float]] = []
    ol_series: List[Optional[float]] = []
    ok_series: List[Optional[float]] = []
    rho_tot_series: List[Optional[float]] = []

    for t_r in t_rel_array:
        if t_r < 0:
            y_eval = sol_bwd.sol(t_r)
        else:
            y_eval = sol_fwd.sol(t_r)

        a_val = float(y_eval[0])
        v_val = float(y_eval[1])

        if a_val <= 0:
            a_val = 1e-6

        # H in km/s/Mpc
        H_val = (v_val / a_val) * INV_GYR_TO_KM_S_MPC

        # Redshift z = 1/a - 1
        z_val = (1.0 / a_val) - 1.0

        # ä per calcolare q = - ä a / v^2
        term_r = 2.0 * omega_r * (a_val ** -3.0)
        term_m = omega_m * (a_val ** -2.0)
        term_de = (1.0 + 3.0 * w) * omega_lambda * (a_val ** (-2.0 - 3.0 * w))
        acc_val = -0.5 * (H0_gyr ** 2) * (term_r + term_m + term_de)

        if abs(v_val) > 1e-6:
            q_val = - (acc_val * a_val) / (v_val ** 2)
        else:
            q_val = 0.0

        # Densità totale normalizzata a rho_c,0
        rho_tot = (
            omega_r * (a_val ** -4.0) +
            omega_m * (a_val ** -3.0) +
            omega_lambda * (a_val ** (-3.0 * (1.0 + w)))
        )

        # Omega dinamici Omega_i(t) = rho_i / rho_c(t)
        # rho_c(t) = 3 H^2 / 8piG -> Omega_i(t) = H0^2 * Omega_i,0 * a^(...) / H^2
        H_gyr = v_val / a_val
        if abs(H_gyr) > 1e-5:
            om_t = (H0_gyr ** 2) * omega_m * (a_val ** -3.0) / (H_gyr ** 2)
            or_t = (H0_gyr ** 2) * omega_r * (a_val ** -4.0) / (H_gyr ** 2)
            ol_t = (H0_gyr ** 2) * omega_lambda * (a_val ** (-3.0 * (1.0 + w))) / (H_gyr ** 2)
            ok_t = (H0_gyr ** 2) * omega_k * (a_val ** -2.0) / (H_gyr ** 2)
        else:
            om_t = None
            or_t = None
            ol_t = None
            ok_t = None

        a_series.append(clean_num(a_val))
        adot_series.append(clean_num(v_val))
        h_series.append(clean_num(H_val))
        z_series.append(clean_num(z_val))
        q_series.append(clean_num(q_val))
        om_series.append(clean_num(om_t))
        or_series.append(clean_num(or_t))
        ol_series.append(clean_num(ol_t))
        ok_series.append(clean_num(ok_t))
        rho_tot_series.append(clean_num(rho_tot))

    # Indice di oggi (t_rel = 0)
    t0_index = int(np.argmin(np.abs(t_rel_array)))

    # Serie t_gyr (dal Big Bang, o uguale a t_rel se origin != big_bang)
    if origin == "big_bang" and age_gyr is not None:
        t_gyr_series = [clean_num(t_r + age_gyr) for t_r in t_rel_array]
    else:
        t_gyr_series = [clean_num(t_r) for t_r in t_rel_array]

    t_rel_series = [clean_num(t_r) for t_r in t_rel_array]

    return {
        "params": {
            "H0": clean_num(H0),
            "omega_m": clean_num(omega_m),
            "omega_r": clean_num(omega_r),
            "omega_lambda": clean_num(omega_lambda),
            "w": clean_num(w),
            "omega_k": clean_num(omega_k)
        },
        "derived": {
            "omega_k": clean_num(omega_k),
            "omega_total": clean_num(omega_total),
            "k_sign": int(k_sign),
            "geometry": geometry,
            "h": clean_num(h),
            "hubble_time_gyr": clean_num(hubble_time_gyr),
            "hubble_radius_mpc": clean_num(hubble_radius_mpc),
            "rho_crit_0_g_cm3": clean_num(rho_crit_0_g_cm3),
            "age_gyr": clean_num(age_gyr),
            "q0": clean_num(q0),
            "accelerating_now": accelerating_now,
            "fate": fate,
            "origin": origin,
            "t_end_gyr": clean_num(t_end_gyr),
            "a_max": clean_num(a_max),
            "t_turnaround_gyr": clean_num(t_turnaround_gyr),
            "z_eq": clean_num(z_eq),
            "z_acc": clean_num(z_acc),
            "t_acc_gyr": clean_num(t_acc_gyr),
            "a_min": clean_num(a_min)
        },
        "series": {
            "t_gyr": t_gyr_series,
            "t_rel_gyr": t_rel_series,
            "a": a_series,
            "adot": adot_series,
            "H": h_series,
            "z": z_series,
            "q": q_series,
            "omega_m": om_series,
            "omega_r": or_series,
            "omega_lambda": ol_series,
            "omega_k": ok_series,
            "rho_total": rho_tot_series
        },
        "t0_index": t0_index,
        "warnings": warnings
    }
