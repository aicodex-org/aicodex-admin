package object

import (
	"strconv"
	"strings"
)

const (
	// ServiceCredentialRuntimeBlocker* 是 copy-safe stable blocker alias，可用于 status/diagnostic，不包含凭据值。
	ServiceCredentialRuntimeBlockerConfigUnavailable    = "admin_service_credential_config_unavailable"
	ServiceCredentialRuntimeBlockerGroupDisabled        = "admin_service_credential_group_disabled"
	ServiceCredentialRuntimeBlockerReferenceMissing     = "admin_service_credential_reference_missing"
	ServiceCredentialRuntimeBlockerReferenceUnresolved  = "admin_service_credential_reference_unresolved"
	ServiceCredentialRuntimeBlockerCallerMissing        = "admin_service_credential_caller_policy_missing"
	ServiceCredentialRuntimeBlockerBoundedPolicyMissing = "admin_service_credential_bounded_policy_missing"
)

var serviceCredentialRuntimePolicyConfigServiceFactory = func() *ServiceCredentialGovernanceConfigService {
	return &ServiceCredentialGovernanceConfigService{}
}

// ServiceCredentialRuntimePolicyDecision 是 runtime path 消费 saved governance config 的脱敏 gate 结果。
// 它只携带 caller、数值策略和 blocker alias，不携带 endpoint、token 或可复用凭据值。
type ServiceCredentialRuntimePolicyDecision struct {
	SavedConfigured      bool
	AllowLegacy          bool
	CallerPolicy         string
	BoundedRuntimePolicy map[string]interface{}
	BlockedReasons       []string
	Group                ServiceCredentialGovernanceConfigGroup
}

// GetServiceCredentialRuntimePolicyDecision 读取已保存治理配置并生成指定分组的 runtime gate。
// 未保存配置时返回 AllowLegacy=true；保存配置存在后，只有 env_config/keepInEnv 可继续使用 legacy secret。
func GetServiceCredentialRuntimePolicyDecision(groupKey string, requiredPolicyKeys []string) ServiceCredentialRuntimePolicyDecision {
	config, err := serviceCredentialRuntimePolicyConfigServiceFactory().GetConfig()
	return BuildServiceCredentialRuntimePolicyDecision(config, err, groupKey, requiredPolicyKeys)
}

// BuildServiceCredentialRuntimePolicyDecision 将 copy-safe config 转换为 runtime gate，供 controller/status overlay 复用。
func BuildServiceCredentialRuntimePolicyDecision(config *ServiceCredentialGovernanceConfigResponse, loadErr error, groupKey string, requiredPolicyKeys []string) ServiceCredentialRuntimePolicyDecision {
	if loadErr != nil {
		return ServiceCredentialRuntimePolicyDecision{SavedConfigured: true, BlockedReasons: []string{ServiceCredentialRuntimeBlockerConfigUnavailable}}
	}
	if config == nil || !config.IsConfigured {
		return ServiceCredentialRuntimePolicyDecision{AllowLegacy: true}
	}
	group, ok := serviceCredentialRuntimePolicyGroupByKey(config.Groups, groupKey)
	if !ok {
		return ServiceCredentialRuntimePolicyDecision{SavedConfigured: true, BlockedReasons: []string{ServiceCredentialRuntimeBlockerReferenceMissing}}
	}
	decision := ServiceCredentialRuntimePolicyDecision{
		SavedConfigured:      true,
		CallerPolicy:         strings.TrimSpace(group.CallerPolicy),
		BoundedRuntimePolicy: group.BoundedRuntimePolicy,
		Group:                group,
		BlockedReasons:       append([]string{}, group.BlockedReasons...),
	}
	if !group.Enabled {
		decision.BlockedReasons = serviceCredentialRuntimePolicyAppendUnique(decision.BlockedReasons, ServiceCredentialRuntimeBlockerGroupDisabled)
		return decision
	}
	if decision.CallerPolicy == "" {
		decision.BlockedReasons = serviceCredentialRuntimePolicyAppendUnique(decision.BlockedReasons, ServiceCredentialRuntimeBlockerCallerMissing)
	}
	for _, key := range requiredPolicyKeys {
		if !serviceCredentialRuntimePolicyHasKey(group.BoundedRuntimePolicy, key) {
			decision.BlockedReasons = serviceCredentialRuntimePolicyAppendUnique(decision.BlockedReasons, ServiceCredentialRuntimeBlockerBoundedPolicyMissing)
			break
		}
	}
	if group.KeepInEnv || strings.TrimSpace(group.SourceClass) == "env_config" {
		decision.AllowLegacy = len(decision.BlockedReasons) == 0
		return decision
	}
	if strings.TrimSpace(group.CredentialReferenceKey) == "" || !serviceCredentialRuntimePolicyReferenceReady(group.CredentialReferenceStatus) {
		decision.BlockedReasons = serviceCredentialRuntimePolicyAppendUnique(decision.BlockedReasons, ServiceCredentialRuntimeBlockerReferenceMissing)
	} else {
		// Admin 当前只保存 copy-safe 引用元数据；没有 secret resolver 时不能把引用别名当 token/URL 使用。
		decision.BlockedReasons = serviceCredentialRuntimePolicyAppendUnique(decision.BlockedReasons, ServiceCredentialRuntimeBlockerReferenceUnresolved)
	}
	return decision
}

func serviceCredentialRuntimePolicyGroupByKey(groups []ServiceCredentialGovernanceConfigGroup, key string) (ServiceCredentialGovernanceConfigGroup, bool) {
	for _, group := range groups {
		if group.Key == key {
			return group, true
		}
	}
	return ServiceCredentialGovernanceConfigGroup{}, false
}

func serviceCredentialRuntimePolicyReferenceReady(status string) bool {
	return status == "configured" || status == "external_secret"
}

func serviceCredentialRuntimePolicyHasKey(policy map[string]interface{}, key string) bool {
	if len(policy) == 0 {
		return false
	}
	_, ok := policy[key]
	return ok
}

// ServiceCredentialRuntimePolicyInt 读取 copy-safe 数值策略；不支持的类型会回到 legacy/default 值。
func ServiceCredentialRuntimePolicyInt(policy map[string]interface{}, key string, fallback int) int {
	if len(policy) == 0 {
		return fallback
	}
	switch value := policy[key].(type) {
	case int:
		return value
	case int64:
		return int(value)
	case float64:
		return int(value)
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(value))
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func serviceCredentialRuntimePolicyAppendUnique(values []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return values
	}
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}
