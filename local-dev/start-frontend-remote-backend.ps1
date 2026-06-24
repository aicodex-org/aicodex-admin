<#
.SYNOPSIS
  只启动本地前端，并把接口请求代理到远端后台。

.DESCRIPTION
  这个脚本用于只验证前端 UI 的场景。它不会启动 Go 后端，也不会读取
  local-dev/runtime.toml。前端端口和后台地址都显式传入，方便同一项目
  同时启动多个本地前端预览实例。

.PARAMETER Action
  start/stop/restart/status/logs。默认 status，避免误启动或误停止。

.PARAMETER Port
  本地前端开发服务器端口。默认 7002。

.PARAMETER BackendUrl
  远端后台基础地址。start/restart 时必须传入，除非当前进程已经设置
  AICODEX_ADMIN_DEV_PROXY_TARGET 或 AICODEX_ADMIN_PROXY_TARGET。

.PARAMETER BackendHealthPath
  用于确认目标后台的轻量 JSON 接口。默认 /api/get-account；脚本不会把
  这个路径和完整后台私有地址一起打印。

.PARAMETER DryRun
  只解析启动命令和环境变量，不启动或停止进程。
#>

param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
  [string]$Action = 'status',

  [ValidateRange(1, 65535)]
  [int]$Port = 7002,

  [string]$BackendUrl = '',
  [string]$BackendHealthPath = '/api/get-account',
  [switch]$Console,
  [switch]$Follow,
  [switch]$DryRun,
  [switch]$SkipHealth,
  [int]$WebWaitSeconds = 90,
  [int]$Tail = 80
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptStartedAt = Get-Date
$ScriptCompleted = $false

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$WebDir = Join-Path $RepoRoot 'web-admin'
$RunDir = Join-Path $PSScriptRoot 'run'
$LogDir = Join-Path $PSScriptRoot 'logs'
$InstanceName = "frontend-remote-$Port"
$WebLog = Join-Path $LogDir "$InstanceName.log"
$WebPidFile = Join-Path $RunDir "$InstanceName.pid"
$WebMetaFile = Join-Path $RunDir "$InstanceName.json"

function Write-Step {
  param([string]$Message)
  Write-Host ''
  Write-Host "==> $Message"
}

function Format-RunTimestamp {
  param([datetime]$Time)
  return $Time.ToString('yyyy-MM-dd HH:mm:ss zzz')
}

function Format-RunDuration {
  param([timespan]$Duration)
  $totalHours = [Math]::Floor($Duration.TotalHours)
  $totalMinutes = [Math]::Floor($Duration.TotalMinutes)

  if ($Duration.TotalHours -ge 1) {
    return '{0:00}:{1:00}:{2:00}' -f $totalHours, $Duration.Minutes, $Duration.Seconds
  }
  return '{0:00}:{1:00}' -f $totalMinutes, $Duration.Seconds
}

function Write-RunStarted {
  Write-Step 'Run started'
  Write-Host ("action:     {0}" -f $Action)
  Write-Host ("port:       {0}" -f $Port)
  Write-Host ("started_at: {0}" -f (Format-RunTimestamp $ScriptStartedAt))
}

function Write-RunCompleted {
  param([bool]$Succeeded)

  $completedAt = Get-Date
  $status = if ($Succeeded) { 'success' } else { 'failed' }
  Write-Step 'Run completed'
  Write-Host ("status:       {0}" -f $status)
  Write-Host ("completed_at: {0}" -f (Format-RunTimestamp $completedAt))
  Write-Host ("duration:     {0}" -f (Format-RunDuration ($completedAt - $ScriptStartedAt)))
}

function Should-WriteRunCompleted {
  return -not ($Action -eq 'logs' -and $Follow)
}

function Ensure-LocalDevDirectories {
  foreach ($dir in @($RunDir, $LogDir, (Join-Path $PSScriptRoot 'tmp'))) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

function Read-PidFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $raw = (Get-Content -LiteralPath $Path -Raw).Trim()
  if ($raw -notmatch '^\d+$') {
    return $null
  }

  return [int]$raw
}

function Test-ProcessRunning {
  param([string]$PidFile)

  $processId = Read-PidFile -Path $PidFile
  if ($null -eq $processId) {
    return $false
  }

  return $null -ne (Get-Process -Id $processId -ErrorAction SilentlyContinue)
}

function Remove-FileIfExists {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function Get-PortOwnerProcessIds {
  param([int[]]$Ports)

  $owners = [System.Collections.Generic.HashSet[int]]::new()
  $lines = @(netstat.exe -ano -p tcp 2>$null)
  foreach ($line in $lines) {
    $parts = @($line -split '\s+' | Where-Object { $_ -ne '' })
    if ($parts.Count -lt 5 -or $parts[0] -ne 'TCP' -or $parts[3] -ne 'LISTENING') {
      continue
    }

    foreach ($candidatePort in $Ports) {
      if ($parts[1] -match (':{0}$' -f $candidatePort) -and $parts[4] -match '^\d+$') {
        $owners.Add([int]$parts[4]) | Out-Null
      }
    }
  }

  return @($owners)
}

function Test-OwnedFrontendProcess {
  param([int]$ProcessId)

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if ($null -eq $process -or [string]::IsNullOrWhiteSpace($process.CommandLine)) {
    return $false
  }

  $normalizedCommand = $process.CommandLine.ToLowerInvariant()
  $normalizedWebDir = $WebDir.ToLowerInvariant()
  return $normalizedCommand.Contains($normalizedWebDir) -and $normalizedCommand.Contains('craco') -and $normalizedCommand.Contains('start')
}

function Stop-FrontendRemote {
  Ensure-LocalDevDirectories

  $processId = Read-PidFile -Path $WebPidFile
  $processIds = [System.Collections.Generic.List[int]]::new()
  $managedPidIsCurrent = $false
  if ($null -ne $processId) {
    if (Test-OwnedFrontendProcess -ProcessId $processId) {
      $processIds.Add($processId)
      $managedPidIsCurrent = $true
    } else {
      Write-Host ("{0}: pid file points to pid={1}, but it no longer matches this web-admin frontend" -f $InstanceName, $processId)
    }
  }

  foreach ($ownerId in Get-PortOwnerProcessIds -Ports @($Port)) {
    # 端口可能被其它项目或手工启动的 dev server 占用；只有 PID 文件已管理，
    # 或命令行能证明它属于当前 workspace 的 web-admin Craco 进程时才清理。
    if ($managedPidIsCurrent -or (Test-OwnedFrontendProcess -ProcessId $ownerId)) {
      $processIds.Add($ownerId)
    } else {
      Write-Host ("{0}: port {1} is owned by pid={2}, but it was not started from this web-admin workspace" -f $InstanceName, $Port, $ownerId)
    }
  }

  $stopped = [System.Collections.Generic.List[int]]::new()
  foreach ($id in @($processIds | Sort-Object -Unique)) {
    $process = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      continue
    }

    Stop-Process -Id $id -Force -ErrorAction Stop
    $process.WaitForExit(5000) | Out-Null
    if ($null -ne (Get-Process -Id $id -ErrorAction SilentlyContinue)) {
      throw ("{0}: failed to stop process pid={1}" -f $InstanceName, $id)
    }
    $stopped.Add($id)
  }

  Remove-FileIfExists -Path $WebPidFile
  Remove-FileIfExists -Path $WebMetaFile
  if ($stopped.Count -eq 0) {
    Write-Host "${InstanceName}: stopped"
    return
  }

  Write-Host ("{0}: stopped ({1})" -f $InstanceName, ($stopped -join ','))
}

function Test-TcpPortOpen {
  param([int]$TestPort)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync('127.0.0.1', $TestPort)
    return $task.Wait(500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 5
  )

  try {
    $process = Start-Process -FilePath 'curl.exe' -ArgumentList @('-fsS', '--max-time', [string]$TimeoutSeconds, $Url) -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $env:TEMP "$InstanceName-curl.out") -RedirectStandardError (Join-Path $env:TEMP "$InstanceName-curl.err")
    return $process.ExitCode -eq 0
  } catch {
    return $false
  }
}

function Wait-HttpOk {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpOk -Url $Url) {
      Write-Host "$Name health: $Url ok"
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "$Name did not return HTTP success from $Url within ${TimeoutSeconds}s"
}

function Add-LogHeader {
  param(
    [string]$LogFile,
    [string]$Name
  )

  Add-Content -LiteralPath $LogFile -Value ("`n==== {0} start {1} ====" -f (Get-Date -Format s), $Name)
}

function Resolve-BackendUrl {
  $value = $BackendUrl
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable('AICODEX_ADMIN_DEV_PROXY_TARGET', 'Process')
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable('AICODEX_ADMIN_PROXY_TARGET', 'Process')
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw 'BackendUrl is required for start/restart unless AICODEX_ADMIN_DEV_PROXY_TARGET or AICODEX_ADMIN_PROXY_TARGET is set.'
  }
  if ($value.Contains('"')) {
    throw 'BackendUrl must not contain double quotes.'
  }

  $candidate = $value.Trim().TrimEnd('/')
  try {
    $uri = [System.Uri]$candidate
  } catch {
    throw 'BackendUrl must be an absolute http(s) URL.'
  }

  if (-not $uri.IsAbsoluteUri -or ($uri.Scheme -ne 'http' -and $uri.Scheme -ne 'https')) {
    throw 'BackendUrl must be an absolute http(s) URL.'
  }

  return $uri.AbsoluteUri.TrimEnd('/')
}

function Format-BackendUrlForDisplay {
  param([string]$Url)

  $uri = [System.Uri]$Url
  $portText = if ($uri.IsDefaultPort) { '' } else { ":$($uri.Port)" }
  return "$($uri.Scheme)://<redacted>$portText"
}

function Join-UrlPath {
  param(
    [string]$BaseUrl,
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $BaseUrl
  }

  $normalizedPath = $Path.Trim()
  if (-not $normalizedPath.StartsWith('/')) {
    $normalizedPath = "/$normalizedPath"
  }

  return $BaseUrl.TrimEnd('/') + $normalizedPath
}

function Test-BackendHealth {
  param([string]$ResolvedBackendUrl)

  $healthUrl = Join-UrlPath -BaseUrl $ResolvedBackendUrl -Path $BackendHealthPath
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 8 -Headers @{ Accept = 'application/json' }
  } catch {
    throw ("backend health failed for configured target path {0}; expected a JSON service response, not 404 or another service" -f $BackendHealthPath)
  }

  $body = ([string]$response.Content).TrimStart()
  if ([string]::IsNullOrWhiteSpace($body) -or ($body[0] -ne '{' -and $body[0] -ne '[')) {
    throw ("backend health failed for configured target path {0}; response was not JSON" -f $BackendHealthPath)
  }

  # 不打印完整私有后台地址或响应体；这里只证明目标路径返回了预期服务的 JSON。
  Write-Host ("backend health: configured target returned JSON from {0}" -f $BackendHealthPath)
}

function Resolve-FrontendStartCommand {
  # 不调用 "yarn start"：package.json 里固定了 PORT=7002。直接调用 Craco
  # 才能让 -Port 参数生效，支持多个本地前端预览并行启动。
  $localCraco = Join-Path $WebDir 'node_modules\.bin\craco.cmd'
  if (Test-Path -LiteralPath $localCraco) {
    return ('"{0}" start' -f $localCraco)
  }

  $yarn = Get-Command 'yarn.cmd' -ErrorAction SilentlyContinue
  if ($null -ne $yarn) {
    return ('"{0}" craco start' -f $yarn.Source)
  }

  $npm = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
  if ($null -ne $npm) {
    return ('"{0}" exec craco -- start' -f $npm.Source)
  }

  throw 'Neither local craco.cmd, yarn.cmd nor npm.cmd was found. Install web-admin dependencies before starting the frontend.'
}

function Start-ManagedCommand {
  param(
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$PidFile,
    [string]$LogFile
  )

  if (Test-ProcessRunning -PidFile $PidFile) {
    Write-Host "${InstanceName}: already running ($(Read-PidFile -Path $PidFile))"
    return
  }

  Add-LogHeader -LogFile $LogFile -Name $InstanceName
  if ($Console) {
    $cmdLine = "cd /d `"$WorkingDirectory`" && $Command"
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/s', '/k', $cmdLine) -PassThru
  } else {
    $cmdLine = "cd /d `"$WorkingDirectory`" && $Command >> `"$LogFile`" 2>&1"
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/s', '/c', $cmdLine) -WindowStyle Hidden -PassThru
  }

  Set-Content -LiteralPath $PidFile -Value $process.Id
  Write-Host "${InstanceName}: started ($($process.Id))"
}

function Write-Metadata {
  param(
    [string]$BackendDisplay,
    [string]$HealthPath
  )

  # 只保存非敏感展示信息；真实后台地址只进入子进程环境，日志也留在 local-dev/。
  $metadata = [ordered]@{
    port = $Port
    backend = $BackendDisplay
    healthPath = $HealthPath
    startedAt = (Get-Date).ToString('o')
    pidFile = $WebPidFile
    logFile = $WebLog
  }
  $metadata | ConvertTo-Json | Set-Content -LiteralPath $WebMetaFile -Encoding UTF8
}

function Start-FrontendRemote {
  Ensure-LocalDevDirectories

  $resolvedBackendUrl = Resolve-BackendUrl
  $backendDisplay = Format-BackendUrlForDisplay -Url $resolvedBackendUrl
  Write-Host ("frontend: http://127.0.0.1:{0}" -f $Port)
  Write-Host ("backend:  {0}" -f $backendDisplay)
  Write-Host ("health:   {0}" -f $BackendHealthPath)

  if (-not $SkipHealth -and -not $DryRun) {
    Test-BackendHealth -ResolvedBackendUrl $resolvedBackendUrl
  }

  $frontendCommand = Resolve-FrontendStartCommand
  $command = "set `"PORT=$Port`" && set `"BROWSER=none`" && set `"CI=true`" && set `"AICODEX_ADMIN_DEV_PROXY_TARGET=$resolvedBackendUrl`" && $frontendCommand"

  if ($DryRun) {
    Write-Step 'Dry run'
    Write-Host ("working_directory: {0}" -f $WebDir)
    Write-Host ("command:           set PORT={0}; set BROWSER=none; set CI=true; set AICODEX_ADMIN_DEV_PROXY_TARGET=<redacted>; {1}" -f $Port, $frontendCommand)
    return
  }

  Write-Step 'Stop stale frontend process'
  Stop-FrontendRemote

  Write-Step 'Start frontend'
  Start-ManagedCommand -WorkingDirectory $WebDir -Command $command -PidFile $WebPidFile -LogFile $WebLog
  Write-Metadata -BackendDisplay $backendDisplay -HealthPath $BackendHealthPath

  if (-not $SkipHealth) {
    Wait-HttpOk -Name $InstanceName -Url ("http://127.0.0.1:{0}/" -f $Port) -TimeoutSeconds $WebWaitSeconds
  }

  Show-Status
}

function Show-Status {
  Ensure-LocalDevDirectories

  Write-Step 'Frontend process'
  $processId = Read-PidFile -Path $WebPidFile
  $state = if (Test-ProcessRunning -PidFile $WebPidFile) { 'running' } else { 'stopped' }
  $pidText = if ($null -eq $processId) { '-' } else { [string]$processId }
  Write-Host ("{0,-22} {1,-8} pid={2}" -f $InstanceName, $state, $pidText)

  Write-Step 'Endpoint'
  $portState = if (Test-TcpPortOpen -TestPort $Port) { 'listening' } else { 'down' }
  Write-Host ("frontend              {0,-10} http://127.0.0.1:{1}" -f $portState, $Port)

  Write-Step 'Logs'
  Write-Host "frontend: $WebLog"

  if (Test-Path -LiteralPath $WebMetaFile) {
    Write-Step 'Proxy'
    $metadata = Get-Content -LiteralPath $WebMetaFile -Raw | ConvertFrom-Json
    Write-Host ("backend:  {0}" -f $metadata.backend)
    Write-Host ("health:   {0}" -f $metadata.healthPath)
  }
}

function Show-Logs {
  Ensure-LocalDevDirectories
  if (-not (Test-Path -LiteralPath $WebLog)) {
    New-Item -ItemType File -Force -Path $WebLog | Out-Null
  }

  if ($Follow) {
    Get-Content -LiteralPath $WebLog -Tail $Tail -Wait
    return
  }

  Write-Step $WebLog
  Get-Content -LiteralPath $WebLog -Tail $Tail
}

Write-RunStarted
try {
  switch ($Action) {
    'start' {
      Start-FrontendRemote
    }
    'stop' {
      Stop-FrontendRemote
    }
    'restart' {
      if (-not $DryRun) {
        Stop-FrontendRemote
      }
      Start-FrontendRemote
    }
    'status' {
      Show-Status
    }
    'logs' {
      Show-Logs
    }
  }
  $ScriptCompleted = $true
} finally {
  if (Should-WriteRunCompleted) {
    Write-RunCompleted $ScriptCompleted
  }
}
