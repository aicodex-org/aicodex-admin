<#
.SYNOPSIS
  Smoke test Insight admin provider current-user, scope, and organization-tree contracts.

.DESCRIPTION
  This script is intended for an approved test environment. It does not store or print
  passwords, cookies, tokens, client secrets, or full environment URLs. Sensitive values
  are read from parameters, environment variables, or a local secrets Markdown file.

.PARAMETER BaseUrl
  Admin service base URL. Can also be set through AICODEX_ADMIN_PROVIDER_SMOKE_BASE_URL.

.PARAMETER Organization
  WeCom sync target organization. Can also be set through AICODEX_ADMIN_PROVIDER_SMOKE_ORGANIZATION.

.PARAMETER SecretsPath
  Optional local secrets Markdown path. Can also be set through AICODEX_TEST_ENV_SECRETS.

.PARAMETER SkipWecomSync
  Skip triggering WeCom sync and only verify provider endpoints.

.PARAMETER RequestTimeoutSeconds
  HTTP request timeout for each login, sync, and provider call.
#>

param(
  [string]$BaseUrl = $env:AICODEX_ADMIN_PROVIDER_SMOKE_BASE_URL,
  [string]$Organization = $env:AICODEX_ADMIN_PROVIDER_SMOKE_ORGANIZATION,
  [string]$AdminOrganization = $(if ($env:AICODEX_ADMIN_PROVIDER_SMOKE_ADMIN_ORGANIZATION) { $env:AICODEX_ADMIN_PROVIDER_SMOKE_ADMIN_ORGANIZATION } else { 'built-in' }),
  [string]$AdminApplication = $(if ($env:AICODEX_ADMIN_PROVIDER_SMOKE_ADMIN_APPLICATION) { $env:AICODEX_ADMIN_PROVIDER_SMOKE_ADMIN_APPLICATION } else { 'app-built-in' }),
  [string]$AdminUsername = $env:AICODEX_ADMIN_PROVIDER_SMOKE_ADMIN_USERNAME,
  [string]$AdminPassword = $env:AICODEX_ADMIN_PROVIDER_SMOKE_ADMIN_PASSWORD,
  [string]$WecomApplication = $env:AICODEX_ADMIN_PROVIDER_SMOKE_WECOM_APPLICATION,
  [string]$WecomUsername = $env:AICODEX_ADMIN_PROVIDER_SMOKE_WECOM_USERNAME,
  [string]$WecomPassword = $env:AICODEX_ADMIN_PROVIDER_SMOKE_WECOM_PASSWORD,
  [string]$SecretsPath = $env:AICODEX_TEST_ENV_SECRETS,
  [string]$AdminSecretSectionPattern = 'aicodex-admin .*test.*',
  [string]$WecomSecretSectionPattern = 'Insight .*',
  [switch]$SkipWecomSync,
  [int]$PollIntervalSeconds = 3,
  [int]$PollTimeoutSeconds = 240,
  [int]$RequestTimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$script:CurrentStage = 'initializing'

function Sanitize-Text {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return ''
  }
  $sanitized = $Text -replace 'https?://[^\s)]+', '<url>'
  $sanitized = $sanitized -replace '\b(?:\d{1,3}\.){3}\d{1,3}\b', '<ip>'
  $sanitized = $sanitized -replace '(?i)(password|token|secret|cookie|client_secret|authorization)\s*[:=]\s*[^\s,;]+', '$1=<redacted>'
  return $sanitized
}

function Get-MarkdownSection {
  param(
    [string]$Content,
    [string]$HeadingPattern
  )

  if ([string]::IsNullOrWhiteSpace($Content) -or [string]::IsNullOrWhiteSpace($HeadingPattern)) {
    return ''
  }
  $pattern = '(?m)^#{2,4}[ \t]+' + $HeadingPattern + '[^\r\n]*\r?\n([\s\S]*?)(?=^#{2,4}[ \t]+|\z)'
  $match = [regex]::Match($Content, $pattern)
  if (-not $match.Success) {
    return ''
  }
  return $match.Groups[1].Value
}

function Get-SectionValue {
  param(
    [string]$Section,
    [string]$LabelPattern
  )

  if ([string]::IsNullOrWhiteSpace($Section)) {
    return ''
  }
  $colonPattern = '[:' + [string][char]0xFF1A + ']'
  $pattern = '(?m)^\s*-\s*' + $LabelPattern + '\s*' + $colonPattern + '\s*(.+?)\s*$'
  $match = [regex]::Match($Section, $pattern)
  if (-not $match.Success) {
    return ''
  }
  return $match.Groups[1].Value.Trim()
}

function Fill-SettingsFromSecrets {
  if ([string]::IsNullOrWhiteSpace($SecretsPath) -or -not (Test-Path -LiteralPath $SecretsPath)) {
    return
  }

  $content = Get-Content -LiteralPath $SecretsPath -Raw -Encoding UTF8
  $adminSection = Get-MarkdownSection -Content $content -HeadingPattern $AdminSecretSectionPattern
  $wecomSection = Get-MarkdownSection -Content $content -HeadingPattern $WecomSecretSectionPattern
  $usernameLabel = ([string][char]0x7528) + ([string][char]0x6237) + ([string][char]0x540D)
  $passwordLabel = ([string][char]0x5BC6) + ([string][char]0x7801)

  if ([string]::IsNullOrWhiteSpace($script:AdminUsername)) {
    $script:AdminUsername = Get-SectionValue -Section $adminSection -LabelPattern ('.*username|.*' + $usernameLabel)
  }
  if ([string]::IsNullOrWhiteSpace($script:AdminPassword)) {
    $script:AdminPassword = Get-SectionValue -Section $adminSection -LabelPattern ('.*password|.*' + $passwordLabel)
  }
  if ([string]::IsNullOrWhiteSpace($script:WecomUsername)) {
    $script:WecomUsername = Get-SectionValue -Section $wecomSection -LabelPattern ('.*username|.*' + $usernameLabel)
  }
  if ([string]::IsNullOrWhiteSpace($script:WecomPassword)) {
    $script:WecomPassword = Get-SectionValue -Section $wecomSection -LabelPattern ('.*password|.*' + $passwordLabel)
  }
}

function Require-Setting {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required setting: $Name"
  }
}

function Set-SmokeStage {
  param([string]$Stage)

  $script:CurrentStage = $Stage
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Path,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [object]$Body = $null
  )

  $uri = $script:BaseUrl.TrimEnd('/') + $Path
  $headers = @{ 'X-Trace-Id' = ('admin-provider-smoke-' + [guid]::NewGuid().ToString('N')) }
  Set-SmokeStage -Stage ("{0} {1}" -f $Method, $Path)
  $request = @{
    Uri = $uri
    Method = $Method
    WebSession = $Session
    Headers = $headers
    TimeoutSec = $script:RequestTimeoutSeconds
    UseBasicParsing = $true
  }
  if ($null -ne $Body) {
    $request.ContentType = 'application/json'
    $request.Body = ($Body | ConvertTo-Json -Compress)
  }

  $response = Invoke-WebRequest @request
  $json = $response.Content | ConvertFrom-Json
  return [pscustomobject]@{
    StatusCode = $response.StatusCode
    Body = $json
  }
}

function Invoke-Login {
  param(
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$OrganizationName,
    [string]$ApplicationName,
    [string]$Username,
    [string]$Password
  )

  Set-SmokeStage -Stage ("login {0}/{1}" -f $OrganizationName, $ApplicationName)
  $body = @{
    type = 'login'
    organization = $OrganizationName
    application = $ApplicationName
    username = $Username
    password = $Password
    signinMethod = 'Password'
    autoSignin = $true
  }
  $response = Invoke-JsonRequest -Method 'POST' -Path '/api/login' -Session $Session -Body $body
  if ($response.Body.status -ne 'ok') {
    throw ("Login failed: {0}" -f (Sanitize-Text $response.Body.msg))
  }
}

function Start-WecomSync {
  param([Microsoft.PowerShell.Commands.WebRequestSession]$Session)

  $response = Invoke-JsonRequest -Method 'POST' -Path '/api/wecom-org-sync/runs' -Session $Session -Body @{ organization = $script:Organization }
  if ($response.Body.status -ne 'ok') {
    throw ("WeCom sync start failed: {0}" -f (Sanitize-Text $response.Body.msg))
  }
  $runId = $response.Body.data.name
  if ([string]::IsNullOrWhiteSpace($runId)) {
    $runId = $response.Body.data.runId
  }
  if ([string]::IsNullOrWhiteSpace($runId)) {
    throw 'WeCom sync started but returned no runId'
  }
  return $runId
}

function Wait-WecomSync {
  param(
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$RunId
  )

  $deadline = (Get-Date).AddSeconds($PollTimeoutSeconds)
  $encodedOrganization = [System.Uri]::EscapeDataString($script:Organization)
  $final = $null
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $PollIntervalSeconds
    $response = Invoke-JsonRequest -Method 'GET' -Path ("/api/wecom-org-sync/runs/{0}?organization={1}" -f [System.Uri]::EscapeDataString($RunId), $encodedOrganization) -Session $Session
    if ($response.Body.status -ne 'ok') {
      throw ("WeCom sync poll failed: {0}" -f (Sanitize-Text $response.Body.msg))
    }
    $final = $response.Body.data
    if ($final.status -in @('succeeded', 'failed', 'cancelled')) {
      break
    }
  }

  if ($null -eq $final) {
    throw 'WeCom sync returned no final state'
  }
  if ($final.status -ne 'succeeded') {
    throw ("WeCom sync did not succeed: status={0}, errorCode={1}" -f $final.status, (Sanitize-Text $final.errorCode))
  }
  return $final
}

function Assert-ProviderOk {
  param(
    [string]$Name,
    [pscustomobject]$Response
  )

  if ($Response.StatusCode -ne 200 -or $Response.Body.status -ne 'ok') {
    throw ("{0} provider failed: http={1}, status={2}" -f $Name, $Response.StatusCode, $Response.Body.status)
  }
}

function Test-ProviderContracts {
  param([Microsoft.PowerShell.Commands.WebRequestSession]$Session)

  $current = Invoke-JsonRequest -Method 'GET' -Path '/api/admin-provider/insight/v1/current-user' -Session $Session
  $scope = Invoke-JsonRequest -Method 'GET' -Path '/api/admin-provider/insight/v1/current-user/scope' -Session $Session
  $tree = Invoke-JsonRequest -Method 'GET' -Path '/api/admin-provider/insight/v1/current-user/organization-tree' -Session $Session

  Assert-ProviderOk -Name 'current-user' -Response $current
  Assert-ProviderOk -Name 'scope' -Response $scope
  Assert-ProviderOk -Name 'organization-tree' -Response $tree

  $currentData = $current.Body.data
  $scopeData = $scope.Body.data
  $treeData = @($tree.Body.data)
  $departments = @($scopeData.departments)

  $checks = [ordered]@{
    currentUser = [ordered]@{
      http = $current.StatusCode
      status = $current.Body.status
      usageMappingStatus = $currentData.usageIdentity.mappingStatus
      usageMappingSource = $currentData.usageIdentity.mappingSource
      hasApiUserId = -not [string]::IsNullOrWhiteSpace($currentData.usageIdentity.apiUserId)
      hasApiOrganizationId = -not [string]::IsNullOrWhiteSpace($currentData.apiOrganizationId)
      sourceType = $currentData.usageIdentity.sourceType
      hasSourceConnectionId = -not [string]::IsNullOrWhiteSpace($currentData.usageIdentity.sourceConnectionId)
      hasExternalSubjectId = -not [string]::IsNullOrWhiteSpace($currentData.usageIdentity.externalSubjectId)
      hasOrgVersion = -not [string]::IsNullOrWhiteSpace($currentData.orgVersion)
      hasScopeVersion = -not [string]::IsNullOrWhiteSpace($currentData.scopeVersion)
      freshness = $currentData.freshness
    }
    scope = [ordered]@{
      http = $scope.StatusCode
      status = $scope.Body.status
      scopeType = $scopeData.scopeType
      mappingStatus = $scopeData.mappingStatus
      lifecycleStatus = $scopeData.lifecycleStatus
      departmentCount = $departments.Count
      departmentsWithLifecycle = @($departments | Where-Object { -not [string]::IsNullOrWhiteSpace($_.lifecycleStatus) }).Count
      departmentsWithSourceTypeWecom = @($departments | Where-Object { $_.sourceType -eq 'wecom' }).Count
      departmentsWithSourceConnection = @($departments | Where-Object { -not [string]::IsNullOrWhiteSpace($_.sourceConnectionId) }).Count
      apiUserCount = @($scopeData.apiUserIds).Count
      hasOrgVersion = -not [string]::IsNullOrWhiteSpace($scopeData.orgVersion)
      hasScopeVersion = -not [string]::IsNullOrWhiteSpace($scopeData.scopeVersion)
      freshness = $scopeData.freshness
    }
    organizationTree = [ordered]@{
      http = $tree.StatusCode
      status = $tree.Body.status
      nodeCount = $treeData.Count
      nodesWithLifecycle = @($treeData | Where-Object { -not [string]::IsNullOrWhiteSpace($_.lifecycleStatus) }).Count
      nodesWithSourceTypeWecom = @($treeData | Where-Object { $_.sourceType -eq 'wecom' }).Count
      nodesWithSourceConnection = @($treeData | Where-Object { -not [string]::IsNullOrWhiteSpace($_.sourceConnectionId) }).Count
    }
  }

  if ($checks.currentUser.usageMappingStatus -ne 'OK' -or -not $checks.currentUser.hasApiUserId -or -not $checks.currentUser.hasSourceConnectionId) {
    throw 'current-user provider contract failed: usage mapping or source identity missing'
  }
  if ($checks.scope.mappingStatus -ne 'OK' -or $checks.scope.lifecycleStatus -ne 'ACTIVE' -or -not $checks.scope.hasOrgVersion -or -not $checks.scope.hasScopeVersion -or $checks.scope.departmentsWithSourceConnection -lt 1) {
    throw 'scope provider contract failed: mapping, lifecycle, version, or sourceConnection metadata missing'
  }
  if ($checks.organizationTree.nodeCount -lt 1 -or $checks.organizationTree.nodesWithSourceConnection -ne $checks.organizationTree.nodeCount) {
    throw 'organization-tree provider contract failed: node sourceConnection metadata missing'
  }

  return $checks
}

try {
  Set-SmokeStage -Stage 'load settings'
  Fill-SettingsFromSecrets
  Set-SmokeStage -Stage 'validate settings'
  Require-Setting -Name 'BaseUrl' -Value $BaseUrl
  Require-Setting -Name 'Organization' -Value $Organization
  Require-Setting -Name 'AdminUsername' -Value $AdminUsername
  Require-Setting -Name 'AdminPassword' -Value $AdminPassword
  Require-Setting -Name 'WecomApplication' -Value $WecomApplication
  Require-Setting -Name 'WecomUsername' -Value $WecomUsername
  Require-Setting -Name 'WecomPassword' -Value $WecomPassword

  $BaseUrl = $BaseUrl.TrimEnd('/')
  $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $wecomSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

  Set-SmokeStage -Stage 'login admin'
  Invoke-Login -Session $adminSession -OrganizationName $AdminOrganization -ApplicationName $AdminApplication -Username $AdminUsername -Password $AdminPassword

  $syncSummary = [ordered]@{ skipped = [bool]$SkipWecomSync }
  if (-not $SkipWecomSync) {
    Set-SmokeStage -Stage 'start wecom sync'
    $runId = Start-WecomSync -Session $adminSession
    Set-SmokeStage -Stage 'wait wecom sync'
    $syncRun = Wait-WecomSync -Session $adminSession -RunId $runId
    $syncSummary = [ordered]@{
      skipped = $false
      status = $syncRun.status
      departmentUpdatedCount = $syncRun.departmentUpdatedCount
      userCreatedCount = $syncRun.userCreatedCount
      userUpdatedCount = $syncRun.userUpdatedCount
      userDisabledCount = $syncRun.userDisabledCount
      hasErrorText = -not [string]::IsNullOrWhiteSpace($syncRun.errorText)
    }
  }

  Set-SmokeStage -Stage 'login wecom user'
  Invoke-Login -Session $wecomSession -OrganizationName $Organization -ApplicationName $WecomApplication -Username $WecomUsername -Password $WecomPassword
  Set-SmokeStage -Stage 'verify provider contracts'
  $providerChecks = Test-ProviderContracts -Session $wecomSession

  [ordered]@{
    success = $true
    baseUrlConfigured = $true
    organizationConfigured = $true
    wecomSync = $syncSummary
    provider = $providerChecks
  } | ConvertTo-Json -Depth 8
  exit 0
} catch {
  [ordered]@{
    success = $false
    stage = Sanitize-Text $script:CurrentStage
    error = Sanitize-Text $_.Exception.Message
  } | ConvertTo-Json -Depth 4
  exit 1
}
