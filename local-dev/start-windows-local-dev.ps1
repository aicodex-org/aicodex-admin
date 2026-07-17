<#
.SYNOPSIS
  aicodex-admin Windows 本地开发一键启停脚本。

.DESCRIPTION
  这个脚本用于“代码在 Windows 本机跑，PostgreSQL 连接由 local-dev/runtime.toml 指定”的快速开发模式：
  - Go 后端从 admin/ 构建到 local-dev/cache/admin-server-local-dev.exe 后启动；
  - React 管理端从 web-admin/ 启动，默认使用 package.json 中的 7002 端口；
  - 前端开发服务器把 /api、/swagger、/files、/cas、/scim 等请求代理到本机后端 8000；
  - PostgreSQL 必填，Redis session 可选；未启用 Redis 时后端回退到本地文件 session；
  - 默认不管理 Docker/WSL 容器，也不修改 deploy/app.conf 或其它可追踪配置文件。

  注意：运行时写入的 PID、日志、临时文件和本地构建 exe 由 local-dev/.gitignore 忽略。

.NOTES
  常见场景速查：
  - 日常前后端联调：.\local-dev\start-windows-local-dev.ps1 start
  - 改了 Go 或 React 后重启：.\local-dev\start-windows-local-dev.ps1 restart
  - 只检查 runtime.toml 解析和环境变量映射：.\local-dev\start-windows-local-dev.ps1 start -DryRun
  - 临时停止本机 backend/web：.\local-dev\start-windows-local-dev.ps1 stop
  - 查看状态：.\local-dev\start-windows-local-dev.ps1 status
  - 查看日志：.\local-dev\start-windows-local-dev.ps1 logs -Tail 120
  - 跟随后端日志：.\local-dev\start-windows-local-dev.ps1 logs -Service backend -Follow
  - 如果 Windows 首次提示是否允许 admin-server-local-dev.exe 运行，允许一次固定路径即可，后续不应因 go run 临时 exe 反复弹窗。

.PARAMETER Action
  start/stop/restart/status/logs。默认 status，避免误启动或误停止服务。

.PARAMETER Service
  logs 动作下用于选择 all/backend/web。默认 all。

.PARAMETER RuntimeConfigFile
  本地运行时配置文件，默认 local-dev/runtime.toml。用于配置远端 PostgreSQL 和可选 Redis。

.PARAMETER Console
  用可见 cmd 窗口启动本地 backend/web，适合需要交互式观察输出的场景。
  默认后台启动，并把日志写到 local-dev/logs/。

.PARAMETER Follow
  logs 动作下持续跟随日志输出，相当于 tail -f。

.PARAMETER DryRun
  只解析 runtime.toml 并打印后端环境变量映射，不启动进程；敏感值会脱敏。

.PARAMETER SkipHealth
  跳过 backend 8000 与 web 7002 健康检查。适合只想拉起进程后自己排查启动日志的场景。

.PARAMETER BackendWaitSeconds
  等待本地 Go 后端 8000 监听的最长秒数，默认 90。
  脚本每次 start/restart 都会先 go build，冷缓存或首次构建可能需要更久。

.PARAMETER WebWaitSeconds
  等待 React 开发服务器 7002 返回 HTTP 成功的最长秒数，默认 90。
  首次启动或依赖重新优化时可能超过 30 秒。

.PARAMETER Tail
  logs 动作下每个日志文件默认输出的尾部行数。
#>

param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
  [string]$Action = 'status',

  [ValidateSet('all', 'backend', 'web')]
  [string]$Service = 'all',

  [string]$RuntimeConfigFile = '',
  [switch]$Console,
  [switch]$Follow,
  [switch]$DryRun,
  [switch]$SkipHealth,
  [int]$BackendWaitSeconds = 90,
  [int]$WebWaitSeconds = 90,
  [int]$Tail = 80
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptStartedAt = Get-Date
$ScriptCompleted = $false

# 所有路径都从脚本位置反推，保证无论从仓库根目录还是其它目录调用都能定位正确。
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$AdminDir = Join-Path $RepoRoot 'admin'
$WebDir = Join-Path $RepoRoot 'web-admin'
$DeployConfig = Join-Path $RepoRoot 'deploy\app.conf'

# local-dev 下只放本机运行状态：PID 用于 stop/status，logs 用于排查，cache 用于稳定后端 exe 路径。
$RunDir = Join-Path $PSScriptRoot 'run'
$LogDir = Join-Path $PSScriptRoot 'logs'
$CacheDir = Join-Path $PSScriptRoot 'cache'
$BackendLog = Join-Path $LogDir 'backend.log'
$BackendBuildLog = Join-Path $LogDir 'backend-build.log'
$WebLog = Join-Path $LogDir 'web.log'
$BackendPidFile = Join-Path $RunDir 'backend.pid'
$WebPidFile = Join-Path $RunDir 'web.pid'

# 固定 exe 路径可避免 go run 每次生成临时 exe 导致 Windows 防火墙/SmartScreen 反复确认。
$BackendExe = Join-Path $CacheDir 'admin-server-local-dev.exe'
$DefaultRuntimeConfigFile = Join-Path $PSScriptRoot 'runtime.toml'

. (Join-Path $PSScriptRoot 'scripts\runtime-config.ps1')

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
  foreach ($dir in @($RunDir, $LogDir, (Join-Path $PSScriptRoot 'tmp'), $CacheDir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

function Resolve-RuntimeConfigPath {
  if ([string]::IsNullOrWhiteSpace($RuntimeConfigFile)) {
    return $DefaultRuntimeConfigFile
  }
  return $RuntimeConfigFile
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

function Get-PortOwnerProcessIds {
  param([int[]]$Ports)

  $owners = [System.Collections.Generic.HashSet[int]]::new()
  $lines = @(netstat.exe -ano -p tcp 2>$null)
  foreach ($line in $lines) {
    $parts = @($line -split '\s+' | Where-Object { $_ -ne '' })
    if ($parts.Count -lt 5 -or $parts[0] -ne 'TCP' -or $parts[3] -ne 'LISTENING') {
      continue
    }

    foreach ($port in $Ports) {
      if ($parts[1] -match (':{0}$' -f $port) -and $parts[4] -match '^\d+$') {
        $owners.Add([int]$parts[4]) | Out-Null
      }
    }
  }

  return @($owners)
}

function Remove-FileIfExists {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function Stop-ManagedProcess {
  param(
    [string]$Name,
    [string]$PidFile,
    [int[]]$Ports = @()
  )

  $processId = Read-PidFile -Path $PidFile
  $processIds = [System.Collections.Generic.List[int]]::new()
  if ($null -ne $processId) {
    $processIds.Add($processId)
  }
  foreach ($ownerId in Get-PortOwnerProcessIds -Ports $Ports) {
    $processIds.Add($ownerId)
  }

  $stopped = [System.Collections.Generic.List[int]]::new()
  foreach ($id in @($processIds | Sort-Object -Unique)) {
    $process = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      continue
    }

    # 端口 owner 才是真正的 Go/Node 服务进程；PID 文件记录的 cmd.exe 也一起清理，避免后台壳残留。
    Stop-Process -Id $id -Force -ErrorAction Stop
    $process.WaitForExit(5000) | Out-Null
    if ($null -ne (Get-Process -Id $id -ErrorAction SilentlyContinue)) {
      throw ("{0}: failed to stop process pid={1}" -f $Name, $id)
    }
    $stopped.Add($id)
  }

  Remove-FileIfExists -Path $PidFile
  if ($stopped.Count -eq 0) {
    Remove-FileIfExists -Path $PidFile
    Write-Host "${Name}: stopped"
    return
  }

  Write-Host ("{0}: stopped ({1})" -f $Name, ($stopped -join ','))
}

function Test-TcpEndpoint {
  param(
    [string]$Name,
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutMilliseconds = 3000
  )

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync($HostName, $Port)
    if (-not $task.Wait($TimeoutMilliseconds) -or -not $client.Connected) {
      throw "$Name connection timed out: ${HostName}:$Port"
    }
  } catch {
    throw "$Name connection failed: ${HostName}:$Port`n$($_.Exception.Message)"
  } finally {
    $client.Dispose()
  }
}

function Test-TcpPortOpen {
  param([int]$Port)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync('127.0.0.1', $Port)
    return $task.Wait(500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-TcpPortOpen {
  param(
    [string]$Name,
    [int]$Port,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPortOpen -Port $Port) {
      Write-Host "$Name health: 127.0.0.1:$Port listening"
      return
    }
    Start-Sleep -Seconds 1
  }

  throw "$Name did not listen on 127.0.0.1:$Port within ${TimeoutSeconds}s"
}

function Test-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 5
  )

  try {
    $process = Start-Process -FilePath 'curl.exe' -ArgumentList @('-fsS', '--max-time', [string]$TimeoutSeconds, $Url) -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $env:TEMP 'aicodex-admin-curl.out') -RedirectStandardError (Join-Path $env:TEMP 'aicodex-admin-curl.err')
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

function Resolve-GoCommand {
  $go = Get-Command 'go.exe' -ErrorAction SilentlyContinue
  if ($null -eq $go) {
    $go = Get-Command 'go' -ErrorAction SilentlyContinue
  }
  if ($null -eq $go) {
    throw 'go.exe was not found in PATH. Install Go before starting the backend.'
  }

  return $go.Source
}

function Build-BackendExecutable {
  $goCommand = Resolve-GoCommand
  Add-LogHeader -LogFile $BackendBuildLog -Name 'backend build'
  Write-Host "backend build: $BackendExe"

  # 先构建到固定路径再运行，兼顾源码最新构建和 Windows 对固定 exe 的安全确认缓存。
  Push-Location -LiteralPath $AdminDir
  try {
    & $goCommand build -o $BackendExe . *>> $BackendBuildLog
    if ($LASTEXITCODE -ne 0) {
      throw "Backend build failed (exit code $LASTEXITCODE). See log: $BackendBuildLog"
    }
  } finally {
    Pop-Location
  }
}

function Start-ManagedCommand {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$PidFile,
    [string]$LogFile
  )

  if (Test-ProcessRunning -PidFile $PidFile) {
    Write-Host "${Name}: already running ($(Read-PidFile -Path $PidFile))"
    return
  }

  Add-LogHeader -LogFile $LogFile -Name $Name
  if ($Console) {
    $cmdLine = "cd /d `"$WorkingDirectory`" && $Command"
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/s', '/k', $cmdLine) -PassThru
  } else {
    $cmdLine = "cd /d `"$WorkingDirectory`" && $Command >> `"$LogFile`" 2>&1"
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/s', '/c', $cmdLine) -WindowStyle Hidden -PassThru
  }

  Set-Content -LiteralPath $PidFile -Value $process.Id
  Write-Host "${Name}: started ($($process.Id))"
}

function Resolve-WebStartCommand {
  # package manager单一真值为固定Bun；缺失时明确失败，避免静默切换解析器。
  $bun = Get-Command 'bun.exe' -ErrorAction SilentlyContinue
  if ($null -ne $bun) {
    return ('"{0}" run start' -f $bun.Source)
  }

  throw 'bun.exe was not found in PATH. Install Bun 1.3.14 before starting web-admin.'
}

function Set-BackendEnvironment {
  param([hashtable]$EnvMap)

  foreach ($key in $EnvMap.Keys) {
    [Environment]::SetEnvironmentVariable($key, [string]$EnvMap[$key], 'Process')
  }
}

function Get-ResolvedRuntime {
  $config = Read-LocalDevRuntimeConfig -Path (Resolve-RuntimeConfigPath)
  return Resolve-LocalDevRuntimeProfile -Config $config
}

function Write-ResolvedRuntimeSummary {
  param($ResolvedProfile)

  Write-Host ("profile:  {0}" -f $ResolvedProfile.ProfileName)
  Write-Host ("postgres: {0}:{1} db={2}" -f $ResolvedProfile.Postgres.host, $ResolvedProfile.Postgres.port, $ResolvedProfile.Postgres.dbName)
  if ($ResolvedProfile.Redis.Enabled) {
    Write-Host ("redis:    {0}:{1}" -f $ResolvedProfile.Redis.host, $ResolvedProfile.Redis.port)
  } else {
    Write-Host 'redis:    disabled; backend will use file session storage'
  }
}

function Start-LocalDev {
  Ensure-LocalDevDirectories
  Write-Step 'Prepare runtime'
  $resolved = Get-ResolvedRuntime
  $envMap = Get-LocalDevBackendEnvironment -ResolvedProfile $resolved -RepoRoot $RepoRoot -LocalDevRoot $PSScriptRoot
  Write-ResolvedRuntimeSummary -ResolvedProfile $resolved

  if ($DryRun) {
    Write-Step 'Backend environment'
    foreach ($key in $envMap.Keys) {
      # DryRun 用于排查映射结果，不能把数据库 DSN 或 Redis 密码打印到终端历史里。
      $value = if ($key -match 'password|dataSourceName|redisEndpoint') { '<configured>' } else { $envMap[$key] }
      Write-Host ("{0}={1}" -f $key, $value)
    }
    return
  }

  # 远端依赖先做 TCP 预检，避免后端半启动后才在应用日志里暴露基础连接问题。
  Test-TcpEndpoint -Name 'postgres' -HostName $resolved.Postgres.host -Port $resolved.Postgres.port
  if ($resolved.Redis.Enabled) {
    Test-TcpEndpoint -Name 'redis' -HostName $resolved.Redis.host -Port $resolved.Redis.port
  }
  Set-BackendEnvironment -EnvMap $envMap

  Write-Step 'Stop stale local processes'
  Stop-ManagedProcess -Name 'web' -PidFile $WebPidFile -Ports @(7002)
  Stop-ManagedProcess -Name 'backend' -PidFile $BackendPidFile -Ports @(8000)

  Write-Step 'Build backend'
  Build-BackendExecutable

  Write-Step 'Start backend'
  $backendCommand = "`"$BackendExe`" --createDatabase=false --config `"$DeployConfig`""
  Start-ManagedCommand -Name 'backend' -WorkingDirectory $AdminDir -Command $backendCommand -PidFile $BackendPidFile -LogFile $BackendLog
  if (-not $SkipHealth) {
    Wait-TcpPortOpen -Name 'backend' -Port 8000 -TimeoutSeconds $BackendWaitSeconds
  }

  Write-Step 'Start web'
  $webCommand = Resolve-WebStartCommand
  if (-not $Console) {
    # 后台模式不自动打开浏览器；CI=true 可以避免 React dev server 把 warning 当成交互式提示。
    $webCommand = "set `"BROWSER=none`" && set `"CI=true`" && $webCommand"
  }
  Start-ManagedCommand -Name 'web' -WorkingDirectory $WebDir -Command $webCommand -PidFile $WebPidFile -LogFile $WebLog
  if (-not $SkipHealth) {
    Wait-HttpOk -Name 'web' -Url 'http://127.0.0.1:7002/' -TimeoutSeconds $WebWaitSeconds
  }

  Show-Status
}

function Stop-LocalDev {
  Ensure-LocalDevDirectories
  Write-Step 'Stop local services'
  Stop-ManagedProcess -Name 'web' -PidFile $WebPidFile -Ports @(7002)
  Stop-ManagedProcess -Name 'backend' -PidFile $BackendPidFile -Ports @(8000)
}

function Show-EndpointStatus {
  param(
    [string]$Name,
    [int]$Port
  )

  $state = if (Test-TcpPortOpen -Port $Port) { 'listening' } else { 'down' }
  Write-Host ("{0,-12} {1,-10} 127.0.0.1:{2}" -f $Name, $state, $Port)
}

function Show-Status {
  Ensure-LocalDevDirectories

  Write-Step 'Local processes'
  foreach ($entry in @(
      @{ Name = 'backend'; PidFile = $BackendPidFile },
      @{ Name = 'web'; PidFile = $WebPidFile }
    )) {
    $processId = Read-PidFile -Path $entry.PidFile
    $state = if (Test-ProcessRunning -PidFile $entry.PidFile) { 'running' } else { 'stopped' }
    $pidText = if ($null -eq $processId) { '-' } else { [string]$processId }
    Write-Host ("{0,-12} {1,-8} pid={2}" -f $entry.Name, $state, $pidText)
  }

  Write-Step 'Endpoints'
  Show-EndpointStatus -Name 'backend' -Port 8000
  Show-EndpointStatus -Name 'web' -Port 7002

  Write-Step 'Logs'
  Write-Host "backend build: $BackendBuildLog"
  Write-Host "backend: $BackendLog"
  Write-Host "web:     $WebLog"
}

function Show-Logs {
  Ensure-LocalDevDirectories
  $paths = @()
  if ($Service -eq 'all' -or $Service -eq 'backend') {
    $paths += $BackendBuildLog
    $paths += $BackendLog
  }
  if ($Service -eq 'all' -or $Service -eq 'web') {
    $paths += $WebLog
  }

  foreach ($path in $paths) {
    if (-not (Test-Path -LiteralPath $path)) {
      New-Item -ItemType File -Force -Path $path | Out-Null
    }
  }

  if ($Follow) {
    Get-Content -LiteralPath $paths -Tail $Tail -Wait
    return
  }

  foreach ($path in $paths) {
    Write-Step $path
    Get-Content -LiteralPath $path -Tail $Tail
  }
}

Write-RunStarted
try {
  switch ($Action) {
    'start' {
      Start-LocalDev
    }
    'stop' {
      Stop-LocalDev
    }
    'restart' {
      Stop-LocalDev
      Start-LocalDev
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
