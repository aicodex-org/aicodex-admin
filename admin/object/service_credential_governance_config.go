package object

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/xorm-io/core"
)

const (
	ServiceCredentialGovernanceConfigOwner  = "built-in"
	ServiceCredentialGovernanceConfigName   = "service-credential-governance-config"
	ServiceCredentialGovernanceConfigSource = "admin_service_credential_governance_config"
)

// ErrServiceCredentialGovernanceConfigUnavailable 用于把 store/持久化损坏映射为稳定、可脱敏的 API blocker。
var ErrServiceCredentialGovernanceConfigUnavailable = errors.New(ServiceCredentialRuntimeBlockerSavedConfigUnavailable)

// ServiceCredentialGovernanceConfig 是服务凭据治理配置入口的持久化记录。
// ConfigJson 只保存 copy-safe 元数据，不保存 token、secret、完整 URL 或 provider 响应。
type ServiceCredentialGovernanceConfig struct {
	Owner      string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name       string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt  time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt  time.Time `xorm:"timestampz updated" json:"updatedAt"`
	ConfigJson string    `xorm:"text" json:"-"`
}

// ServiceCredentialGovernanceConfigResponse 是 Application Access 使用的脱敏配置响应。
// 它承载 operator 可维护的引用和策略元数据，但不承载任何可复用凭据值。
type ServiceCredentialGovernanceConfigResponse struct {
	UpdatedAt    string                                   `json:"updatedAt,omitempty"`
	Source       string                                   `json:"source"`
	IsConfigured bool                                     `json:"isConfigured"`
	Groups       []ServiceCredentialGovernanceConfigGroup `json:"groups"`
}

// ServiceCredentialGovernanceConfigGroup 描述单个治理分组的 copy-safe 配置。
// CredentialReferenceKey 是外部 secret/config 的别名或引用 key，不允许完整 URL 或 secret 值。
type ServiceCredentialGovernanceConfigGroup struct {
	Key                       string                 `json:"key"`
	Label                     string                 `json:"label,omitempty"`
	Enabled                   bool                   `json:"enabled"`
	Owner                     string                 `json:"owner,omitempty"`
	SourceClass               string                 `json:"sourceClass,omitempty"`
	CredentialReferenceStatus string                 `json:"credentialReferenceStatus,omitempty"`
	CredentialReferenceKey    string                 `json:"credentialReferenceKey,omitempty"`
	OwnerManaged              bool                   `json:"ownerManaged,omitempty"`
	KeepInEnv                 bool                   `json:"keepInEnv,omitempty"`
	CallerPolicy              string                 `json:"callerPolicy,omitempty"`
	BoundedRuntimePolicy      map[string]interface{} `json:"boundedRuntimePolicy,omitempty"`
	RemediationRoute          string                 `json:"remediationRoute,omitempty"`
	NextAction                string                 `json:"nextAction,omitempty"`
	BlockedReasons            []string               `json:"blockedReasons,omitempty"`
	KeepInEnvKeys             []string               `json:"keepInEnvKeys,omitempty"`
}

// ServiceCredentialGovernanceConfigStore 隔离配置元数据持久化，便于 controller 测试注入内存 store。
type ServiceCredentialGovernanceConfigStore interface {
	GetServiceCredentialGovernanceConfig() (*ServiceCredentialGovernanceConfig, error)
	SaveServiceCredentialGovernanceConfig(config *ServiceCredentialGovernanceConfig) (bool, error)
}

// ServiceCredentialGovernanceConfigService 统一处理默认分组、copy-safe 校验、保存和脱敏回读。
type ServiceCredentialGovernanceConfigService struct {
	Store ServiceCredentialGovernanceConfigStore
	Now   func() time.Time
}

type defaultServiceCredentialGovernanceConfigStore struct{}

// GetConfig 读取已保存的 copy-safe 配置元数据，并在缺失记录时返回默认治理分组。
func (s *ServiceCredentialGovernanceConfigService) GetConfig() (*ServiceCredentialGovernanceConfigResponse, error) {
	config, err := s.configStore().GetServiceCredentialGovernanceConfig()
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrServiceCredentialGovernanceConfigUnavailable, err)
	}
	response := defaultServiceCredentialGovernanceConfigResponse()
	if config == nil || strings.TrimSpace(config.ConfigJson) == "" {
		return response, nil
	}

	var persisted ServiceCredentialGovernanceConfigResponse
	if err := json.Unmarshal([]byte(config.ConfigJson), &persisted); err != nil {
		return nil, ErrServiceCredentialGovernanceConfigUnavailable
	}
	normalized, err := normalizeServiceCredentialGovernanceConfig(&persisted, true)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrServiceCredentialGovernanceConfigUnavailable, err)
	}
	normalized.UpdatedAt = formatServiceCredentialGovernanceConfigTime(config.UpdatedAt)
	normalized.IsConfigured = true
	return normalized, nil
}

// SaveConfig 校验并保存服务凭据治理配置引用，拒绝 raw secret、完整 URL 和未知分组。
func (s *ServiceCredentialGovernanceConfigService) SaveConfig(config *ServiceCredentialGovernanceConfigResponse) (*ServiceCredentialGovernanceConfigResponse, bool, error) {
	normalized, err := normalizeServiceCredentialGovernanceConfig(config, true)
	if err != nil {
		return nil, false, err
	}
	normalized.UpdatedAt = formatServiceCredentialGovernanceConfigTime(s.now())
	normalized.IsConfigured = true

	body, err := json.Marshal(normalized)
	if err != nil {
		return nil, false, err
	}
	record := &ServiceCredentialGovernanceConfig{
		Owner:      ServiceCredentialGovernanceConfigOwner,
		Name:       ServiceCredentialGovernanceConfigName,
		ConfigJson: string(body),
	}
	affected, err := s.configStore().SaveServiceCredentialGovernanceConfig(record)
	if err != nil {
		return nil, false, fmt.Errorf("%w: %w", ErrServiceCredentialGovernanceConfigUnavailable, err)
	}
	return normalized, affected, nil
}

func (s *ServiceCredentialGovernanceConfigService) configStore() ServiceCredentialGovernanceConfigStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultServiceCredentialGovernanceConfigStore{}
}

func (s *ServiceCredentialGovernanceConfigService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func defaultServiceCredentialGovernanceConfigResponse() *ServiceCredentialGovernanceConfigResponse {
	return &ServiceCredentialGovernanceConfigResponse{
		Source: ServiceCredentialGovernanceConfigSource,
		Groups: []ServiceCredentialGovernanceConfigGroup{
			{
				Key:                       "insight_provider_trust",
				Label:                     "Insight provider trust",
				Enabled:                   true,
				Owner:                     "admin_provider_trust",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "not_applicable",
				OwnerManaged:              true,
				CallerPolicy:              "insight_service_token",
				RemediationRoute:          "/providers",
				NextAction:                "核对 Insight provider trust 白名单",
			},
			{
				Key:                       "usage_identity_resolver",
				Label:                     "Usage identity resolver",
				Enabled:                   true,
				Owner:                     "admin_outbound_resolver",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "missing",
				OwnerManaged:              true,
				CallerPolicy:              "aicodex-admin",
				RemediationRoute:          "/platform-api-mappings",
				NextAction:                "导入 Insight Profile 后通过 manual/secretRef binding 绑定 resolver 凭据",
			},
			{
				Key:                       "gateway_organization_projection",
				Label:                     "Gateway organization projection",
				Enabled:                   false,
				Owner:                     "admin_gateway_projection_producer",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "not_applicable",
				OwnerManaged:              true,
				CallerPolicy:              "aicodex-admin",
				RemediationRoute:          "/platform-api-mappings",
				NextAction:                "启用后核对 Gateway projection 凭据引用",
			},
			{
				Key:                       "keep_in_env",
				Label:                     "Keep in env/config",
				Enabled:                   true,
				Owner:                     "deployment_env_config",
				SourceClass:               "env_config",
				CredentialReferenceStatus: "external_secret",
				KeepInEnv:                 true,
				RemediationRoute:          "env/config",
				NextAction:                "作为底层 secret 落点保留；默认通过 Insight manual/secretRef binding 完成绑定",
				KeepInEnvKeys: []string{
					"driverName",
					"dataSourceName",
					"dbName",
					"redisEndpoint",
					"httpport",
					"httpsport",
					"certFile",
					"keyFile",
					"KMS/Vault bootstrap",
					"breakGlassRecovery",
					"buildTokens",
					"CROWDIN_PERSONAL_TOKEN",
					"RADIUS/LDAP server secrets",
				},
			},
		},
	}
}

func normalizeServiceCredentialGovernanceConfig(input *ServiceCredentialGovernanceConfigResponse, mergeDefaults bool) (*ServiceCredentialGovernanceConfigResponse, error) {
	if input == nil {
		return nil, errors.New("service credential governance config is required")
	}

	defaults := defaultServiceCredentialGovernanceConfigResponse()
	byKey := map[string]ServiceCredentialGovernanceConfigGroup{}
	if mergeDefaults {
		for _, group := range defaults.Groups {
			byKey[group.Key] = group
		}
	}

	for _, group := range input.Groups {
		normalized, err := normalizeServiceCredentialGovernanceConfigGroup(group)
		if err != nil {
			return nil, err
		}
		if base, ok := byKey[normalized.Key]; ok {
			normalized = mergeServiceCredentialGovernanceConfigGroup(base, normalized)
		}
		byKey[normalized.Key] = normalized
	}

	groups := make([]ServiceCredentialGovernanceConfigGroup, 0, len(byKey))
	for _, key := range []string{"insight_provider_trust", "usage_identity_resolver", "gateway_organization_projection", "keep_in_env"} {
		group, ok := byKey[key]
		if !ok {
			continue
		}
		if err := validateServiceCredentialGovernanceConfigGroup(group); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}

	response := &ServiceCredentialGovernanceConfigResponse{
		Source:       ServiceCredentialGovernanceConfigSource,
		IsConfigured: input.IsConfigured,
		Groups:       groups,
	}
	if input.UpdatedAt != "" {
		response.UpdatedAt = input.UpdatedAt
	}
	return response, nil
}

func normalizeServiceCredentialGovernanceConfigGroup(group ServiceCredentialGovernanceConfigGroup) (ServiceCredentialGovernanceConfigGroup, error) {
	group.Key = strings.TrimSpace(group.Key)
	if !isAllowedServiceCredentialGovernanceConfigGroupKey(group.Key) {
		return ServiceCredentialGovernanceConfigGroup{}, errors.New("service credential governance config group is not supported")
	}
	if group.Key == ServiceCredentialRuntimeGroupInsightProviderTrust {
		if err := validateInsightProviderTrustRuntimePolicyTypes(group.BoundedRuntimePolicy); err != nil {
			return ServiceCredentialGovernanceConfigGroup{}, err
		}
	}
	group.Label = strings.TrimSpace(group.Label)
	group.Owner = strings.TrimSpace(group.Owner)
	group.SourceClass = strings.TrimSpace(group.SourceClass)
	group.CredentialReferenceStatus = strings.TrimSpace(group.CredentialReferenceStatus)
	group.CredentialReferenceKey = strings.TrimSpace(group.CredentialReferenceKey)
	group.CallerPolicy = strings.TrimSpace(group.CallerPolicy)
	group.RemediationRoute = strings.TrimSpace(group.RemediationRoute)
	group.NextAction = strings.TrimSpace(group.NextAction)
	group.BlockedReasons = sanitizeServiceCredentialGovernanceConfigStringSlice(group.BlockedReasons)
	group.KeepInEnvKeys = sanitizeServiceCredentialGovernanceConfigStringSlice(group.KeepInEnvKeys)
	group.BoundedRuntimePolicy = sanitizeServiceCredentialGovernanceConfigPolicy(group.BoundedRuntimePolicy)
	return group, nil
}

// validateInsightProviderTrustRuntimePolicyTypes 在通用 policy 归一化前拒绝非字符串 trust 元素，
// 避免数字或布尔值被格式化成字符串后形成看似可执行的授权策略。
func validateInsightProviderTrustRuntimePolicyTypes(policy map[string]interface{}) error {
	for _, key := range []string{"allowedAudiences", "requiredScopes", "allowedIssuerDigests"} {
		value, ok := policy[key]
		if ok && !isInsightProviderTrustStringListValue(value) {
			return errors.New("service credential governance trust policy type is not supported")
		}
	}
	if value, ok := policy["issuerMode"]; ok {
		if _, valid := value.(string); !valid {
			return errors.New("service credential governance trust policy type is not supported")
		}
	}
	return nil
}

func isInsightProviderTrustStringListValue(value interface{}) bool {
	switch typed := value.(type) {
	case string, []string:
		return true
	case []interface{}:
		for _, item := range typed {
			if _, ok := item.(string); !ok {
				return false
			}
		}
		return true
	default:
		return false
	}
}

func mergeServiceCredentialGovernanceConfigGroup(base ServiceCredentialGovernanceConfigGroup, override ServiceCredentialGovernanceConfigGroup) ServiceCredentialGovernanceConfigGroup {
	if override.Label == "" {
		override.Label = base.Label
	}
	if override.Owner == "" {
		override.Owner = base.Owner
	}
	if override.SourceClass == "" {
		override.SourceClass = base.SourceClass
	}
	if override.CredentialReferenceStatus == "" {
		override.CredentialReferenceStatus = base.CredentialReferenceStatus
	}
	if override.CallerPolicy == "" {
		override.CallerPolicy = base.CallerPolicy
	}
	if override.RemediationRoute == "" {
		override.RemediationRoute = base.RemediationRoute
	}
	if override.NextAction == "" {
		override.NextAction = base.NextAction
	}
	if override.BoundedRuntimePolicy == nil {
		override.BoundedRuntimePolicy = base.BoundedRuntimePolicy
	}
	if override.KeepInEnvKeys == nil {
		override.KeepInEnvKeys = base.KeepInEnvKeys
	}
	return override
}

func validateServiceCredentialGovernanceConfigGroup(group ServiceCredentialGovernanceConfigGroup) error {
	if !isAllowedServiceCredentialGovernanceSourceClass(group.SourceClass) {
		return errors.New("service credential governance source class is not supported")
	}
	if !isAllowedServiceCredentialReferenceStatus(group.CredentialReferenceStatus) {
		return errors.New("service credential reference status is not supported")
	}
	for _, value := range []string{group.Label, group.Owner, group.CredentialReferenceKey, group.CallerPolicy, group.RemediationRoute, group.NextAction} {
		if containsServiceCredentialGovernanceSensitiveMaterial(value) {
			return errors.New("service credential governance config contains unsupported sensitive material")
		}
	}
	for _, value := range append(group.BlockedReasons, group.KeepInEnvKeys...) {
		if containsServiceCredentialGovernanceSensitiveMaterial(value) {
			return errors.New("service credential governance config contains unsupported sensitive material")
		}
	}
	for key, value := range group.BoundedRuntimePolicy {
		if containsServiceCredentialGovernanceSensitiveMaterial(key) || containsServiceCredentialGovernanceSensitivePolicyValue(value) {
			return errors.New("service credential governance config contains unsupported sensitive material")
		}
	}
	if group.Key == "insight_provider_trust" {
		if err := validateInsightProviderTrustRuntimePolicy(group.BoundedRuntimePolicy); err != nil {
			return err
		}
	}
	return nil
}

// validateInsightProviderTrustRuntimePolicy 确保 provider trust policy 只保存 audience/scope 和 issuer digest 等 copy-safe 元数据。
func validateInsightProviderTrustRuntimePolicy(policy map[string]interface{}) error {
	if len(policy) == 0 {
		return nil
	}
	for _, audience := range serviceCredentialGovernancePolicyStringSlice(policy, "allowedAudiences") {
		if containsServiceCredentialGovernanceSensitiveMaterial(audience) {
			return errors.New("service credential governance config contains unsupported sensitive material")
		}
	}
	for _, scope := range serviceCredentialGovernancePolicyStringSlice(policy, "requiredScopes") {
		if containsServiceCredentialGovernanceSensitiveMaterial(scope) {
			return errors.New("service credential governance config contains unsupported sensitive material")
		}
	}
	for _, digest := range serviceCredentialGovernancePolicyStringSlice(policy, "allowedIssuerDigests") {
		if !isServiceCredentialGovernanceIssuerDigest(digest) {
			return errors.New("service credential governance issuer digest is not supported")
		}
	}
	if issuerMode, ok := policy["issuerMode"].(string); ok && issuerMode != "" && issuerMode != "any_non_empty" && issuerMode != "digest_allowlist" {
		return errors.New("service credential governance issuer mode is not supported")
	}
	return nil
}

func sanitizeServiceCredentialGovernanceConfigStringSlice(values []string) []string {
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
	sort.Strings(result)
	return result
}

func sanitizeServiceCredentialGovernanceConfigPolicy(policy map[string]interface{}) map[string]interface{} {
	if len(policy) == 0 {
		return nil
	}
	result := map[string]interface{}{}
	keys := make([]string, 0, len(policy))
	for key := range policy {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		value := policy[key]
		switch typedValue := value.(type) {
		case bool, int, int64, float64:
			result[trimmedKey] = typedValue
		case []string:
			if values := sanitizeServiceCredentialGovernanceConfigStringSlice(typedValue); len(values) > 0 {
				result[trimmedKey] = values
			}
		case []interface{}:
			values := []string{}
			for _, item := range typedValue {
				text := strings.TrimSpace(fmt.Sprintf("%v", item))
				if text != "" {
					values = append(values, text)
				}
			}
			if values = sanitizeServiceCredentialGovernanceConfigStringSlice(values); len(values) > 0 {
				result[trimmedKey] = values
			}
		case string:
			trimmedValue := strings.TrimSpace(typedValue)
			if trimmedValue != "" {
				result[trimmedKey] = trimmedValue
			}
		default:
			result[trimmedKey] = fmt.Sprintf("%v", typedValue)
		}
	}
	return result
}

func isAllowedServiceCredentialGovernanceConfigGroupKey(key string) bool {
	switch key {
	case "insight_provider_trust", "usage_identity_resolver", "gateway_organization_projection", "keep_in_env":
		return true
	default:
		return false
	}
}

func isAllowedServiceCredentialGovernanceSourceClass(sourceClass string) bool {
	switch sourceClass {
	case "admin_config", "env_config", "external_secret_system":
		return true
	default:
		return false
	}
}

func isAllowedServiceCredentialReferenceStatus(status string) bool {
	switch status {
	case "configured", "missing", "external_secret", "not_applicable":
		return true
	default:
		return false
	}
}

func containsServiceCredentialGovernanceSensitivePolicyValue(value interface{}) bool {
	switch typedValue := value.(type) {
	case string:
		return containsServiceCredentialGovernanceSensitiveMaterial(typedValue)
	case []string:
		for _, item := range typedValue {
			if containsServiceCredentialGovernanceSensitiveMaterial(item) {
				return true
			}
		}
	case []interface{}:
		for _, item := range typedValue {
			if containsServiceCredentialGovernanceSensitivePolicyValue(item) {
				return true
			}
		}
	default:
		return false
	}
	return false
}

func containsServiceCredentialGovernanceSensitiveMaterial(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return false
	}
	if strings.Contains(normalized, "://") || strings.Contains(normalized, "bearer ") || strings.Contains(normalized, "authorization") || strings.Contains(normalized, "cookie") || strings.Contains(normalized, "clientsecret") || strings.Contains(normalized, "client_secret") || strings.Contains(normalized, "client-secret") || strings.Contains(normalized, "privatekey") || strings.Contains(normalized, "private_key") || strings.Contains(normalized, "private-key") || strings.Contains(normalized, "-----begin") || strings.Contains(normalized, "dsn=") || strings.Contains(normalized, "rawpayload") || strings.Contains(normalized, "raw_payload") || strings.Contains(normalized, "rawid") || strings.Contains(normalized, "raw_id") || strings.Contains(normalized, "secret-value") {
		return true
	}
	return false
}

// ContainsServiceCredentialGovernanceSensitiveMaterial exposes the copy-safe
// guard for controller/package boundaries that must reject operator-facing
// handoff payloads containing raw secrets or private endpoints.
func ContainsServiceCredentialGovernanceSensitiveMaterial(value string) bool {
	return containsServiceCredentialGovernanceSensitiveMaterial(value)
}

// serviceCredentialGovernancePolicyStringSlice 统一处理 JSON 数组和 Go slice，避免 copy-safe list 被降级成字符串。
func serviceCredentialGovernancePolicyStringSlice(policy map[string]interface{}, key string) []string {
	if len(policy) == 0 {
		return nil
	}
	switch value := policy[key].(type) {
	case []string:
		return sanitizeServiceCredentialGovernanceConfigStringSlice(value)
	case []interface{}:
		values := []string{}
		for _, item := range value {
			text := strings.TrimSpace(fmt.Sprintf("%v", item))
			if text != "" {
				values = append(values, text)
			}
		}
		return sanitizeServiceCredentialGovernanceConfigStringSlice(values)
	case string:
		return sanitizeServiceCredentialGovernanceConfigStringSlice([]string{value})
	default:
		return nil
	}
}

// isServiceCredentialGovernanceIssuerDigest 只接受 issuer 的 sha256 digest，避免保存完整 issuer URL。
func isServiceCredentialGovernanceIssuerDigest(value string) bool {
	value = strings.TrimSpace(value)
	if !strings.HasPrefix(value, "sha256:") || len(value) != len("sha256:")+64 {
		return false
	}
	for _, r := range strings.TrimPrefix(value, "sha256:") {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')) {
			return false
		}
	}
	return true
}

func formatServiceCredentialGovernanceConfigTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

// GetServiceCredentialGovernanceConfig 返回持久化的服务凭据治理配置记录；记录不存在时返回 nil。
func GetServiceCredentialGovernanceConfig() (*ServiceCredentialGovernanceConfig, error) {
	return getServiceCredentialGovernanceConfig()
}

// SaveServiceCredentialGovernanceConfig 以固定 owner/name upsert copy-safe 配置元数据。
func SaveServiceCredentialGovernanceConfig(config *ServiceCredentialGovernanceConfig) (bool, error) {
	return saveServiceCredentialGovernanceConfig(config)
}

// GetServiceCredentialGovernanceConfig 实现默认 store 的读取路径，供 service 注入边界复用。
func (s defaultServiceCredentialGovernanceConfigStore) GetServiceCredentialGovernanceConfig() (*ServiceCredentialGovernanceConfig, error) {
	return getServiceCredentialGovernanceConfig()
}

// SaveServiceCredentialGovernanceConfig 实现默认 store 的保存路径，供 service 注入边界复用。
func (s defaultServiceCredentialGovernanceConfigStore) SaveServiceCredentialGovernanceConfig(config *ServiceCredentialGovernanceConfig) (bool, error) {
	return saveServiceCredentialGovernanceConfig(config)
}

func getServiceCredentialGovernanceConfig() (*ServiceCredentialGovernanceConfig, error) {
	if ormer == nil || ormer.Engine == nil {
		return nil, nil
	}
	config := &ServiceCredentialGovernanceConfig{}
	existed, err := ormer.Engine.ID(core.PK{ServiceCredentialGovernanceConfigOwner, ServiceCredentialGovernanceConfigName}).Get(config)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return config, nil
}

func saveServiceCredentialGovernanceConfig(config *ServiceCredentialGovernanceConfig) (bool, error) {
	if config == nil {
		return false, nil
	}
	config.Owner = ServiceCredentialGovernanceConfigOwner
	config.Name = ServiceCredentialGovernanceConfigName
	existing, err := getServiceCredentialGovernanceConfig()
	if err != nil {
		return false, err
	}
	if existing == nil {
		affected, err := ormer.Engine.Insert(config)
		return affected != 0, err
	}
	config.CreatedAt = existing.CreatedAt
	affected, err := ormer.Engine.ID(core.PK{config.Owner, config.Name}).AllCols().Update(config)
	return affected != 0, err
}
