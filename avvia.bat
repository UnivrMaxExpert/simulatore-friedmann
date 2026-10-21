@echo off
setlocal
cd /d "%~dp0"

rem Cerca Python 3 gia installato (non scarica niente)
set "PY="
py -3 --version >NUL 2>&1 && set "PY=py -3"
if not defined PY python --version >NUL 2>&1 && set "PY=python"
if not defined PY python3 --version >NUL 2>&1 && set "PY=python3"
if not defined PY for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*" "%ProgramFiles%\Python3*") do if exist "%%D\python.exe" set "PY="%%D\python.exe""

if not defined PY (
  echo.
  echo Python 3 non trovato.
  echo Installalo da https://www.python.org/downloads/
  echo spuntando "Add python.exe to PATH", poi rilancia avvia.bat.
  goto fine
)

%PY% avvia.py %*

:fine
echo.
pause
