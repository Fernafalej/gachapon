@echo off
setlocal

cd /d "%~dp0"

set "PORT=8000"

where py >nul 2>nul
if %errorlevel%==0 (
  echo Starte lokalen Server mit py auf http://localhost:%PORT%
  echo.
  echo Fenster offen lassen, solange der Server laufen soll.
  echo Mit Strg+C beenden.
  echo.
  py -m http.server %PORT%
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Starte lokalen Server mit python auf http://localhost:%PORT%
  echo.
  echo Fenster offen lassen, solange der Server laufen soll.
  echo Mit Strg+C beenden.
  echo.
  python -m http.server %PORT%
  goto :eof
)

echo Konnte weder "py" noch "python" finden.
echo Bitte installiere Python oder den Python Launcher fuer Windows.
echo Danach kannst du diese Datei erneut per Doppelklick starten.
echo.
pause
