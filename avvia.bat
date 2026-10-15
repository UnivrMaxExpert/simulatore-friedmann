@echo off
cd /d "%~dp0"
where py >/dev/null 2>/dev/null && (py -3 avvia.py %* & goto fine)
python --version >/dev/null 2>/dev/null && (python avvia.py %* & goto fine)
echo.
echo Python non risulta installato: provo a installarlo con winget...
winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo.
  echo Installazione automatica non riuscita. Scarica Python da https://www.python.org/downloads/
  echo spuntando "Add python.exe to PATH", poi rilancia avvia.bat.
  goto fine
)
echo.
echo Python installato. Chiudi questa finestra e fai di nuovo doppio clic su avvia.bat.
:fine
pause
