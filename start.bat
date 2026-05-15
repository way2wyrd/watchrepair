@echo off
setlocal

:: Change to the folder where this script lives, regardless of where it was launched from
cd /d "%~dp0"

:: Check that Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Node.js was not found on this computer.
    echo.
    echo  Please install Node.js before running this app:
    echo    1. Open your browser and go to: https://nodejs.org
    echo    2. Click the big "LTS" download button
    echo    3. Run the installer, clicking Next through all the defaults
    echo    4. Close this window, open a NEW Command Prompt, and run start.bat again
    echo.
    pause
    exit /b 1
)

:: Install dependencies on first run (or if node_modules is missing)
if not exist "node_modules\" (
    echo.
    echo  Installing dependencies -- this only happens once, please wait...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: npm install failed. See the messages above for details.
        echo.
        pause
        exit /b 1
    )
)

:: Build the frontend on first run (or if dist is missing)
if not exist "dist\" (
    echo.
    echo  Building the app -- this only happens once, please wait...
    echo.
    call npm run build
    if errorlevel 1 (
        echo.
        echo  ERROR: Build failed. See the messages above for details.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo  =========================================
echo   Fricking Watch Repair is starting...
echo   Open your browser to: http://localhost:3001
echo   Press Ctrl+C in this window to stop.
echo  =========================================
echo.

:: Open the browser (small delay gives the server a moment to start)
ping -n 2 127.0.0.1 >nul
start http://localhost:3001

:: Start the server (this blocks until Ctrl+C)
call npm run server

echo.
echo  Server stopped.
echo.
pause
