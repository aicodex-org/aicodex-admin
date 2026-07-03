package controllers

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestBuildApplicationAccessServiceCredentialGovernanceStatusSanitizesRuntimeConfig(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAudience", "")
	t.Setenv("insightProviderAllowedIssuers", "")
	t.Setenv("insightProviderRequiredScopes", "")
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://resolver.internal.example.invalid/api/usage")
	t.Setenv("insightUsageIdentityResolverToken", "resolver-secret-value")
	t.Setenv("insightUsageIdentityResolverCaller", "admin-resolver")
	t.Setenv("insightUsageIdentityResolverMaxItems", "25")
	t.Setenv("insightUsageIdentityResolverTimeoutMs", "1500")
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://gateway.internal.example.invalid/api/status")
	t.Setenv("gatewayOrganizationProjectionToken", "")
	t.Setenv("gatewayOrganizationProjectionCaller", "admin-projection")
	t.Setenv("gatewayOrganizationProjectionTimeoutMs", "2500")
	t.Setenv("gatewayOrganizationProjectionFreshnessTTLSeconds", "1800")
	t.Setenv("gatewayOrganizationProjectionMaxRetries", "2")
	t.Setenv("gatewayOrganizationProjectionRefreshEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionRefreshIntervalSeconds", "600")
	t.Setenv("gatewayOrganizationProjectionRefreshInitialDelaySeconds", "30")
	t.Setenv("gatewayOrganizationProjectionRefreshBatchSize", "20")

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 3, 40, 0, 0, time.UTC))

	if status.GeneratedAt != "2026-06-21T03:40:00Z" {
		t.Fatalf("generatedAt = %q, want fixed UTC time", status.GeneratedAt)
	}
	if status.Source != "admin_runtime_config" {
		t.Fatalf("source = %q, want admin_runtime_config", status.Source)
	}
	groupKeys := []string{}
	for _, group := range status.Groups {
		groupKeys = append(groupKeys, group.Key)
	}
	wantKeys := []string{"insight_provider_trust", "usage_identity_resolver", "gateway_organization_projection", "keep_in_env"}
	if !reflect.DeepEqual(groupKeys, wantKeys) {
		t.Fatalf("group keys = %#v, want %#v", groupKeys, wantKeys)
	}

	trust := serviceCredentialGovernanceGroupByKey(t, status.Groups, "insight_provider_trust")
	if trust.Status != "partial" || !stringSliceContains(trust.MissingKeys, "insightProviderAllowedIssuers") {
		t.Fatalf("provider trust should be partial with issuer gap, got %#v", trust)
	}
	if trust.CredentialReferenceStatus != "not_applicable" {
		t.Fatalf("provider trust credential status = %q", trust.CredentialReferenceStatus)
	}

	resolver := serviceCredentialGovernanceGroupByKey(t, status.Groups, "usage_identity_resolver")
	if resolver.Status != "configured" || resolver.CredentialReferenceStatus != "configured" {
		t.Fatalf("resolver status mismatch: %#v", resolver)
	}
	if !stringSliceContains(resolver.ConfiguredKeys, "insightUsageIdentityResolverEndpoint") || !stringSliceContains(resolver.ConfiguredKeys, "insightUsageIdentityResolverToken") {
		t.Fatalf("resolver configured keys missing endpoint/token statuses: %#v", resolver.ConfiguredKeys)
	}
	if resolver.BoundedRuntimePolicy["maxItems"] != 25 || resolver.BoundedRuntimePolicy["timeoutMs"] != 1500 {
		t.Fatalf("resolver bounded runtime policy mismatch: %#v", resolver.BoundedRuntimePolicy)
	}

	projection := serviceCredentialGovernanceGroupByKey(t, status.Groups, "gateway_organization_projection")
	if projection.Status != "blocked" || projection.CredentialReferenceStatus != "missing" {
		t.Fatalf("gateway projection should be blocked by missing token, got %#v", projection)
	}
	if !stringSliceContains(projection.BlockedReasons, "gateway_projection_token_missing") {
		t.Fatalf("gateway projection blocked reasons missing token gap: %#v", projection.BlockedReasons)
	}
	if projection.BoundedRuntimePolicy["enabled"] != true || projection.BoundedRuntimePolicy["refreshBatchSize"] != 20 {
		t.Fatalf("gateway projection policy should expose bounded values only, got %#v", projection.BoundedRuntimePolicy)
	}

	keepInEnv := serviceCredentialGovernanceGroupByKey(t, status.Groups, "keep_in_env")
	if keepInEnv.Status != "configured" || keepInEnv.CredentialReferenceStatus != "external_secret" {
		t.Fatalf("keep-in-env status mismatch: %#v", keepInEnv)
	}
	if !stringSliceContains(keepInEnv.KeepInEnvKeys, "dataSourceName") || !stringSliceContains(keepInEnv.KeepInEnvKeys, "redisEndpoint") {
		t.Fatalf("keep-in-env keys should expose safe key names: %#v", keepInEnv.KeepInEnvKeys)
	}

	body, err := json.Marshal(status)
	if err != nil {
		t.Fatalf("marshal status: %v", err)
	}
	for _, forbidden := range []string{
		"resolver-secret-value",
		"gateway.internal.example.invalid",
		"resolver.internal.example.invalid",
		"Authorization",
		"Cookie",
		"clientSecret",
		"privateKey",
	} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("sanitized status leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusClassifiesMissingAndDisabledConfig(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "")
	t.Setenv("insightProviderAudience", "")
	t.Setenv("insightProviderAllowedIssuers", "")
	t.Setenv("insightProviderRequiredScopes", "")
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://resolver.internal.example.invalid/api/usage")
	t.Setenv("insightUsageIdentityResolverToken", "")
	t.Setenv("gatewayOrganizationProjectionEnabled", "")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "")
	t.Setenv("gatewayOrganizationProjectionToken", "")

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 4, 0, 0, 0, time.UTC))

	trust := serviceCredentialGovernanceGroupByKey(t, status.Groups, "insight_provider_trust")
	if trust.Status != "blocked" || !stringSliceContains(trust.BlockedReasons, "insight_provider_allowed_audiences_missing") {
		t.Fatalf("missing provider audience should fail closed, got %#v", trust)
	}

	resolver := serviceCredentialGovernanceGroupByKey(t, status.Groups, "usage_identity_resolver")
	if resolver.Status != "partial" || resolver.CredentialReferenceStatus != "missing" {
		t.Fatalf("resolver endpoint without token should be partial/missing credential, got %#v", resolver)
	}
	if !stringSliceContains(resolver.MissingKeys, "insightUsageIdentityResolverToken") {
		t.Fatalf("resolver missing keys should include token: %#v", resolver.MissingKeys)
	}

	projection := serviceCredentialGovernanceGroupByKey(t, status.Groups, "gateway_organization_projection")
	if projection.Status != "not_applicable" {
		t.Fatalf("disabled gateway projection should be not_applicable, got %#v", projection)
	}
}

func TestGetInsightAdminProviderHandoffStatusReturnsReadOnlyEnvelope(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")
	t.Setenv("gatewayOrganizationProjectionEnabled", "false")

	controller := newInsightAdminProviderHandoffStatusTestController()
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.GetInsightAdminProviderHandoffStatus()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "ok" {
		t.Fatalf("response = %#v, want ok response", controller.Data["json"])
	}
	status, ok := resp.Data.(ServiceCredentialGovernanceStatusResponse)
	if !ok {
		t.Fatalf("response data = %#v, want ServiceCredentialGovernanceStatusResponse", resp.Data)
	}
	if status.Source != "admin_runtime_config" || len(status.Groups) != 4 {
		t.Fatalf("status = %#v, want runtime source and four governance groups", status)
	}
}

func TestGetInsightAdminProviderHandoffStatusRequiresAdmin(t *testing.T) {
	controller := newInsightAdminProviderHandoffStatusTestController()

	controller.GetInsightAdminProviderHandoffStatus()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "Please login first") {
		t.Fatalf("response = %#v, want login required error", controller.Data["json"])
	}
}

func TestGetInsightAdminProviderHandoffStatusRejectsNonGlobalAdmin(t *testing.T) {
	controller := newInsightAdminProviderHandoffStatusTestController()
	controller.Ctx.Input.SetData("currentUserId", "tenant-a/operator")

	controller.GetInsightAdminProviderHandoffStatus()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "administrator") {
		t.Fatalf("response = %#v, want administrator required error", controller.Data["json"])
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusUsesCurrentTimeForZeroGeneratedAt(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "")
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")
	t.Setenv("gatewayOrganizationProjectionEnabled", "")

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Time{})

	if status.GeneratedAt == "" {
		t.Fatalf("generatedAt should be populated for zero time")
	}
	parsed, err := time.Parse(time.RFC3339, status.GeneratedAt)
	if err != nil {
		t.Fatalf("generatedAt = %q, want RFC3339 time: %v", status.GeneratedAt, err)
	}
	if parsed.IsZero() {
		t.Fatalf("generatedAt = %q, want non-zero time", status.GeneratedAt)
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusClassifiesGatewayProjectionConfiguredAndPartial(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://gateway.internal.example.invalid/api/status")
	t.Setenv("gatewayOrganizationProjectionToken", "projection-secret-value")
	t.Setenv("gatewayOrganizationProjectionCaller", "admin-projection")
	t.Setenv("gatewayOrganizationProjectionTimeoutMs", "2500")
	t.Setenv("gatewayOrganizationProjectionFreshnessTTLSeconds", "1800")
	t.Setenv("gatewayOrganizationProjectionMaxRetries", "2")
	t.Setenv("gatewayOrganizationProjectionRefreshEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionRefreshIntervalSeconds", "600")
	t.Setenv("gatewayOrganizationProjectionRefreshInitialDelaySeconds", "30")
	t.Setenv("gatewayOrganizationProjectionRefreshBatchSize", "20")

	configured := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 5, 0, 0, 0, time.UTC))
	configuredProjection := serviceCredentialGovernanceGroupByKey(t, configured.Groups, "gateway_organization_projection")
	if configuredProjection.Status != "configured" || configuredProjection.CredentialReferenceStatus != "configured" {
		t.Fatalf("gateway projection should be configured with token reference, got %#v", configuredProjection)
	}
	if len(configuredProjection.BlockedReasons) != 0 || !stringSliceContains(configuredProjection.ConfiguredKeys, "gatewayOrganizationProjectionStatusEndpoint") {
		t.Fatalf("configured projection should expose configured key names without blocked reasons, got %#v", configuredProjection)
	}

	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "")
	partial := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 5, 5, 0, 0, time.UTC))
	partialProjection := serviceCredentialGovernanceGroupByKey(t, partial.Groups, "gateway_organization_projection")
	if partialProjection.Status != "partial" || partialProjection.CredentialReferenceStatus != "configured" {
		t.Fatalf("gateway projection should be partial when only status endpoint is missing, got %#v", partialProjection)
	}
	if !stringSliceContains(partialProjection.BlockedReasons, "gateway_projection_status_endpoint_missing") {
		t.Fatalf("partial projection should expose status endpoint gap reason, got %#v", partialProjection.BlockedReasons)
	}

	body, err := json.Marshal(partialProjection)
	if err != nil {
		t.Fatalf("marshal partial projection: %v", err)
	}
	for _, forbidden := range []string{"projection-secret-value", "gateway.internal.example.invalid"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("gateway projection status leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusOverlaysSavedEnabledConfig(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "")
	t.Setenv("gatewayOrganizationProjectionToken", "")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{
		{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "vault:usage-identity-resolver",
			CallerPolicy:              "saved-resolver-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1600.0, "maxItems": 40.0},
			RemediationRoute:          "/platform-api-mappings",
			NextAction:                "核对 resolver 外部 secret 引用",
			BlockedReasons:            []string{"operator_reviewed_reference"},
		},
		{
			Key:                       "gateway_organization_projection",
			Enabled:                   true,
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "config:gateway-projection-publisher",
			CallerPolicy:              "saved-projection-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2600.0, "maxRetries": 2.0, "refreshBatchSize": 30.0},
			RemediationRoute:          "/platform-api-mappings",
			NextAction:                "核对 Gateway projection 发布凭据引用",
		},
	})

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 8, 0, 0, 0, time.UTC))

	resolver := serviceCredentialGovernanceGroupByKey(t, status.Groups, "usage_identity_resolver")
	if resolver.Status != "blocked" || resolver.CredentialReferenceStatus != "external_secret" || !stringSliceContains(resolver.BlockedReasons, "admin_service_credential_reference_unresolved") {
		t.Fatalf("resolver should expose unresolved saved external secret reference, got %#v", resolver)
	}
	if resolver.CallerPolicy != "saved-resolver-caller" || resolver.BoundedRuntimePolicy["timeoutMs"] != float64(1600) {
		t.Fatalf("resolver should use saved caller and bounded policy, got %#v", resolver)
	}
	if resolver.NextAction != "核对 resolver 外部 secret 引用" {
		t.Fatalf("resolver should expose saved next action, got %#v", resolver)
	}
	if !stringSliceContains(resolver.ConfiguredKeys, "vault:usage-identity-resolver") || !stringSliceContains(resolver.BlockedReasons, "operator_reviewed_reference") {
		t.Fatalf("resolver should expose saved safe reference key and reason, got %#v", resolver)
	}

	projection := serviceCredentialGovernanceGroupByKey(t, status.Groups, "gateway_organization_projection")
	if projection.Status != "blocked" || projection.CredentialReferenceStatus != "configured" || !stringSliceContains(projection.BlockedReasons, "admin_service_credential_reference_unresolved") {
		t.Fatalf("projection should expose unresolved saved configured reference, got %#v", projection)
	}
	if projection.CallerPolicy != "saved-projection-caller" || projection.BoundedRuntimePolicy["refreshBatchSize"] != float64(30) {
		t.Fatalf("projection should use saved caller and bounded policy, got %#v", projection)
	}

	body, err := json.Marshal(status)
	if err != nil {
		t.Fatalf("marshal overlaid status: %v", err)
	}
	for _, forbidden := range []string{"resolver-secret-value", "gateway.internal.example.invalid", "Authorization", "Cookie", "clientSecret", "privateKey"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("overlaid status leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusUsesSavedInsightProviderTrustPolicy(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "legacy-client")
	t.Setenv("insightProviderAllowedIssuers", "legacy-issuer")
	t.Setenv("insightProviderRequiredScopes", "legacy.scope")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:         "insight_provider_trust",
		Enabled:     true,
		SourceClass: "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{
			"allowedAudiences":     []string{"saved-client"},
			"requiredScopes":       []string{"saved.scope"},
			"allowedIssuerDigests": []string{testInsightIssuerDigest("saved-issuer")},
			"issuerMode":           "digest_allowlist",
		},
		RemediationRoute: "/providers",
	}})

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 9, 0, 0, 0, time.UTC))

	trust := serviceCredentialGovernanceGroupByKey(t, status.Groups, "insight_provider_trust")
	if trust.Status != "configured" || trust.BoundedRuntimePolicy["source"] != "saved_runtime_policy" {
		t.Fatalf("trust should use saved runtime policy source, got %#v", trust)
	}
	if trust.BoundedRuntimePolicy["allowedAudienceCount"] != 1 || trust.BoundedRuntimePolicy["allowedIssuerDigestCount"] != 1 || trust.BoundedRuntimePolicy["requiredScopeCount"] != 1 {
		t.Fatalf("trust should expose saved counts, got %#v", trust.BoundedRuntimePolicy)
	}
	if trust.BoundedRuntimePolicy["requiredScopesDefaulted"] != false || trust.BoundedRuntimePolicy["cannotInfer"] != false {
		t.Fatalf("trust should expose defaulted/cannotInfer=false, got %#v", trust.BoundedRuntimePolicy)
	}
	if !stringSliceContains(trust.ConfiguredKeys, "allowedIssuerDigests:1") {
		t.Fatalf("trust should expose digest count key only, got %#v", trust.ConfiguredKeys)
	}
	body, err := json.Marshal(status)
	if err != nil {
		t.Fatalf("marshal saved trust status: %v", err)
	}
	for _, forbidden := range []string{"saved-issuer", "legacy-issuer", "https://", "Authorization", "Cookie", "clientSecret", "privateKey"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("saved trust status leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusSavedInsightProviderTrustDisabled(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "legacy-client")
	t.Setenv("insightProviderAllowedIssuers", "legacy-issuer")
	t.Setenv("insightProviderRequiredScopes", "legacy.scope")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:                  "insight_provider_trust",
		Enabled:              false,
		SourceClass:          "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{"allowedAudiences": []string{"saved-client"}, "requiredScopes": []string{"saved.scope"}, "allowedIssuerDigests": []string{testInsightIssuerDigest("saved-issuer")}, "issuerMode": "digest_allowlist"},
		RemediationRoute:     "/providers",
	}})

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 9, 5, 0, 0, time.UTC))

	trust := serviceCredentialGovernanceGroupByKey(t, status.Groups, "insight_provider_trust")
	if trust.Status != "blocked" || !stringSliceContains(trust.BlockedReasons, "insight_provider_saved_trust_policy_disabled") {
		t.Fatalf("disabled trust policy should fail closed, got %#v", trust)
	}
	if stringSliceContains(trust.ConfiguredKeys, "insightProviderAllowedAudiences") || stringSliceContains(trust.ConfiguredKeys, "insightProviderAllowedIssuers") {
		t.Fatalf("disabled trust policy should not report legacy readiness, got %#v", trust.ConfiguredKeys)
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusSavedInsightProviderTrustGapsAndCannotInfer(t *testing.T) {
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:         "insight_provider_trust",
		Enabled:     true,
		SourceClass: "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{
			"issuerMode": "any_non_empty",
		},
		RemediationRoute: "/providers",
	}})

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 9, 10, 0, 0, time.UTC))

	trust := serviceCredentialGovernanceGroupByKey(t, status.Groups, "insight_provider_trust")
	if trust.Status != "blocked" || !stringSliceContains(trust.BlockedReasons, "insight_provider_allowed_audiences_missing") {
		t.Fatalf("trust missing saved audiences should be blocked, got %#v", trust)
	}
	if trust.BoundedRuntimePolicy["issuerMode"] != "any_non_empty" || trust.BoundedRuntimePolicy["cannotInfer"] != true {
		t.Fatalf("trust should expose cannotInfer for any_non_empty, got %#v", trust.BoundedRuntimePolicy)
	}
	if !stringSliceContains(trust.ConfiguredKeys, "issuerMode:any_non_empty") {
		t.Fatalf("trust should expose safe issuer mode key, got %#v", trust.ConfiguredKeys)
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusDisablesSavedConfigFailClosed(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://resolver.internal.example.invalid/api/usage")
	t.Setenv("insightUsageIdentityResolverToken", "resolver-secret-value")
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionStatusEndpoint", "https://gateway.internal.example.invalid/api/status")
	t.Setenv("gatewayOrganizationProjectionToken", "projection-secret-value")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{
		{
			Key:                       "usage_identity_resolver",
			Enabled:                   false,
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "vault:usage-identity-resolver",
			CallerPolicy:              "saved-resolver-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1600.0},
			RemediationRoute:          "/platform-api-mappings",
		},
		{
			Key:                       "gateway_organization_projection",
			Enabled:                   false,
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "config:gateway-projection-publisher",
			CallerPolicy:              "saved-projection-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2600.0},
			RemediationRoute:          "/platform-api-mappings",
		},
	})

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 8, 10, 0, 0, time.UTC))

	for _, key := range []string{"usage_identity_resolver", "gateway_organization_projection"} {
		group := serviceCredentialGovernanceGroupByKey(t, status.Groups, key)
		if group.Status != "blocked" || !stringSliceContains(group.BlockedReasons, "admin_service_credential_group_disabled") {
			t.Fatalf("%s should fail closed when saved config is disabled, got %#v", key, group)
		}
		for _, configuredKey := range []string{"insightUsageIdentityResolverToken", "gatewayOrganizationProjectionToken"} {
			if stringSliceContains(group.ConfiguredKeys, configuredKey) {
				t.Fatalf("%s should not report legacy token readiness when disabled: %#v", key, group.ConfiguredKeys)
			}
		}
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusClassifiesSavedConfigGaps(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://resolver.internal.example.invalid/api/usage")
	t.Setenv("insightUsageIdentityResolverToken", "resolver-secret-value")
	t.Setenv("gatewayOrganizationProjectionEnabled", "true")
	t.Setenv("gatewayOrganizationProjectionEndpoint", "https://gateway.internal.example.invalid/api/projection")
	t.Setenv("gatewayOrganizationProjectionToken", "projection-secret-value")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{
		{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "missing",
			CallerPolicy:              "saved-resolver-caller",
			RemediationRoute:          "/platform-api-mappings",
		},
		{
			Key:                       "gateway_organization_projection",
			Enabled:                   true,
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "config:gateway-projection-publisher",
			CallerPolicy:              "saved-projection-caller",
			RemediationRoute:          "/platform-api-mappings",
		},
	})

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 8, 20, 0, 0, time.UTC))

	resolver := serviceCredentialGovernanceGroupByKey(t, status.Groups, "usage_identity_resolver")
	if resolver.Status != "blocked" || resolver.CredentialReferenceStatus != "missing" {
		t.Fatalf("resolver missing saved reference should be blocked, got %#v", resolver)
	}
	if !stringSliceContains(resolver.BlockedReasons, "admin_service_credential_reference_missing") {
		t.Fatalf("resolver should expose stable reference gap reason: %#v", resolver.BlockedReasons)
	}

	projection := serviceCredentialGovernanceGroupByKey(t, status.Groups, "gateway_organization_projection")
	if projection.Status != "blocked" || !stringSliceContains(projection.BlockedReasons, "admin_service_credential_reference_unresolved") || !stringSliceContains(projection.BlockedReasons, "admin_service_credential_bounded_policy_missing") {
		t.Fatalf("projection unresolved saved reference and missing bounded policy should be blocked, got %#v", projection)
	}
}

func TestServiceCredentialGovernanceRuntimeRequiredPolicyKeys(t *testing.T) {
	if got := serviceCredentialGovernanceRuntimeRequiredPolicyKeys("usage_identity_resolver"); len(got) != 2 || got[0] != "timeoutMs" || got[1] != "maxItems" {
		t.Fatalf("usage resolver required policy keys mismatch: %#v", got)
	}
	if got := serviceCredentialGovernanceRuntimeRequiredPolicyKeys("gateway_organization_projection"); len(got) != 3 || got[0] != "timeoutMs" || got[1] != "freshnessTTLSeconds" || got[2] != "maxRetries" {
		t.Fatalf("gateway projection required policy keys mismatch: %#v", got)
	}
	if got := serviceCredentialGovernanceRuntimeRequiredPolicyKeys("keep_in_env"); got != nil {
		t.Fatalf("unknown runtime policy keys should be nil, got %#v", got)
	}
}

func TestGetInsightAdminProviderHandoffStatusReturnsConfigStoreError(t *testing.T) {
	storeErr := errors.New("metadata store unavailable")
	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{
			Store: &memoryServiceCredentialGovernanceConfigStore{err: storeErr},
		}
	}
	defer func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	}()

	controller := newInsightAdminProviderHandoffStatusTestController()
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")
	controller.GetInsightAdminProviderHandoffStatus()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, storeErr.Error()) {
		t.Fatalf("response = %#v, want config store error", controller.Data["json"])
	}
}

func TestGetApplicationAccessServiceCredentialGovernanceStatusRejectsLegacyEndpoint(t *testing.T) {
	controller := newApplicationAccessServiceCredentialGovernanceStatusTestController()
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.GetApplicationAccessServiceCredentialGovernanceStatus()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "/api/insight-admin-provider/handoff/status") {
		t.Fatalf("response = %#v, want deprecated endpoint error with new handoff path", controller.Data["json"])
	}
}

func TestBuildApplicationAccessServiceCredentialGovernanceStatusFallsBackToLegacyOnConfigStoreError(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://resolver.internal.example.invalid/api/usage")
	t.Setenv("insightUsageIdentityResolverToken", "resolver-secret-value")
	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{
			Store: &memoryServiceCredentialGovernanceConfigStore{err: errors.New("metadata store unavailable")},
		}
	}
	defer func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	}()

	status := buildApplicationAccessServiceCredentialGovernanceStatus(time.Date(2026, 6, 21, 8, 30, 0, 0, time.UTC))

	resolver := serviceCredentialGovernanceGroupByKey(t, status.Groups, "usage_identity_resolver")
	if resolver.Status != "configured" || resolver.CredentialReferenceStatus != "configured" {
		t.Fatalf("legacy helper should preserve legacy fallback on config store error, got %#v", resolver)
	}
}

func serviceCredentialGovernanceGroupByKey(t *testing.T, groups []ServiceCredentialGovernanceStatusGroup, key string) ServiceCredentialGovernanceStatusGroup {
	t.Helper()
	for _, group := range groups {
		if group.Key == key {
			return group
		}
	}
	t.Fatalf("group %q not found in %#v", key, groups)
	return ServiceCredentialGovernanceStatusGroup{}
}

func stringSliceContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func newApplicationAccessServiceCredentialGovernanceStatusTestController() *ApiController {
	request := httptest.NewRequest("GET", "/api/application-access/service-credential-governance-status", nil)
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "GetApplicationAccessServiceCredentialGovernanceStatus", controller)
	controller.Ctx.Input.SetData("currentUserId", "")
	return controller
}

func newInsightAdminProviderHandoffStatusTestController() *ApiController {
	request := httptest.NewRequest("GET", "/api/insight-admin-provider/handoff/status", nil)
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "GetInsightAdminProviderHandoffStatus", controller)
	controller.Ctx.Input.SetData("currentUserId", "")
	return controller
}

func withServiceCredentialGovernanceStatusConfig(t *testing.T, groups []object.ServiceCredentialGovernanceConfigGroup) {
	t.Helper()
	store := &memoryServiceCredentialGovernanceConfigStore{}
	service := &object.ServiceCredentialGovernanceConfigService{
		Store: store,
		Now:   func() time.Time { return time.Date(2026, 6, 21, 7, 30, 0, 0, time.UTC) },
	}
	if _, _, err := service.SaveConfig(&object.ServiceCredentialGovernanceConfigResponse{Groups: groups}); err != nil {
		t.Fatalf("save test governance config: %v", err)
	}
	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{Store: store}
	}
	t.Cleanup(func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	})
}
