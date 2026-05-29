$ErrorActionPreference = 'Stop'

$script:LocalDevRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$script:RuntimeConfigScript = Join-Path $script:LocalDevRoot 'scripts\runtime-config.ps1'

Describe 'local-dev runtime config' {
  BeforeAll {
    . $script:RuntimeConfigScript
  }

  It 'maps the active remote profile to admin backend environment variables' {
    $runtimeFile = Join-Path $TestDrive 'runtime.toml'
    @'
active_profile = "remote"

[profiles.remote.postgres]
host = "10.18.80.60"
port = 5499
user = "aicodex_admin"
password = "secret password"
database = "aicodex_admin"
sslmode = "disable"
extra_options = "connect_timeout=10"

[profiles.remote.redis]
host = "10.18.80.60"
port = 6399
password = "redis secret"
database = 2

[env]
origin = "http://localhost:8000"
originFrontend = "http://localhost:7002"
'@ | Set-Content -LiteralPath $runtimeFile -Encoding UTF8

    $config = Read-LocalDevRuntimeConfig -Path $runtimeFile
    $resolved = Resolve-LocalDevRuntimeProfile -Config $config
    $envMap = Get-LocalDevBackendEnvironment -ResolvedProfile $resolved -RepoRoot 'D:\repo' -LocalDevRoot $script:LocalDevRoot

    $resolved.ProfileName | Should Be 'remote'
    $envMap.driverName | Should Be 'postgres'
    $envMap.dbName | Should Be 'aicodex_admin'
    $envMap.dataSourceName | Should Match 'host=10\.18\.80\.60'
    $envMap.dataSourceName | Should Match 'port=5499'
    $envMap.dataSourceName | Should Match 'user=aicodex_admin'
    $envMap.dataSourceName | Should Match 'password=''secret password'''
    $envMap.dataSourceName | Should Match 'dbname=aicodex_admin'
    $envMap.dataSourceName | Should Match 'sslmode=disable'
    $envMap.dataSourceName | Should Match 'connect_timeout=10'
    $envMap.redisEndpoint | Should Be '10.18.80.60:6399,100,redis secret,2,30'
    $envMap.httpport | Should Be '8000'
    $envMap.origin | Should Be 'http://localhost:8000'
    $envMap.originFrontend | Should Be 'http://localhost:7002'
  }

  It 'prefers explicit Postgres DSN and Redis endpoint overrides' {
    $runtimeFile = Join-Path $TestDrive 'runtime-overrides.toml'
    @'
active_profile = "remote"

[profiles.remote.postgres]
dsn = "user=custom password='custom secret' host=db.example.test port=5432 sslmode=require dbname=custom_admin"

[profiles.remote.redis]
endpoint = "redis.example.test:6379,100,redispass,0,30"
'@ | Set-Content -LiteralPath $runtimeFile -Encoding UTF8

    $config = Read-LocalDevRuntimeConfig -Path $runtimeFile
    $resolved = Resolve-LocalDevRuntimeProfile -Config $config
    $envMap = Get-LocalDevBackendEnvironment -ResolvedProfile $resolved -RepoRoot 'D:\repo' -LocalDevRoot $script:LocalDevRoot

    $envMap.dataSourceName | Should Be "user=custom password='custom secret' host=db.example.test port=5432 sslmode=require dbname=custom_admin"
    $envMap.redisEndpoint | Should Be 'redis.example.test:6379,100,redispass,0,30'
  }

  It 'keeps Redis disabled when only PostgreSQL is configured' {
    $runtimeFile = Join-Path $TestDrive 'runtime-postgres-only.toml'
    @'
active_profile = "remote"

[profiles.remote.postgres]
host = "10.18.80.67"
port = 5432
user = "aicodex_admin"
password = "secret password"
database = "aicodex_admin"
sslmode = "disable"
'@ | Set-Content -LiteralPath $runtimeFile -Encoding UTF8

    $config = Read-LocalDevRuntimeConfig -Path $runtimeFile
    $resolved = Resolve-LocalDevRuntimeProfile -Config $config
    $envMap = Get-LocalDevBackendEnvironment -ResolvedProfile $resolved -RepoRoot 'D:\repo' -LocalDevRoot $script:LocalDevRoot

    $resolved.Redis.Enabled | Should Be $false
    $envMap.Contains('redisEndpoint') | Should Be $false
  }

  It 'treats template Redis placeholders as disabled' {
    $runtimeFile = Join-Path $TestDrive 'runtime-template-redis.toml'
    @'
active_profile = "remote"

[profiles.remote.postgres]
host = "10.18.80.67"
port = 5432
user = "aicodex_admin"
password = "secret password"
database = "aicodex_admin"
sslmode = "disable"

[profiles.remote.redis]
host = "your-redis-host.example.com"
port = 6379
password = "replace_with_remote_redis_password"
database = 0
'@ | Set-Content -LiteralPath $runtimeFile -Encoding UTF8

    $config = Read-LocalDevRuntimeConfig -Path $runtimeFile
    $resolved = Resolve-LocalDevRuntimeProfile -Config $config
    $envMap = Get-LocalDevBackendEnvironment -ResolvedProfile $resolved -RepoRoot 'D:\repo' -LocalDevRoot $script:LocalDevRoot

    $resolved.Redis.Enabled | Should Be $false
    $envMap.Contains('redisEndpoint') | Should Be $false
  }

  It 'fails when Redis is explicitly enabled without host' {
    $runtimeFile = Join-Path $TestDrive 'runtime-enabled-redis-missing-host.toml'
    @'
active_profile = "remote"

[profiles.remote.postgres]
host = "10.18.80.67"
port = 5432
user = "aicodex_admin"
password = "secret password"
database = "aicodex_admin"
sslmode = "disable"

[profiles.remote.redis]
enabled = true
host = ""
port = 6379
database = 0
'@ | Set-Content -LiteralPath $runtimeFile -Encoding UTF8

    $config = Read-LocalDevRuntimeConfig -Path $runtimeFile

    { Resolve-LocalDevRuntimeProfile -Config $config } | Should Throw 'Missing runtime config value: [profiles.remote.redis].host'
  }

  It 'fails clearly when runtime.toml is missing' {
    $missing = Join-Path $TestDrive 'missing-runtime.toml'

    { Read-LocalDevRuntimeConfig -Path $missing } | Should Throw 'Missing runtime config'
  }
}

Describe 'local-dev Windows start script' {
  $scriptText = Get-Content -LiteralPath (Join-Path $script:LocalDevRoot 'start-windows-local-dev.ps1') -Raw

  It 'runs the backend from a stable local executable instead of go run temp exe' {
    $scriptText | Should Match 'admin-server-local-dev\.exe'
    $scriptText | Should Not Match '\$backendCommand\s*=\s*"go run'
  }

  It 'stops managed processes from pid files and service ports without CIM or taskkill' {
    $scriptText | Should Match 'netstat\.exe'
    $scriptText | Should Match 'Stop-Process'
    $scriptText | Should Match 'Stop-ManagedProcess -Name ''web'' -PidFile \$WebPidFile -Ports @\(7002\)'
    $scriptText | Should Match 'Stop-ManagedProcess -Name ''backend'' -PidFile \$BackendPidFile -Ports @\(8000\)'
    $scriptText | Should Not Match 'Get-CimInstance\s+Win32_Process'
    $scriptText | Should Not Match 'taskkill\.exe'
  }
}
