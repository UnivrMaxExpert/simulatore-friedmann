"""
CosmoSim 3D - Generatore Griglia Spazio-Temporale a(t, parametro)
Implementa l'endpoint POST /api/grid per la visualizzazione 3D delle superfici evolutive.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
import numpy as np
from scipy.integrate import solve_ivp

from .friedmann import (
    KM_S_MPC_TO_INV_GYR,
    clean_num,
    compute_friedmann_universe
)


def compute_grid_surface(
    base: Dict[str, float],
    sweep: Dict[str, Any],
    t_rel_min_gyr: float = -15.0,
    t_rel_max_gyr: float = 40.0,
    n_time: int = 160,
    keep_flat: bool = False
) -> Dict[str, Any]:
    """
    Calcola la matrice 2D a[i_param, j_time] al variare di un parametro cosmologico.
    """
    param_name = sweep.get("param", "omega_m")
    p_min = float(sweep.get("min", 0.0))
    p_max = float(sweep.get("max", 3.0))
    steps = int(sweep.get("steps", 40))
    steps = max(5, min(steps, 80))
    n_time = max(20, min(n_time, 400))

    param_values = np.linspace(p_min, p_max, steps)
    t_rel_grid = np.linspace(t_rel_min_gyr, t_rel_max_gyr, n_time)

    a_matrix: List[List[Optional[float]]] = []
    fate_list: List[str] = []
    origin_list: List[str] = []
    age_list: List[Optional[float]] = []

    for val in param_values:
        # Clona i parametri base
        current_params = dict(base)
        current_params[param_name] = float(val)

        # Se keep_flat: ricalcola omega_lambda = 1 - omega_m - omega_r
        if keep_flat and param_name != "omega_lambda":
            om = current_params.get("omega_m", 0.3)
            or_val = current_params.get("omega_r", 0.0)
            current_params["omega_lambda"] = 1.0 - om - or_val

        # Esegui la simulazione per questo set di parametri
        sim = compute_friedmann_universe(
            H0=current_params.get("H0", 70.0),
            omega_m=current_params.get("omega_m", 0.3),
            omega_r=current_params.get("omega_r", 0.0),
            omega_lambda=current_params.get("omega_lambda", 0.7),
            w=current_params.get("w", -1.0),
            t_future_gyr=max(abs(t_rel_max_gyr), 40.0),
            n_points=250
        )

        fate_list.append(sim["derived"]["fate"])
        origin_list.append(sim["derived"]["origin"])
        age_list.append(sim["derived"]["age_gyr"])

        # Interpolazione di a sui punti t_rel_grid
        series_t = np.array(sim["series"]["t_rel_gyr"], dtype=float)
        series_a = np.array([x if x is not None else np.nan for x in sim["series"]["a"]], dtype=float)

        t_min_valid = series_t[0]
        t_max_valid = series_t[-1]

        row: List[Optional[float]] = []
        for t_target in t_rel_grid:
            # Prima del Big Bang o dopo il Big Crunch/Rip: a non è definito -> None
            if t_target < t_min_valid - 0.05 or t_target > t_max_valid + 0.05:
                row.append(None)
            else:
                # Interpola linearmente
                interp_val = float(np.interp(t_target, series_t, series_a, left=np.nan, right=np.nan))
                if np.isnan(interp_val) or interp_val <= 0 or interp_val > 500:
                    row.append(None)
                else:
                    row.append(clean_num(interp_val))

        a_matrix.append(row)

    return {
        "param": param_name,
        "param_values": [clean_num(v) for v in param_values],
        "t_rel_gyr": [clean_num(t) for t in t_rel_grid],
        "a": a_matrix,
        "fate": fate_list,
        "origin": origin_list,
        "age_gyr": age_list
    }
