package object

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
)

const (
	ServiceCredentialRuntimeGroupUsageIdentityResolver = "usage_identity_resolver"
	ServiceCredentialRuntimeGroupInsightProviderTrust  = "insight_provider_trust"
	ServiceCredentialRuntimeGroupGatewayProjection     = "gateway_organization_projection"

	ServiceCredentialRuntimeSourceLegacyEnvConfig = "legacy_env_config"
	ServiceCredentialRuntimeSourceSavedKeepInEnv  = "saved_keep_in_env"
	ServiceCredentialRuntimeSourceSavedSecretRef  = "saved_secret_ref"
	ServiceCredentialRuntimeSourceSavedManual     = "saved_manual"
	ServiceCredentialRuntimeSourceSavedConfig     = "saved_config"

	ServiceCredentialRuntimeBlockerMissing                = "admin_runtime_config_missing"
	ServiceCredentialRuntimeBlockerInvalid                = "admin_runtime_config_invalid"
	ServiceCredentialRuntimeBlockerSavedConfigUnavailable = ServiceCredentialRuntimeBlockerConfigUnavailable
	ServiceCredentialRuntimeBlockerLegacyDisabled         = "admin_runtime_config_legacy_disabled"

	usageIdentityResolverRuntimeDefaultCaller    = "aicodex-admin"
	usageIdentityResolverRuntimeDefaultMaxItems  = 200
	usageIdentityResolverRuntimeDefaultTimeoutMs = 5000
	insightProviderRuntimeDefaultRequiredScopes  = "profile insight.scope.read"
)

var errServiceCredentialRuntimeMaterialUnavailable = errors.New("service credential runtime material is unavailable")

// ServiceCredentialRuntimeResolution 是三组 P0 runtime config 共用的 copy-safe 解析结果。
// 该结构可以投影到 status/diagnostics，但不得增加 endpoint、token 或 secret 字段。
type ServiceCredentialRuntimeResolution struct {
	GroupKey               string   `json:"groupKey"`
	Ready                  bool     `json:"ready"`
	AdoptedSource          string   `json:"adoptedSource"`
	Owner                  string   `json:"owner"`
	CredentialReferenceKey string   `json:"credentialReferenceKey,omitempty"`
	SavedPolicy            bool     `json:"savedPolicy"`
	Diagnostics            []string `json:"diagnostics,omitempty"`
	BlockedReasons         []string `json:"blockedReasons,omitempty"`
	ErrorCode              string   `json:"errorCode,omitempty"`
}

// ServiceCredentialMaterialRequest 只把 group、source 和 copy-safe reference 交给 material provider。
type ServiceCredentialMaterialRequest struct {
	GroupKey     string
	Source       string
	ReferenceKey string
}

// ServiceCredentialMaterial 只在进程内承载外部调用所需材料，所有字段均禁止 JSON 序列化。
type ServiceCredentialMaterial struct {
	Endpoint       string `json:"-"`
	StatusEndpoint string `json:"-"`
	Token          string `json:"-"`
}

// ServiceCredentialMaterialProvider 隔离 env/config 与未来 secret provider，治理配置本身不实现 secret 存储。
type ServiceCredentialMaterialProvider interface {
	ResolveServiceCredentialMaterial(request ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error)
}

type defaultServiceCredentialMaterialProvider struct{}

// UsageIdentityResolverRuntimeConfig 是 usage identity resolver 唯一的最终 typed config。
type UsageIdentityResolverRuntimeConfig struct {
	Resolution         ServiceCredentialRuntimeResolution `json:"resolution"`
	Endpoint           string                             `json:"-"`
	Token              string                             `json:"-"`
	EndpointConfigured bool                               `json:"-"`
	TokenConfigured    bool                               `json:"-"`
	Caller             string                             `json:"-"`
	MaxItems           int                                `json:"-"`
	LookupTimeout      time.Duration                      `json:"-"`
}

// InsightProviderTrustRuntimeConfig 是 Insight provider bearer trust 唯一的最终 typed config。
type InsightProviderTrustRuntimeConfig struct {
	Resolution              ServiceCredentialRuntimeResolution `json:"resolution"`
	Enabled                 bool                               `json:"-"`
	AllowedAudiences        []string                           `json:"-"`
	AudienceConfigKey       string                             `json:"-"`
	RequiredScopes          []string                           `json:"-"`
	AllowedIssuerDigests    []string                           `json:"-"`
	AllowedIssuers          []string                           `json:"-"`
	IssuerMode              string                             `json:"-"`
	RequiredScopesDefaulted bool                               `json:"-"`
	CannotInfer             bool                               `json:"-"`
}

// GatewayProjectionRuntimeConfig 将 publisher 与 refresh policy 放在同一个解析边界内。
type GatewayProjectionRuntimeConfig struct {
	Resolution                        ServiceCredentialRuntimeResolution `json:"resolution"`
	Publisher                         GatewayProjectionPublisherConfig   `json:"-"`
	Refresh                           GatewayProjectionRefreshConfig     `json:"-"`
	PublisherEndpointConfigured       bool                               `json:"-"`
	PublisherStatusEndpointConfigured bool                               `json:"-"`
	PublisherTokenConfigured          bool                               `json:"-"`
}

type serviceCredentialRuntimeBase struct {
	resolution ServiceCredentialRuntimeResolution
	group      ServiceCredentialGovernanceConfigGroup
	material   ServiceCredentialMaterial
	saved      bool
}

// GetGatewayProjectionRuntimeConfig 从唯一 saved config service 入口解析 Gateway publisher/refresh 配置。
func GetGatewayProjectionRuntimeConfig() GatewayProjectionRuntimeConfig {
	config, err := serviceCredentialRuntimePolicyConfigServiceFactory().GetConfig()
	return ResolveGatewayProjectionRuntimeConfig(config, err, nil)
}

func (defaultServiceCredentialMaterialProvider) ResolveServiceCredentialMaterial(request ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error) {
	if request.Source != ServiceCredentialRuntimeSourceLegacyEnvConfig && request.Source != ServiceCredentialRuntimeSourceSavedKeepInEnv {
		return ServiceCredentialMaterial{}, errServiceCredentialRuntimeMaterialUnavailable
	}
	switch request.GroupKey {
	case ServiceCredentialRuntimeGroupUsageIdentityResolver:
		return ServiceCredentialMaterial{
			Endpoint: strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverEndpoint")),
			Token:    strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverToken")),
		}, nil
	case ServiceCredentialRuntimeGroupGatewayProjection:
		return ServiceCredentialMaterial{
			Endpoint:       strings.TrimSpace(conf.GetConfigString("gatewayOrganizationProjectionEndpoint")),
			StatusEndpoint: strings.TrimSpace(conf.GetConfigString("gatewayOrganizationProjectionStatusEndpoint")),
			Token:          strings.TrimSpace(conf.GetConfigString("gatewayOrganizationProjectionToken")),
		}, nil
	default:
		return ServiceCredentialMaterial{}, errServiceCredentialRuntimeMaterialUnavailable
	}
}

// ResolveUsageIdentityResolverRuntimeConfig 统一解析 usage resolver 的 source、material、caller 与 bounded policy。
func ResolveUsageIdentityResolverRuntimeConfig(config *ServiceCredentialGovernanceConfigResponse, loadErr error, provider ServiceCredentialMaterialProvider) UsageIdentityResolverRuntimeConfig {
	base := resolveServiceCredentialRuntimeBase(config, loadErr, ServiceCredentialRuntimeGroupUsageIdentityResolver, provider)
	result := UsageIdentityResolverRuntimeConfig{Resolution: base.resolution}
	if len(result.Resolution.BlockedReasons) > 0 {
		return result
	}

	result.Endpoint = strings.TrimSpace(base.material.Endpoint)
	result.Token = strings.TrimSpace(base.material.Token)
	result.EndpointConfigured = result.Endpoint != ""
	result.TokenConfigured = result.Token != ""
	if base.saved {
		result.Caller = strings.TrimSpace(base.group.CallerPolicy)
		if result.Caller == "" {
			result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerCallerMissing)
		}
		maxItems, ok := serviceCredentialRuntimePolicyRequiredInt(base.group.BoundedRuntimePolicy, "maxItems", 1)
		if !ok {
			result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerBoundedPolicyMissing)
		} else {
			result.MaxItems = maxItems
		}
		timeoutMs, ok := serviceCredentialRuntimePolicyRequiredInt(base.group.BoundedRuntimePolicy, "timeoutMs", 1)
		if !ok {
			result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerBoundedPolicyMissing)
		} else {
			result.LookupTimeout = time.Duration(timeoutMs) * time.Millisecond
		}
	} else {
		result.Caller = firstNonEmpty(strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverCaller")), usageIdentityResolverRuntimeDefaultCaller)
		maxItems, _ := serviceCredentialRuntimeOptionalIntConfig("insightUsageIdentityResolverMaxItems", usageIdentityResolverRuntimeDefaultMaxItems, 1)
		if maxItems <= 0 {
			maxItems = usageIdentityResolverRuntimeDefaultMaxItems
		}
		timeoutMs, _ := serviceCredentialRuntimeOptionalIntConfig("insightUsageIdentityResolverTimeoutMs", usageIdentityResolverRuntimeDefaultTimeoutMs, 1)
		if timeoutMs <= 0 {
			timeoutMs = usageIdentityResolverRuntimeDefaultTimeoutMs
		}
		result.MaxItems = maxItems
		result.LookupTimeout = time.Duration(timeoutMs) * time.Millisecond
	}

	result.Resolution = validateServiceCredentialRuntimeMaterial(result.Resolution, result.Endpoint, result.Token, "")
	return finalizeServiceCredentialRuntimeConfigResolution(result)
}

// ResolveInsightProviderTrustRuntimeConfig 统一解析 legacy 或显式 saved provider trust policy。
func ResolveInsightProviderTrustRuntimeConfig(config *ServiceCredentialGovernanceConfigResponse, loadErr error) InsightProviderTrustRuntimeConfig {
	resolution := newServiceCredentialRuntimeResolution(ServiceCredentialRuntimeGroupInsightProviderTrust)
	if loadErr != nil {
		resolution.AdoptedSource = ServiceCredentialRuntimeSourceSavedConfig
		resolution.SavedPolicy = true
		return finalizeInsightProviderTrustRuntimeConfig(InsightProviderTrustRuntimeConfig{
			Resolution: blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerSavedConfigUnavailable),
		})
	}

	group, found := serviceCredentialRuntimePolicyGroupByKey(serviceCredentialRuntimeGroups(config), ServiceCredentialRuntimeGroupInsightProviderTrust)
	explicit := found && config != nil && config.IsConfigured && serviceCredentialRuntimeTrustPolicyExplicit(group)
	if !explicit {
		resolution.AdoptedSource = ServiceCredentialRuntimeSourceLegacyEnvConfig
		allowedAudiences := splitServiceCredentialRuntimeCSV(conf.GetConfigString("insightProviderAllowedAudiences"))
		audienceConfigKey := "insightProviderAllowedAudiences"
		if len(allowedAudiences) == 0 {
			allowedAudiences = splitServiceCredentialRuntimeCSV(conf.GetConfigString("insightProviderAudience"))
			audienceConfigKey = "insightProviderAudience"
		}
		result := InsightProviderTrustRuntimeConfig{
			Resolution:        resolution,
			Enabled:           true,
			AllowedAudiences:  allowedAudiences,
			AudienceConfigKey: audienceConfigKey,
			AllowedIssuers:    splitServiceCredentialRuntimeCSV(conf.GetConfigString("insightProviderAllowedIssuers")),
			RequiredScopes:    splitServiceCredentialRuntimeCSV(conf.GetConfigString("insightProviderRequiredScopes")),
		}
		if len(result.RequiredScopes) == 0 {
			result.RequiredScopes = splitServiceCredentialRuntimeCSV(insightProviderRuntimeDefaultRequiredScopes)
			result.RequiredScopesDefaulted = true
		}
		if len(result.AllowedIssuers) == 0 {
			result.IssuerMode = "any_non_empty"
		} else {
			result.IssuerMode = "legacy_allowlist"
		}
		if len(result.AllowedAudiences) == 0 {
			result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerMissing)
		}
		return finalizeInsightProviderTrustRuntimeConfig(result)
	}

	resolution.SavedPolicy = true
	resolution.Owner = firstNonEmpty(strings.TrimSpace(group.Owner), resolution.Owner)
	resolution.AdoptedSource = serviceCredentialRuntimeSavedSource(group)
	for _, blocker := range group.BlockedReasons {
		resolution = blockServiceCredentialRuntimeResolution(resolution, blocker)
	}
	if resolution.AdoptedSource == "" {
		resolution.AdoptedSource = ServiceCredentialRuntimeSourceSavedConfig
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerInvalid)
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
		return finalizeInsightProviderTrustRuntimeConfig(InsightProviderTrustRuntimeConfig{Resolution: resolution})
	}
	if !group.Enabled {
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerGroupDisabled)
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
		return finalizeInsightProviderTrustRuntimeConfig(InsightProviderTrustRuntimeConfig{Resolution: resolution})
	}

	result := InsightProviderTrustRuntimeConfig{Resolution: resolution, Enabled: true}
	result.AudienceConfigKey = "boundedRuntimePolicy.allowedAudiences"
	var valid bool
	result.AllowedAudiences, _, valid = serviceCredentialRuntimePolicyStringSlice(group.BoundedRuntimePolicy, "allowedAudiences")
	if !valid {
		result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerInvalid)
	}
	result.RequiredScopes, _, valid = serviceCredentialRuntimePolicyStringSlice(group.BoundedRuntimePolicy, "requiredScopes")
	if !valid {
		result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerInvalid)
	}
	result.AllowedIssuerDigests, _, valid = serviceCredentialRuntimePolicyStringSlice(group.BoundedRuntimePolicy, "allowedIssuerDigests")
	if !valid {
		result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerInvalid)
	}
	result.IssuerMode, valid = serviceCredentialRuntimePolicyOptionalString(group.BoundedRuntimePolicy, "issuerMode", "digest_allowlist")
	if !valid || (result.IssuerMode != "digest_allowlist" && result.IssuerMode != "any_non_empty") {
		result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerInvalid)
	}
	if len(result.RequiredScopes) == 0 {
		result.RequiredScopes = splitServiceCredentialRuntimeCSV(insightProviderRuntimeDefaultRequiredScopes)
		result.RequiredScopesDefaulted = true
	}
	if len(result.AllowedAudiences) == 0 {
		result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerMissing)
	}
	if result.IssuerMode == "digest_allowlist" {
		if len(result.AllowedIssuerDigests) == 0 {
			result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerMissing)
		}
		for _, digest := range result.AllowedIssuerDigests {
			if !isServiceCredentialGovernanceIssuerDigest(digest) {
				result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerInvalid)
				break
			}
		}
	}
	result.CannotInfer = result.IssuerMode == "any_non_empty"
	return finalizeInsightProviderTrustRuntimeConfig(result)
}

// ResolveGatewayProjectionRuntimeConfig 统一解析 Gateway publisher 与 refresh worker 的配置和 blocker。
func ResolveGatewayProjectionRuntimeConfig(config *ServiceCredentialGovernanceConfigResponse, loadErr error, provider ServiceCredentialMaterialProvider) GatewayProjectionRuntimeConfig {
	base := resolveServiceCredentialRuntimeBase(config, loadErr, ServiceCredentialRuntimeGroupGatewayProjection, provider)
	result := GatewayProjectionRuntimeConfig{Resolution: base.resolution}
	intendedEnabled := gatewayProjectionRuntimeIntendedEnabled(base)
	result.Publisher.Enabled = intendedEnabled
	result.Publisher.Resolution = result.Resolution
	result.Publisher.Endpoint = strings.TrimSpace(base.material.Endpoint)
	result.Publisher.StatusEndpoint = strings.TrimSpace(base.material.StatusEndpoint)
	result.Publisher.Token = strings.TrimSpace(base.material.Token)
	result.PublisherEndpointConfigured = result.Publisher.Endpoint != ""
	result.PublisherStatusEndpointConfigured = result.Publisher.StatusEndpoint != ""
	result.PublisherTokenConfigured = result.Publisher.Token != ""
	if base.saved {
		populateSavedGatewayProjectionRuntimePolicy(&result, base)
	} else {
		populateLegacyGatewayProjectionRuntimePolicy(&result, intendedEnabled)
	}

	if len(result.Resolution.BlockedReasons) == 0 {
		if !intendedEnabled {
			result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerGroupDisabled)
		} else {
			result.Resolution = validateServiceCredentialRuntimeMaterial(result.Resolution, result.Publisher.Endpoint, result.Publisher.Token, result.Publisher.StatusEndpoint)
		}
	}
	// saved manual/secretRef/config 错误不得保留可执行的 publisher intent。
	// keepInEnv 则保留 legacy env enabled 标志，使材料缺失时继续映射既有 invalid_config alias。
	if len(result.Resolution.BlockedReasons) > 0 && base.saved && result.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceSavedKeepInEnv {
		result.Publisher.Enabled = false
	}
	return finalizeGatewayProjectionRuntimeConfig(result)
}

func gatewayProjectionRuntimeIntendedEnabled(base serviceCredentialRuntimeBase) bool {
	if !base.saved || base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedKeepInEnv {
		if base.saved && !base.group.Enabled {
			return false
		}
		return conf.GetConfigBool("gatewayOrganizationProjectionEnabled")
	}
	return base.group.Enabled && (base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedManual || base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedSecretRef)
}

func populateSavedGatewayProjectionRuntimePolicy(result *GatewayProjectionRuntimeConfig, base serviceCredentialRuntimeBase) {
	result.Publisher.Caller = firstNonEmpty(strings.TrimSpace(base.group.CallerPolicy), GatewayProjectionDefaultCaller)
	result.Publisher.Timeout = time.Duration(gatewayProjectionPublisherDefaultTimeoutMs) * time.Millisecond
	result.Publisher.FreshnessTTL = GatewayProjectionDefaultFreshnessTTL
	result.Publisher.MaxRetries = gatewayProjectionPublisherDefaultRetries
	result.Refresh.Enabled = true
	result.Refresh.Interval = time.Duration(gatewayProjectionRefreshDefaultIntervalSeconds) * time.Second
	result.Refresh.InitialDelay = time.Duration(gatewayProjectionRefreshDefaultInitialDelaySeconds) * time.Second
	result.Refresh.BatchSize = gatewayProjectionRefreshDefaultBatchSize

	// missing/unavailable/disabled saved metadata 仍返回归一化的 copy-safe 默认值，
	// 但不得额外制造 policy blocker，也不得读取 legacy material。
	if strings.TrimSpace(base.group.Key) != ServiceCredentialRuntimeGroupGatewayProjection || !base.group.Enabled {
		return
	}
	if strings.TrimSpace(base.group.CallerPolicy) == "" {
		result.Resolution = blockServiceCredentialRuntimeResolution(result.Resolution, ServiceCredentialRuntimeBlockerCallerMissing)
	}
	result.Publisher.Timeout = time.Duration(serviceCredentialRuntimePolicyIntOrBlock(&result.Resolution, base.group.BoundedRuntimePolicy, "timeoutMs", 1, gatewayProjectionPublisherDefaultTimeoutMs)) * time.Millisecond
	result.Publisher.FreshnessTTL = time.Duration(serviceCredentialRuntimePolicyIntOrBlock(&result.Resolution, base.group.BoundedRuntimePolicy, "freshnessTTLSeconds", 1, int(GatewayProjectionDefaultFreshnessTTL/time.Second))) * time.Second
	result.Publisher.MaxRetries = serviceCredentialRuntimePolicyIntOrBlock(&result.Resolution, base.group.BoundedRuntimePolicy, "maxRetries", 0, gatewayProjectionPublisherDefaultRetries)
	result.Refresh.Enabled = serviceCredentialRuntimePolicyOptionalBool(base.group.BoundedRuntimePolicy, "refreshEnabled", true, &result.Resolution)
	result.Refresh.Interval = time.Duration(serviceCredentialRuntimePolicyOptionalInt(base.group.BoundedRuntimePolicy, "refreshIntervalSeconds", gatewayProjectionRefreshDefaultIntervalSeconds, 1, &result.Resolution)) * time.Second
	result.Refresh.InitialDelay = time.Duration(serviceCredentialRuntimePolicyOptionalInt(base.group.BoundedRuntimePolicy, "refreshInitialDelaySeconds", gatewayProjectionRefreshDefaultInitialDelaySeconds, 0, &result.Resolution)) * time.Second
	result.Refresh.BatchSize = serviceCredentialRuntimePolicyOptionalInt(base.group.BoundedRuntimePolicy, "refreshBatchSize", gatewayProjectionRefreshDefaultBatchSize, 1, &result.Resolution)
}

func populateLegacyGatewayProjectionRuntimePolicy(result *GatewayProjectionRuntimeConfig, intendedEnabled bool) {
	result.Publisher.Caller = firstNonEmpty(strings.TrimSpace(conf.GetConfigString("gatewayOrganizationProjectionCaller")), GatewayProjectionDefaultCaller)
	timeoutMs, _ := serviceCredentialRuntimeOptionalIntConfig("gatewayOrganizationProjectionTimeoutMs", gatewayProjectionPublisherDefaultTimeoutMs, 1)
	freshnessSeconds, _ := serviceCredentialRuntimeOptionalIntConfig("gatewayOrganizationProjectionFreshnessTTLSeconds", int(GatewayProjectionDefaultFreshnessTTL/time.Second), 1)
	maxRetries, _ := serviceCredentialRuntimeOptionalIntConfig("gatewayOrganizationProjectionMaxRetries", gatewayProjectionPublisherDefaultRetries, 0)
	result.Publisher.Timeout = time.Duration(timeoutMs) * time.Millisecond
	result.Publisher.FreshnessTTL = time.Duration(freshnessSeconds) * time.Second
	result.Publisher.MaxRetries = maxRetries
	result.Refresh.Enabled = intendedEnabled
	if enabled, ok := serviceCredentialRuntimeOptionalBoolConfig("gatewayOrganizationProjectionRefreshEnabled"); ok {
		result.Refresh.Enabled = enabled
	}
	interval, _ := serviceCredentialRuntimeOptionalIntConfig("gatewayOrganizationProjectionRefreshIntervalSeconds", gatewayProjectionRefreshDefaultIntervalSeconds, 1)
	initialDelay, _ := serviceCredentialRuntimeOptionalIntConfig("gatewayOrganizationProjectionRefreshInitialDelaySeconds", gatewayProjectionRefreshDefaultInitialDelaySeconds, 0)
	batchSize, _ := serviceCredentialRuntimeOptionalIntConfig("gatewayOrganizationProjectionRefreshBatchSize", gatewayProjectionRefreshDefaultBatchSize, 1)
	result.Refresh.Interval = time.Duration(interval) * time.Second
	result.Refresh.InitialDelay = time.Duration(initialDelay) * time.Second
	result.Refresh.BatchSize = batchSize
}

func resolveServiceCredentialRuntimeBase(config *ServiceCredentialGovernanceConfigResponse, loadErr error, groupKey string, provider ServiceCredentialMaterialProvider) serviceCredentialRuntimeBase {
	resolution := newServiceCredentialRuntimeResolution(groupKey)
	if loadErr != nil {
		resolution.AdoptedSource = ServiceCredentialRuntimeSourceSavedConfig
		resolution.SavedPolicy = true
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerSavedConfigUnavailable)
		return serviceCredentialRuntimeBase{resolution: finalizeServiceCredentialRuntimeResolution(resolution), saved: true}
	}

	base := serviceCredentialRuntimeBase{resolution: resolution}
	if config == nil || !config.IsConfigured {
		base.resolution.AdoptedSource = ServiceCredentialRuntimeSourceLegacyEnvConfig
	} else {
		base.saved = true
		base.resolution.SavedPolicy = true
		group, ok := serviceCredentialRuntimePolicyGroupByKey(config.Groups, groupKey)
		if !ok {
			base.resolution.AdoptedSource = ServiceCredentialRuntimeSourceSavedConfig
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerMissing)
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
			base.resolution = finalizeServiceCredentialRuntimeResolution(base.resolution)
			return base
		}
		base.group = group
		base.resolution.Owner = firstNonEmpty(strings.TrimSpace(group.Owner), base.resolution.Owner)
		base.resolution.CredentialReferenceKey = strings.TrimSpace(group.CredentialReferenceKey)
		base.resolution.AdoptedSource = serviceCredentialRuntimeSavedSource(group)
		for _, blocker := range group.BlockedReasons {
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, blocker)
		}
		if !group.Enabled {
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerGroupDisabled)
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
			base.resolution = finalizeServiceCredentialRuntimeResolution(base.resolution)
			return base
		}
		if base.resolution.AdoptedSource == "" {
			base.resolution.AdoptedSource = ServiceCredentialRuntimeSourceSavedConfig
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerInvalid)
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
			base.resolution = finalizeServiceCredentialRuntimeResolution(base.resolution)
			return base
		}
		if base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedManual || base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedSecretRef {
			if base.resolution.CredentialReferenceKey == "" || !serviceCredentialRuntimePolicyReferenceReady(group.CredentialReferenceStatus) {
				base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerReferenceMissing)
				base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
				base.resolution = finalizeServiceCredentialRuntimeResolution(base.resolution)
				return base
			}
		}
	}

	if provider == nil {
		provider = defaultServiceCredentialMaterialProvider{}
	}
	material, err := provider.ResolveServiceCredentialMaterial(ServiceCredentialMaterialRequest{
		GroupKey:     groupKey,
		Source:       base.resolution.AdoptedSource,
		ReferenceKey: base.resolution.CredentialReferenceKey,
	})
	if err != nil {
		blocker := ServiceCredentialRuntimeBlockerMissing
		if base.saved && (base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedManual || base.resolution.AdoptedSource == ServiceCredentialRuntimeSourceSavedSecretRef) {
			blocker = ServiceCredentialRuntimeBlockerReferenceUnresolved
		}
		base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, blocker)
		if blocker == ServiceCredentialRuntimeBlockerReferenceUnresolved {
			base.resolution = blockServiceCredentialRuntimeResolution(base.resolution, ServiceCredentialRuntimeBlockerLegacyDisabled)
		}
		base.resolution = finalizeServiceCredentialRuntimeResolution(base.resolution)
		return base
	}
	base.material = material
	base.resolution = finalizeServiceCredentialRuntimeResolution(base.resolution)
	return base
}

func newServiceCredentialRuntimeResolution(groupKey string) ServiceCredentialRuntimeResolution {
	return ServiceCredentialRuntimeResolution{
		GroupKey: groupKey,
		Owner:    serviceCredentialRuntimeDefaultOwner(groupKey),
	}
}

func serviceCredentialRuntimeDefaultOwner(groupKey string) string {
	switch groupKey {
	case ServiceCredentialRuntimeGroupInsightProviderTrust:
		return "admin_provider_trust"
	case ServiceCredentialRuntimeGroupGatewayProjection:
		return "admin_gateway_projection_producer"
	default:
		return "admin_outbound_resolver"
	}
}

func serviceCredentialRuntimeSavedSource(group ServiceCredentialGovernanceConfigGroup) string {
	if group.KeepInEnv || strings.TrimSpace(group.SourceClass) == "env_config" {
		return ServiceCredentialRuntimeSourceSavedKeepInEnv
	}
	switch strings.TrimSpace(group.SourceClass) {
	case "admin_config":
		return ServiceCredentialRuntimeSourceSavedManual
	case "external_secret_system":
		return ServiceCredentialRuntimeSourceSavedSecretRef
	default:
		return ""
	}
}

func blockServiceCredentialRuntimeResolution(resolution ServiceCredentialRuntimeResolution, blocker string) ServiceCredentialRuntimeResolution {
	resolution.BlockedReasons = serviceCredentialRuntimePolicyAppendUnique(resolution.BlockedReasons, blocker)
	return resolution
}

func finalizeServiceCredentialRuntimeResolution(resolution ServiceCredentialRuntimeResolution) ServiceCredentialRuntimeResolution {
	resolution.Diagnostics = []string{
		"adopted_source:" + firstNonEmpty(resolution.AdoptedSource, "unresolved"),
		fmt.Sprintf("saved_policy:%t", resolution.SavedPolicy),
	}
	resolution.Ready = len(resolution.BlockedReasons) == 0
	resolution.ErrorCode = ""
	if len(resolution.BlockedReasons) > 0 {
		resolution.ErrorCode = resolution.BlockedReasons[0]
	}
	return resolution
}

func finalizeServiceCredentialRuntimeConfigResolution(config UsageIdentityResolverRuntimeConfig) UsageIdentityResolverRuntimeConfig {
	config.Resolution = finalizeServiceCredentialRuntimeResolution(config.Resolution)
	if !config.Resolution.Ready {
		config.Endpoint = ""
		config.Token = ""
	}
	return config
}

func finalizeInsightProviderTrustRuntimeConfig(config InsightProviderTrustRuntimeConfig) InsightProviderTrustRuntimeConfig {
	config.Resolution = finalizeServiceCredentialRuntimeResolution(config.Resolution)
	return config
}

func finalizeGatewayProjectionRuntimeConfig(config GatewayProjectionRuntimeConfig) GatewayProjectionRuntimeConfig {
	config.Resolution = finalizeServiceCredentialRuntimeResolution(config.Resolution)
	config.Publisher.Resolution = config.Resolution
	config.Refresh.Resolution = config.Resolution
	config.Publisher.BlockedReasons = append([]string{}, config.Resolution.BlockedReasons...)
	config.Refresh.FreshnessTTL = config.Publisher.FreshnessTTL
	config.Refresh.Interval = normalizeGatewayProjectionRefreshInterval(config.Refresh.Interval, config.Publisher.FreshnessTTL)
	config.Refresh.InitialDelay = normalizeGatewayProjectionRefreshInitialDelay(config.Refresh.InitialDelay)
	config.Refresh.BatchSize = normalizeGatewayProjectionRefreshBatchSize(config.Refresh.BatchSize)
	if !config.Resolution.Ready {
		config.Publisher.Endpoint = ""
		config.Publisher.StatusEndpoint = ""
		config.Publisher.Token = ""
		config.Refresh.Enabled = false
		if config.Publisher.Enabled || config.Resolution.ErrorCode != ServiceCredentialRuntimeBlockerGroupDisabled {
			config.Refresh.DisabledReason = GatewayProjectionRefreshErrorInvalidConfig
		}
		return config
	}
	config.Refresh.Enabled = config.Refresh.Enabled && config.Publisher.Enabled
	return config
}

func validateServiceCredentialRuntimeMaterial(resolution ServiceCredentialRuntimeResolution, endpoint string, token string, optionalStatusEndpoint string) ServiceCredentialRuntimeResolution {
	if strings.TrimSpace(endpoint) == "" || strings.TrimSpace(token) == "" {
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerMissing)
	}
	if endpoint != "" && !serviceCredentialRuntimeHTTPURLValid(endpoint) {
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerInvalid)
	}
	if optionalStatusEndpoint != "" && !serviceCredentialRuntimeHTTPURLValid(optionalStatusEndpoint) {
		resolution = blockServiceCredentialRuntimeResolution(resolution, ServiceCredentialRuntimeBlockerInvalid)
	}
	return resolution
}

func serviceCredentialRuntimeHTTPURLValid(value string) bool {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && strings.TrimSpace(parsed.Host) != ""
}

func serviceCredentialRuntimeOptionalIntConfig(key string, fallback int, minimum int) (int, bool) {
	// legacy 非法值继续交由各调用方沿用既有 default/normalize 规则；minimum 只用于 saved policy 严格校验。
	_ = minimum
	text := strings.TrimSpace(conf.GetConfigString(key))
	if text == "" {
		return fallback, true
	}
	value, err := strconv.Atoi(text)
	if err != nil {
		return fallback, true
	}
	return value, true
}

func serviceCredentialRuntimeOptionalBoolConfig(key string) (bool, bool) {
	text := strings.TrimSpace(conf.GetConfigString(key))
	if text == "" {
		return false, false
	}
	return strings.EqualFold(text, "true"), true
}

func serviceCredentialRuntimePolicyRequiredInt(policy map[string]interface{}, key string, minimum int) (int, bool) {
	if len(policy) == 0 {
		return 0, false
	}
	value, ok := policy[key]
	if !ok {
		return 0, false
	}
	parsed, valid := serviceCredentialRuntimePolicyInt(value)
	return parsed, valid && parsed >= minimum
}

func serviceCredentialRuntimePolicyInt(value interface{}) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int64:
		return int(typed), true
	case float64:
		if typed != float64(int(typed)) {
			return 0, false
		}
		return int(typed), true
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(typed))
		return parsed, err == nil
	default:
		return 0, false
	}
}

func serviceCredentialRuntimePolicyIntOrBlock(resolution *ServiceCredentialRuntimeResolution, policy map[string]interface{}, key string, minimum int, fallback int) int {
	value, ok := serviceCredentialRuntimePolicyRequiredInt(policy, key, minimum)
	if !ok {
		*resolution = blockServiceCredentialRuntimeResolution(*resolution, ServiceCredentialRuntimeBlockerBoundedPolicyMissing)
		return fallback
	}
	return value
}

func serviceCredentialRuntimePolicyOptionalInt(policy map[string]interface{}, key string, fallback int, minimum int, resolution *ServiceCredentialRuntimeResolution) int {
	value, ok := policy[key]
	if !ok {
		return fallback
	}
	parsed, valid := serviceCredentialRuntimePolicyInt(value)
	if !valid || parsed < minimum {
		*resolution = blockServiceCredentialRuntimeResolution(*resolution, ServiceCredentialRuntimeBlockerInvalid)
		return fallback
	}
	return parsed
}

func serviceCredentialRuntimePolicyOptionalBool(policy map[string]interface{}, key string, fallback bool, resolution *ServiceCredentialRuntimeResolution) bool {
	value, ok := policy[key]
	if !ok {
		return fallback
	}
	typed, valid := value.(bool)
	if !valid {
		*resolution = blockServiceCredentialRuntimeResolution(*resolution, ServiceCredentialRuntimeBlockerInvalid)
		return fallback
	}
	return typed
}

func serviceCredentialRuntimeTrustPolicyExplicit(group ServiceCredentialGovernanceConfigGroup) bool {
	if !group.Enabled {
		return true
	}
	for _, key := range []string{"allowedAudiences", "requiredScopes", "allowedIssuerDigests", "issuerMode"} {
		if _, ok := group.BoundedRuntimePolicy[key]; ok {
			return true
		}
	}
	return false
}

func serviceCredentialRuntimePolicyStringSlice(policy map[string]interface{}, key string) ([]string, bool, bool) {
	value, ok := policy[key]
	if !ok {
		return nil, false, true
	}
	values := []string{}
	switch typed := value.(type) {
	case []string:
		values = append(values, typed...)
	case []interface{}:
		for _, item := range typed {
			text, valid := item.(string)
			if !valid {
				return nil, true, false
			}
			values = append(values, text)
		}
	case string:
		values = append(values, typed)
	default:
		return nil, true, false
	}
	return sanitizeServiceCredentialGovernanceConfigStringSlice(values), true, true
}

func serviceCredentialRuntimePolicyOptionalString(policy map[string]interface{}, key string, fallback string) (string, bool) {
	value, ok := policy[key]
	if !ok {
		return fallback, true
	}
	text, valid := value.(string)
	if !valid || strings.TrimSpace(text) == "" {
		return fallback, false
	}
	return strings.TrimSpace(text), true
}

func serviceCredentialRuntimeGroups(config *ServiceCredentialGovernanceConfigResponse) []ServiceCredentialGovernanceConfigGroup {
	if config == nil || !config.IsConfigured {
		return nil
	}
	return config.Groups
}

func splitServiceCredentialRuntimeCSV(value string) []string {
	value = strings.ReplaceAll(value, ",", " ")
	return sanitizeServiceCredentialGovernanceConfigStringSlice(strings.Fields(value))
}
