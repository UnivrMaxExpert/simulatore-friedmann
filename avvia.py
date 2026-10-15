#!/usr/bin/env python3
"""
Avvio con un solo comando del Simulatore di Friedmann.

    python avvia.py              backend + frontend, apre il browser
    python avvia.py --mock       solo frontend, fisica simulata nel browser
    python avvia.py --no-browser non aprire il browser
    python avvia.py --reload     backend con auto-reload (utile mentre si sviluppa)
    python avvia.py --pronto     usa l'interfaccia già compilata (frontend/dist), anche se Node.js c'è
    python avvia.py --compila    ricompila frontend/dist (serve Node.js), da fare prima di un commit

Al primo avvio crea .venv e installa backend/requirements.txt.
Prerequisito: Python >= 3.9. Node.js (>= 18) serve solo per modificare l'interfaccia: senza Node.js
si usa la versione già compilata in frontend/dist, servita dal backend sulla porta 8000.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = ROOT / ".venv"
DIST = FRONTEND / "dist"
IS_WIN = os.name == "nt"
BACKEND_PORT = 8000
FRONTEND_PORT = 5173


def say(msg: str) -> None:
    print(f"[avvia] {msg}", flush=True)


def die(msg: str) -> None:
    print(f"\n[avvia] ERRORE: {msg}\n", file=sys.stderr, flush=True)
    sys.exit(1)


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def wait_port(port: int, timeout: float, proc: subprocess.Popen | None = None) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        if port_in_use(port):
            return True
        if proc is not None and proc.poll() is not None:
            return False
        time.sleep(0.3)
    return False


def venv_python() -> Path:
    return VENV / ("Scripts/python.exe" if IS_WIN else "bin/python")


def run(cmd: list[str], cwd: Path, what: str) -> None:
    say(f"{what}…")
    r = subprocess.run(cmd, cwd=cwd)
    if r.returncode != 0:
        die(f"{what} non riuscito (codice {r.returncode}). Controlla i messaggi sopra.")


def backend_module() -> str | None:
    """Contratto (D6): backend/main.py con `app`. Accetta anche backend/app.py, usato oggi da Antigravity."""
    for name in ("main", "app"):
        if (BACKEND / f"{name}.py").exists():
            return f"{name}:app"
    return None


def setup_backend() -> bool:
    req = BACKEND / "requirements.txt"
    if backend_module() is None:
        say("backend/main.py non c'è ancora (lo sta scrivendo Antigravity): parto con il frontend in modalità MOCK.")
        return False
    if not venv_python().exists():
        run([sys.executable, "-m", "venv", str(VENV)], ROOT, "Creo l'ambiente virtuale .venv")
    if req.exists():
        digest = hashlib.sha256(req.read_bytes()).hexdigest()
        stamp = VENV / ".requirements.sha256"
        if not stamp.exists() or stamp.read_text().strip() != digest:
            run([str(venv_python()), "-m", "pip", "install", "--upgrade", "pip", "-q"], ROOT, "Aggiorno pip")
            run([str(venv_python()), "-m", "pip", "install", "-r", str(req)], ROOT, "Installo le dipendenze Python del backend")
            stamp.write_text(digest)
    else:
        say("ATTENZIONE: manca backend/requirements.txt, uso l'ambiente così com'è.")
    return True


def find_npm() -> str | None:
    return shutil.which("npm.cmd" if IS_WIN else "npm") or shutil.which("npm")


def setup_frontend(npm: str) -> str:
    marker = FRONTEND / "node_modules" / ".package-lock.json"
    pkg = FRONTEND / "package.json"
    if not marker.exists() or marker.stat().st_mtime < pkg.stat().st_mtime:
        run([npm, "install", "--no-audit", "--no-fund"], FRONTEND, "Installo le dipendenze del frontend (npm install, solo la prima volta)")
    return npm


def start(cmd: list[str], cwd: Path, env: dict | None = None) -> subprocess.Popen:
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if IS_WIN else 0
    return subprocess.Popen(cmd, cwd=cwd, env=env, creationflags=flags, start_new_session=not IS_WIN)


def stop(proc: subprocess.Popen | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    try:
        if IS_WIN:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
        else:
            os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=5)
    except Exception:
        proc.kill()


def open_browser(url: str, args) -> None:
    say(f"Pronto: {url}   (Ctrl+C per chiudere)")
    if not args.no_browser:
        webbrowser.open(url)


def run_prebuilt(args) -> None:
    """Senza Node.js: backend + interfaccia compilata sulla stessa porta (avvia_app.py)."""
    if port_in_use(BACKEND_PORT):
        die(f"La porta {BACKEND_PORT} è occupata: probabilmente il simulatore è già aperto in un altro terminale.")
    proc = None
    try:
        if not args.mock and setup_backend():
            say(f"Avvio il simulatore (versione già compilata) su http://127.0.0.1:{BACKEND_PORT}")
            env = dict(os.environ, AVVIA_BACKEND=(backend_module() or "main:app").split(":")[0])
            proc = start([str(venv_python()), "-m", "uvicorn", "avvia_app:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)], ROOT, env)
            if not wait_port(BACKEND_PORT, 40, proc):
                say("Il backend non è partito (vedi errori sopra): apro l'interfaccia in modalità MOCK.")
                stop(proc)
                proc = None
        if proc is None:
            # solo l'interfaccia, con il server web di Python: la fisica la calcola il browser
            proc = start([sys.executable, "-m", "http.server", str(BACKEND_PORT), "--bind", "127.0.0.1", "--directory", str(DIST)], ROOT)
            if not wait_port(BACKEND_PORT, 15, proc):
                die("Non riesco ad avviare il server dell'interfaccia: controlla i messaggi sopra.")
        open_browser(f"http://127.0.0.1:{BACKEND_PORT}", args)
        while proc.poll() is None:
            time.sleep(1)
        say("Il server si è chiuso.")
    except KeyboardInterrupt:
        print()
        say("Chiudo…")
    finally:
        stop(proc)


def build_frontend(npm: str) -> None:
    setup_frontend(npm)
    run([npm, "run", "build"], FRONTEND, "Compilo l'interfaccia in frontend/dist")
    say("Fatto: frontend/dist è aggiornata (ricordati di includerla nel commit).")


def main() -> None:
    ap = argparse.ArgumentParser(description="Avvia il Simulatore di Friedmann")
    ap.add_argument("--mock", action="store_true", help="solo frontend, fisica simulata nel browser")
    ap.add_argument("--no-browser", action="store_true", help="non aprire il browser")
    ap.add_argument("--reload", action="store_true", help="backend con auto-reload")
    ap.add_argument("--pronto", action="store_true", help="usa l'interfaccia già compilata anche se Node.js è installato")
    ap.add_argument("--compila", action="store_true", help="ricompila frontend/dist ed esci (serve Node.js)")
    args = ap.parse_args()

    if sys.version_info < (3, 9):
        die(f"Serve Python 3.9 o superiore (trovato {sys.version.split()[0]}).")

    npm = find_npm()
    has_dist = (DIST / "index.html").exists()
    if args.compila:
        if not npm:
            die("Per ricompilare l'interfaccia serve Node.js: https://nodejs.org")
        build_frontend(npm)
        return
    if args.pronto or not npm:
        if not has_dist:
            die("Node.js non è installato e manca l'interfaccia già compilata (frontend/dist).\n"
                "         Installa Node.js LTS da https://nodejs.org, riapri il terminale e riprova.")
        if not npm:
            say("Node.js non trovato: uso l'interfaccia già compilata (frontend/dist). Va benissimo per usare il simulatore.")
        run_prebuilt(args)
        return

    backend_proc = frontend_proc = None
    use_backend = not args.mock
    if use_backend and port_in_use(BACKEND_PORT):
        say(f"Sulla porta {BACKEND_PORT} risponde già qualcosa: uso quel backend.")
        use_backend = False
    elif use_backend:
        use_backend = setup_backend()

    setup_frontend(npm)
    if port_in_use(FRONTEND_PORT):
        die(f"La porta {FRONTEND_PORT} è occupata: probabilmente il simulatore è già aperto in un altro terminale.")

    try:
        if use_backend:
            cmd = [str(venv_python()), "-m", "uvicorn", backend_module() or "main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)]
            if args.reload:
                cmd.append("--reload")
            say(f"Avvio il backend su http://127.0.0.1:{BACKEND_PORT}")
            backend_proc = start(cmd, BACKEND)
            if not wait_port(BACKEND_PORT, 40, backend_proc):
                say("Il backend non è partito (vedi errori sopra): il frontend userà la modalità MOCK.")
                stop(backend_proc)
                backend_proc = None

        env = dict(os.environ)
        if args.mock:
            env["VITE_USE_MOCK"] = "1"
        say(f"Avvio il frontend su http://127.0.0.1:{FRONTEND_PORT}")
        frontend_proc = start([npm, "run", "dev", "--", "--clearScreen", "false"], FRONTEND, env)
        if not wait_port(FRONTEND_PORT, 60, frontend_proc):
            die("Il frontend non è partito: controlla i messaggi sopra.")

        open_browser(f"http://127.0.0.1:{FRONTEND_PORT}", args)

        while True:
            time.sleep(1)
            if frontend_proc.poll() is not None:
                say("Il frontend si è chiuso.")
                break
            if backend_proc is not None and backend_proc.poll() is not None:
                say("Il backend si è chiuso: il frontend passa alla modalità MOCK finché non lo riavvii.")
                backend_proc = None
    except KeyboardInterrupt:
        print()
        say("Chiudo…")
    finally:
        stop(frontend_proc)
        stop(backend_proc)


if __name__ == "__main__":
    main()
