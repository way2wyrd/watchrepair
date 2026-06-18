@echo off
setlocal enabledelayedexpansion

:: Change to the folder where this script lives, regardless of where it was launched from
cd /d "%~dp0"

echo.
echo  =========================================
echo   Fricking Watch Repair - Update
echo  =========================================
echo.

:: Check that Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js was not found on this computer.
    echo.
    echo  Please install Node.js before updating this app:
    echo    1. Open your browser and go to: https://nodejs.org
    echo    2. Click the big "LTS" download button
    echo    3. Run the installer, clicking Next through all the defaults
    echo    4. Close this window, open a NEW Command Prompt, and run update.bat again
    echo.
    pause
    exit /b 1
)

:: Make sure the app isn't running (the database file is locked while it runs)
echo  Before continuing, please make sure the app is stopped:
echo  close any open "Fricking Watch Repair is starting..." terminal window.
echo.
pause
echo.

:: Back up your data (repairs, parts, users, settings) before changing anything
if exist "public\WatchRepair.db3" (
    if not exist "backups\" mkdir "backups"
    for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set STAMP=%%i
    copy /Y "public\WatchRepair.db3" "backups\WatchRepair_!STAMP!.db3" >nul
    if errorlevel 1 (
        echo  WARNING: Could not back up the database. Continuing anyway.
    ) else (
        echo  Backed up your database to: backups\WatchRepair_!STAMP!.db3
    )
    echo.
)

:: Update the app files
if exist ".git\" (
    echo  Downloading the latest version...
    echo.
    git pull
    if errorlevel 1 (
        echo.
        echo  ERROR: Update download failed. See the messages above for details.
        echo  Your data has NOT been changed. A backup is in the backups folder.
        echo.
        pause
        exit /b 1
    )
) else (
    echo  This copy was not installed with Git, so it cannot update itself
    echo  automatically. To update manually:
    echo.
    echo    1. Download the latest ZIP from GitHub
    echo       ^(green "Code" button -^> Download ZIP^)
    echo    2. Extract it to a NEW folder
    echo    3. Copy these data folders from THIS folder into the new one,
    echo       replacing the empty ones there:
    echo          public   uploads   manuals   movement-photos
    echo    4. Double-click start.bat inside the new folder
    echo.
    echo  See UPDATE.md for full step-by-step instructions.
    echo.
    pause
    exit /b 0
)

:: Install any new or updated dependencies
echo.
echo  Updating dependencies -- please wait...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo  ERROR: npm install failed. See the messages above for details.
    echo.
    pause
    exit /b 1
)

:: Rebuild the app with the new code
echo.
echo  Rebuilding the app -- please wait...
echo.
if exist "dist\" rmdir /s /q "dist"
call npm run build
if errorlevel 1 (
    echo.
    echo  ERROR: Build failed. See the messages above for details.
    echo.
    pause
    exit /b 1
)

echo.
echo  =========================================
echo   Update complete!
echo   Double-click start.bat to launch the app.
echo  =========================================
echo.
pause
