package object

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

type runtimeMaterialProviderFunc func(ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error)

func (f runtimeMaterialProviderFunc) ResolveServiceCredentialMaterial(request ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error) {
	return f(request)
}

func TestUsageIdentityRuntimeConfigResolvesLegacyAndSavedKeepInEnv(t *testing.T) {
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://resolver.example.invalid/v1/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-token")
	t.Setenv("insightUsageIdentityResolverCaller", "legacy-caller")
	t.Setenv("insightUsageIdentityResolverMaxItems", "73")
	t.Setenv("insightUsageIdentityResolverTimeoutMs", "2400")

	legacy := ResolveUsageIdentityResolverRuntimeConfig(nil, nil, nil)
	if !legacy.Resolution.Ready || legacy.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceLegacyEnvConfig {
		t.Fatalf("legacy resolution = %#v", legacy.Resolution)
	}
	if legacy.Endpoint == "" || legacy.Token == "" || legacy.Caller != "legacy-caller" || legacy.MaxItems != 73 || legacy.LookupTimeout != 2400*time.Millisecond {
		t.Fatalf("legacy config = %#v", legacy)
	}

	saved := ResolveUsageIdentityResolverRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       ServiceCredentialRuntimeGroupUsageIdentityResolver,
			Enabled:                   true,
			Owner:                     "admin_outbound_resolver",
			SourceClass:               "env_config",
			CredentialReferenceStatus: "external_secret",
			KeepInEnv:                 true,
			CallerPolicy:              "saved-caller",
			BoundedRuntimePolicy: map[string]interface{}{
				"maxItems":  31,
				"timeoutMs": 1800,
			},
		}},
	}, nil, nil)
	if !saved.Resolution.Ready || saved.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceSavedKeepInEnv {
		t.Fatalf("saved keep-in-env resolution = %#v", saved.Resolution)
	}
	if saved.Caller != "saved-caller" || saved.MaxItems != 31 || saved.LookupTimeout != 1800*time.Millisecond {
		t.Fatalf("saved keep-in-env config = %#v", saved)
	}
}

func TestUsageIdentityRuntimeConfigUsesManualOrSecretRefWithoutLegacyFallback(t *testing.T) {
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://legacy.example.invalid/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-token-must-not-win")

	for _, tc := range []struct {
		name        string
		sourceClass string
		wantSource  string
	}{
		{name: "manual", sourceClass: "admin_config", wantSource: ServiceCredentialRuntimeSourceSavedManual},
		{name: "secretRef", sourceClass: "external_secret_system", wantSource: ServiceCredentialRuntimeSourceSavedSecretRef},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var gotRequest ServiceCredentialMaterialRequest
			provider := runtimeMaterialProviderFunc(func(request ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error) {
				gotRequest = request
				return ServiceCredentialMaterial{Endpoint: "https://resolved.example.invalid/resolve", Token: "resolved-token"}, nil
			})
			config := ResolveUsageIdentityResolverRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
				IsConfigured: true,
				Groups: []ServiceCredentialGovernanceConfigGroup{{
					Key:                       ServiceCredentialRuntimeGroupUsageIdentityResolver,
					Enabled:                   true,
					Owner:                     "admin_outbound_resolver",
					SourceClass:               tc.sourceClass,
					CredentialReferenceStatus: "configured",
					CredentialReferenceKey:    "resolver-primary",
					CallerPolicy:              "saved-caller",
					BoundedRuntimePolicy: map[string]interface{}{
						"maxItems":  20,
						"timeoutMs": 1500,
					},
				}},
			}, nil, provider)

			if !config.Resolution.Ready || config.Resolution.AdoptedSource != tc.wantSource || config.Endpoint != "https://resolved.example.invalid/resolve" || config.Token != "resolved-token" {
				t.Fatalf("resolved config = %#v", config)
			}
			if gotRequest.ReferenceKey != "resolver-primary" || gotRequest.Source != tc.wantSource || gotRequest.GroupKey != ServiceCredentialRuntimeGroupUsageIdentityResolver {
				t.Fatalf("material request = %#v", gotRequest)
			}
		})
	}
}

func TestUsageIdentityRuntimeConfigFailsClosedForUnavailableDisabledUnresolvedAndInvalid(t *testing.T) {
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://legacy.example.invalid/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-token")

	unavailable := ResolveUsageIdentityResolverRuntimeConfig(nil, errors.New("private store detail"), nil)
	assertRuntimeResolutionBlocked(t, unavailable.Resolution, ServiceCredentialRuntimeBlockerSavedConfigUnavailable)
	if unavailable.Endpoint != "" || unavailable.Token != "" {
		t.Fatalf("saved unavailable leaked legacy material: %#v", unavailable)
	}

	disabled := ResolveUsageIdentityResolverRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups:       []ServiceCredentialGovernanceConfigGroup{{Key: ServiceCredentialRuntimeGroupUsageIdentityResolver, Enabled: false, SourceClass: "env_config"}},
	}, nil, nil)
	assertRuntimeResolutionBlocked(t, disabled.Resolution, ServiceCredentialRuntimeBlockerGroupDisabled)

	unresolved := ResolveUsageIdentityResolverRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       ServiceCredentialRuntimeGroupUsageIdentityResolver,
			Enabled:                   true,
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "resolver-primary",
			CallerPolicy:              "saved-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"maxItems": 20, "timeoutMs": 1500},
		}},
	}, nil, nil)
	assertRuntimeResolutionBlocked(t, unresolved.Resolution, ServiceCredentialRuntimeBlockerReferenceUnresolved)
	if !runtimeConfigStringContains(unresolved.Resolution.BlockedReasons, ServiceCredentialRuntimeBlockerLegacyDisabled) {
		t.Fatalf("unresolved blockers = %#v, want legacy disabled", unresolved.Resolution.BlockedReasons)
	}

	t.Setenv("insightUsageIdentityResolverEndpoint", "://invalid-private-url")
	t.Setenv("insightUsageIdentityResolverMaxItems", "not-a-number")
	invalid := ResolveUsageIdentityResolverRuntimeConfig(nil, nil, nil)
	assertRuntimeResolutionBlocked(t, invalid.Resolution, ServiceCredentialRuntimeBlockerInvalid)
}

func TestUsageIdentityRuntimeConfigKeepsLegacyNumericDefaultsAndNormalization(t *testing.T) {
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://legacy.example.invalid/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-token")
	t.Setenv("insightUsageIdentityResolverCaller", "")
	t.Setenv("insightUsageIdentityResolverMaxItems", "not-a-number")
	t.Setenv("insightUsageIdentityResolverTimeoutMs", "0")

	config := ResolveUsageIdentityResolverRuntimeConfig(nil, nil, nil)

	if !config.Resolution.Ready || config.Caller != usageIdentityResolverRuntimeDefaultCaller || config.MaxItems != usageIdentityResolverRuntimeDefaultMaxItems || config.LookupTimeout != time.Duration(usageIdentityResolverRuntimeDefaultTimeoutMs)*time.Millisecond {
		t.Fatalf("legacy defaults/normalization changed: %#v", config)
	}
}

func TestInsightProviderTrustRuntimeConfigKeepsLegacyUntilSavedPolicyIsExplicit(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-a,insight-b")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightProviderRequiredScopes", "insight.read")

	legacy := ResolveInsightProviderTrustRuntimeConfig(nil, nil)
	if !legacy.Resolution.Ready || legacy.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceLegacyEnvConfig || len(legacy.AllowedAudiences) != 2 {
		t.Fatalf("legacy trust config = %#v", legacy)
	}

	metadataOnly := ResolveInsightProviderTrustRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:         ServiceCredentialRuntimeGroupInsightProviderTrust,
			Enabled:     true,
			Owner:       "admin_provider_trust",
			SourceClass: "admin_config",
		}},
	}, nil)
	if metadataOnly.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceLegacyEnvConfig || !metadataOnly.Resolution.Ready {
		t.Fatalf("metadata-only trust config = %#v", metadataOnly)
	}

	saved := ResolveInsightProviderTrustRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:         ServiceCredentialRuntimeGroupInsightProviderTrust,
			Enabled:     true,
			Owner:       "admin_provider_trust",
			SourceClass: "admin_config",
			BoundedRuntimePolicy: map[string]interface{}{
				"allowedAudiences":     []string{"saved-audience"},
				"requiredScopes":       []string{"saved.scope"},
				"allowedIssuerDigests": []string{"sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"},
				"issuerMode":           "digest_allowlist",
			},
		}},
	}, nil)
	if !saved.Resolution.Ready || saved.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceSavedManual || len(saved.AllowedAudiences) != 1 || saved.AllowedAudiences[0] != "saved-audience" {
		t.Fatalf("saved trust config = %#v", saved)
	}
}

func TestInsightProviderTrustRuntimeConfigFailsClosed(t *testing.T) {
	unavailable := ResolveInsightProviderTrustRuntimeConfig(nil, errors.New("private store detail"))
	assertRuntimeResolutionBlocked(t, unavailable.Resolution, ServiceCredentialRuntimeBlockerSavedConfigUnavailable)

	disabled := ResolveInsightProviderTrustRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups:       []ServiceCredentialGovernanceConfigGroup{{Key: ServiceCredentialRuntimeGroupInsightProviderTrust, Enabled: false, SourceClass: "admin_config"}},
	}, nil)
	assertRuntimeResolutionBlocked(t, disabled.Resolution, ServiceCredentialRuntimeBlockerGroupDisabled)

	invalid := ResolveInsightProviderTrustRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                  ServiceCredentialRuntimeGroupInsightProviderTrust,
			Enabled:              true,
			SourceClass:          "admin_config",
			BoundedRuntimePolicy: map[string]interface{}{"allowedAudiences": 42, "issuerMode": "unsupported"},
		}},
	}, nil)
	assertRuntimeResolutionBlocked(t, invalid.Resolution, ServiceCredentialRuntimeBlockerInvalid)
}

func TestGatewayProjectionRuntimeConfigResolvesPublisherAndRefreshFromOneBoundary(t *testing.T) {
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.example.invalid/api/gateway-organization-projection/v1/batches")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://gateway.example.invalid/api/gateway-organization-projection/v1/status")
	t.Setenv("gatewayOrganizationProjectionToken", "gateway-token")
	t.Setenv("gatewayOrganizationProjectionCaller", "legacy-gateway-caller")
	t.Setenv("gatewayOrganizationProjectionTimeoutMs", "2200")
	t.Setenv("gatewayOrganizationProjectionFreshnessTTLSeconds", "1200")
	t.Setenv("gatewayOrganizationProjectionMaxRetries", "2")
	t.Setenv("gatewayOrganizationProjectionRefreshEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionRefreshIntervalSeconds", "300")
	t.Setenv("gatewayOrganizationProjectionRefreshInitialDelaySeconds", "5")
	t.Setenv("gatewayOrganizationProjectionRefreshBatchSize", "25")

	config := ResolveGatewayProjectionRuntimeConfig(nil, nil, nil)
	if !config.Resolution.Ready || config.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceLegacyEnvConfig {
		t.Fatalf("gateway resolution = %#v", config.Resolution)
	}
	if !config.Publisher.Enabled || config.Publisher.Endpoint == "" || config.Publisher.StatusEndpoint == "" || config.Publisher.Token == "" || config.Publisher.Caller != "legacy-gateway-caller" {
		t.Fatalf("gateway publisher = %#v", config.Publisher)
	}
	if !config.Refresh.Enabled || config.Refresh.Interval != 300*time.Second || config.Refresh.InitialDelay != 5*time.Second || config.Refresh.BatchSize != 25 {
		t.Fatalf("gateway refresh = %#v", config.Refresh)
	}
}

func TestGatewayProjectionRuntimeConfigUsesSavedSecretRefAndFailsClosedWithoutProvider(t *testing.T) {
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://legacy.example.invalid/batches")
	t.Setenv("gatewayOrganizationProjectionToken", "legacy-token-must-not-win")

	savedConfig := &ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       ServiceCredentialRuntimeGroupGatewayProjection,
			Enabled:                   true,
			Owner:                     "admin_gateway_projection_producer",
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "gateway-projection-primary",
			CallerPolicy:              "saved-gateway-caller",
			BoundedRuntimePolicy: map[string]interface{}{
				"timeoutMs":                  1700,
				"freshnessTTLSeconds":        900,
				"maxRetries":                 1,
				"refreshEnabled":             true,
				"refreshIntervalSeconds":     300,
				"refreshInitialDelaySeconds": 10,
				"refreshBatchSize":           40,
			},
		}},
	}
	provider := runtimeMaterialProviderFunc(func(request ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error) {
		return ServiceCredentialMaterial{
			Endpoint:       "https://resolved.example.invalid/batches",
			StatusEndpoint: "https://resolved.example.invalid/status",
			Token:          "resolved-token",
		}, nil
	})
	resolved := ResolveGatewayProjectionRuntimeConfig(savedConfig, nil, provider)
	if !resolved.Resolution.Ready || resolved.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceSavedSecretRef || resolved.Publisher.Endpoint != "https://resolved.example.invalid/batches" || resolved.Publisher.Token != "resolved-token" {
		t.Fatalf("saved gateway config = %#v", resolved)
	}
	if resolved.Publisher.Caller != "saved-gateway-caller" || resolved.Publisher.Timeout != 1700*time.Millisecond || resolved.Publisher.FreshnessTTL != 900*time.Second || resolved.Refresh.Interval != 300*time.Second {
		t.Fatalf("saved gateway policies = %#v / %#v", resolved.Publisher, resolved.Refresh)
	}

	unresolved := ResolveGatewayProjectionRuntimeConfig(savedConfig, nil, nil)
	assertRuntimeResolutionBlocked(t, unresolved.Resolution, ServiceCredentialRuntimeBlockerReferenceUnresolved)
	if unresolved.Publisher.Endpoint != "" || unresolved.Publisher.Token != "" {
		t.Fatalf("unresolved gateway config leaked legacy: %#v", unresolved.Publisher)
	}
}

func TestGatewayProjectionPathsShareTypedResolutionAndKeepStableAliases(t *testing.T) {
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://legacy.example.invalid/batches")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://legacy.example.invalid/status")
	t.Setenv("gatewayOrganizationProjectionToken", "legacy-token-must-not-win")
	withServiceCredentialRuntimePolicyConfigForTest(t, &ServiceCredentialGovernanceConfigResponse{
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       ServiceCredentialRuntimeGroupGatewayProjection,
			Enabled:                   true,
			Owner:                     "admin_gateway_projection_producer",
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "gateway-projection-primary",
			CallerPolicy:              "aicodex-admin",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500, "freshnessTTLSeconds": 900, "maxRetries": 1},
		}},
	})

	runtimeConfig := GetGatewayProjectionRuntimeConfig()
	if runtimeConfig.Resolution.AdoptedSource != ServiceCredentialRuntimeSourceSavedSecretRef || runtimeConfig.Resolution.ErrorCode != ServiceCredentialRuntimeBlockerReferenceUnresolved {
		t.Fatalf("gateway runtime resolution = %#v", runtimeConfig.Resolution)
	}
	if runtimeConfig.Publisher.Resolution.ErrorCode != runtimeConfig.Resolution.ErrorCode || runtimeConfig.Refresh.Resolution.ErrorCode != runtimeConfig.Resolution.ErrorCode {
		t.Fatalf("publisher/refresh did not share resolution: %#v / %#v", runtimeConfig.Publisher.Resolution, runtimeConfig.Refresh.Resolution)
	}
	if runtimeConfig.Refresh.Enabled || runtimeConfig.Refresh.DisabledReason != GatewayProjectionRefreshErrorInvalidConfig {
		t.Fatalf("refresh stable disabled alias changed: %#v", runtimeConfig.Refresh)
	}

	publish, err := (GatewayProjectionPublisher{Config: runtimeConfig.Publisher}).Publish(nil, GatewayProjectionBatchRequest{})
	if err == nil || publish.ErrorCode != GatewayProjectionPublishErrorInvalidConfig {
		t.Fatalf("publish stable alias = %#v/%v", publish, err)
	}
	status, err := (GatewayProjectionIngestionStatusService{Config: runtimeConfig.Publisher}).GetStatus(nil, GatewayProjectionIngestionStatusQuery{})
	if err == nil || status.ReasonCode != GatewayProjectionPublishErrorInvalidConfig {
		t.Fatalf("ingestion status stable alias = %#v/%v", status, err)
	}
	retry := buildGatewayProjectionRetrySummary(runtimeConfig.Publisher, GatewayProjectionSourceConnectionSummary{}, GatewayProjectionRunSubjectSummary{}, nil, GatewayProjectionRunDiffSummary{}, "", nil)
	if retry.Readiness != GatewayProjectionRetryReadinessFixPublisherConfig || !runtimeConfigStringContains(retry.Reasons, GatewayProjectionFailureProjectionTokenMissing) || !runtimeConfigStringContains(retry.Reasons, ServiceCredentialRuntimeBlockerReferenceUnresolved) {
		t.Fatalf("readiness aliases = %#v", retry)
	}
	observability := GetGatewayProjectionObservabilitySnapshot(time.Now())
	if observability.Publisher.DisabledReason != GatewayProjectionFailureProjectionTokenMissing || observability.Publisher.ErrorCode != ServiceCredentialRuntimeBlockerReferenceUnresolved || observability.Publisher.AdoptedSource != ServiceCredentialRuntimeSourceSavedSecretRef {
		t.Fatalf("observability aliases/resolution = %#v", observability.Publisher)
	}
}

func TestRuntimeConfigResolutionJsonIsCopySafe(t *testing.T) {
	config := ResolveUsageIdentityResolverRuntimeConfig(&ServiceCredentialGovernanceConfigResponse{
		IsConfigured: true,
		Groups: []ServiceCredentialGovernanceConfigGroup{{
			Key:                       ServiceCredentialRuntimeGroupUsageIdentityResolver,
			Enabled:                   true,
			Owner:                     "admin_outbound_resolver",
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "resolver-primary",
			CallerPolicy:              "saved-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"maxItems": 20, "timeoutMs": 1500},
		}},
	}, nil, runtimeMaterialProviderFunc(func(ServiceCredentialMaterialRequest) (ServiceCredentialMaterial, error) {
		return ServiceCredentialMaterial{Endpoint: "https://private.example.invalid/resolve", Token: "super-secret-token"}, nil
	}))

	body, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("marshal runtime config: %v", err)
	}
	text := string(body)
	for _, forbidden := range []string{"private.example.invalid", "super-secret-token", "endpoint", "token"} {
		if strings.Contains(strings.ToLower(text), strings.ToLower(forbidden)) {
			t.Fatalf("runtime config JSON leaked %q: %s", forbidden, text)
		}
	}
	for _, required := range []string{"saved_secret_ref", "resolver-primary", "admin_outbound_resolver"} {
		if !strings.Contains(text, required) {
			t.Fatalf("runtime config JSON missing copy-safe %q: %s", required, text)
		}
	}
}

func assertRuntimeResolutionBlocked(t *testing.T, resolution ServiceCredentialRuntimeResolution, blocker string) {
	t.Helper()
	if resolution.Ready || resolution.ErrorCode == "" || !runtimeConfigStringContains(resolution.BlockedReasons, blocker) {
		t.Fatalf("resolution = %#v, want blocker %q", resolution, blocker)
	}
}

func runtimeConfigStringContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
