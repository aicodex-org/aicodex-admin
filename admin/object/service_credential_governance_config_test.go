package object

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/xorm-io/xorm"
)

type memoryServiceCredentialGovernanceObjectConfigStore struct {
	config *ServiceCredentialGovernanceConfig
	saved  *ServiceCredentialGovernanceConfig
	err    error
}

func (s *memoryServiceCredentialGovernanceObjectConfigStore) GetServiceCredentialGovernanceConfig() (*ServiceCredentialGovernanceConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.config == nil {
		return nil, nil
	}
	copy := *s.config
	return &copy, nil
}

func (s *memoryServiceCredentialGovernanceObjectConfigStore) SaveServiceCredentialGovernanceConfig(config *ServiceCredentialGovernanceConfig) (bool, error) {
	if s.err != nil {
		return false, s.err
	}
	if config == nil {
		return false, nil
	}
	copy := *config
	s.saved = &copy
	s.config = &copy
	return true, nil
}

func TestServiceCredentialGovernanceConfigServiceDefaultAndRoundTrip(t *testing.T) {
	store := &memoryServiceCredentialGovernanceObjectConfigStore{}
	service := &ServiceCredentialGovernanceConfigService{
		Store: store,
		Now:   func() time.Time { return time.Date(2026, 6, 21, 6, 30, 0, 0, time.UTC) },
	}

	defaultConfig, err := service.GetConfig()
	if err != nil {
		t.Fatalf("GetConfig() error = %v", err)
	}
	if defaultConfig.IsConfigured || defaultConfig.Source != ServiceCredentialGovernanceConfigSource || len(defaultConfig.Groups) != 4 {
		t.Fatalf("default config mismatch: %#v", defaultConfig)
	}

	saved, affected, err := service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			Owner:                     "admin_outbound_resolver",
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "vault:usage-identity-resolver",
			CallerPolicy:              "aicodex-admin",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500.0, "maxItems": 25.0},
			RemediationRoute:          "/platform-api-mappings",
			NextAction:                "核对 resolver 凭据引用",
			BlockedReasons:            []string{"resolver_reference_missing", "resolver_reference_missing"},
		}},
	})
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}
	if !affected || !saved.IsConfigured || store.saved == nil {
		t.Fatalf("SaveConfig() did not persist: affected=%v saved=%#v store=%#v", affected, saved, store.saved)
	}
	if saved.UpdatedAt != "2026-06-21T06:30:00Z" {
		t.Fatalf("updatedAt = %q", saved.UpdatedAt)
	}

	readBack, err := service.GetConfig()
	if err != nil {
		t.Fatalf("GetConfig() after save error = %v", err)
	}
	group := serviceCredentialGovernanceObjectConfigGroupByKey(t, readBack.Groups, "usage_identity_resolver")
	if group.CredentialReferenceKey != "vault:usage-identity-resolver" || group.BoundedRuntimePolicy["timeoutMs"] != float64(1500) {
		t.Fatalf("readback should keep safe reference and policy: %#v", group)
	}
	if len(group.BlockedReasons) != 1 {
		t.Fatalf("blocked reasons should be deduplicated: %#v", group.BlockedReasons)
	}
}

func TestServiceCredentialGovernanceConfigServiceRejectsUnsupportedAndSensitiveData(t *testing.T) {
	service := &ServiceCredentialGovernanceConfigService{Store: &memoryServiceCredentialGovernanceObjectConfigStore{}}

	_, _, err := service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{Key: "unknown_group", SourceClass: "admin_config", CredentialReferenceStatus: "missing"}},
	})
	if err == nil || !strings.Contains(err.Error(), "not supported") {
		t.Fatalf("unknown group err = %v, want not supported", err)
	}

	_, _, err = service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			Owner:                     "admin_outbound_resolver",
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "https://resolver.internal.example.invalid/token",
			CallerPolicy:              "Bearer resolver-secret-value",
		}},
	})
	if err == nil {
		t.Fatalf("sensitive config err = nil, want rejection")
	}
	if strings.Contains(err.Error(), "resolver-secret-value") || strings.Contains(err.Error(), "resolver.internal.example.invalid") {
		t.Fatalf("sensitive rejection leaked value: %v", err)
	}

	_, _, err = service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "insight_provider_trust",
			Enabled:                   true,
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "not_applicable",
			BoundedRuntimePolicy:      map[string]interface{}{"allowedIssuerDigests": []string{"https://issuer.internal.example.invalid"}, "issuerMode": "digest_allowlist"},
		}},
	})
	if err == nil {
		t.Fatalf("raw issuer URL in trust policy should be rejected")
	}
	if strings.Contains(err.Error(), "issuer.internal.example.invalid") {
		t.Fatalf("trust policy rejection leaked raw issuer URL: %v", err)
	}
}

func TestServiceCredentialGovernanceConfigServiceKeepsInsightTrustPolicyArraysCopySafe(t *testing.T) {
	store := &memoryServiceCredentialGovernanceObjectConfigStore{}
	service := &ServiceCredentialGovernanceConfigService{Store: store}

	saved, _, err := service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "insight_provider_trust",
			Enabled:                   true,
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "not_applicable",
			BoundedRuntimePolicy: map[string]interface{}{
				"allowedAudiences":     []string{"saved-client"},
				"requiredScopes":       []string{"profile", "insight.scope.read"},
				"allowedIssuerDigests": []string{"sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"},
				"issuerMode":           "digest_allowlist",
			},
		}},
	})
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}
	trust := serviceCredentialGovernanceObjectConfigGroupByKey(t, saved.Groups, "insight_provider_trust")
	audiences, ok := trust.BoundedRuntimePolicy["allowedAudiences"].([]string)
	if !ok || len(audiences) != 1 || audiences[0] != "saved-client" {
		t.Fatalf("allowedAudiences should round trip as []string, got %#v", trust.BoundedRuntimePolicy["allowedAudiences"])
	}
	digests, ok := trust.BoundedRuntimePolicy["allowedIssuerDigests"].([]string)
	if !ok || len(digests) != 1 || !strings.HasPrefix(digests[0], "sha256:") {
		t.Fatalf("allowedIssuerDigests should round trip as digest aliases, got %#v", trust.BoundedRuntimePolicy["allowedIssuerDigests"])
	}
	readBack, err := service.GetConfig()
	if err != nil {
		t.Fatalf("GetConfig() after trust save error = %v", err)
	}
	readBackTrust := serviceCredentialGovernanceObjectConfigGroupByKey(t, readBack.Groups, "insight_provider_trust")
	readBackAudiences, ok := readBackTrust.BoundedRuntimePolicy["allowedAudiences"].([]string)
	if !ok || len(readBackAudiences) != 1 || readBackAudiences[0] != "saved-client" {
		t.Fatalf("persisted allowedAudiences should normalize from JSON arrays, got %#v", readBackTrust.BoundedRuntimePolicy["allowedAudiences"])
	}
	body, err := json.Marshal(saved)
	if err != nil {
		t.Fatalf("marshal saved trust policy: %v", err)
	}
	for _, forbidden := range []string{"https://", "Authorization", "Cookie", "clientSecret", "privateKey", "rawPayload", "rawId"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("trust policy leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestServiceCredentialGovernanceConfigServiceRejectsInvalidInsightTrustPolicy(t *testing.T) {
	service := &ServiceCredentialGovernanceConfigService{Store: &memoryServiceCredentialGovernanceObjectConfigStore{}}
	cases := []struct {
		name   string
		policy map[string]interface{}
	}{
		{name: "unsupported issuer mode", policy: map[string]interface{}{"allowedAudiences": []string{"saved-client"}, "issuerMode": "raw_url_allowlist"}},
		{name: "invalid digest alias", policy: map[string]interface{}{"allowedIssuerDigests": []string{"issuer-alias"}, "issuerMode": "digest_allowlist"}},
		{name: "raw audience url", policy: map[string]interface{}{"allowedAudiences": []interface{}{"https://audience.internal.example.invalid"}}},
		{name: "raw scope material", policy: map[string]interface{}{"requiredScopes": []interface{}{"Authorization: Bearer secret-value"}}},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{
				Groups: []ServiceCredentialGovernanceConfigGroup{{
					Key:                       "insight_provider_trust",
					Enabled:                   true,
					SourceClass:               "admin_config",
					CredentialReferenceStatus: "not_applicable",
					BoundedRuntimePolicy:      tt.policy,
				}},
			})
			if err == nil {
				t.Fatalf("SaveConfig() error = nil, want invalid trust policy rejection")
			}
			if strings.Contains(err.Error(), "audience.internal") || strings.Contains(err.Error(), "secret-value") {
				t.Fatalf("error leaked sensitive policy value: %v", err)
			}
		})
	}
}

func TestServiceCredentialGovernanceConfigPolicyHelpersHandleArrayShapes(t *testing.T) {
	policy := sanitizeServiceCredentialGovernanceConfigPolicy(map[string]interface{}{
		"stringSlice":     []string{"b", "a", "a"},
		"interfaceSlice":  []interface{}{"profile", "insight.scope.read"},
		"singleString":    "saved-client",
		"unsupportedList": []int{1, 2},
	})
	if got := serviceCredentialGovernancePolicyStringSlice(policy, "stringSlice"); len(got) != 2 || got[0] != "a" || got[1] != "b" {
		t.Fatalf("string slice policy mismatch: %#v", got)
	}
	if got := serviceCredentialGovernancePolicyStringSlice(policy, "interfaceSlice"); len(got) != 2 || got[0] != "insight.scope.read" || got[1] != "profile" {
		t.Fatalf("interface slice policy mismatch: %#v", got)
	}
	if got := serviceCredentialGovernancePolicyStringSlice(policy, "singleString"); len(got) != 1 || got[0] != "saved-client" {
		t.Fatalf("single string policy mismatch: %#v", got)
	}
	if got := serviceCredentialGovernancePolicyStringSlice(policy, "missing"); got != nil {
		t.Fatalf("missing policy should return nil, got %#v", got)
	}
	rawPolicy := map[string]interface{}{
		"stringSlice":    []string{"z", "y"},
		"interfaceSlice": []interface{}{"b", "a"},
		"singleString":   "one",
		"unsupported":    12,
	}
	if got := serviceCredentialGovernancePolicyStringSlice(rawPolicy, "stringSlice"); len(got) != 2 || got[0] != "y" || got[1] != "z" {
		t.Fatalf("raw string slice policy mismatch: %#v", got)
	}
	if got := serviceCredentialGovernancePolicyStringSlice(rawPolicy, "interfaceSlice"); len(got) != 2 || got[0] != "a" || got[1] != "b" {
		t.Fatalf("raw interface slice policy mismatch: %#v", got)
	}
	if got := serviceCredentialGovernancePolicyStringSlice(rawPolicy, "singleString"); len(got) != 1 || got[0] != "one" {
		t.Fatalf("raw string policy mismatch: %#v", got)
	}
	if got := serviceCredentialGovernancePolicyStringSlice(rawPolicy, "unsupported"); got != nil {
		t.Fatalf("raw unsupported policy should return nil, got %#v", got)
	}
	if !containsServiceCredentialGovernanceSensitivePolicyValue([]string{"safe", "Cookie: value"}) {
		t.Fatalf("sensitive []string policy value should be detected")
	}
	if !containsServiceCredentialGovernanceSensitivePolicyValue([]interface{}{"safe", "raw_payload"}) {
		t.Fatalf("sensitive []interface policy value should be detected")
	}
	if containsServiceCredentialGovernanceSensitivePolicyValue([]interface{}{"safe", 123}) {
		t.Fatalf("safe mixed policy values should not be sensitive")
	}
	if isServiceCredentialGovernanceIssuerDigest("sha256:not-hex") {
		t.Fatalf("invalid digest should be rejected")
	}
}

func TestServiceCredentialGovernanceConfigServiceHandlesInvalidPersistedConfigAndStoreErrors(t *testing.T) {
	service := &ServiceCredentialGovernanceConfigService{
		Store: &memoryServiceCredentialGovernanceObjectConfigStore{
			config: &ServiceCredentialGovernanceConfig{ConfigJson: `{"groups":[{"key":"usage_identity_resolver","sourceClass":"admin_config","credentialReferenceStatus":"missing"}]`},
		},
	}
	if _, err := service.GetConfig(); err == nil {
		t.Fatalf("GetConfig() error = nil, want invalid persisted JSON error")
	}

	storeErr := errors.New("metadata store unavailable")
	service = &ServiceCredentialGovernanceConfigService{Store: &memoryServiceCredentialGovernanceObjectConfigStore{err: storeErr}}
	if _, err := service.GetConfig(); !errors.Is(err, storeErr) {
		t.Fatalf("GetConfig() error = %v, want %v", err, storeErr)
	}
	if _, _, err := service.SaveConfig(&ServiceCredentialGovernanceConfigResponse{Groups: []ServiceCredentialGovernanceConfigGroup{{Key: "keep_in_env", SourceClass: "env_config", CredentialReferenceStatus: "external_secret"}}}); !errors.Is(err, storeErr) {
		t.Fatalf("SaveConfig() error = %v, want %v", err, storeErr)
	}
}

func TestServiceCredentialGovernanceConfigHelpersCoverFailClosedBranches(t *testing.T) {
	var nilService *ServiceCredentialGovernanceConfigService
	if nilService.configStore() == nil {
		t.Fatalf("nil service should return default config store")
	}
	if _, err := nilService.configStore().GetServiceCredentialGovernanceConfig(); err != nil {
		t.Fatalf("default store get without ormer should be nil error, got %v", err)
	}
	if affected, err := SaveServiceCredentialGovernanceConfig(nil); err != nil || affected {
		t.Fatalf("SaveServiceCredentialGovernanceConfig(nil) = %v/%v, want false/nil", affected, err)
	}
	if affected, err := (defaultServiceCredentialGovernanceConfigStore{}).SaveServiceCredentialGovernanceConfig(nil); err != nil || affected {
		t.Fatalf("default store Save(nil) = %v/%v, want false/nil", affected, err)
	}

	_, err := normalizeServiceCredentialGovernanceConfig(nil, true)
	if err == nil {
		t.Fatalf("normalize nil config error = nil")
	}
	_, err = normalizeServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfigResponse{Groups: []ServiceCredentialGovernanceConfigGroup{{
		Key:                       "usage_identity_resolver",
		SourceClass:               "unsupported_source",
		CredentialReferenceStatus: "missing",
	}}}, true)
	if err == nil || !strings.Contains(err.Error(), "source class") {
		t.Fatalf("unsupported source err = %v", err)
	}
	_, err = normalizeServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfigResponse{Groups: []ServiceCredentialGovernanceConfigGroup{{
		Key:                       "usage_identity_resolver",
		SourceClass:               "admin_config",
		CredentialReferenceStatus: "unsupported_status",
	}}}, true)
	if err == nil || !strings.Contains(err.Error(), "reference status") {
		t.Fatalf("unsupported status err = %v", err)
	}
	_, err = normalizeServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfigResponse{Groups: []ServiceCredentialGovernanceConfigGroup{{
		Key:                       "usage_identity_resolver",
		SourceClass:               "admin_config",
		CredentialReferenceStatus: "missing",
		BlockedReasons:            []string{"Bearer resolver-secret-value"},
	}}}, true)
	if err == nil {
		t.Fatalf("sensitive blocked reason should be rejected")
	}
	_, err = normalizeServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfigResponse{Groups: []ServiceCredentialGovernanceConfigGroup{{
		Key:                       "usage_identity_resolver",
		SourceClass:               "admin_config",
		CredentialReferenceStatus: "missing",
		BoundedRuntimePolicy:      map[string]interface{}{"authorizationHeader": "present"},
	}}}, true)
	if err == nil {
		t.Fatalf("sensitive policy key should be rejected")
	}

	policy := sanitizeServiceCredentialGovernanceConfigPolicy(map[string]interface{}{
		"bool":   true,
		"int":    1,
		"int64":  int64(2),
		"float":  3.5,
		"string": "safe",
		"empty":  "",
		"other":  []string{"safe"},
	})
	if policy["bool"] != true || policy["int"] != 1 || policy["int64"] != int64(2) || policy["float"] != 3.5 || policy["string"] != "safe" || policy["other"] == nil {
		t.Fatalf("policy sanitize mismatch: %#v", policy)
	}
	if containsServiceCredentialGovernanceSensitivePolicyValue(123) {
		t.Fatalf("numeric policy value should not be sensitive")
	}
	if !containsServiceCredentialGovernanceSensitivePolicyValue("Bearer resolver-secret-value") {
		t.Fatalf("bearer policy value should be sensitive")
	}
	merged, err := normalizeServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{Key: "insight_provider_trust"}},
	}, true)
	if err != nil {
		t.Fatalf("normalize sparse group: %v", err)
	}
	if group := serviceCredentialGovernanceObjectConfigGroupByKey(t, merged.Groups, "insight_provider_trust"); group.Label == "" || group.Owner == "" || group.RemediationRoute == "" {
		t.Fatalf("sparse group should merge defaults: %#v", group)
	}
}

func TestServiceCredentialGovernanceConfigDefaultStorePersistsMetadata(t *testing.T) {
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("NewEngine() error = %v", err)
	}
	defer func() {
		_ = engine.Close()
	}()
	if err := engine.Sync2(new(ServiceCredentialGovernanceConfig)); err != nil {
		t.Fatalf("Sync2() error = %v", err)
	}
	originalOrmer := ormer
	ormer = &Ormer{Engine: engine}
	defer func() {
		ormer = originalOrmer
	}()

	if existing, err := GetServiceCredentialGovernanceConfig(); err != nil || existing != nil {
		t.Fatalf("initial GetServiceCredentialGovernanceConfig() = %#v/%v, want nil/nil", existing, err)
	}
	affected, err := SaveServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfig{
		ConfigJson: `{"source":"admin_service_credential_governance_config","isConfigured":true,"groups":[]}`,
	})
	if err != nil || !affected {
		t.Fatalf("SaveServiceCredentialGovernanceConfig() = %v/%v, want true/nil", affected, err)
	}
	saved, err := GetServiceCredentialGovernanceConfig()
	if err != nil {
		t.Fatalf("GetServiceCredentialGovernanceConfig() after save error = %v", err)
	}
	if saved == nil || saved.Owner != ServiceCredentialGovernanceConfigOwner || saved.Name != ServiceCredentialGovernanceConfigName {
		t.Fatalf("saved config mismatch: %#v", saved)
	}
	affected, err = SaveServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfig{
		ConfigJson: `{"source":"admin_service_credential_governance_config","isConfigured":true,"groups":[{"key":"keep_in_env"}]}`,
	})
	if err != nil || !affected {
		t.Fatalf("SaveServiceCredentialGovernanceConfig() update = %v/%v, want true/nil", affected, err)
	}
}

func TestServiceCredentialGovernanceConfigResponseDoesNotMarshalSensitiveFields(t *testing.T) {
	config, err := normalizeServiceCredentialGovernanceConfig(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "gateway_organization_projection",
			Enabled:                   true,
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "vault:gateway-projection",
			CallerPolicy:              "aicodex-admin",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2500.0, "maxRetries": 2.0},
		}},
	}, true)
	if err != nil {
		t.Fatalf("normalize config: %v", err)
	}
	body, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("marshal config: %v", err)
	}
	for _, forbidden := range []string{"gateway.internal.example.invalid", "resolver-secret-value", "Authorization", "Cookie", "clientSecret", "privateKey"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("config leaked %q in %s", forbidden, string(body))
		}
	}
}

func serviceCredentialGovernanceObjectConfigGroupByKey(t *testing.T, groups []ServiceCredentialGovernanceConfigGroup, key string) ServiceCredentialGovernanceConfigGroup {
	t.Helper()
	for _, group := range groups {
		if group.Key == key {
			return group
		}
	}
	t.Fatalf("group %q not found in %#v", key, groups)
	return ServiceCredentialGovernanceConfigGroup{}
}
