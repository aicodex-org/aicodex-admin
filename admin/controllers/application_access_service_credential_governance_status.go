package controllers

import (
	"encoding/json"
	"strconv"
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
	NextAction                string                 `json:"nextAction,omitempty"`
}

// GetApplicationAccessServiceCredentialGovernanceStatus 返回 Admin 运行态配置推导出的脱敏治理状态。
// 该接口只读，不触发 resolver、provider、Gateway projection publish 或 credential test。
func (c *ApiController) GetApplicationAccessServiceCredentialGovernanceStatus() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	status, err := buildApplicationAccessServiceCredentialGovernanceStatusWithConfig(time.Now().UTC())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(status)
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
	status, err := buildApplicationAccessServiceCredentialGovernanceStatusWithConfig(generatedAt)
	if err != nil {
		return buildApplicationAccessServiceCredentialGovernanceLegacyStatus(generatedAt)
	}
	return status
}

func buildApplicationAccessServiceCredentialGovernanceStatusWithConfig(generatedAt time.Time) (ServiceCredentialGovernanceStatusResponse, error) {
	status := buildApplicationAccessServiceCredentialGovernanceLegacyStatus(generatedAt)
	config, err := applicationAccessServiceCredentialGovernanceConfigServiceFactory().GetConfig()
	if err != nil {
		return ServiceCredentialGovernanceStatusResponse{}, err
	}
	if config == nil || !config.IsConfigured {
		return status, nil
	}
	status.Groups = applyServiceCredentialGovernanceStatusConfigOverlay(status.Groups, config.Groups)
	return status, nil
}

func buildApplicationAccessServiceCredentialGovernanceLegacyStatus(generatedAt time.Time) ServiceCredentialGovernanceStatusResponse {
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

func applyServiceCredentialGovernanceStatusConfigOverlay(groups []ServiceCredentialGovernanceStatusGroup, configGroups []object.ServiceCredentialGovernanceConfigGroup) []ServiceCredentialGovernanceStatusGroup {
	overlayByKey := map[string]object.ServiceCredentialGovernanceConfigGroup{}
	for _, configGroup := range configGroups {
		if isServiceCredentialGovernanceStatusOverlayGroup(configGroup.Key) {
			overlayByKey[configGroup.Key] = configGroup
		}
	}
	if len(overlayByKey) == 0 {
		return groups
	}
	overlaid := make([]ServiceCredentialGovernanceStatusGroup, 0, len(groups))
	for _, group := range groups {
		configGroup, ok := overlayByKey[group.Key]
		if ok {
			if group.Key == "insight_provider_trust" {
				group = applyInsightProviderTrustStatusGroupConfigOverlay(group, configGroup)
			} else {
				group = applyServiceCredentialGovernanceStatusGroupConfigOverlay(group, configGroup)
			}
		}
		overlaid = append(overlaid, group)
	}
	return overlaid
}

func isServiceCredentialGovernanceStatusOverlayGroup(key string) bool {
	return key == "insight_provider_trust" || key == "usage_identity_resolver" || key == "gateway_organization_projection"
}

// applyInsightProviderTrustStatusGroupConfigOverlay 将 saved trust policy 映射成只含 count/digest/source 的脱敏治理状态。
func applyInsightProviderTrustStatusGroupConfigOverlay(group ServiceCredentialGovernanceStatusGroup, configGroup object.ServiceCredentialGovernanceConfigGroup) ServiceCredentialGovernanceStatusGroup {
	policy := buildInsightProviderTrustRuntimePolicyFromConfig(&object.ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups:       []object.ServiceCredentialGovernanceConfigGroup{configGroup},
	})
	if !policy.Explicit {
		return group
	}

	group.ConfiguredKeys = []string{}
	group.MissingKeys = []string{}
	group.BlockedReasons = deduplicateStrings(configGroup.BlockedReasons)
	group.CredentialReferenceStatus = serviceCredentialReferenceNotApplicable
	group.CallerPolicy = "insight_service_token"
	group.RemediationRoute = firstNonEmptyInsightString(configGroup.RemediationRoute, "/providers")
	group.BoundedRuntimePolicy = map[string]interface{}{
		"source":                   "saved_runtime_policy",
		"allowedAudienceCount":     len(policy.AllowedAudiences),
		"allowedIssuerDigestCount": len(policy.AllowedIssuerDigests),
		"requiredScopeCount":       len(policy.RequiredScopes),
		"requiredScopesDefaulted":  policy.RequiredScopesDefaulted,
		"issuerMode":               policy.IssuerMode,
		"cannotInfer":              policy.CannotInfer,
	}

	if !policy.Enabled {
		group.Status = serviceCredentialGovernanceStatusBlocked
		group.BlockedReasons = deduplicateStrings(append(group.BlockedReasons, "insight_provider_saved_trust_policy_disabled"))
		return group
	}

	if len(policy.AllowedAudiences) > 0 {
		group.ConfiguredKeys = append(group.ConfiguredKeys, "allowedAudiences:"+strconv.Itoa(len(policy.AllowedAudiences)))
	} else {
		group.MissingKeys = append(group.MissingKeys, "allowedAudiences")
		group.BlockedReasons = append(group.BlockedReasons, "insight_provider_allowed_audiences_missing")
	}
	if policy.IssuerMode == "any_non_empty" {
		group.ConfiguredKeys = append(group.ConfiguredKeys, "issuerMode:any_non_empty")
	} else if len(policy.AllowedIssuerDigests) > 0 {
		group.ConfiguredKeys = append(group.ConfiguredKeys, "allowedIssuerDigests:"+strconv.Itoa(len(policy.AllowedIssuerDigests)))
	} else {
		group.MissingKeys = append(group.MissingKeys, "allowedIssuerDigests")
		group.BlockedReasons = append(group.BlockedReasons, "insight_provider_issuer_digest_missing")
	}
	if len(policy.RequiredScopes) > 0 {
		group.ConfiguredKeys = append(group.ConfiguredKeys, "requiredScopes:"+strconv.Itoa(len(policy.RequiredScopes)))
	} else {
		group.MissingKeys = append(group.MissingKeys, "requiredScopes")
		group.BlockedReasons = append(group.BlockedReasons, "insight_provider_required_scopes_missing")
	}

	group.ConfiguredKeys = deduplicateStrings(group.ConfiguredKeys)
	group.MissingKeys = deduplicateStrings(group.MissingKeys)
	group.BlockedReasons = deduplicateStrings(group.BlockedReasons)
	if len(group.BlockedReasons) > 0 {
		group.Status = serviceCredentialGovernanceStatusBlocked
	} else if len(group.MissingKeys) > 0 {
		group.Status = serviceCredentialGovernanceStatusPartial
	} else {
		group.Status = serviceCredentialGovernanceStatusConfigured
	}
	return group
}

func applyServiceCredentialGovernanceStatusGroupConfigOverlay(group ServiceCredentialGovernanceStatusGroup, configGroup object.ServiceCredentialGovernanceConfigGroup) ServiceCredentialGovernanceStatusGroup {
	// 已保存配置代表 operator 对该分组的显式治理意图；一旦存在，就不能继续把 legacy token 当成 active readiness。
	group.ConfiguredKeys = []string{}
	group.MissingKeys = []string{}
	group.BlockedReasons = deduplicateStrings(configGroup.BlockedReasons)
	if strings.TrimSpace(configGroup.Owner) != "" {
		group.Owner = configGroup.Owner
	}
	if strings.TrimSpace(configGroup.CallerPolicy) != "" {
		group.CallerPolicy = configGroup.CallerPolicy
	}
	if configGroup.BoundedRuntimePolicy != nil {
		group.BoundedRuntimePolicy = configGroup.BoundedRuntimePolicy
	} else {
		group.BoundedRuntimePolicy = nil
	}
	if strings.TrimSpace(configGroup.RemediationRoute) != "" {
		group.RemediationRoute = configGroup.RemediationRoute
	}
	if strings.TrimSpace(configGroup.NextAction) != "" {
		group.NextAction = configGroup.NextAction
	}
	if strings.TrimSpace(configGroup.CredentialReferenceStatus) != "" {
		group.CredentialReferenceStatus = configGroup.CredentialReferenceStatus
	}

	if !configGroup.Enabled {
		group.Status = serviceCredentialGovernanceStatusBlocked
		group.BlockedReasons = deduplicateStrings(append(group.BlockedReasons, "admin_service_credential_config_disabled"))
		return group
	}

	if serviceCredentialGovernanceReferenceIsReady(configGroup.CredentialReferenceStatus) && strings.TrimSpace(configGroup.CredentialReferenceKey) != "" {
		group.ConfiguredKeys = append(group.ConfiguredKeys, strings.TrimSpace(configGroup.CredentialReferenceKey))
	} else {
		group.MissingKeys = append(group.MissingKeys, "credentialReferenceKey")
		group.CredentialReferenceStatus = serviceCredentialReferenceMissing
		group.BlockedReasons = append(group.BlockedReasons, "admin_service_credential_reference_missing")
	}
	if strings.TrimSpace(configGroup.CallerPolicy) != "" {
		group.ConfiguredKeys = append(group.ConfiguredKeys, "callerPolicy")
	} else {
		group.MissingKeys = append(group.MissingKeys, "callerPolicy")
		group.BlockedReasons = append(group.BlockedReasons, "admin_service_credential_caller_policy_missing")
	}
	if len(configGroup.BoundedRuntimePolicy) > 0 {
		group.ConfiguredKeys = append(group.ConfiguredKeys, "boundedRuntimePolicy")
	} else {
		group.MissingKeys = append(group.MissingKeys, "boundedRuntimePolicy")
		group.BlockedReasons = append(group.BlockedReasons, "admin_service_credential_runtime_policy_missing")
	}

	group.ConfiguredKeys = deduplicateStrings(group.ConfiguredKeys)
	group.MissingKeys = deduplicateStrings(group.MissingKeys)
	group.BlockedReasons = deduplicateStrings(group.BlockedReasons)
	if serviceCredentialGovernanceStringSliceContains(group.BlockedReasons, "admin_service_credential_reference_missing") {
		group.Status = serviceCredentialGovernanceStatusBlocked
	} else if len(group.MissingKeys) > 0 {
		group.Status = serviceCredentialGovernanceStatusPartial
	} else {
		group.Status = serviceCredentialGovernanceStatusConfigured
	}
	return group
}

func serviceCredentialGovernanceReferenceIsReady(status string) bool {
	return status == serviceCredentialReferenceConfigured || status == serviceCredentialReferenceExternal
}

func serviceCredentialGovernanceStringSliceContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
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
