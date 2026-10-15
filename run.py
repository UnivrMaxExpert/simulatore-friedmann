"""
CosmoSim 3D - Launcher Alias (ISSUE-4)
Esegue avvia.py per gestire la creazione dell'ambiente virtuale,
l'installazione delle dipendenze e l'avvio congiunto di backend e frontend.
"""

import runpy
from pathlib import Path

if __name__ == "__main__":
    avvia_script = Path(__file__).resolve().parent / "avvia.py"
    runpy.run_path(str(avvia_script), run_name="__main__")
