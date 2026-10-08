# 팀 공용 DB(Aiven)에 붙어서 백엔드를 Docker 없이 실행한다.
# 사용법: 프로젝트 루트에서  .\scripts\run-backend-shared-db.ps1
$root = Split-Path -Parent $PSScriptRoot

# .env의 KEY=VALUE 줄을 환경변수로 올린다 (주석·빈 줄 제외)
Get-Content (Join-Path $root ".env") -Encoding UTF8 | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2]
    }
}

# 공용 DB에 샘플 경기가 또 쌓이지 않게 끄고, Redis 없이 실행한다.
$env:SAMPLE_DATA_ENABLED = "false"
$env:TICKETING_SEAT_HOLD_STORE = "memory"
$env:TICKETING_NOTIFICATION_BROADCAST = "local"
$env:SPRING_CACHE_TYPE = "simple"
# 로컬(http)에서는 보안 쿠키가 저장되지 않으므로 끈다.
$env:AUTH_COOKIE_SECURE = "false"

# 프로젝트는 Java 21이 필요하다.
if (Test-Path "C:\Program Files\Java\jdk-21.0.11") { $env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.11" }

Set-Location (Join-Path $root "backend")
.\gradlew.bat bootRun
