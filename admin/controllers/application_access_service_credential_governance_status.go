package controllers

import (
	"encoding/json"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
)

const (
	serviceCredentialGovernanceStatusConfigured    = "configured"
	serviceCredentialGovernanceStatusMissing       = "missing"
	serviceCredentialGovernanceStatusPartial       = "partial"
	serviceCredentialGovernanceStatusBlocked       = "blocked"
	serviceCredentialGovernanceStatusNotApplicable = "not_applicable"

	serviceCredentialReferenceConfigured    = "configured"
	serviceCredentialReferenceMissing       = "missing"
	serviceCredentialReferenceExternal      = "external_secret"
	serviceCredentialReferenceNotApplicable = "not_applicable"

	serviceCredentialGovernanceSource = "admin_runtime_config"
)

var applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
	return &object.ServiceCredentialGovernanceConfigService{}
}

// ServiceCredentialGovernanceStatusResponse 是应用接入消费的服务凭据治理只读响应。
// 它只承载脱敏状态、配置 key 名和受限运行策略，不承载任何可复用凭据值。
type ServiceCredentialGovernanceStatusResponse struct {
	GeneratedAt string                                   `json:"generatedAt"`
	Source      string                                   `json:"source"`
	Groups      []ServiceCredentialGovernanceStatusGroup `json:"groups"`
}

// ServiceCredentialGovernanceStatusGroup 描述一个 Admin-owned 服务凭据治理分组。
// ConfiguredKeys/MissingKeys 只允许出现配置 key 名；BoundedRuntimePolicy 只允许数字、布尔或低敏 caller 策略。
type ServiceCredentialGovernanceStatusGroup struct {
	Key                       string                 `json:"key"`
	Label                     string                 `json:"label"`
	Owner                     string                 `json:"owner"`
	Status                    string                 `json:"status"`
	ConfiguredKeys            []string               `json:"configuredKeys,omitempty"`
	MissingKeys               []string               `json:"missingKeys,omitempty"`
	CredentialReferenceStatus string                 `json:"credentialReferenceStatus"`
	CallerPolicy              string                 `json:"callerPolicy,omitempty"`
	BoundedRuntimePolicy      map[string]interface{} `json:"boundedRuntimePolicy,omitempty"`
	KeepInEnvKeys             []string               `json:"keepInEnvKeys,omitempty"`
	BlockedReasons            []string               `json:"blockedReasons,omitempty"`
	RemediationRoute          string                 `json:"remediationRoute,omitempty"`
}

// GetApplicationAccessServiceCredentialGovernanceStatus 返回 Admin 运行态配置推导出的脱敏治理状态。
// 该接口只读，不触发 resolver、provider、Gateway projection publish 或 credential test。
func (c *ApiController) GetApplicationAccessServiceCredentialGovernanceStatus() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	c.ResponseOk(buildApplicationAccessServiceCredentialGovernanceStatus(time.Now().UTC()))
}

// GetApplicationAccessServiceCredentialGovernanceConfig 返回服务凭据治理配置入口的脱敏回读。
// 该接口不测试凭据、不调用外部 provider，也不触发 Gateway projection 发布或刷新。
func (c *ApiController) GetApplicationAccessServiceCredentialGovernanceConfig() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	config, err := applicationAccessServiceCredentialGovernanceConfigServiceFactory().GetConfig()
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(config)
}

// SaveApplicationAccessServiceCredentialGovernanceConfig 保存 Admin-owned copy-safe 配置引用元数据。
// 请求中的 raw secret、完整私有 URL 或未知分组会 fail closed，且错误不会回显敏感值。
func (c *ApiController) SaveApplicationAccessServiceCredentialGovernanceConfig() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	var config object.ServiceCredentialGovernanceConfigResponse
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &config); err != nil {
		c.ResponseError(err.Error())
		return
	}
	savedConfig, _, err := applicationAccessServiceCredentialGovernanceConfigServiceFactory().SaveConfig(&config)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(savedConfig)
}

func (c *ApiController) requireServiceCredentialGovernanceGlobalAdmin() bool {
	userId, ok := c.RequireSignedIn()
	if !ok {
		return false
	}
	owner, _, err := util.GetOwnerAndNameFromIdWithError(userId)
	if err != nil || owner != "built-in" {
		c.ResponseError(c.T("general:this operation requires administrator to perform"))
		return false
	}
	return true
}

func buildApplicationAccessServiceCredentialGovernanceStatus(generatedAt time.Time) ServiceCredentialGovernanceStatusResponse {
	if generatedAt.IsZero() {
		generatedAt = time.Now().UTC()
	}
	return ServiceCredentialGovernanceStatusResponse{
		GeneratedAt: formatInsightTime(generatedAt),
		Source:      serviceCredentialGovernanceSource,
		Groups: []ServiceCredentialGovernanceStatusGroup{
			buildInsightProviderTrustGovernanceGroup(),
			buildUsageIdentityResolverGovernanceGroup(),
			buildGatewayOrganizationProjectionGovernanceGroup(),
			buildKeepInEnvGovernanceGroup(),
		},
	}
}

func buildInsightProviderTrustGovernanceGroup() ServiceCredentialGovernanceStatusGroup {
	allowedAudiences := splitInsightCsv(conf.GetConfigString("insightProviderAllowedAudiences"))
	audienceKey := "insightProviderAllowedAudiences"
	if len(allowedAudiences) == 0 {
		allowedAudiences = splitInsightCsv(conf.GetConfigString("insightProviderAudience"))
		if len(allowedAudiences) > 0 {
			audienceKey = "insightProviderAudience"
		}
	}
	allowedIssuers := splitInsightCsv(conf.GetConfigString("insightProviderAllowedIssuers"))
	requiredScopes := splitInsightCsv(conf.GetConfigString("insightProviderRequiredScopes"))
	requiredScopesDefaulted := false
	if len(requiredScopes) == 0 {
		requiredScopes = splitInsightCsv(insightProviderDefaultRequiredScopes)
		requiredScopesDefaulted = true
	}

	configuredKeys := []string{"insightProviderRequiredScopes"}
	missingKeys := []string{}
	blockedReasons := []string{}
	if len(allowedAudiences) > 0 {
		configuredKeys = append(configuredKeys, audienceKey)
	} else {
		missingKeys = append(missingKeys, "insightProviderAllowedAudiences")
		blockedReasons = append(blockedReasons, "insight_provider_allowed_audiences_missing")
	}
	if len(allowedIssuers) > 0 {
		configuredKeys = append(configuredKeys, "insightProviderAllowedIssuers")
	} else {
		missingKeys = append(missingKeys, "insightProviderAllowedIssuers")
	}

	status := serviceCredentialGovernanceStatusConfigured
	if len(allowedAudiences) == 0 {
		status = serviceCredentialGovernanceStatusBlocked
	} else if len(allowedIssuers) == 0 {
		status = serviceCredentialGovernanceStatusPartial
	}

	return ServiceCredentialGovernanceStatusGroup{
		Key:                       "insight_provider_trust",
		Label:                     "Insight provider trust",
		Owner:                     "admin_provider_trust",
		Status:                    status,
		ConfiguredKeys:            deduplicateStrings(configuredKeys),
		MissingKeys:               deduplicateStrings(missingKeys),
		CredentialReferenceStatus: serviceCredentialReferenceNotApplicable,
		CallerPolicy:              "insight_service_token",
		BoundedRuntimePolicy: map[string]interface{}{
			"allowedAudienceCount":    len(allowedAudiences),
			"allowedIssuerCount":      len(allowedIssuers),
			"requiredScopeCount":      len(requiredScopes),
			"requiredScopesDefaulted": requiredScopesDefaulted,
		},
		BlockedReasons:   deduplicateStrings(blockedReasons),
		RemediationRoute: "/providers",
	}
}

func buildUsageIdentityResolverGovernanceGroup() ServiceCredentialGovernanceStatusGroup {
	endpointConfigured := strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverEndpoint")) != ""
	tokenConfigured := strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverToken")) != ""
	caller := firstNonEmptyInsightString(conf.GetConfigString("insightUsageIdentityResolverCaller"), insightUsageIdentityResolverDefaultCaller)
	maxItems := normalizeInsightUsageIdentityResolverMaxItems(getInsightUsageIdentityResolverIntConfig("insightUsageIdentityResolverMaxItems", insightUsageIdentityResolverDefaultMaxItems))
	timeoutMs := normalizeInsightUsageIdentityResolverTimeoutMs(getInsightUsageIdentityResolverIntConfig("insightUsageIdentityResolverTimeoutMs", insightUsageIdentityResolverDefaultTimeoutMs))

	configuredKeys, missingKeys := serviceCredentialGovernanceConfiguredMissingKeys(map[string]bool{
		"insightUsageIdentityResolverEndpoint":  endpointConfigured,
		"insightUsageIdentityResolverToken":     tokenConfigured,
		"insightUsageIdentityResolverCaller":    strings.TrimSpace(caller) != "",
		"insightUsageIdentityResolverMaxItems":  true,
		"insightUsageIdentityResolverTimeoutMs": true,
	})

	status := serviceCredentialGovernanceStatusConfigured
	if !endpointConfigured && !tokenConfigured {
		status = serviceCredentialGovernanceStatusMissing
	} else if !endpointConfigured || !tokenConfigured {
		status = serviceCredentialGovernanceStatusPartial
	}

	credentialStatus := serviceCredentialReferenceMissing
	if tokenConfigured {
		credentialStatus = serviceCredentialReferenceConfigured
	}

	return ServiceCredentialGovernanceStatusGroup{
		Key:                       "usage_identity_resolver",
		Label:                     "Usage identity resolver",
		Owner:                     "admin_outbound_resolver",
		Status:                    status,
		ConfiguredKeys:            configuredKeys,
		MissingKeys:               missingKeys,
		CredentialReferenceStatus: credentialStatus,
		CallerPolicy:              caller,
		BoundedRuntimePolicy: map[string]interface{}{
			"maxItems":         maxItems,
			"timeoutMs":        timeoutMs,
			"transportRetries": insightUsageIdentityResolverTransportRetries,
		},
		BlockedReasons:   buildServiceCredentialMissingReasons("usage_identity_resolver", missingKeys),
		RemediationRoute: "/platform-api-mappings",
	}
}

func buildGatewayOrganizationProjectionGovernanceGroup() ServiceCredentialGovernanceStatusGroup {
	publisherConfig := object.GetGatewayProjectionPublisherConfig()
	refreshConfig := object.GetGatewayProjectionRefreshConfig()
	endpointConfigured := strings.TrimSpace(publisherConfig.Endpoint) != ""
	statusEndpointConfigured := strings.TrimSpace(publisherConfig.StatusEndpoint) != ""
	tokenConfigured := strings.TrimSpace(publisherConfig.Token) != ""

	configuredKeys, missingKeys := serviceCredentialGovernanceConfiguredMissingKeys(map[string]bool{
		"gatewayOrganizationProjectionEnabled":                    publisherConfig.Enabled,
		"gatewayOrganizationProjectionEndpoint":                   endpointConfigured,
		"gatewayOrganizationProjectionStatusEndpoint":             statusEndpointConfigured,
		"gatewayOrganizationProjectionToken":                      tokenConfigured,
		"gatewayOrganizationProjectionCaller":                     strings.TrimSpace(publisherConfig.Caller) != "",
		"gatewayOrganizationProjectionTimeoutMs":                  publisherConfig.Timeout > 0,
		"gatewayOrganizationProjectionFreshnessTTLSeconds":        publisherConfig.FreshnessTTL > 0,
		"gatewayOrganizationProjectionMaxRetries":                 publisherConfig.MaxRetries >= 0,
		"gatewayOrganizationProjectionRefreshEnabled":             refreshConfig.Enabled,
		"gatewayOrganizationProjectionRefreshIntervalSeconds":     refreshConfig.Interval > 0,
		"gatewayOrganizationProjectionRefreshInitialDelaySeconds": refreshConfig.InitialDelay >= 0,
		"gatewayOrganizationProjectionRefreshBatchSize":           refreshConfig.BatchSize > 0,
	})

	status := serviceCredentialGovernanceStatusConfigured
	blockedReasons := []string{}
	if !publisherConfig.Enabled {
		status = serviceCredentialGovernanceStatusNotApplicable
		missingKeys = []string{}
	} else {
		if !endpointConfigured {
			blockedReasons = append(blockedReasons, "gateway_projection_endpoint_missing")
		}
		if !tokenConfigured {
			blockedReasons = append(blockedReasons, "gateway_projection_token_missing")
		}
		if len(blockedReasons) > 0 {
			status = serviceCredentialGovernanceStatusBlocked
		} else if !statusEndpointConfigured {
			status = serviceCredentialGovernanceStatusPartial
			blockedReasons = append(blockedReasons, "gateway_projection_status_endpoint_missing")
		}
	}

	credentialStatus := serviceCredentialReferenceNotApplicable
	if publisherConfig.Enabled {
		credentialStatus = serviceCredentialReferenceMissing
		if tokenConfigured {
			credentialStatus = serviceCredentialReferenceConfigured
		}
	}

	return ServiceCredentialGovernanceStatusGroup{
		Key:                       "gateway_organization_projection",
		Label:                     "Gateway organization projection",
		Owner:                     "admin_gateway_projection_producer",
		Status:                    status,
		ConfiguredKeys:            configuredKeys,
		MissingKeys:               missingKeys,
		CredentialReferenceStatus: credentialStatus,
		CallerPolicy:              publisherConfig.Caller,
		BoundedRuntimePolicy: map[string]interface{}{
			"enabled":                    publisherConfig.Enabled,
			"timeoutMs":                  int(publisherConfig.Timeout / time.Millisecond),
			"freshnessTTLSeconds":        int(publisherConfig.FreshnessTTL / time.Second),
			"maxRetries":                 publisherConfig.MaxRetries,
			"refreshEnabled":             refreshConfig.Enabled,
			"refreshIntervalSeconds":     int(refreshConfig.Interval / time.Second),
			"refreshInitialDelaySeconds": int(refreshConfig.InitialDelay / time.Second),
			"refreshBatchSize":           refreshConfig.BatchSize,
		},
		BlockedReasons:   deduplicateStrings(blockedReasons),
		RemediationRoute: "/platform-api-mappings",
	}
}

func buildKeepInEnvGovernanceGroup() ServiceCredentialGovernanceStatusGroup {
	return ServiceCredentialGovernanceStatusGroup{
		Key:                       "keep_in_env",
		Label:                     "Keep in env/config",
		Owner:                     "deployment_env_config",
		Status:                    serviceCredentialGovernanceStatusConfigured,
		ConfiguredKeys:            []string{"env/config", "external-secret-system"},
		CredentialReferenceStatus: serviceCredentialReferenceExternal,
		KeepInEnvKeys: []string{
			"driverName",
			"dataSourceName",
			"dbName",
			"redisEndpoint",
			"httpport",
			"httpsport",
			"certFile",
			"keyFile",
			"initDataFile",
			"KMS/Vault bootstrap",
			"breakGlassRecovery",
			"buildTokens",
			"CROWDIN_PERSONAL_TOKEN",
			"RADIUS/LDAP server secrets",
		},
		RemediationRoute: "env/config",
	}
}

func serviceCredentialGovernanceConfiguredMissingKeys(keyConfigured map[string]bool) ([]string, []string) {
	configuredKeys := []string{}
	missingKeys := []string{}
	for key, configured := range keyConfigured {
		if configured {
			configuredKeys = append(configuredKeys, key)
		} else {
			missingKeys = append(missingKeys, key)
		}
	}
	return deduplicateStrings(configuredKeys), deduplicateStrings(missingKeys)
}

func buildServiceCredentialMissingReasons(prefix string, missingKeys []string) []string {
	reasons := []string{}
	for _, key := range missingKeys {
		reasons = append(reasons, prefix+"_"+serviceCredentialGovernanceReasonKey(key)+"_missing")
	}
	return deduplicateStrings(reasons)
}

func serviceCredentialGovernanceReasonKey(key string) string {
	parts := []rune{}
	for index, r := range key {
		if r >= 'A' && r <= 'Z' {
			if index > 0 {
				parts = append(parts, '_')
			}
			parts = append(parts, r+'a'-'A')
			continue
		}
		parts = append(parts, r)
	}
	return strings.ToLower(string(parts))
}
