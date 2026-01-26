@echo off
cd /d "%~dp0"

echo ===================================================
echo   초기화 및 서버 재시작 (Reset & Run)
echo ===================================================

:: 1. 기존 Node 프로세스 정리 (강제 종료)
echo [1/4] 기존 실행 중인 서버(Node.js)를 종료합니다...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 >nul

:: 2. 패키지 확인
if not exist node_modules (
    echo [2/4] node_modules 설치 중...
    call npm install
)

:: 3. 서버 실행 (새 창에서 실행, 에러 시 창 유지)
echo [3/4] 새 서버를 시작합니다...
:: /k 옵션은 명령 수행 후 창을 닫지 않음 (에러 확인용)
start "Vite Dev Server" cmd /k "npm run dev"

:: 4. 브라우저 열기 (서버 부팅 대기 후)
echo [4/4] 브라우저를 실행합니다...
echo 잠시 대기 중 (5초)...
timeout /t 5 >nul
start http://localhost:5173

echo.
echo ===================================================
echo   모든 작업이 완료되었습니다.
echo   서버 로그는 새로 뜬 창을 확인해주세요.
echo ===================================================
timeout /t 3 >nul
exit
