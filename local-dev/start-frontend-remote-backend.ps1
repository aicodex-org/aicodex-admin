<#
.SYNOPSIS
  只启动本地前端，并把接口请求代理到远端后台。

.DESCRIPTION
  这个脚本用于只验证前端 UI 的场景。它不会启动 Go 后端，也不会读取
  local-dev/runtime.toml。

  推荐把个人私有配置放在 local-dev/.env：
    AICODEX_ADMIN_FRONTEND_PORT=7003
    AICODEX_ADMIN_DEV_PROXY_TARGET=http://<60-test-backend>:18080
    AICODEX_ADMIN_BACKEND_HEALTH_PATH=/api/get-account

  local-dev/.env 已被 git 忽略，适合保存本机测试后台地址。仓库只提交
  local-dev/.env.example。配置优先级为：
    1. 命令行参数，例如 -Port、-BackendUrl、-BackendHealthPath
    2. local-dev/.env
    3. 当前 PowerShell 进程环境变量
    4. 脚本默认值

  常用用法速查：
    .\local-dev\start-frontend-remote-backend.ps1 restart
      使用 local-dev/.env 启动或重启本地前端。

    .\local-dev\start-frontend-remote-backend.ps1 restart -Port 7003
      显式指定前端端口，后台地址仍使用 local-dev/.env。

    .\local-dev\start-frontend-remote-backend.ps1 restart -Port 7003 -BackendUrl "http://<test-backend>:18080"
      临时覆盖后台地址，端口仍使用 local-dev/.env。

    .\local-dev\start-frontend-remote-backend.ps1 status
      查看当前端口、PID、日志文件和脱敏后的代理目标。

    .\local-dev\start-frontend-remote-backend.ps1 logs -Follow
      持续查看本地前端编译日志。

    .\local-dev\start-frontend-remote-backend.ps1 stop
      只停止当前 workspace 由本脚本管理的本地前端进程。

.PARAMETER Action
  start/stop/restart/status/logs。默认 status，避免误启动或误停止。

.PARAMETER Port
  本地前端开发服务器端口。默认 7003；也可在 local-dev/.env 中设置
  AICODEX_ADMIN_FRONTEND_PORT。

.PARAMETER BackendUrl
  远端后台基础地址。start/restart 时必须通过参数、local-dev/.env、
  AICODEX_ADMIN_DEV_PROXY_TARGET 或 AICODEX_ADMIN_PROXY_TARGET 提供。

.PARAMETER BackendHealthPath
  用于确认目标后台的轻量 JSON 接口。默认 /api/get-account；脚本不会把
  这个路径和完整后台私有地址一起打印。也可在 local-dev/.env 中设置
  AICODEX_ADMIN_BACKEND_HEALTH_PATH。

.PARAMETER DryRun
  只解析启动命令和环境变量，不启动或停止进程。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 restart

  使用 local-dev/.env 里的端口和后台地址启动。适合日常手动启动。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 restart -Port 7003

  显式指定本地前端端口；后台地址仍读取 local-dev/.env。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 restart -Port 7003 -BackendUrl "http://<test-backend>:18080"

  同时显式指定本地端口和后台地址。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 restart -DryRun

  只解析最终启动命令，验证 local-dev/.env 和命令行参数是否生效，不启动或停止进程。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 status

  查看当前实例状态、PID、日志路径和脱敏后的代理目标。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 logs -Follow

  持续查看本地前端日志；退出查看可按 Ctrl+C。

.EXAMPLE
  .\local-dev\start-frontend-remote-backend.ps1 stop

  停止当前端口对应且可归因到本 workspace 的前端进程。
#>

param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
  [string]$Action = 'status',

  [ValidateRange(1, 65535)]
  [int]$Port = 7003,

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
$EnvFile = Join-Path $PSScriptRoot '.env'
$RunDir = Join-Path $PSScriptRoot 'run'
$LogDir = Join-Path $PSScriptRoot 'logs'

function Read-LocalEnvFile {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $Path) {
    $lineNumber++
    $trimmed = $line.Trim()
    if ($trimmed -eq '' -or $trimmed.StartsWith('#')) {
      continue
    }
    if ($trimmed.StartsWith('export ')) {
      $trimmed = $trimmed.Substring(7).Trim()
    }

    $separatorIndex = $trimmed.IndexOf('=')
    if ($separatorIndex -lt 1) {
      throw ("{0}:{1}: expected KEY=VALUE" -f $Path, $lineNumber)
    }

    $key = $trimmed.Substring(0, $separatorIndex).Trim()
    if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
      throw ("{0}:{1}: invalid environment variable name '{2}'" -f $Path, $lineNumber, $key)
    }

    $value = $trimmed.Substring($separatorIndex + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$key] = $value
  }

  return $values
}

function Get-LocalEnvValue {
  param(
    [hashtable]$Values,
    [string[]]$Names
  )

  foreach ($name in $Names) {
    if ($Values.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace([string]$Values[$name])) {
      return [string]$Values[$name]
    }
  }
  return ''
}

function Get-ProcessEnvValue {
  param(
    [string[]]$Names
  )

  foreach ($name in $Names) {
    $value = [Environment]::GetEnvironmentVariable($name, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value
    }
  }
  return ''
}

function Resolve-IntegerRangeValue {
  param(
    [string]$Value,
    [string]$Source,
    [int]$Min,
    [int]$Max
  )

  $resolvedValue = 0
  if (-not [int]::TryParse($Value, [ref]$resolvedValue) -or $resolvedValue -lt $Min -or $resolvedValue -gt $Max) {
    throw ("{0} must be an integer between {1} and {2}." -f $Source, $Min, $Max)
  }
  return $resolvedValue
}

$LocalEnv = Read-LocalEnvFile -Path $EnvFile

if (-not $PSBoundParameters.ContainsKey('Port')) {
  $envPort = Get-LocalEnvValue -Values $LocalEnv -Names @('AICODEX_ADMIN_FRONTEND_PORT', 'FRONTEND_PORT', 'PORT')
  if ([string]::IsNullOrWhiteSpace($envPort)) {
    $envPort = Get-ProcessEnvValue -Names @('AICODEX_ADMIN_FRONTEND_PORT', 'FRONTEND_PORT', 'PORT')
  }
  if (-not [string]::IsNullOrWhiteSpace($envPort)) {
    $Port = Resolve-IntegerRangeValue -Value $envPort -Source 'AICODEX_ADMIN_FRONTEND_PORT' -Min 1 -Max 65535
  }
}

if ((-not $PSBoundParameters.ContainsKey('BackendUrl')) -or [string]::IsNullOrWhiteSpace($BackendUrl)) {
  $envBackendUrl = Get-LocalEnvValue -Values $LocalEnv -Names @('AICODEX_ADMIN_DEV_PROXY_TARGET', 'AICODEX_ADMIN_PROXY_TARGET', 'BACKEND_URL')
  if ([string]::IsNullOrWhiteSpace($envBackendUrl)) {
    $envBackendUrl = Get-ProcessEnvValue -Names @('AICODEX_ADMIN_DEV_PROXY_TARGET', 'AICODEX_ADMIN_PROXY_TARGET', 'BACKEND_URL')
  }
  if (-not [string]::IsNullOrWhiteSpace($envBackendUrl)) {
    $BackendUrl = $envBackendUrl
  }
}

if (-not $PSBoundParameters.ContainsKey('BackendHealthPath')) {
  $envBackendHealthPath = Get-LocalEnvValue -Values $LocalEnv -Names @('AICODEX_ADMIN_BACKEND_HEALTH_PATH', 'BACKEND_HEALTH_PATH')
  if ([string]::IsNullOrWhiteSpace($envBackendHealthPath)) {
    $envBackendHealthPath = Get-ProcessEnvValue -Names @('AICODEX_ADMIN_BACKEND_HEALTH_PATH', 'BACKEND_HEALTH_PATH')
  }
  if (-not [string]::IsNullOrWhiteSpace($envBackendHealthPath)) {
    $BackendHealthPath = $envBackendHealthPath
  }
}

if (-not $PSBoundParameters.ContainsKey('WebWaitSeconds')) {
  $envWebWaitSeconds = Get-LocalEnvValue -Values $LocalEnv -Names @('AICODEX_ADMIN_FRONTEND_WAIT_SECONDS', 'WEB_WAIT_SECONDS')
  if ([string]::IsNullOrWhiteSpace($envWebWaitSeconds)) {
    $envWebWaitSeconds = Get-ProcessEnvValue -Names @('AICODEX_ADMIN_FRONTEND_WAIT_SECONDS', 'WEB_WAIT_SECONDS')
  }
  if (-not [string]::IsNullOrWhiteSpace($envWebWaitSeconds)) {
    $WebWaitSeconds = Resolve-IntegerRangeValue -Value $envWebWaitSeconds -Source 'AICODEX_ADMIN_FRONTEND_WAIT_SECONDS' -Min 1 -Max 86400
  }
}

if (-not $PSBoundParameters.ContainsKey('Tail')) {
  $envTail = Get-LocalEnvValue -Values $LocalEnv -Names @('AICODEX_ADMIN_LOG_TAIL', 'LOG_TAIL')
  if ([string]::IsNullOrWhiteSpace($envTail)) {
    $envTail = Get-ProcessEnvValue -Names @('AICODEX_ADMIN_LOG_TAIL', 'LOG_TAIL')
  }
  if (-not [string]::IsNullOrWhiteSpace($envTail)) {
    $Tail = Resolve-IntegerRangeValue -Value $envTail -Source 'AICODEX_ADMIN_LOG_TAIL' -Min 1 -Max 100000
  }
}

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
  if (Test-Path -LiteralPath $EnvFile) {
    Write-Host ("env_file:   {0}" -f $EnvFile)
  }
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
  $isViteCommand = $normalizedCommand.Contains('vite.cmd') `
    -or $normalizedCommand.Contains(' exec vite') `
    -or $normalizedCommand.Contains(' vite ')
  return $normalizedCommand.Contains($normalizedWebDir) -and $isViteCommand
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
    # 或命令行能证明它属于当前 workspace 的 web-admin Vite 进程时才清理。
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
  # 直接调用 Vite CLI，让脚本通过 PORT 覆盖 package 默认端口，同时保留 workspace 进程归属信号。
  $localVite = Join-Path $WebDir 'node_modules\.bin\vite.cmd'
  if (Test-Path -LiteralPath $localVite) {
    return ('"{0}"' -f $localVite)
  }

  $yarn = Get-Command 'yarn.cmd' -ErrorAction SilentlyContinue
  if ($null -ne $yarn) {
    return ('"{0}" vite' -f $yarn.Source)
  }

  $npm = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
  if ($null -ne $npm) {
    return ('"{0}" exec vite --' -f $npm.Source)
  }

  throw 'Neither local vite.cmd, yarn.cmd nor npm.cmd was found. Install web-admin dependencies before starting the frontend.'
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
