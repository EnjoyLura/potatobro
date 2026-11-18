@echo off
rem Build the web-mobile package with the Cocos Creator 3.8.8 command line.
rem Exit code 36 means "build succeeded" for Cocos Creator's CLI.
set CREATOR=C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe
"%CREATOR%" --project "%~dp0." --build "configPath=%~dp0build-web.json"
if not %ERRORLEVEL%==36 (echo Build finished with code %ERRORLEVEL% & exit /b 1)
rem sharp rendering on 3x phones, no engine splash, cache-busting (see tools/postbuild.py)
python "%~dp0tools\postbuild.py" || (echo Post-build patch FAILED & exit /b 1)
echo Build OK: build\web-mobile
