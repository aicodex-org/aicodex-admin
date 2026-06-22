package object

import (
	"testing"
	"time"
)

func TestBuildServiceCredentialGovernanceDiagnosticsClassifiesReadyAndFailClosedStates(t *testing.T) {
	response := BuildServiceCredentialGovernanceDiagnostics(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{
			{
				Key:                       "usage_identity_resolver",
				Enabled:                   true,
				Owner:                     "admin_outbound_resolver",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
				CredentialReferenceKey:    "vault:usage-identity-resolver",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "maxItems": 25},
				NextAction:                "配置可进入保存前核对",
			},
			{
				Key:                       "gateway_organization_projection",
				Enabled:                   false,
				Owner:                     "admin_gateway_projection_producer",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
				CredentialReferenceKey:    "vault:gateway-projection",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "freshnessTTLSeconds": 60, "maxRetries": 1},
			},
			{
				Key:                       "keep_in_env",
				Enabled:                   true,
				Owner:                     "deployment_env_config",
				SourceClass:               "env_config",
				CredentialReferenceStatus: "external_secret",
				KeepInEnv:                 true,
			},
		},
	}, time.Date(2026, 6, 22, 1, 2, 3, 0, time.UTC))

	if response.Source != ServiceCredentialGovernanceDiagnosticSource || response.GeneratedAt != "2026-06-22T01:02:03Z" {
		t.Fatalf("diagnostic metadata = %#v", response)
	}

	ready := serviceCredentialGovernanceDiagnosticGroupByKey(t, response.Groups, "usage_identity_resolver")
	if ready.Status != "ready" || ready.StableAlias != ServiceCredentialDiagnosticAliasReady || ready.CannotInfer {
		t.Fatalf("ready group = %#v", ready)
	}
	if !ready.CallerPolicyPresent || ready.Owner != "admin_outbound_resolver" || ready.NextAction == "" {
		t.Fatalf("ready metadata = %#v", ready)
	}

	disabled := serviceCredentialGovernanceDiagnosticGroupByKey(t, response.Groups, "gateway_organization_projection")
	if disabled.Status != "disabled" || disabled.StableAlias != ServiceCredentialRuntimeBlockerGroupDisabled {
		t.Fatalf("disabled group = %#v", disabled)
	}

	keepInEnv := serviceCredentialGovernanceDiagnosticGroupByKey(t, response.Groups, "keep_in_env")
	if keepInEnv.Status != "keep_in_env" || keepInEnv.StableAlias != ServiceCredentialDiagnosticAliasKeepInEnv || !keepInEnv.CannotInfer {
		t.Fatalf("keep in env group = %#v", keepInEnv)
	}
}

func TestBuildServiceCredentialGovernanceDiagnosticsClassifiesMissingUnresolvedAndPolicyGaps(t *testing.T) {
	response := BuildServiceCredentialGovernanceDiagnostics(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{
			{
				Key:                       "usage_identity_resolver",
				Enabled:                   true,
				Owner:                     "admin_outbound_resolver",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "missing",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "maxItems": 25},
			},
			{
				Key:                       "gateway_organization_projection",
				Enabled:                   true,
				Owner:                     "admin_gateway_projection_producer",
				SourceClass:               "external_secret_system",
				CredentialReferenceStatus: "external_secret",
				CredentialReferenceKey:    "vault:gateway-projection",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "freshnessTTLSeconds": 60, "maxRetries": 1},
			},
			{
				Key:                       "gateway_organization_projection",
				Enabled:                   true,
				Owner:                     "admin_gateway_projection_producer",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
				CredentialReferenceKey:    "vault:gateway-projection",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500},
			},
		},
	}, time.Time{})

	missing := response.Groups[0]
	if missing.Status != "missing_reference" || missing.StableAlias != ServiceCredentialRuntimeBlockerReferenceMissing {
		t.Fatalf("missing reference group = %#v", missing)
	}
	unresolved := response.Groups[1]
	if unresolved.Status != "cannot_infer" || unresolved.StableAlias != ServiceCredentialRuntimeBlockerReferenceUnresolved || !unresolved.CannotInfer {
		t.Fatalf("unresolved group = %#v", unresolved)
	}
	policyGap := response.Groups[2]
	if policyGap.Status != "blocked" || policyGap.StableAlias != ServiceCredentialRuntimeBlockerCallerMissing {
		t.Fatalf("policy gap group = %#v", policyGap)
	}
}

func TestBuildServiceCredentialGovernanceDiagnosticsRejectsUnsupportedAndSensitiveMetadata(t *testing.T) {
	response := BuildServiceCredentialGovernanceDiagnostics(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{
			{
				Key:                       "unknown_group",
				Enabled:                   true,
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
			},
			{
				Key:                       "usage_identity_resolver",
				Enabled:                   true,
				SourceClass:               "file_config",
				CredentialReferenceStatus: "configured",
			},
			{
				Key:                       "usage_identity_resolver",
				Enabled:                   true,
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
				CredentialReferenceKey:    "https://resolver.internal.example.invalid/token",
				CallerPolicy:              "Bearer secret-value",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "maxItems": 25},
			},
		},
	}, time.Time{})

	if response.Groups[0].Key != "unsupported_group" || response.Groups[0].StableAlias != ServiceCredentialDiagnosticAliasUnsupportedGroup {
		t.Fatalf("unsupported group = %#v", response.Groups[0])
	}
	if response.Groups[1].StableAlias != ServiceCredentialDiagnosticAliasUnsupportedSourceClass {
		t.Fatalf("unsupported source class = %#v", response.Groups[1])
	}
	sensitive := response.Groups[2]
	if sensitive.StableAlias != ServiceCredentialDiagnosticAliasCopySafeViolation || sensitive.CredentialReferenceStatus != "" || sensitive.CallerPolicyPresent {
		t.Fatalf("sensitive group = %#v", sensitive)
	}
}

func TestBuildServiceCredentialGovernanceDiagnosticsCoversOptionalBranches(t *testing.T) {
	empty := BuildServiceCredentialGovernanceDiagnostics(nil, time.Time{})
	if len(empty.Groups) != 0 || empty.GeneratedAt == "" {
		t.Fatalf("nil input diagnostic = %#v", empty)
	}

	response := BuildServiceCredentialGovernanceDiagnostics(&ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{
			{
				Key:                       "insight_provider_trust",
				Label:                     "Insight provider trust",
				Enabled:                   true,
				Owner:                     "admin_provider_trust",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "not_applicable",
				CallerPolicy:              "insight_service_token",
				BlockedReasons:            []string{"duplicate_alias", "duplicate_alias", " "},
				BoundedRuntimePolicy:      map[string]interface{}{"issuerMode": "any_non_empty"},
			},
			{
				Key:                       "usage_identity_resolver",
				Enabled:                   true,
				Owner:                     "admin_outbound_resolver",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
				CredentialReferenceKey:    "vault:usage-identity-resolver",
				CallerPolicy:              "aicodex-admin",
				BlockedReasons:            []string{"Authorization: Bearer secret-value"},
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "maxItems": 25},
			},
			{
				Key:                       "gateway_organization_projection",
				Enabled:                   true,
				Owner:                     "admin_gateway_projection_producer",
				SourceClass:               "admin_config",
				CredentialReferenceStatus: "configured",
				CredentialReferenceKey:    "vault:gateway-projection",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy: map[string]interface{}{
					"timeoutMs":           1500,
					"freshnessTTLSeconds": 60,
					"maxRetries":          1,
					"Authorization":       "Bearer secret-value",
				},
			},
		},
	}, time.Time{})

	trust := response.Groups[0]
	if trust.Status != "ready" || trust.StableAlias != ServiceCredentialDiagnosticAliasReferenceNotApplicable {
		t.Fatalf("insight trust diagnostic = %#v", trust)
	}
	if len(trust.BlockedReasons) != 1 || trust.BlockedReasons[0] != "duplicate_alias" {
		t.Fatalf("deduplicated blocked reasons = %#v", trust.BlockedReasons)
	}
	if response.Groups[1].StableAlias != ServiceCredentialDiagnosticAliasCopySafeViolation {
		t.Fatalf("sensitive blocked reason diagnostic = %#v", response.Groups[1])
	}
	if response.Groups[2].StableAlias != ServiceCredentialDiagnosticAliasCopySafeViolation {
		t.Fatalf("sensitive policy key diagnostic = %#v", response.Groups[2])
	}

	if missingRequiredServiceCredentialGovernanceDiagnosticPolicy(ServiceCredentialGovernanceConfigGroup{Key: "keep_in_env"}) {
		t.Fatalf("keep_in_env should not require bounded runtime policy")
	}
	if !missingRequiredServiceCredentialGovernanceDiagnosticPolicy(ServiceCredentialGovernanceConfigGroup{
		Key:                  "gateway_organization_projection",
		BoundedRuntimePolicy: map[string]interface{}{"timeoutMs": 1500, "freshnessTTLSeconds": 60},
	}) {
		t.Fatalf("gateway projection should require maxRetries policy")
	}
	if text := firstServiceCredentialGovernanceDiagnosticText("", "  "); text != "" {
		t.Fatalf("empty diagnostic text = %q, want empty", text)
	}
}

func serviceCredentialGovernanceDiagnosticGroupByKey(t *testing.T, groups []ServiceCredentialGovernanceDiagnosticGroup, key string) ServiceCredentialGovernanceDiagnosticGroup {
	t.Helper()
	for _, group := range groups {
		if group.Key == key {
			return group
		}
	}
	t.Fatalf("missing diagnostic group %q in %#v", key, groups)
	return ServiceCredentialGovernanceDiagnosticGroup{}
}
