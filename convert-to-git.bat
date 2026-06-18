@echo off
setlocal enabledelayedexpansion

:: Change to the folder where this script lives, regardless of where it was launched from
cd /d "%~dp0"

echo.
echo  =========================================
echo   Fricking Watch Repair - Convert to Git
echo  =========================================
echo.
echo  This turns a ZIP-based install into a Git install so you can
echo  update with one click (update.bat) from now on. Your data is
echo  not affected.
echo.

:: If this is already a Git install, there's nothing to do
if exist ".git\" (
    echo  This folder is already a Git install. You can use update.bat directly.
    echo.
    pause
    exit /b 0
)

:: Check that Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js was not found on this computer.
    echo.
    echo  Install Node.js from https://nodejs.org ^(click the "LTS" button^),
    echo  restart your computer, then run this script again.
    echo.
    pause
    exit /b 1
)

:: Check that Git is installed
where git >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Git was not found on this computer.
    echo.
    echo  Please install Git for Windows before running this script:
    echo    1. Open your browser and go to: https://git-scm.com/download/win
    echo    2. Run the installer, clicking Next through all the defaults
    echo    3. Close this window, open a NEW Command Prompt, and run
    echo       convert-to-git.bat again
    echo.
    pause
    exit /b 1
)

:: Make sure the app isn't running (its files are locked while it runs)
echo  Before continuing, please make sure the app is stopped:
echo  close any open "Fricking Watch Repair is starting..." terminal window.
echo.
echo  Note: this will replace the app's program files with the latest
echo  version. Your data (database, photos, manuals) is kept. Any manual
echo  edits you made to the program's source code will be discarded.
echo.
pause
echo.

:: Back up your data before changing anything
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

:: Connect this folder to the project repository
echo  Connecting this folder to the project repository...
echo.
git init
if errorlevel 1 (
    echo.
    echo  ERROR: "git init" failed. See the messages above for details.
    echo.
    pause
    exit /b 1
)

:: Point at the remote (remove first in case a stale one exists)
git remote remove origin >nul 2>&1
git remote add origin https://github.com/way2wyrd/watchrepair.git
if errorlevel 1 (
    echo.
    echo  ERROR: Could not add the remote repository.
    echo.
    pause
    exit /b 1
)

echo.
echo  Downloading the latest version...
echo.
git fetch origin
if errorlevel 1 (
    echo.
    echo  ERROR: Download failed. Check your internet connection and try again.
    echo  Your data has NOT been changed. A backup is in the backups folder.
    echo.
    pause
    exit /b 1
)

:: Adopt the latest code. This overwrites tracked source files but leaves
:: ignored data (database, uploads, manuals, movement-photos) untouched.
git reset --hard origin/main
if errorlevel 1 (
    echo.
    echo  ERROR: Could not switch to the latest version.
    echo  Your data has NOT been changed. A backup is in the backups folder.
    echo.
    pause
    exit /b 1
)

:: Name the local branch "main" and track the remote, regardless of the
:: default branch name this version of Git created.
git branch -M main
git branch --set-upstream-to=origin/main main >nul 2>&1

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

:: Rebuild the app with the latest code
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
echo   Done! This is now a Git install.
echo   - Double-click start.bat to launch the app.
echo   - Use update.bat for one-click updates from now on.
echo  =========================================
echo.
pause
