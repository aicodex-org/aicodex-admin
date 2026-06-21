package controllers

import (
	"encoding/json"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

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

func TestGetApplicationAccessServiceCredentialGovernanceStatusReturnsReadOnlyEnvelope(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")
	t.Setenv("insightProviderAllowedIssuers", "https://issuer.example.invalid")
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")
	t.Setenv("gatewayOrganizationProjectionEnabled", "false")

	controller := newApplicationAccessServiceCredentialGovernanceStatusTestController()
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.GetApplicationAccessServiceCredentialGovernanceStatus()

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

func TestGetApplicationAccessServiceCredentialGovernanceStatusRequiresAdmin(t *testing.T) {
	controller := newApplicationAccessServiceCredentialGovernanceStatusTestController()

	controller.GetApplicationAccessServiceCredentialGovernanceStatus()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "Please login first") {
		t.Fatalf("response = %#v, want login required error", controller.Data["json"])
	}
}

func TestGetApplicationAccessServiceCredentialGovernanceStatusRejectsNonGlobalAdmin(t *testing.T) {
	controller := newApplicationAccessServiceCredentialGovernanceStatusTestController()
	controller.Ctx.Input.SetData("currentUserId", "tenant-a/operator")

	controller.GetApplicationAccessServiceCredentialGovernanceStatus()

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
