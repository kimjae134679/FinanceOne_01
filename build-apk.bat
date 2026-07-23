@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo FinanceOne Android APK Build
echo ============================================================

where java >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Java was not found. Install JDK 21 and reopen this file.
  pause
  exit /b 1
)

if not exist "node_modules\@capacitor\cli" (
  echo [1/4] Installing Node dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/4] Node dependencies already installed.
)

set "SDK_PATH=%ANDROID_SDK_ROOT%"
if not defined SDK_PATH set "SDK_PATH=%ANDROID_HOME%"
if not defined SDK_PATH if exist "%LOCALAPPDATA%\Android\Sdk" set "SDK_PATH=%LOCALAPPDATA%\Android\Sdk"
if not defined SDK_PATH (
  echo [ERROR] Android SDK was not found.
  echo Install Android Studio and Android SDK Platform 36, then retry.
  pause
  exit /b 1
)

set "SDK_ESC=%SDK_PATH:\=\\%"
set "SDK_ESC=%SDK_ESC::=\:%"
> "android\local.properties" echo sdk.dir=%SDK_ESC%

echo [2/4] Copying web files into Android project...
call npx cap copy android
if errorlevel 1 goto :fail

echo [3/4] Building a clean debug APK...
pushd android
call gradlew.bat --stop >nul 2>&1
call gradlew.bat clean assembleDebug --stacktrace
if errorlevel 1 (
  popd
  goto :fail
)
popd

set "APK=android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK%" (
  echo [ERROR] Gradle finished, but the APK was not found.
  pause
  exit /b 1
)

copy /y "%APK%" "FinanceOne-Mobile-v1.4.7-debug.apk" >nul
echo [4/4] Finished.
echo.
echo APK: %CD%\FinanceOne-Mobile-v1.4.7-debug.apk
echo.
echo If Android says the app cannot be installed, uninstall the older
 echo FinanceOne app first only after exporting a backup. A different
 echo signing key or a higher installed version code can block updates.
pause
exit /b 0

:fail
echo.
echo [BUILD FAILED] Review the error above.
pause
exit /b 1
