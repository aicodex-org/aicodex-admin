<#
Gateway projection 冒烟脚本。
Endpoint、Token 和 BadToken 只从参数或环境变量读取；脚本输出只包含状态码、accepted/idempotent 和脱敏错误码。
#>
param(
    [string]$FixturePath = (Join-Path $PSScriptRoot "..\fixtures\gateway-projection\projection-batch.json"),
    [string]$Endpoint = $env:GATEWAY_PROJECTION_ENDPOINT,
    [string]$Token = $env:GATEWAY_PROJECTION_TOKEN,
    [string]$BadToken = $env:GATEWAY_PROJECTION_BAD_TOKEN,
    [ValidateRange(0, 300)]
    [int]$RequestDelaySeconds = $(if ([string]::IsNullOrWhiteSpace($env:GATEWAY_PROJECTION_REQUEST_DELAY_SECONDS)) { 0 } else { [int]$env:GATEWAY_PROJECTION_REQUEST_DELAY_SECONDS }),
    [switch]$SkipHttp
)

$ErrorActionPreference = "Stop"

function Read-ProjectionJson {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "fixture not found: $Path"
    }
    $raw = Get-Content -LiteralPath $Path -Raw
    # fixture 是跨仓库 contract 锚点，提交前必须拒绝真实地址、凭据和个人信息形态。
    $patterns = @(
        '([0-9]{1,3}\.){3}[0-9]{1,3}',
        'https?://',
        'Authorization:\s*Bearer\s+(?!<projection-token>|REDACTED|fixture)[^\s]+',
        '(?i)(token|cookie|password|secret)\s*[:=]\s*(?!"?REDACTED|"?<|"?fixture)[^\s,}]+',
        '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
        '(?<![0-9])1[3-9][0-9]{9}(?![0-9])'
    )
    foreach ($pattern in $patterns) {
        if ($raw -match $pattern) {
            throw "fixture contains sensitive-looking value matching pattern: $pattern"
        }
    }
    return $raw | ConvertFrom-Json
}

function Assert-ProjectionFixture {
    param([object]$Body)
    foreach ($field in @("caller", "projectionBatchId", "orgVersion", "generatedAt", "freshness", "lineage", "subjects")) {
        if ($null -eq $Body.$field -or "$($Body.$field)" -eq "") {
            throw "fixture missing required field: $field"
        }
    }
    if ($Body.caller -ne "aicodex-admin") {
        throw "fixture caller must be aicodex-admin"
    }
    if ($Body.lineage.sourceService -ne "aicodex-admin") {
        throw "fixture lineage.sourceService must be aicodex-admin"
    }
    if ("$($Body.lineage.digest)" -notmatch '^sha256:[a-fA-F0-9]{64}$') {
        throw "fixture lineage.digest must use sha256:<hex>"
    }
    foreach ($subject in @($Body.subjects)) {
        foreach ($field in @("stableSubjectId", "apiSubjectId", "subjectType", "organizationId", "lifecycleStatus", "projectionVersion", "orgVersion", "freshnessExpiresAt")) {
            if ($null -eq $subject.$field -or "$($subject.$field)" -eq "") {
                throw "fixture subject missing required field: $field"
            }
        }
    }
}

function Invoke-ProjectionPost {
    param(
        [object]$Body,
        [string]$Bearer
    )
    $payload = $Body | ConvertTo-Json -Depth 20
    try {
        # 只把 token 写入请求头，不把 endpoint、token 或响应体原文写入摘要。
        $headers = @{
            Authorization = "Bearer $Bearer"
            "Accept-Encoding" = "identity"
        }
        $response = Invoke-WebRequest -Uri $Endpoint -Method Post -Headers $headers -ContentType "application/json" -Body $payload -ErrorAction Stop
        $json = $response.Content | ConvertFrom-Json
        return [ordered]@{
            statusCode = [int]$response.StatusCode
            success = [bool]$json.success
            accepted = [bool]$json.data.accepted
            idempotent = [bool]$json.data.idempotent
            errorCode = ""
        }
    } catch {
        $statusCode = 0
        $errorCode = "transport_error"
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try {
                $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($errorJson.error.code) {
                    $errorCode = $errorJson.error.code
                }
            } catch {
                $errorCode = "invalid_error_response"
            }
        }
        return [ordered]@{
            statusCode = $statusCode
            success = $false
            accepted = $false
            idempotent = $false
            errorCode = $errorCode
        }
    }
}

function Copy-ProjectionBody {
    param([object]$Body)
    return ($Body | ConvertTo-Json -Depth 20) | ConvertFrom-Json
}

function Wait-ProjectionRequestDelay {
    if ($RequestDelaySeconds -gt 0) {
        Start-Sleep -Seconds $RequestDelaySeconds
    }
}

$fixture = Read-ProjectionJson -Path $FixturePath
Assert-ProjectionFixture -Body $fixture

$summary = [ordered]@{
    fixtureValid = $true
    subjectCount = @($fixture.subjects).Count
    endpointConfigured = -not [string]::IsNullOrWhiteSpace($Endpoint)
    tokenConfigured = -not [string]::IsNullOrWhiteSpace($Token)
    requestDelaySeconds = $RequestDelaySeconds
    httpPush = "skipped"
    replay = "skipped"
    contractError = "skipped"
    authError = "skipped"
}

if (-not $SkipHttp -and $summary.endpointConfigured -and $summary.tokenConfigured) {
    $first = Invoke-ProjectionPost -Body $fixture -Bearer $Token
    $summary.httpPush = $first

    Wait-ProjectionRequestDelay
    $second = Invoke-ProjectionPost -Body $fixture -Bearer $Token
    $summary.replay = $second

    Wait-ProjectionRequestDelay
    $expired = Copy-ProjectionBody -Body $fixture
    $expired.projectionBatchId = "$($fixture.projectionBatchId)-expired"
    $expired.freshness.expiresAt = "2000-01-01T00:00:00Z"
    foreach ($subject in @($expired.subjects)) {
        $subject.freshnessExpiresAt = "2000-01-01T00:00:00Z"
    }
    $summary.contractError = Invoke-ProjectionPost -Body $expired -Bearer $Token

    if (-not [string]::IsNullOrWhiteSpace($BadToken)) {
        Wait-ProjectionRequestDelay
        $summary.authError = Invoke-ProjectionPost -Body $fixture -Bearer $BadToken
    }
}

$summary | ConvertTo-Json -Depth 20
