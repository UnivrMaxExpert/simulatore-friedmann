"""
CosmoSim 3D - FastAPI Server (Contratto API v1.0)
Espone gli endpoint REST per simulazioni cosmologiche, calcolo della griglia a(t, param),
modelli predefiniti e verifica di stato.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from cosmo.friedmann import compute_friedmann_universe
from cosmo.grid import compute_grid_surface

app = FastAPI(
    title="CosmoSim 3D - Friedmann Equations API",
    description="Backend scientifico per la simulazione e visualizzazione 3D delle equazioni di Friedmann.",
    version="1.0.0"
)

# CORS per Vite (5173) e accessi locali
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Gestore errori di validazione in italiano come da contratto API §0
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg_parts = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg_parts.append(f"Parametro '{loc}': {err.get('msg', 'valore non valido')}")
    detail_msg = "; ".join(msg_parts) if msg_parts else "Dati della richiesta non validi."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"Errore di validazione: {detail_msg}"}
    )


class SimulateRequest(BaseModel):
    H0: float = Field(default=67.66, ge=20.0, le=150.0, description="Costante di Hubble [km/s/Mpc]")
    omega_m: float = Field(default=0.3111, ge=0.0, le=5.0, description="Densità di materia odierna")
    omega_r: float = Field(default=9.0e-5, ge=0.0, le=2.0, description="Densità di radiazione odierna")
    omega_lambda: float = Field(default=0.6889, ge=-2.0, le=5.0, description="Densità di energia oscura odierna (ammette < 0 per AdS)")
    w: float = Field(default=-1.0, ge=-2.5, le=0.0, description="Equazione di stato dell'energia oscura")
    t_future_gyr: float = Field(default=40.0, ge=1.0, le=500.0, description="Orizzonte futuro oltre oggi [Gyr]")
    n_points: int = Field(default=600, ge=50, le=5000, description="Numero di campioni temporali")


class GridSweep(BaseModel):
    param: str = Field(default="omega_m", description="Parametro da variare")
    min: float = Field(default=0.0, description="Valore minimo")
    max: float = Field(default=3.0, description="Valore massimo")
    steps: int = Field(default=40, ge=5, le=80, description="Numero di passi di sweep")


class GridRequest(BaseModel):
    base: Dict[str, float] = Field(default_factory=lambda: {"H0": 70.0, "omega_m": 0.3, "omega_r": 0.0, "omega_lambda": 0.7, "w": -1.0})
    sweep: GridSweep = Field(default_factory=GridSweep)
    t_rel_min_gyr: float = Field(default=-15.0, description="Inizio intervallo tempo relativo [Gyr]")
    t_rel_max_gyr: float = Field(default=40.0, description="Fine intervallo tempo relativo [Gyr]")
    n_time: int = Field(default=160, ge=20, le=400, description="Punti temporali")
    keep_flat: bool = Field(default=False, description="Se true ricalcola omega_lambda = 1 - omega_m - omega_r")


PRESETS = [
    {
        "id": "planck18",
        "name": "ΛCDM (Planck 2018)",
        "description": "Modello standard: materia + costante cosmologica, piatto",
        "params": { "H0": 67.66, "omega_m": 0.3111, "omega_r": 9.0e-5, "omega_lambda": 0.6889, "w": -1.0 }
    },
    {
        "id": "einstein_de_sitter",
        "name": "Einstein-de Sitter (Solo Materia)",
        "description": "Universo piatto critico senza energia oscura (k=0, Ωm=1, a ∝ t^(2/3)).",
        "params": { "H0": 70.0, "omega_m": 1.0, "omega_r": 0.0, "omega_lambda": 0.0, "w": -1.0 }
    },
    {
        "id": "open_matter",
        "name": "Universo Aperto (Sola Materia)",
        "description": "Universo a curvatura negativa k = -1, espansione perenne.",
        "params": { "H0": 70.0, "omega_m": 0.3, "omega_r": 0.0, "omega_lambda": 0.0, "w": -1.0 }
    },
    {
        "id": "closed_matter",
        "name": "Universo Chiuso (Big Crunch)",
        "description": "Universo sovradenso (k=+1, Ωm=3) che ricollassa in un Big Crunch.",
        "params": { "H0": 70.0, "omega_m": 3.0, "omega_r": 0.0, "omega_lambda": 0.0, "w": -1.0 }
    },
    {
        "id": "de_sitter",
        "name": "De Sitter Puro (Solo Λ)",
        "description": "Espansione esponenziale pura guidata da costante cosmologica positiva.",
        "params": { "H0": 70.0, "omega_m": 0.0, "omega_r": 0.0, "omega_lambda": 1.0, "w": -1.0 }
    },
    {
        "id": "radiation",
        "name": "Dominato da Radiazione",
        "description": "Modello ultra-relativistico (a ∝ t^(1/2)).",
        "params": { "H0": 70.0, "omega_m": 0.0, "omega_r": 1.0, "omega_lambda": 0.0, "w": 0.3333 }
    },
    {
        "id": "phantom",
        "name": "Energia Fantasma (Big Rip)",
        "description": "Energia oscura con w = -1.5: espansione super-accelerata verso il Big Rip.",
        "params": { "H0": 70.0, "omega_m": 0.3, "omega_r": 0.0, "omega_lambda": 0.7, "w": -1.5 }
    },
    {
        "id": "bounce",
        "name": "Universo con Rimbalzo (No Big Bang)",
        "description": "Modello che rimbalza ad a_min > 0 senza singolarità iniziale.",
        "params": { "H0": 70.0, "omega_m": 0.3, "omega_r": 0.0, "omega_lambda": 1.9, "w": -1.0 }
    },
    {
        "id": "anti_de_sitter",
        "name": "Anti-de Sitter (Λ < 0)",
        "description": "Costante cosmologica attrattiva negativa: collassa sempre nel futuro.",
        "params": { "H0": 70.0, "omega_m": 0.3, "omega_r": 0.0, "omega_lambda": -0.5, "w": -1.0 }
    }
]


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0"
    }


@app.get("/api/presets")
def get_presets():
    return PRESETS


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    try:
        res = compute_friedmann_universe(
            H0=req.H0,
            omega_m=req.omega_m,
            omega_r=req.omega_r,
            omega_lambda=req.omega_lambda,
            w=req.w,
            t_future_gyr=req.t_future_gyr,
            n_points=req.n_points
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante l'integrazione numerica dell'equazione di Friedmann: {str(e)}"
        )


@app.post("/api/grid")
def grid(req: GridRequest):
    try:
        res = compute_grid_surface(
            base=req.base,
            sweep=req.sweep.model_dump(),
            t_rel_min_gyr=req.t_rel_min_gyr,
            t_rel_max_gyr=req.t_rel_max_gyr,
            n_time=req.n_time,
            keep_flat=req.keep_flat
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante il calcolo della superficie a(t, param): {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
