package object

import (
	"strings"
	"time"
)

const (
	ServiceCredentialGovernanceDiagnosticSource = "admin_service_credential_governance_diagnostic"

	ServiceCredentialDiagnosticAliasReady                  = "admin_service_credential_ready"
	ServiceCredentialDiagnosticAliasKeepInEnv              = "admin_service_credential_keep_in_env"
	ServiceCredentialDiagnosticAliasUnsupportedGroup       = "admin_service_credential_group_unsupported"
	ServiceCredentialDiagnosticAliasUnsupportedSourceClass = "admin_service_credential_source_class_unsupported"
	ServiceCredentialDiagnosticAliasCopySafeViolation      = "admin_service_credential_copy_safe_violation"
	ServiceCredentialDiagnosticAliasReferenceNotApplicable = "admin_service_credential_reference_not_applicable"
	ServiceCredentialDiagnosticAliasBoundedPolicyMissing   = ServiceCredentialRuntimeBlockerBoundedPolicyMissing
	ServiceCredentialDiagnosticAliasCallerPolicyMissing    = ServiceCredentialRuntimeBlockerCallerMissing
	ServiceCredentialDiagnosticAliasReferenceMissing       = ServiceCredentialRuntimeBlockerReferenceMissing
	ServiceCredentialDiagnosticAliasReferenceUnresolved    = ServiceCredentialRuntimeBlockerReferenceUnresolved
	ServiceCredentialDiagnosticAliasGroupDisabled          = ServiceCredentialRuntimeBlockerGroupDisabled
)

// ServiceCredentialGovernanceDiagnosticResponse 是保存前/保存后的 copy-safe 预检结果。
// 诊断只评估元数据完整度，不解析真实 secret，也不触发任何下游调用。
type ServiceCredentialGovernanceDiagnosticResponse struct {
	GeneratedAt string                                       `json:"generatedAt"`
	Source      string                                       `json:"source"`
	Groups      []ServiceCredentialGovernanceDiagnosticGroup `json:"groups"`
}

// ServiceCredentialGovernanceDiagnosticGroup 描述单个治理分组的脱敏诊断状态。
type ServiceCredentialGovernanceDiagnosticGroup struct {
	Key                       string   `json:"key"`
	Label                     string   `json:"label,omitempty"`
	Status                    string   `json:"status"`
	StableAlias               string   `json:"stableAlias"`
	Owner                     string   `json:"owner,omitempty"`
	SourceClass               string   `json:"sourceClass,omitempty"`
	CredentialReferenceStatus string   `json:"credentialReferenceStatus,omitempty"`
	CallerPolicyPresent       bool     `json:"callerPolicyPresent"`
	KeepInEnv                 bool     `json:"keepInEnv"`
	NextAction                string   `json:"nextAction,omitempty"`
	CannotInfer               bool     `json:"cannotInfer"`
	BlockedReasons            []string `json:"blockedReasons,omitempty"`
	AdoptedSource             string   `json:"adoptedSource,omitempty"`
	CredentialReferenceKey    string   `json:"credentialReferenceKey,omitempty"`
	Diagnostics               []string `json:"diagnostics,omitempty"`
	ErrorCode                 string   `json:"errorCode,omitempty"`
	RuntimeBlockedReasons     []string `json:"runtimeBlockedReasons,omitempty"`
}

// BuildServiceCredentialGovernanceDiagnostics 将服务凭据治理 draft/saved config 转换为 copy-safe 诊断结果。
func BuildServiceCredentialGovernanceDiagnostics(input *ServiceCredentialGovernanceConfigResponse, generatedAt time.Time) ServiceCredentialGovernanceDiagnosticResponse {
	if generatedAt.IsZero() {
		generatedAt = time.Now().UTC()
	}
	response := ServiceCredentialGovernanceDiagnosticResponse{
		GeneratedAt: formatServiceCredentialGovernanceConfigTime(generatedAt),
		Source:      ServiceCredentialGovernanceDiagnosticSource,
		Groups:      []ServiceCredentialGovernanceDiagnosticGroup{},
	}
	if input == nil {
		return response
	}
	for _, group := range input.Groups {
		diagnostic := buildServiceCredentialGovernanceDiagnosticGroup(group)
		if isAllowedServiceCredentialGovernanceConfigGroupKey(strings.TrimSpace(group.Key)) && !containsServiceCredentialGovernanceDiagnosticSensitiveMaterial(group) {
			diagnostic = applyServiceCredentialGovernanceDiagnosticRuntimeResolution(diagnostic, serviceCredentialGovernanceDiagnosticRuntimeResolution(group))
		}
		response.Groups = append(response.Groups, diagnostic)
	}
	return response
}

func serviceCredentialGovernanceDiagnosticRuntimeResolution(group ServiceCredentialGovernanceConfigGroup) ServiceCredentialRuntimeResolution {
	config := &ServiceCredentialGovernanceConfigResponse{IsConfigured: true, Groups: []ServiceCredentialGovernanceConfigGroup{group}}
	switch strings.TrimSpace(group.Key) {
	case ServiceCredentialRuntimeGroupInsightProviderTrust:
		return ResolveInsightProviderTrustRuntimeConfig(config, nil).Resolution
	case ServiceCredentialRuntimeGroupGatewayProjection:
		return ResolveGatewayProjectionRuntimeConfig(config, nil, nil).Resolution
	default:
		return ResolveUsageIdentityResolverRuntimeConfig(config, nil, nil).Resolution
	}
}

func applyServiceCredentialGovernanceDiagnosticRuntimeResolution(diagnostic ServiceCredentialGovernanceDiagnosticGroup, resolution ServiceCredentialRuntimeResolution) ServiceCredentialGovernanceDiagnosticGroup {
	diagnostic.AdoptedSource = resolution.AdoptedSource
	diagnostic.CredentialReferenceKey = resolution.CredentialReferenceKey
	diagnostic.Diagnostics = append([]string{}, resolution.Diagnostics...)
	diagnostic.ErrorCode = resolution.ErrorCode
	// blockedReasons/cannotInfer 是既有 metadata preflight 契约；runtime blocker 单独投影，避免内部重构改写旧 alias/DTO 语义。
	diagnostic.RuntimeBlockedReasons = append([]string{}, resolution.BlockedReasons...)
	return diagnostic
}

func buildServiceCredentialGovernanceDiagnosticGroup(group ServiceCredentialGovernanceConfigGroup) ServiceCredentialGovernanceDiagnosticGroup {
	key := strings.TrimSpace(group.Key)
	if !isAllowedServiceCredentialGovernanceConfigGroupKey(key) {
		return serviceCredentialGovernanceDiagnosticBlocked("unsupported_group", "", ServiceCredentialDiagnosticAliasUnsupportedGroup, "不支持的服务凭据治理分组", true)
	}
	if containsServiceCredentialGovernanceDiagnosticSensitiveMaterial(group) {
		return serviceCredentialGovernanceDiagnosticBlocked(key, "", ServiceCredentialDiagnosticAliasCopySafeViolation, "移除 raw secret、完整 URL、Authorization、Cookie、DSN 或 raw payload 后再诊断", true)
	}
	sourceClass := strings.TrimSpace(group.SourceClass)
	if !isAllowedServiceCredentialGovernanceSourceClass(sourceClass) {
		diagnostic := serviceCredentialGovernanceDiagnosticFromGroup(group, "blocked", ServiceCredentialDiagnosticAliasUnsupportedSourceClass)
		diagnostic.CannotInfer = true
		diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasUnsupportedSourceClass}
		diagnostic.NextAction = "选择 Admin 配置、env/config 或外部 Secret 来源分类"
		return diagnostic
	}

	diagnostic := serviceCredentialGovernanceDiagnosticFromGroup(group, "ready", ServiceCredentialDiagnosticAliasReady)
	if !group.Enabled {
		diagnostic.Status = "disabled"
		diagnostic.StableAlias = ServiceCredentialDiagnosticAliasGroupDisabled
		diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasGroupDisabled}
		diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "启用该治理分组后再执行保存前核对")
		return diagnostic
	}
	if group.KeepInEnv || sourceClass == "env_config" {
		diagnostic.Status = "keep_in_env"
		diagnostic.StableAlias = ServiceCredentialDiagnosticAliasKeepInEnv
		diagnostic.CannotInfer = true
		diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasKeepInEnv}
		diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "运行时 secret 保留在 env/config，Admin 仅能确认归属边界")
		return diagnostic
	}
	if strings.TrimSpace(group.CallerPolicy) == "" {
		diagnostic.Status = "blocked"
		diagnostic.StableAlias = ServiceCredentialDiagnosticAliasCallerPolicyMissing
		diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasCallerPolicyMissing}
		diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "补充调用方策略后再诊断")
		return diagnostic
	}
	if missingRequiredServiceCredentialGovernanceDiagnosticPolicy(group) {
		diagnostic.Status = "blocked"
		diagnostic.StableAlias = ServiceCredentialDiagnosticAliasBoundedPolicyMissing
		diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasBoundedPolicyMissing}
		diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "补充 timeout、batch 或 retry 等受限运行策略")
		return diagnostic
	}
	if serviceCredentialGovernanceDiagnosticRequiresReference(key) {
		if strings.TrimSpace(group.CredentialReferenceKey) == "" || !serviceCredentialRuntimePolicyReferenceReady(group.CredentialReferenceStatus) {
			diagnostic.Status = "missing_reference"
			diagnostic.StableAlias = ServiceCredentialDiagnosticAliasReferenceMissing
			diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasReferenceMissing}
			diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "补充 copy-safe 凭据引用别名")
			return diagnostic
		}
		if sourceClass == "external_secret_system" {
			diagnostic.Status = "cannot_infer"
			diagnostic.StableAlias = ServiceCredentialDiagnosticAliasReferenceUnresolved
			diagnostic.CannotInfer = true
			diagnostic.BlockedReasons = []string{ServiceCredentialDiagnosticAliasReferenceUnresolved}
			diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "Admin 只能确认外部引用别名，需在运行态验证外部 Secret 解析")
			return diagnostic
		}
	} else if strings.TrimSpace(group.CredentialReferenceStatus) == "not_applicable" {
		diagnostic.StableAlias = ServiceCredentialDiagnosticAliasReferenceNotApplicable
	}
	diagnostic.NextAction = firstServiceCredentialGovernanceDiagnosticText(group.NextAction, "配置元数据完整；保存后仍需运行态验收确认 no-fallback 边界")
	return diagnostic
}

func serviceCredentialGovernanceDiagnosticFromGroup(group ServiceCredentialGovernanceConfigGroup, status string, alias string) ServiceCredentialGovernanceDiagnosticGroup {
	return ServiceCredentialGovernanceDiagnosticGroup{
		Key:                       strings.TrimSpace(group.Key),
		Label:                     strings.TrimSpace(group.Label),
		Status:                    status,
		StableAlias:               alias,
		Owner:                     strings.TrimSpace(group.Owner),
		SourceClass:               strings.TrimSpace(group.SourceClass),
		CredentialReferenceStatus: strings.TrimSpace(group.CredentialReferenceStatus),
		CallerPolicyPresent:       strings.TrimSpace(group.CallerPolicy) != "",
		KeepInEnv:                 group.KeepInEnv || strings.TrimSpace(group.SourceClass) == "env_config",
		NextAction:                strings.TrimSpace(group.NextAction),
		BlockedReasons:            deduplicateServiceCredentialGovernanceDiagnosticStrings(group.BlockedReasons),
	}
}

func serviceCredentialGovernanceDiagnosticBlocked(key string, label string, alias string, nextAction string, cannotInfer bool) ServiceCredentialGovernanceDiagnosticGroup {
	return ServiceCredentialGovernanceDiagnosticGroup{
		Key:            key,
		Label:          label,
		Status:         "blocked",
		StableAlias:    alias,
		NextAction:     nextAction,
		CannotInfer:    cannotInfer,
		BlockedReasons: []string{alias},
	}
}

func serviceCredentialGovernanceDiagnosticRequiresReference(key string) bool {
	return key == "usage_identity_resolver" || key == "gateway_organization_projection"
}

func missingRequiredServiceCredentialGovernanceDiagnosticPolicy(group ServiceCredentialGovernanceConfigGroup) bool {
	for _, key := range serviceCredentialGovernanceDiagnosticRequiredPolicyKeys(group.Key) {
		if !serviceCredentialRuntimePolicyHasKey(group.BoundedRuntimePolicy, key) {
			return true
		}
	}
	return false
}

func serviceCredentialGovernanceDiagnosticRequiredPolicyKeys(key string) []string {
	switch key {
	case "usage_identity_resolver":
		return []string{"timeoutMs", "maxItems"}
	case "gateway_organization_projection":
		return []string{"timeoutMs", "freshnessTTLSeconds", "maxRetries"}
	default:
		return nil
	}
}

func containsServiceCredentialGovernanceDiagnosticSensitiveMaterial(group ServiceCredentialGovernanceConfigGroup) bool {
	for _, value := range []string{group.Key, group.Label, group.Owner, group.SourceClass, group.CredentialReferenceStatus, group.CredentialReferenceKey, group.CallerPolicy, group.RemediationRoute, group.NextAction} {
		if containsServiceCredentialGovernanceSensitiveMaterial(value) {
			return true
		}
	}
	for _, value := range append(group.BlockedReasons, group.KeepInEnvKeys...) {
		if containsServiceCredentialGovernanceSensitiveMaterial(value) {
			return true
		}
	}
	for key, value := range group.BoundedRuntimePolicy {
		if containsServiceCredentialGovernanceSensitiveMaterial(key) || containsServiceCredentialGovernanceSensitivePolicyValue(value) {
			return true
		}
	}
	return false
}

func firstServiceCredentialGovernanceDiagnosticText(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func deduplicateServiceCredentialGovernanceDiagnosticStrings(values []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		result = append(result, trimmed)
	}
	return result
}
