package object

import (
	"errors"
	"testing"
	"time"
)

func TestGatewayProjectionPublisherConfigFallsBackToLegacyWithoutSavedGovernanceConfig(t *testing.T) {
	withServiceCredentialRuntimePolicyConfigForTest(t, nil)
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://gateway.internal.example.invalid/api/status")
	t.Setenv("gatewayOrganizationProjectionToken", "legacy-projection-token")
	t.Setenv("gatewayOrganizationProjectionCaller", "legacy-projection-caller")
	t.Setenv("gatewayOrganizationProjectionTimeoutMs", "2400")
	t.Setenv("gatewayOrganizationProjectionFreshnessTTLSeconds", "1800")
	t.Setenv("gatewayOrganizationProjectionMaxRetries", "2")

	config := GetGatewayProjectionPublisherConfig()

	if !config.Enabled || config.Endpoint == "" || config.Token == "" {
		t.Fatalf("legacy publisher config should remain enabled without saved config: %#v", config)
	}
	if config.Caller != "legacy-projection-caller" || config.Timeout != 2400*time.Millisecond || config.FreshnessTTL != 1800*time.Second || config.MaxRetries != 2 {
		t.Fatalf("legacy publisher config mismatch: %#v", config)
	}
}

func TestGatewayProjectionPublisherConfigSavedDisabledDoesNotUseLegacy(t *testing.T) {
	withServiceCredentialRuntimePolicyConfigForTest(t, &ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "gateway_organization_projection",
			Enabled:                   false,
			SourceClass:               "env_config",
			CredentialReferenceStatus: "configured",
			CallerPolicy:              "saved-projection-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2100.0, "freshnessTTLSeconds": 1200.0, "maxRetries": 1.0},
		}},
	})
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionToken", "legacy-projection-token")
	t.Setenv("gatewayOrganizationProjectionCaller", "legacy-projection-caller")

	config := GetGatewayProjectionPublisherConfig()

	if config.Enabled || config.Endpoint != "" || config.Token != "" {
		t.Fatalf("saved disabled policy must fail closed without legacy config: %#v", config)
	}
	if !stringSliceContains(config.BlockedReasons, "admin_service_credential_group_disabled") {
		t.Fatalf("disabled publisher config should expose stable blocker alias: %#v", config.BlockedReasons)
	}
}

func TestGatewayProjectionPublisherConfigSavedExternalReferenceDoesNotFallbackLegacy(t *testing.T) {
	withServiceCredentialRuntimePolicyConfigForTest(t, &ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "gateway_organization_projection",
			Enabled:                   true,
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "vault:gateway-projection-publisher",
			CallerPolicy:              "saved-projection-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2100.0, "freshnessTTLSeconds": 1200.0, "maxRetries": 1.0},
		}},
	})
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionToken", "legacy-projection-token")

	config := GetGatewayProjectionPublisherConfig()

	if config.Enabled || config.Endpoint != "" || config.Token != "" {
		t.Fatalf("unresolved saved external reference must not fall back to legacy: %#v", config)
	}
	if !stringSliceContains(config.BlockedReasons, "admin_service_credential_reference_unresolved") {
		t.Fatalf("unresolved publisher config should expose stable blocker alias: %#v", config.BlockedReasons)
	}
}

func TestGatewayProjectionPublisherConfigSavedEnvPolicyOverlaysLegacyBounds(t *testing.T) {
	withServiceCredentialRuntimePolicyConfigForTest(t, &ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "gateway_organization_projection",
			Enabled:                   true,
			SourceClass:               "env_config",
			CredentialReferenceStatus: "configured",
			KeepInEnv:                 true,
			CallerPolicy:              "saved-projection-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2100.0, "freshnessTTLSeconds": 1200.0, "maxRetries": 3.0},
		}},
	})
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://gateway.internal.example.invalid/api/status")
	t.Setenv("gatewayOrganizationProjectionToken", "legacy-projection-token")
	t.Setenv("gatewayOrganizationProjectionCaller", "legacy-projection-caller")
	t.Setenv("gatewayOrganizationProjectionTimeoutMs", "9000")
	t.Setenv("gatewayOrganizationProjectionFreshnessTTLSeconds", "3600")
	t.Setenv("gatewayOrganizationProjectionMaxRetries", "1")

	config := GetGatewayProjectionPublisherConfig()

	if !config.Enabled || config.Endpoint == "" || config.Token == "" {
		t.Fatalf("saved env_config policy should allow legacy credentials: %#v", config)
	}
	if config.Caller != "saved-projection-caller" || config.Timeout != 2100*time.Millisecond || config.FreshnessTTL != 1200*time.Second || config.MaxRetries != 3 {
		t.Fatalf("saved bounded runtime policy should overlay legacy defaults: %#v", config)
	}
}

func TestServiceCredentialRuntimePolicyDecisionHandlesErrorsAndMetadataGaps(t *testing.T) {
	unavailable := BuildServiceCredentialRuntimePolicyDecision(nil, errors.New("metadata store unavailable"), "usage_identity_resolver", []string{"timeoutMs"})
	if !stringSliceContains(unavailable.BlockedReasons, ServiceCredentialRuntimeBlockerConfigUnavailable) || unavailable.AllowLegacy {
		t.Fatalf("store error should fail closed: %#v", unavailable)
	}

	missingGroup := BuildServiceCredentialRuntimePolicyDecision(&ServiceCredentialGovernanceConfigResponse{IsConfigured: true}, nil, "usage_identity_resolver", []string{"timeoutMs"})
	if !stringSliceContains(missingGroup.BlockedReasons, ServiceCredentialRuntimeBlockerReferenceMissing) {
		t.Fatalf("missing group should expose reference blocker: %#v", missingGroup)
	}

	metadataGaps := BuildServiceCredentialRuntimePolicyDecision(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			SourceClass:               "env_config",
			CredentialReferenceStatus: "configured",
		}},
	}, nil, "usage_identity_resolver", []string{"timeoutMs", "maxItems"})
	if metadataGaps.AllowLegacy || !stringSliceContains(metadataGaps.BlockedReasons, ServiceCredentialRuntimeBlockerCallerMissing) || !stringSliceContains(metadataGaps.BlockedReasons, ServiceCredentialRuntimeBlockerBoundedPolicyMissing) {
		t.Fatalf("missing caller and bounded policy should fail closed: %#v", metadataGaps)
	}

	policy := map[string]interface{}{"int": 3, "int64": int64(4), "float": 5.0, "string": "6", "bad": "x"}
	if ServiceCredentialRuntimePolicyInt(policy, "int", 1) != 3 ||
		ServiceCredentialRuntimePolicyInt(policy, "int64", 1) != 4 ||
		ServiceCredentialRuntimePolicyInt(policy, "float", 1) != 5 ||
		ServiceCredentialRuntimePolicyInt(policy, "string", 1) != 6 ||
		ServiceCredentialRuntimePolicyInt(policy, "bad", 7) != 7 ||
		ServiceCredentialRuntimePolicyInt(nil, "missing", 8) != 8 {
		t.Fatalf("runtime policy int conversion mismatch")
	}
	if normalizeGatewayProjectionTimeoutMs(0) != gatewayProjectionPublisherDefaultTimeoutMs || normalizeGatewayProjectionTimeoutMs(2200) != 2200 {
		t.Fatalf("gateway projection timeout normalization mismatch")
	}
	aliases := serviceCredentialRuntimePolicyAppendUnique([]string{"existing"}, "")
	aliases = serviceCredentialRuntimePolicyAppendUnique(aliases, "existing")
	aliases = serviceCredentialRuntimePolicyAppendUnique(aliases, "new")
	if len(aliases) != 2 || aliases[0] != "existing" || aliases[1] != "new" {
		t.Fatalf("append unique should trim empty and skip duplicates: %#v", aliases)
	}
}

func withServiceCredentialRuntimePolicyConfigForTest(t *testing.T, config *ServiceCredentialGovernanceConfigResponse) {
	t.Helper()
	store := &memoryServiceCredentialGovernanceObjectConfigStore{}
	service := &ServiceCredentialGovernanceConfigService{Store: store}
	if config != nil {
		if _, _, err := service.SaveConfig(config); err != nil {
			t.Fatalf("SaveConfig() error = %v", err)
		}
	}
	original := serviceCredentialRuntimePolicyConfigServiceFactory
	serviceCredentialRuntimePolicyConfigServiceFactory = func() *ServiceCredentialGovernanceConfigService {
		return service
	}
	t.Cleanup(func() {
		serviceCredentialRuntimePolicyConfigServiceFactory = original
	})
}
