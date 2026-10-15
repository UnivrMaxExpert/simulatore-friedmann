@echo off
cd /d "%~dp0"
where py >NUL 2>NUL
if %errorlevel%==0 (py -3 avvia.py %*) else (python avvia.py %*)
pause
