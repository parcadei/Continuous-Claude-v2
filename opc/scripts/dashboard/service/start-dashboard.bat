@echo off
REM Start the Session Dashboard service
REM Called by Task Scheduler on logon

cd /d C:\Users\david.hayes\continuous-claude\opc\scripts
C:\Users\david.hayes\.local\bin\uv.exe run python -m dashboard.main
