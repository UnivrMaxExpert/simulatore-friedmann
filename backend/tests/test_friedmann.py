"""
Suite di Test per il Motore Fisico di Friedmann e le API REST
Verifica i modelli di riferimento (§7 API_CONTRACT.md), la forma delle risposte e l'assenza di NaN.
"""

import sys
import os
import math
import pytest
from fastapi.testclient import TestClient

# Assicura che backend sia nel PYTHONPATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from cosmo.friedmann import compute_friedmann_universe
from main import app

client = TestClient(app)


def test_planck18_reference():
    """Verifica modello Planck 2018: età ~ 13.79 Gyr, q0 ≈ -0.53, z_acc ≈ 0.63."""
    res = compute_friedmann_universe(
        H0=67.66,
        omega_m=0.3111,
        omega_r=9.0e-5,
        omega_lambda=0.6889,
        w=-1.0,
        t_future_gyr=40.0,
        n_points=300
    )
    derived = res["derived"]
    assert derived["origin"] == "big_bang"
    assert derived["fate"] == "accelerating_expansion"
    assert derived["age_gyr"] == pytest.approx(13.79, abs=0.08)
    assert derived["q0"] == pytest.approx(-0.53, abs=0.03)
    assert derived["accelerating_now"] is True
    assert derived["z_acc"] == pytest.approx(0.63, abs=0.05)
    assert derived["geometry"] == "flat"
    assert derived["k_sign"] == 0


def test_einstein_de_sitter_reference():
    """Verifica Einstein-de Sitter (H0=70, sola materia): età = (2/3)/H0 = 9.31 Gyr, q = 0.5."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=1.0,
        omega_r=0.0,
        omega_lambda=0.0,
        w=-1.0,
        n_points=150
    )
    derived = res["derived"]
    assert derived["origin"] == "big_bang"
    assert derived["fate"] == "eternal_expansion"
    assert derived["age_gyr"] == pytest.approx(9.31, abs=0.06)
    assert derived["q0"] == pytest.approx(0.5, abs=0.02)
    assert derived["accelerating_now"] is False


def test_radiation_reference():
    """Verifica Universo di sola radiazione (H0=70, Ωr=1): età = (1/2)/H0 = 6.98 Gyr."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=0.0,
        omega_r=1.0,
        omega_lambda=0.0,
        w=1.0 / 3.0,
        n_points=150
    )
    derived = res["derived"]
    assert derived["origin"] == "big_bang"
    assert derived["age_gyr"] == pytest.approx(6.98, abs=0.06)


def test_de_sitter_reference():
    """Verifica de Sitter puro: origin 'eternal_past', età null, fate 'accelerating_expansion', q = -1."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=0.0,
        omega_r=0.0,
        omega_lambda=1.0,
        w=-1.0,
        n_points=150
    )
    derived = res["derived"]
    assert derived["origin"] == "eternal_past"
    assert derived["age_gyr"] is None
    assert derived["fate"] == "accelerating_expansion"
    assert derived["q0"] == pytest.approx(-1.0, abs=0.02)


def test_bounce_reference():
    """Verifica modello rimbalzo (Ωm=0.3, ΩΛ=1.9): origin 'bounce', a_min > 0, età null."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=0.3,
        omega_r=0.0,
        omega_lambda=1.9,
        w=-1.0,
        n_points=150
    )
    derived = res["derived"]
    assert derived["origin"] == "bounce"
    assert derived["age_gyr"] is None
    assert derived["a_min"] is not None
    assert derived["a_min"] == pytest.approx(0.611, abs=0.02)


def test_phantom_big_rip_reference():
    """Verifica energia fantasma (w = -1.5): fate 'big_rip', t_end_gyr finito (~36 Gyr)."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=0.3,
        omega_r=0.0,
        omega_lambda=0.7,
        w=-1.5,
        t_future_gyr=40.0,
        n_points=150
    )
    derived = res["derived"]
    assert derived["fate"] == "big_rip"
    assert derived["t_end_gyr"] is not None
    assert derived["t_end_gyr"] == pytest.approx(35.8, abs=1.5)


def test_closed_matter_big_crunch_reference():
    """Verifica universo chiuso (Ωm=3, H0=70): big crunch a ~46.55 Gyr, a_max = 1.5, H < 0 in contrazione."""
    res = compute_friedmann_universe(
        H0=70.0,
        omega_m=3.0,
        omega_r=0.0,
        omega_lambda=0.0,
        w=-1.0,
        t_future_gyr=60.0,
        n_points=200
    )
    derived = res["derived"]
    assert derived["fate"] == "big_crunch"
    assert derived["t_end_gyr"] == pytest.approx(46.55, abs=0.5)
    assert derived["a_max"] == pytest.approx(1.5, abs=0.02)

    # Verifica che nella fase di contrazione H diventi negativo
    h_series = res["series"]["H"]
    has_negative_h = any(h is not None and h < 0 for h in h_series)
    assert has_negative_h is True


def test_api_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "version": "1.0.0"}


def test_api_presets():
    r = client.get("/api/presets")
    assert r.status_code == 200
    presets = r.json()
    assert len(presets) >= 8
    preset_ids = [p["id"] for p in presets]
    assert "planck18" in preset_ids
    assert "einstein_de_sitter" in preset_ids
    assert "closed_matter" in preset_ids
    assert "bounce" in preset_ids
    assert "phantom" in preset_ids


def test_api_simulate_contract_format():
    payload = {
        "H0": 67.66,
        "omega_m": 0.3111,
        "omega_r": 9.0e-5,
        "omega_lambda": 0.6889,
        "w": -1.0,
        "t_future_gyr": 40.0,
        "n_points": 100
    }
    r = client.post("/api/simulate", json=payload)
    assert r.status_code == 200
    data = r.json()

    # Verifica chiavi principali
    assert "params" in data
    assert "derived" in data
    assert "series" in data
    assert "t0_index" in data
    assert "warnings" in data

    # Verifica lunghezza identica delle serie
    series = data["series"]
    expected_len = 100
    for key in ["t_gyr", "t_rel_gyr", "a", "adot", "H", "z", "q", "omega_m", "omega_r", "omega_lambda", "omega_k", "rho_total"]:
        assert key in series
        assert len(series[key]) == expected_len, f"Serie {key} ha lunghezza errata"
        # Verifica nessun NaN/Infinity
        for val in series[key]:
            if val is not None:
                assert not math.isnan(val)
                assert not math.isinf(val)


def test_api_simulate_validation_error():
    # H0 fuori range (> 150)
    payload = { "H0": 250.0, "omega_m": 0.3 }
    r = client.post("/api/simulate", json=payload)
    assert r.status_code == 422
    data = r.json()
    assert "detail" in data
    assert "Errore di validazione" in data["detail"]


def test_api_grid_endpoint():
    payload = {
        "base": { "H0": 70, "omega_m": 0.3, "omega_r": 0, "omega_lambda": 0.7, "w": -1 },
        "sweep": { "param": "omega_m", "min": 0.0, "max": 2.0, "steps": 10 },
        "t_rel_min_gyr": -10,
        "t_rel_max_gyr": 20,
        "n_time": 25,
        "keep_flat": False
    }
    r = client.post("/api/grid", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["param"] == "omega_m"
    assert len(data["param_values"]) == 10
    assert len(data["t_rel_gyr"]) == 25
    assert len(data["a"]) == 10
    assert len(data["a"][0]) == 25
    assert len(data["fate"]) == 10
    assert len(data["origin"]) == 10
