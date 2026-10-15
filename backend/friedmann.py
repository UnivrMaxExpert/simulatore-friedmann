"""
Friedmann Equations Solver and Cosmology Engine
Calculates cosmic evolution, scale factor a(t), Hubble parameter H(t),
cosmological age, density parameters, 3D comoving coordinates, and spatial curvature embeddings.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from scipy.integrate import quad, solve_ivp

# Conversion factor: H0 in (km/s/Mpc) to (1/Gyr)
# 1 Mpc = 3.085677581e19 km
# 1 year = 3.15576e7 s (Julian year)
# 1 Gyr = 3.15576e16 s
# 1 / (km/s/Mpc) = 977.792 Gyr
KM_S_MPC_TO_INV_GYR = 1.0 / 977.7922


def get_hubble_inv_gyr(H0_kms: float) -> float:
    """Converts H0 from km/s/Mpc to 1/Gyr."""
    return H0_kms * KM_S_MPC_TO_INV_GYR


def friedmann_E_sq(a: float, Omega_m: float, Omega_Lambda: float, Omega_r: float, Omega_k: float, w: float = -1.0) -> float:
    """
    Computes [H(a) / H0]^2.
    E(a)^2 = Omega_r * a^(-4) + Omega_m * a^(-3) + Omega_k * a^(-2) + Omega_Lambda * a^(-3*(1+w))
    """
    if a <= 1e-7:
        a = 1e-7
    
    dark_energy = Omega_Lambda * (a ** (-3.0 * (1.0 + w)))
    val = (
        Omega_r * (a ** -4.0) +
        Omega_m * (a ** -3.0) +
        Omega_k * (a ** -2.0) +
        dark_energy
    )
    return max(val, 0.0)


def compute_cosmic_age_at_a(a_target: float, H0_kms: float, Omega_m: float, Omega_Lambda: float, Omega_r: float, Omega_k: float, w: float = -1.0) -> float:
    """
    Computes time t (in Gyr) elapsed from a=0 to a=a_target:
    t = (1/H0) * integral_{0}^{a_target} [ a * E(a) ]^(-1) da
    """
    H0_gyr = get_hubble_inv_gyr(H0_kms)
    
    def integrand(a):
        if a <= 0:
            return 0.0
        e2 = friedmann_E_sq(a, Omega_m, Omega_Lambda, Omega_r, Omega_k, w)
        if e2 <= 0:
            return 0.0
        return 1.0 / (a * np.sqrt(e2))
    
    # Adaptive integration with quad
    val, _ = quad(integrand, 1e-8, a_target, limit=200, epsrel=1e-5)
    return val / H0_gyr


def find_turnaround_a(Omega_m: float, Omega_Lambda: float, Omega_r: float, Omega_k: float, w: float = -1.0) -> Optional[float]:
    """
    Checks if the universe has a maximum scale factor (turnaround point) where E(a) = 0.
    Relevant for closed universes heading towards a Big Crunch.
    """
    # Only possible if Omega_k > 0 or attractive components dominate at large a
    # We check a range of a > 1.0
    a_vals = np.linspace(1.0, 50.0, 1000)
    e2_vals = [friedmann_E_sq(a, Omega_m, Omega_Lambda, Omega_r, Omega_k, w) for a in a_vals]
    
    for i in range(len(e2_vals) - 1):
        if e2_vals[i] > 0 and e2_vals[i+1] <= 0:
            # Found zero crossing between a_vals[i] and a_vals[i+1]
            a_low = a_vals[i]
            a_high = a_vals[i+1]
            for _ in range(40):
                a_mid = 0.5 * (a_low + a_high)
                if friedmann_E_sq(a_mid, Omega_m, Omega_Lambda, Omega_r, Omega_k, w) > 0:
                    a_low = a_mid
                else:
                    a_high = a_mid
            return 0.5 * (a_low + a_high)
    return None


def generate_comoving_galaxies(n_galaxies: int = 1200, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generates realistic 3D galaxy positions in comoving coordinates with filaments and clusters.
    """
    np.random.seed(seed)
    galaxies = []
    
    # 70% in cosmic filaments / clusters, 30% background field
    n_cluster = int(n_galaxies * 0.70)
    n_field = n_galaxies - n_cluster
    
    # Create ~8 cluster/filament centers
    n_centers = 8
    centers = np.random.uniform(-35, 35, size=(n_centers, 3))
    
    # Filament galaxies
    cluster_idx = np.random.choice(n_centers, size=n_cluster)
    offsets = np.random.normal(0, scale=8.0, size=(n_cluster, 3))
    cluster_points = centers[cluster_idx] + offsets
    
    # Field galaxies (uniform sphere)
    phi = np.random.uniform(0, 2 * np.pi, size=n_field)
    costheta = np.random.uniform(-1, 1, size=n_field)
    u = np.random.uniform(0, 1, size=n_field)
    theta = np.arccos(costheta)
    r = 50.0 * (u ** (1.0 / 3.0))
    field_points = np.zeros((n_field, 3))
    field_points[:, 0] = r * np.sin(theta) * np.cos(phi)
    field_points[:, 1] = r * np.sin(theta) * np.sin(phi)
    field_points[:, 2] = r * np.cos(theta)
    
    all_points = np.vstack([cluster_points, field_points])
    
    # Types and colors
    types = ["spiral", "elliptical", "irregular", "dwarf"]
    colors = ["#60a5fa", "#f59e0b", "#c084fc", "#e2e8f0"]
    probs = [0.45, 0.35, 0.15, 0.05]
    
    for i in range(n_galaxies):
        gtype_idx = np.random.choice(4, p=probs)
        galaxies.append({
            "id": i,
            "x": round(float(all_points[i, 0]), 3),
            "y": round(float(all_points[i, 1]), 3),
            "z": round(float(all_points[i, 2]), 3),
            "type": types[gtype_idx],
            "color_hex": colors[gtype_idx],
            "size": round(float(np.random.uniform(0.8, 2.2)), 2)
        })
        
    return galaxies


def generate_curvature_mesh(curvature_type: str, grid_size: int = 30) -> Dict[str, Any]:
    """
    Generates 3D vertex coordinates (grid) representing the spatial curvature embedding:
    - Sphere for closed (k=+1)
    - Flat plane for flat (k=0)
    - Hyperbolic saddle for open (k=-1)
    """
    u = np.linspace(-1.0, 1.0, grid_size)
    v = np.linspace(-1.0, 1.0, grid_size)
    U, V = np.meshgrid(u, v)
    
    if curvature_type == "closed":
        # Upper hemisphere / sphere embedding
        r_sq = U**2 + V**2
        mask = r_sq <= 1.0
        Z = np.zeros_like(r_sq)
        Z[mask] = np.sqrt(np.maximum(1.0 - r_sq[mask], 0.0))
        # Scale
        X = U * 25.0
        Y = V * 25.0
        Z = Z * 25.0
    elif curvature_type == "open":
        # Hyperbolic saddle z = (x^2 - y^2) / 2
        X = U * 25.0
        Y = V * 25.0
        Z = (U**2 - V**2) * 12.0
    else:
        # Flat plane
        X = U * 25.0
        Y = V * 25.0
        Z = np.zeros_like(U)
        
    return {
        "type": curvature_type,
        "grid_size": grid_size,
        "vertices_x": [round(float(x), 3) for x in X.flatten()],
        "vertices_y": [round(float(y), 3) for y in Y.flatten()],
        "vertices_z": [round(float(z), 3) for z in Z.flatten()]
    }


def simulate_universe(
    H0: float = 67.4,
    Omega_m: float = 0.315,
    Omega_Lambda: float = 0.685,
    Omega_r: float = 0.00009,
    w: float = -1.0,
    num_time_points: int = 300,
    num_galaxies: int = 1200
) -> Dict[str, Any]:
    """
    Main simulation function:
    Solves Friedmann's equations, builds time trajectories, calculates parameters,
    and returns full payload for frontend rendering.
    """
    Omega_tot = Omega_m + Omega_Lambda + Omega_r
    Omega_k = 1.0 - Omega_tot
    
    # Classify spatial curvature
    if abs(Omega_k) < 1e-4:
        curvature_type = "flat"
        k_val = 0
    elif Omega_k < 0:
        curvature_type = "closed"
        k_val = 1
    else:
        curvature_type = "open"
        k_val = -1
        
    H0_gyr = get_hubble_inv_gyr(H0)
    
    # Current age t0 (at a = 1.0)
    current_age = compute_cosmic_age_at_a(1.0, H0, Omega_m, Omega_Lambda, Omega_r, Omega_k, w)
    
    # Check for turnaround (Big Crunch)
    turnaround_a = find_turnaround_a(Omega_m, Omega_Lambda, Omega_r, Omega_k, w)
    
    if turnaround_a is not None and turnaround_a > 1.0:
        fate = "big_crunch"
        turnaround_time = compute_cosmic_age_at_a(turnaround_a * 0.999, H0, Omega_m, Omega_Lambda, Omega_r, Omega_k, w)
        crunch_time = 2.0 * turnaround_time
        t_max = min(crunch_time * 0.999, turnaround_time * 2.0)
        
        # Build trajectory for expansion and contraction
        # Phase 1: expansion 0 -> turnaround
        half_pts = num_time_points // 2
        a_half_exp = np.linspace(0.01, turnaround_a, half_pts)
        t_half_exp = [compute_cosmic_age_at_a(a, H0, Omega_m, Omega_Lambda, Omega_r, Omega_k, w) for a in a_half_exp]
        
        # Phase 2: contraction turnaround -> 0
        a_half_rec = np.linspace(turnaround_a, 0.01, num_time_points - half_pts)
        t_half_rec = [2.0 * turnaround_time - compute_cosmic_age_at_a(a, H0, Omega_m, Omega_Lambda, Omega_r, Omega_k, w) for a in a_half_rec]
        
        times = t_half_exp + t_half_rec
        scale_factors = list(a_half_exp) + list(a_half_rec)
    else:
        crunch_time = None
        # Monotonic expansion
        if Omega_Lambda > 0.1 and w <= -0.5:
            fate = "accelerated_expansion"
        elif w < -1.0:
            fate = "big_rip"
        else:
            fate = "decelerated_expansion"
            
        # Target max time: today + ~25 Gyr or ~3 * current_age
        t_max = max(35.0, current_age * 2.5)
        
        # Sample scale factor a from ~0.005 up to a_future
        # We find a_max corresponding to t_max using numerical shooting
        # We can integrate ODE: da/dt = H0 * a * E(a)
        def da_dt(t, a):
            if a[0] <= 0:
                return [0.0]
            e2 = friedmann_E_sq(a[0], Omega_m, Omega_Lambda, Omega_r, Omega_k, w)
            return [H0_gyr * a[0] * np.sqrt(e2)]
        
        # Integrate forward from a=1 at t=t0 to t=t_max
        sol_fwd = solve_ivp(da_dt, [current_age, t_max], [1.0], dense_output=True, rtol=1e-6)
        # Integrate backward from a=1 at t=t0 to near t=0
        sol_bwd = solve_ivp(da_dt, [current_age, 0.02], [1.0], dense_output=True, rtol=1e-6)
        
        # Uniform time grid
        times = np.linspace(0.02, t_max, num_time_points).tolist()
        scale_factors = []
        for t in times:
            if t < current_age:
                val = float(sol_bwd.sol(t)[0])
            else:
                val = float(sol_fwd.sol(t)[0])
            scale_factors.append(max(val, 0.0001))
            
    # Calculate H(t), q(t), z(t), and Omega_i(t) along the trajectory
    hubble_H = []
    q_decel = []
    redshifts = []
    omega_m_t = []
    omega_lam_t = []
    omega_r_t = []
    omega_k_t = []
    
    for a in scale_factors:
        e2 = friedmann_E_sq(a, Omega_m, Omega_Lambda, Omega_r, Omega_k, w)
        E = np.sqrt(e2)
        h_t = H0 * E
        hubble_H.append(round(float(h_t), 3))
        
        # Redshift z = 1/a - 1
        z = (1.0 / a) - 1.0
        redshifts.append(round(float(z), 3))
        
        # Deceleration q = 1/2 * (Omega_m/a^3 + 2*Omega_r/a^4 + (1+3w)*Omega_Lambda/a^(3(1+w))) / E^2
        if e2 > 1e-9:
            q_val = 0.5 * (
                Omega_m * (a ** -3.0) +
                2.0 * Omega_r * (a ** -4.0) +
                (1.0 + 3.0 * w) * Omega_Lambda * (a ** (-3.0 * (1.0 + w)))
            ) / e2
            q_decel.append(round(float(q_val), 3))
            
            # Dynamic Omegas at time t
            om_t = (Omega_m * (a ** -3.0)) / e2
            ol_t = (Omega_Lambda * (a ** (-3.0 * (1.0 + w)))) / e2
            or_t = (Omega_r * (a ** -4.0)) / e2
            ok_t = (Omega_k * (a ** -2.0)) / e2
            omega_m_t.append(round(float(om_t), 4))
            omega_lam_t.append(round(float(ol_t), 4))
            omega_r_t.append(round(float(or_t), 4))
            omega_k_t.append(round(float(ok_t), 4))
        else:
            q_decel.append(0.0)
            omega_m_t.append(0.0)
            omega_lam_t.append(0.0)
            omega_r_t.append(0.0)
            omega_k_t.append(0.0)
            
    # Find index closest to today (current_age)
    time_diffs = [abs(t - current_age) for t in times]
    t_today_index = int(np.argmin(time_diffs))
    
    # 3D assets
    comoving_galaxies = generate_comoving_galaxies(num_galaxies)
    curvature_mesh = generate_curvature_mesh(curvature_type)
    
    return {
        "metadata": {
            "Omega_k": round(float(Omega_k), 5),
            "spatial_curvature_type": curvature_type,
            "k_val": k_val,
            "current_age_Gyr": round(float(current_age), 2),
            "fate": fate,
            "crunch_time_Gyr": round(float(crunch_time), 2) if crunch_time else None,
            "t_min_Gyr": round(float(times[0]), 2),
            "t_max_Gyr": round(float(times[-1]), 2),
            "t_today_index": t_today_index
        },
        "times_Gyr": [round(float(t), 3) for t in times],
        "scale_factor_a": [round(float(a), 4) for a in scale_factors],
        "hubble_H": hubble_H,
        "q_deceleration": q_decel,
        "redshift_z": redshifts,
        "omega_components": {
            "Omega_m_t": omega_m_t,
            "Omega_Lambda_t": omega_lam_t,
            "Omega_r_t": omega_r_t,
            "Omega_k_t": omega_k_t
        },
        "comoving_galaxies": comoving_galaxies,
        "curvature_mesh": curvature_mesh
    }
