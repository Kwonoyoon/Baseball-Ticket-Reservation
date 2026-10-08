@echo off
rem Docker MySQL(3307)에 연결해서 백엔드를 켠다. cmd와 PowerShell 어디서 실행해도 된다.
rem 사용 전: Docker Desktop을 켜고 `docker compose up -d mysql redis`를 한 번 실행해 둔다.
rem .env의 값(DB 비밀번호 등)을 환경 변수로 읽는다. # 로 시작하는 줄은 건너뛴다.
setlocal
cd /d "%~dp0..\backend"
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("..\.env") do set "%%a=%%b"
set "DB_PORT=3307"
call gradlew.bat bootRun
