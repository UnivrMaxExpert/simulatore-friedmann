"""
Test di Verifica Indipendente (docs/VERIFICA.md — ISSUE-5)
Confronta i risultati del motore di Friedmann con astropy.cosmology e con le soluzioni analitiche.
"""

import sys
import os
import math
import pytest
from astropy.cosmology import FlatLambdaCDM, LambdaCDM, wCDM

# Assicura che backend sia nel PYTHONPATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from cosmo.friedmann import compute_friedmann_universe


def test_ref_planck18():
    """Modello ΛCDM Planck18: confronto con astropy.FlatLambdaCDM."""
    H0 = 67.66
    Om = 0.3111
    Ol = 0.6889
    res = compute_friedmann_universe(H0=H0, omega_m=Om, omega_r=0.0, omega_lambda=Ol, w=-1.0, t_future_gyr=40.0)
    derived = res["derived"]

    # Confronto con astropy (Tcmb0=0 per isolare Omega_r=0)
    astro = FlatLambdaCDM(H0=H0, Om0=Om, Tcmb0=0.0)
    astro_age = astro.age(0).value  # in Gyr

    assert derived["age_gyr"] == pytest.approx(astro_age, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(13.792, abs=0.01)
    assert derived["q0"] == pytest.approx(-0.533, abs=0.005)
    assert derived["fate"] == "accelerating_expansion"
    assert derived["origin"] == "big_bang"
    assert derived["z_acc"] == pytest.approx(0.64, abs=0.05)


def test_ref_einstein_de_sitter():
    """Modello Einstein-de Sitter: confronto analitico 2/(3*H0) e astropy."""
    H0 = 70.0
    res = compute_friedmann_universe(H0=H0, omega_m=1.0, omega_r=0.0, omega_lambda=0.0, w=-1.0)
    derived = res["derived"]

    astro = FlatLambdaCDM(H0=H0, Om0=1.0, Tcmb0=0.0)
    astro_age = astro.age(0).value

    # Formula analitica esatta: 2 / (3 * H0) con 1/H0 = 977.7922 / 70 = 13.96846 Gyr -> age = 9.312 Gyr
    expected_analytic = (2.0 / 3.0) * (977.7922 / H0)

    assert derived["age_gyr"] == pytest.approx(expected_analytic, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(astro_age, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(9.312, abs=0.01)
    assert derived["q0"] == pytest.approx(0.500, abs=0.005)
    assert derived["fate"] == "eternal_expansion"
    assert derived["origin"] == "big_bang"


def test_ref_aperto_materia():
    """Modello aperto di sola materia (Ωm=0.3): confronto con astropy.LambdaCDM."""
    H0 = 70.0
    Om = 0.3
    res = compute_friedmann_universe(H0=H0, omega_m=Om, omega_r=0.0, omega_lambda=0.0, w=-1.0)
    derived = res["derived"]

    astro = LambdaCDM(H0=H0, Om0=Om, Ode0=0.0, Tcmb0=0.0)
    astro_age = astro.age(0).value

    assert derived["age_gyr"] == pytest.approx(astro_age, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(11.298, abs=0.01)
    assert derived["q0"] == pytest.approx(0.150, abs=0.005)
    assert derived["fate"] == "eternal_expansion"
    assert derived["origin"] == "big_bang"


def test_ref_chiuso_big_crunch():
    """Modello chiuso di sola materia (Ωm=3.0): confronto analitico e astropy."""
    H0 = 70.0
    Om = 3.0
    res = compute_friedmann_universe(H0=H0, omega_m=Om, omega_r=0.0, omega_lambda=0.0, w=-1.0, t_future_gyr=60.0)
    derived = res["derived"]

    astro = LambdaCDM(H0=H0, Om0=Om, Ode0=0.0, Tcmb0=0.0)
    astro_age = astro.age(0).value

    # Formule analitiche
    inv_h0 = 977.7922 / H0
    t_crunch_analytic = math.pi * Om / (H0 * (1.0 / 977.7922) * ((Om - 1.0) ** 1.5))
    a_max_analytic = Om / (Om - 1.0)

    assert derived["age_gyr"] == pytest.approx(astro_age, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(7.170, abs=0.01)
    assert derived["q0"] == pytest.approx(1.500, abs=0.005)
    assert derived["a_max"] == pytest.approx(a_max_analytic, rel=5e-3)
    assert derived["a_max"] == pytest.approx(1.500, abs=0.01)
    assert derived["t_end_gyr"] == pytest.approx(t_crunch_analytic, rel=5e-3)
    assert derived["t_end_gyr"] == pytest.approx(46.55, abs=0.1)
    assert derived["fate"] == "big_crunch"
    assert derived["origin"] == "big_bang"


def test_ref_solo_barioni():
    """Modello solo barioni (Ωm=0.03): confronto con astropy."""
    H0 = 70.0
    Om = 0.03
    res = compute_friedmann_universe(H0=H0, omega_m=Om, omega_r=0.0, omega_lambda=0.0, w=-1.0)
    derived = res["derived"]

    astro = LambdaCDM(H0=H0, Om0=Om, Ode0=0.0, Tcmb0=0.0)
    astro_age = astro.age(0).value

    assert derived["age_gyr"] == pytest.approx(astro_age, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(13.331, abs=0.01)
    assert derived["q0"] == pytest.approx(0.015, abs=0.005)
    assert derived["fate"] == "eternal_expansion"
    assert derived["origin"] == "big_bang"


def test_ref_phantom_big_rip():
    """Modello energia fantasma (w=-1.5): confronto con astropy.wCDM."""
    H0 = 70.0
    Om = 0.3
    Ol = 0.7
    w = -1.5
    res = compute_friedmann_universe(H0=H0, omega_m=Om, omega_r=0.0, omega_lambda=Ol, w=w, t_future_gyr=40.0)
    derived = res["derived"]

    astro = wCDM(H0=H0, Om0=Om, Ode0=Ol, w0=w, Tcmb0=0.0)
    astro_age = astro.age(0).value

    assert derived["age_gyr"] == pytest.approx(astro_age, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(14.273, abs=0.01)
    assert derived["q0"] == pytest.approx(-1.075, abs=0.005)
    assert derived["fate"] == "big_rip"
    assert derived["origin"] == "big_bang"
    assert derived["t_end_gyr"] is not None
    assert (derived["t_end_gyr"] - derived["age_gyr"]) == pytest.approx(21.7, abs=1.0)


def test_ref_anti_de_sitter():
    """Modello Anti-de Sitter (ΩΛ=-0.5): confronto con formula esatta a = √3 sin(√0.5 H0 t)."""
    H0 = 70.0
    Ol = -0.5
    res = compute_friedmann_universe(H0=H0, omega_m=0.0, omega_r=0.0, omega_lambda=Ol, w=-1.0, t_future_gyr=60.0)
    derived = res["derived"]

    # In AdS puro (k=-1 con Om=0, Ol=-0.5):
    # E^2 = Ok a^-2 + Ol = 1.5 a^-2 - 0.5. Turnaround a E^2 = 0 -> a_max = sqrt(1.5 / 0.5) = sqrt(3) ≈ 1.732
    # t_crunch = pi / (sqrt(0.5) * H0_gyr) = pi / (0.7071 * 70 / 977.7922) = 62.06 Gyr
    H0_gyr = H0 / 977.7922
    t_crunch_analytic = math.pi / (math.sqrt(0.5) * H0_gyr)

    assert derived["age_gyr"] == pytest.approx(12.158, abs=0.01)
    assert derived["q0"] == pytest.approx(0.500, abs=0.005)
    assert derived["a_max"] == pytest.approx(math.sqrt(3.0), rel=5e-3)
    assert derived["a_max"] == pytest.approx(1.732, abs=0.01)
    assert derived["t_end_gyr"] == pytest.approx(t_crunch_analytic, rel=5e-3)
    assert derived["t_end_gyr"] == pytest.approx(62.06, abs=0.1)
    assert derived["fate"] == "big_crunch"
    assert derived["origin"] == "big_bang"


def test_ref_solo_radiazione():
    """Modello solo radiazione (Ωr=1.0): confronto analitico 1/(2*H0)."""
    H0 = 70.0
    res = compute_friedmann_universe(H0=H0, omega_m=0.0, omega_r=1.0, omega_lambda=0.0, w=1.0/3.0)
    derived = res["derived"]

    expected_analytic = 0.5 * (977.7922 / H0)

    assert derived["age_gyr"] == pytest.approx(expected_analytic, rel=1e-3)
    assert derived["age_gyr"] == pytest.approx(6.984, abs=0.01)
    assert derived["q0"] == pytest.approx(1.000, abs=0.005)
    assert derived["fate"] == "eternal_expansion"
    assert derived["origin"] == "big_bang"


def test_ref_de_sitter():
    """Modello de Sitter puro: origine eternal_past, età null, fate accelerating_expansion."""
    H0 = 70.0
    res = compute_friedmann_universe(H0=H0, omega_m=0.0, omega_r=0.0, omega_lambda=1.0, w=-1.0)
    derived = res["derived"]

    assert derived["age_gyr"] is None
    assert derived["q0"] == pytest.approx(-1.000, abs=0.005)
    assert derived["fate"] == "accelerating_expansion"
    assert derived["origin"] == "eternal_past"


def test_ref_rimbalzo():
    """Modello rimbalzo (Ωm=0.3, ΩΛ=1.9): origine bounce, età null, a_min ≈ 0.611."""
    H0 = 70.0
    res = compute_friedmann_universe(H0=H0, omega_m=0.3, omega_r=0.0, omega_lambda=1.9, w=-1.0)
    derived = res["derived"]

    assert derived["age_gyr"] is None
    assert derived["q0"] == pytest.approx(-1.750, abs=0.005)
    assert derived["a_min"] == pytest.approx(0.611, abs=0.01)
    assert derived["fate"] == "accelerating_expansion"
    assert derived["origin"] == "bounce"


def test_ref_coerenza_fisica():
    """Verifica condizioni di coerenza su a(t0)=1, H(t0)=H0 e assenza di NaN/Infinity."""
    res = compute_friedmann_universe(H0=70.0, omega_m=0.3, omega_r=0.0, omega_lambda=0.7, w=-1.0)
    t0_idx = res["t0_index"]
    series = res["series"]

    assert series["a"][t0_idx] == pytest.approx(1.0, abs=0.02)
    assert series["H"][t0_idx] == pytest.approx(70.0, abs=1.0)

    for k, arr in series.items():
        for val in arr:
            if val is not None:
                assert not math.isnan(val)
                assert not math.isinf(val)


def test_issue6_closed_matter_beyond_horizon():
    """ISSUE-6 (1): Universi chiusi che ricollassano oltre t_future_gyr."""
    # Test om = 1.1 con orizzonte standard t_future_gyr = 40.0
    res = compute_friedmann_universe(H0=70.0, omega_m=1.1, omega_r=0.0, omega_lambda=0.0, w=-1.0, t_future_gyr=40.0)
    d = res["derived"]
    assert d["fate"] == "big_crunch"
    assert d["a_max"] == pytest.approx(11.0, rel=1e-3)
    assert d["t_end_gyr"] == pytest.approx(1526.5, abs=2.0)

    # Test om = 1.06
    res2 = compute_friedmann_universe(H0=70.0, omega_m=1.06, omega_r=0.0, omega_lambda=0.0, w=-1.0, t_future_gyr=40.0)
    d2 = res2["derived"]
    assert d2["fate"] == "big_crunch"
    assert d2["a_max"] == pytest.approx(17.67, abs=0.05)
    assert d2["t_end_gyr"] == pytest.approx(3165.0, abs=5.0)


def test_issue6_asymptotic_acceleration():
    """ISSUE-6 (2): Accelerazione asintotica con piccola energia oscura dominante a infinito."""
    res = compute_friedmann_universe(
        H0=88.53,
        omega_m=0.753,
        omega_r=9.0e-5,
        omega_lambda=0.045,
        w=-0.8,
        t_future_gyr=40.0
    )
    d = res["derived"]
    assert d["fate"] == "accelerating_expansion"
    assert d["accelerating_now"] is False  # q0 > 0 oggi, ma q_inf = -0.7 < 0


def test_issue6_bounce_no_z_acc():
    """ISSUE-6 (3): Nel modello con rimbalzo a_acc < a_min -> z_acc e t_acc_gyr devono essere None."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=0.3,
        omega_r=0.0,
        omega_lambda=1.9,
        w=-1.0
    )
    d = res["derived"]
    assert d["origin"] == "bounce"
    assert d["a_min"] == pytest.approx(0.611, abs=0.01)
    assert d["z_acc"] is None
    assert d["t_acc_gyr"] is None

