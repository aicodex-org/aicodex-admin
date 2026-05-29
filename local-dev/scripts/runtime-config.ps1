$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Remove-LocalDevTomlInlineComment {
  param([string]$Line)

  $inSingle = $false
  $inDouble = $false
  $escaped = $false
  for ($i = 0; $i -lt $Line.Length; $i++) {
    $char = $Line[$i]
    if ($escaped) {
      $escaped = $false
      continue
    }
    if ($inDouble -and $char -eq '\') {
      $escaped = $true
      continue
    }
    if (-not $inDouble -and $char -eq "'") {
      $inSingle = -not $inSingle
      continue
    }
    if (-not $inSingle -and $char -eq '"') {
      $inDouble = -not $inDouble
      continue
    }
    if (-not $inSingle -and -not $inDouble -and $char -eq '#') {
      return $Line.Substring(0, $i)
    }
  }

  return $Line
}

function ConvertFrom-LocalDevTomlValue {
  param([string]$Value)

  $trimmed = $Value.Trim()
  if ($trimmed.Length -ge 2) {
    $first = $trimmed[0]
    $last = $trimmed[$trimmed.Length - 1]
    if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
      return $trimmed.Substring(1, $trimmed.Length - 2)
    }
  }

  if ($trimmed -match '^(?i:true|false)$') {
    return [bool]::Parse($trimmed)
  }
  if ($trimmed -match '^-?\d+$') {
    return [int]$trimmed
  }

  return $trimmed
}

function Read-LocalDevRuntimeConfig {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing runtime config: $Path`nCopy local-dev/runtime.toml.example to local-dev/runtime.toml and fill remote dependencies."
  }

  $sections = [ordered]@{ __root = [ordered]@{} }
  $currentSection = '__root'
  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $Path) {
    $lineNumber++
    $trimmed = (Remove-LocalDevTomlInlineComment $line).Trim()
    if ($trimmed -eq '') {
      continue
    }

    if ($trimmed -match '^\[([A-Za-z0-9_.-]+)\]$') {
      $currentSection = $Matches[1]
      if (-not $sections.Contains($currentSection)) {
        $sections[$currentSection] = [ordered]@{}
      }
      continue
    }

    $separator = $trimmed.IndexOf('=')
    if ($separator -le 0) {
      throw "Invalid runtime.toml line ${lineNumber}: $line"
    }

    $key = $trimmed.Substring(0, $separator).Trim()
    if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_-]*$') {
      throw "Invalid runtime.toml key at line ${lineNumber}: $key"
    }

    $sections[$currentSection][$key] = ConvertFrom-LocalDevTomlValue $trimmed.Substring($separator + 1)
  }

  [pscustomobject]@{
    Path = (Resolve-Path -LiteralPath $Path).Path
    Sections = $sections
  }
}

function Get-LocalDevTomlValue {
  param(
    [Parameter(Mandatory = $true)]$Config,
    [Parameter(Mandatory = $true)][string]$Section,
    [Parameter(Mandatory = $true)][string]$Key,
    $DefaultValue = $null
  )

  if ($Config.Sections.Contains($Section) -and $Config.Sections[$Section].Contains($Key)) {
    return $Config.Sections[$Section][$Key]
  }

  return $DefaultValue
}

function Get-LocalDevRequiredTomlValue {
  param(
    [Parameter(Mandatory = $true)]$Config,
    [Parameter(Mandatory = $true)][string]$Section,
    [Parameter(Mandatory = $true)][string]$Key
  )

  $value = Get-LocalDevTomlValue -Config $Config -Section $Section -Key $Key
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
    throw "Missing runtime config value: [$Section].$Key"
  }

  return $value
}

function Get-LocalDevProfileSection {
  param(
    [Parameter(Mandatory = $true)]$Config,
    [Parameter(Mandatory = $true)][string]$ProfileName,
    [Parameter(Mandatory = $true)][string]$ServiceName
  )

  $section = "profiles.$ProfileName.$ServiceName"
  if ($Config.Sections.Contains($section)) {
    return $section
  }

  throw "Missing runtime config section: [$section]"
}

function Format-PostgresDataSourceValue {
  param([AllowNull()][object]$Value)

  $text = [string]$Value
  if ($text -eq '') {
    return "''"
  }
  if ($text -match '[\s''\\]') {
    return "'{0}'" -f (($text -replace '\\', '\\') -replace "'", "\'")
  }

  return $text
}

function Get-ConnectionHostPort {
  param(
    [Parameter(Mandatory = $true)][string]$ConnectionString,
    [int]$DefaultPort
  )

  if ($ConnectionString -match '(^|\s)host\s*=\s*("[^"]*"|''[^'']*''|\S+)') {
    $hostValue = $Matches[2].Trim("'", '"')
    $portValue = $DefaultPort
    if ($ConnectionString -match '(^|\s)port\s*=\s*("[^"]*"|''[^'']*''|\S+)') {
      $portValue = [int]($Matches[2].Trim("'", '"'))
    }
    return [pscustomobject]@{ Host = $hostValue; Port = $portValue }
  }

  if ($ConnectionString -match '^[A-Za-z][A-Za-z0-9+.-]*://(?:[^@/?#]*@)?(?<host>\[[^\]]+\]|[^:/?#]+)(?::(?<port>\d+))?') {
    $hostValue = $Matches.host.Trim('[', ']')
    $portValue = if ([string]::IsNullOrWhiteSpace($Matches.port)) { $DefaultPort } else { [int]$Matches.port }
    return [pscustomobject]@{ Host = $hostValue; Port = $portValue }
  }

  if ($ConnectionString -match '^(?<host>[^,:]+):(?<port>\d+)') {
    return [pscustomobject]@{ Host = $Matches.host; Port = [int]$Matches.port }
  }

  return $null
}

function New-PostgresDataSourceName {
  param([Parameter(Mandatory = $true)]$Postgres)

  $parts = [System.Collections.Generic.List[string]]::new()
  foreach ($name in @('host', 'port', 'user', 'password', 'sslmode', 'dbname')) {
    $parts.Add(('{0}={1}' -f $name, (Format-PostgresDataSourceValue $Postgres[$name])))
  }

  if (-not [string]::IsNullOrWhiteSpace([string]$Postgres.extra_options)) {
    $parts.Add([string]$Postgres.extra_options)
  }

  return ($parts -join ' ')
}

function Test-LocalDevRedisPlaceholder {
  param(
    [string]$HostName,
    [string]$Password,
    [string]$Endpoint
  )

  if (-not [string]::IsNullOrWhiteSpace($Endpoint)) {
    return $false
  }
  if ([string]::IsNullOrWhiteSpace($HostName)) {
    return $true
  }
  if ($HostName -match '^your-.*example\.com$') {
    return $true
  }
  if ($Password -match '^replace_with_') {
    return $true
  }

  return $false
}

function Resolve-LocalDevRuntimeProfile {
  param([Parameter(Mandatory = $true)]$Config)

  $profileName = [string](Get-LocalDevTomlValue -Config $Config -Section '__root' -Key 'active_profile' -DefaultValue 'remote')
  if ([string]::IsNullOrWhiteSpace($profileName)) {
    throw 'Missing runtime config value: active_profile'
  }

  $postgresSection = Get-LocalDevProfileSection -Config $Config -ProfileName $profileName -ServiceName 'postgres'
  $postgresDsn = [string](Get-LocalDevTomlValue -Config $Config -Section $postgresSection -Key 'dsn' -DefaultValue '')
  if ($postgresDsn -ne '') {
    $postgresEndpoint = Get-ConnectionHostPort -ConnectionString $postgresDsn -DefaultPort 5432
    if ($null -eq $postgresEndpoint) {
      throw "Unable to parse Postgres host and port from [$postgresSection].dsn"
    }
    $postgres = [ordered]@{
      dataSourceName = $postgresDsn
      dbName = [string](Get-LocalDevTomlValue -Config $Config -Section $postgresSection -Key 'database' -DefaultValue 'aicodex_admin')
      host = $postgresEndpoint.Host
      port = $postgresEndpoint.Port
    }
  } else {
    $postgresParts = [ordered]@{
      host = [string](Get-LocalDevRequiredTomlValue -Config $Config -Section $postgresSection -Key 'host')
      port = [int](Get-LocalDevRequiredTomlValue -Config $Config -Section $postgresSection -Key 'port')
      user = [string](Get-LocalDevRequiredTomlValue -Config $Config -Section $postgresSection -Key 'user')
      password = [string](Get-LocalDevTomlValue -Config $Config -Section $postgresSection -Key 'password' -DefaultValue '')
      dbname = [string](Get-LocalDevRequiredTomlValue -Config $Config -Section $postgresSection -Key 'database')
      sslmode = [string](Get-LocalDevTomlValue -Config $Config -Section $postgresSection -Key 'sslmode' -DefaultValue 'disable')
      extra_options = [string](Get-LocalDevTomlValue -Config $Config -Section $postgresSection -Key 'extra_options' -DefaultValue '')
    }
    $postgres = [ordered]@{
      dataSourceName = New-PostgresDataSourceName -Postgres $postgresParts
      dbName = $postgresParts.dbname
      host = $postgresParts.host
      port = $postgresParts.port
    }
  }

  $redisSection = "profiles.$profileName.redis"
  $redis = [ordered]@{
    Enabled = $false
    endpoint = ''
    host = ''
    port = 0
  }
  if ($Config.Sections.Contains($redisSection)) {
    $redisEnabledValue = Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'enabled' -DefaultValue $null
    $redisEnabled = if ($null -eq $redisEnabledValue) { $true } else { [bool]$redisEnabledValue }
    $redisEnabledExplicit = $null -ne $redisEnabledValue
    $redisEndpoint = [string](Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'endpoint' -DefaultValue '')
    $redisHost = [string](Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'host' -DefaultValue '')
    $redisPassword = [string](Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'password' -DefaultValue '')

    # 只有未显式开启 Redis 时才把模板占位值视为 disabled；enabled=true 必须暴露缺配置或连通性错误。
    if (-not $redisEnabled -or (-not $redisEnabledExplicit -and (Test-LocalDevRedisPlaceholder -HostName $redisHost -Password $redisPassword -Endpoint $redisEndpoint))) {
      $redis.Enabled = $false
    } elseif ($redisEndpoint -ne '') {
      $endpoint = Get-ConnectionHostPort -ConnectionString $redisEndpoint -DefaultPort 6379
      if ($null -eq $endpoint) {
        throw "Unable to parse Redis host and port from [$redisSection].endpoint"
      }
      $redis = [ordered]@{
        Enabled = $true
        endpoint = $redisEndpoint
        host = $endpoint.Host
        port = $endpoint.Port
      }
    } else {
      if ([string]::IsNullOrWhiteSpace($redisHost)) {
        throw "Missing runtime config value: [$redisSection].host"
      }
      $redisPort = [int](Get-LocalDevRequiredTomlValue -Config $Config -Section $redisSection -Key 'port')
      $redisDatabase = [int](Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'database' -DefaultValue 0)
      $redisPoolSize = [int](Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'pool_size' -DefaultValue 100)
      $redisIdleTimeout = [int](Get-LocalDevTomlValue -Config $Config -Section $redisSection -Key 'idle_timeout_seconds' -DefaultValue 30)
      $redis = [ordered]@{
        Enabled = $true
        endpoint = ('{0}:{1},{2},{3},{4},{5}' -f $redisHost, $redisPort, $redisPoolSize, $redisPassword, $redisDatabase, $redisIdleTimeout)
        host = $redisHost
        port = $redisPort
      }
    }
  }

  [pscustomobject]@{
    ProfileName = $profileName
    Postgres = [pscustomobject]$postgres
    Redis = [pscustomobject]$redis
    Env = if ($Config.Sections.Contains('env')) { $Config.Sections.env } else { [ordered]@{} }
  }
}

function Get-LocalDevBackendEnvironment {
  param(
    [Parameter(Mandatory = $true)]$ResolvedProfile,
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$LocalDevRoot
  )

  $logFile = Join-Path $LocalDevRoot 'logs\admin-app.log'
  $frontendBaseDir = Join-Path $RepoRoot 'web-admin'
  $envMap = [ordered]@{
    driverName = 'postgres'
    dbName = $ResolvedProfile.Postgres.dbName
    dataSourceName = $ResolvedProfile.Postgres.dataSourceName
    httpport = '8000'
    runmode = 'dev'
    origin = 'http://localhost:8000'
    originFrontend = 'http://localhost:7002'
    frontendBaseDir = $frontendBaseDir
    logConfig = ('{{"adapter":"file","filename":"{0}","maxdays":99999,"perm":"0770"}}' -f (($logFile -replace '\\', '\\')))
  }

  if ($ResolvedProfile.Redis.Enabled) {
    $envMap.redisEndpoint = $ResolvedProfile.Redis.endpoint
  }

  foreach ($key in $ResolvedProfile.Env.Keys) {
    $envMap[$key] = [string]$ResolvedProfile.Env[$key]
  }

  return $envMap
}
