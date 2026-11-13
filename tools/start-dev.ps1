param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$entry=Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$statePath=Join-Path $projectRoot '.bonyeon-dev-server.json'
Set-Location -LiteralPath $projectRoot

if(Test-Path -LiteralPath $statePath) {
    $saved=Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if($saved.root -ne $projectRoot -or $saved.entry -ne $entry -or ($saved.pid -isnot [long] -and $saved.pid -isnot [int])) {
        throw '개발 서버 기록을 확인해 주세요. 다른 프로세스는 종료하지 않았습니다.'
    }
    $previous=Get-CimInstance Win32_Process -Filter ('ProcessId = '+[int]$saved.pid)
    if($previous) {
        if($previous.Name -ne 'node.exe' -or $previous.CommandLine -notmatch [regex]::Escape('"'+$entry+'"')) {
            throw '기록된 PID가 본연 개발 서버와 일치하지 않습니다. 해당 프로세스는 유지합니다.'
        }
        Stop-Process -Id $previous.ProcessId -ErrorAction Stop
        Wait-Process -Id $previous.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $statePath
}
if(-not(Test-Path -LiteralPath $entry)) {
    & npm.cmd install
    if($LASTEXITCODE -ne 0) {throw '패키지 설치에 실패했습니다.'}
}
$outLog=Join-Path $projectRoot '.bonyeon-dev-server.log'
$errorLog=Join-Path $projectRoot '.bonyeon-dev-server.error.log'
$process=Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @(('"'+$entry+'"'),'--host','127.0.0.1','--port','5173','--strictPort') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errorLog
@{pid=$process.Id;root=$projectRoot;entry=$entry} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
Start-Sleep -Seconds 2
if($process.HasExited) {throw ('개발 서버가 시작되지 않았습니다. 포트 사용 여부와 로그를 확인해 주세요: '+$errorLog)}
Write-Host ('본연 개발 서버: http://localhost:5173 · PID '+$process.Id)
Write-Host ('로그: '+$outLog)
if(-not $NoBrowser) {Start-Process 'http://localhost:5173'}
