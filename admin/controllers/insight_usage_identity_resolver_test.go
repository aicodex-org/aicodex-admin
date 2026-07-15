package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

type insightUsageIdentityResolverRoundTripFunc func(req *http.Request) (*http.Response, error)

func (f insightUsageIdentityResolverRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestInsightUsageIdentityResolverConfigDisabledWhenMissingEndpointOrToken(t *testing.T) {
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "secret")
	if _, ok := getInsightUsageIdentityResolverConfig(); ok {
		t.Fatalf("resolver should be disabled when endpoint is missing")
	}

	t.Setenv("insightUsageIdentityResolverEndpoint", "https://api.example.test/api/usage-identity-provider/v1/wecom/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "")
	if _, ok := getInsightUsageIdentityResolverConfig(); ok {
		t.Fatalf("resolver should be disabled when token is missing")
	}
}

func TestInsightUsageIdentityResolverConfigFallsBackWithoutSavedGovernanceConfig(t *testing.T) {
	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, nil)
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://api.example.test/api/usage-identity-provider/v1/wecom/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")
	t.Setenv("insightUsageIdentityResolverCaller", "legacy-resolver-caller")
	t.Setenv("insightUsageIdentityResolverMaxItems", "12")
	t.Setenv("insightUsageIdentityResolverTimeoutMs", "1300")

	config, ok := getInsightUsageIdentityResolverConfig()

	if !ok {
		t.Fatalf("resolver should use legacy config when no saved governance config exists")
	}
	if config.Resolution.AdoptedSource != object.ServiceCredentialRuntimeSourceLegacyEnvConfig {
		t.Fatalf("legacy resolver source = %#v", config.Resolution)
	}
	if config.Caller != "legacy-resolver-caller" || config.MaxItems != 12 || config.LookupTimeout != 1300*time.Millisecond {
		t.Fatalf("legacy resolver config mismatch: %#v", config)
	}
}

func TestInsightUsageIdentityResolverConfigSavedDisabledDoesNotUseLegacy(t *testing.T) {
	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, &object.ServiceCredentialGovernanceConfigResponse{
		Groups: []object.ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   false,
			SourceClass:               "env_config",
			CredentialReferenceStatus: "configured",
			CallerPolicy:              "saved-resolver-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1200.0, "maxItems": 25.0},
		}},
	})
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://api.example.test/api/usage-identity-provider/v1/wecom/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	if config, ok := getInsightUsageIdentityResolverConfig(); ok {
		t.Fatalf("saved disabled resolver policy must fail closed without legacy fallback: %#v", config)
	}
}

func TestInsightUsageIdentityResolverConfigSavedExternalReferenceDoesNotFallbackLegacy(t *testing.T) {
	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, &object.ServiceCredentialGovernanceConfigResponse{
		Groups: []object.ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			SourceClass:               "external_secret_system",
			CredentialReferenceStatus: "external_secret",
			CredentialReferenceKey:    "vault:usage-identity-resolver",
			CallerPolicy:              "saved-resolver-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1200.0, "maxItems": 25.0},
		}},
	})
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://api.example.test/api/usage-identity-provider/v1/wecom/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	if config, ok := getInsightUsageIdentityResolverConfig(); ok {
		t.Fatalf("unresolved saved external resolver reference must not fall back to legacy: %#v", config)
	}
}

func TestInsightUsageIdentityResolverConfigSavedEnvPolicyOverlaysLegacyBounds(t *testing.T) {
	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, &object.ServiceCredentialGovernanceConfigResponse{
		Groups: []object.ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			SourceClass:               "env_config",
			CredentialReferenceStatus: "configured",
			KeepInEnv:                 true,
			CallerPolicy:              "saved-resolver-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1200.0, "maxItems": 25.0},
		}},
	})
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://api.example.test/api/usage-identity-provider/v1/wecom/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")
	t.Setenv("insightUsageIdentityResolverCaller", "legacy-resolver-caller")
	t.Setenv("insightUsageIdentityResolverMaxItems", "200")
	t.Setenv("insightUsageIdentityResolverTimeoutMs", "5000")

	config, ok := getInsightUsageIdentityResolverConfig()

	if !ok {
		t.Fatalf("saved env_config resolver policy should allow legacy credentials")
	}
	if config.Resolution.AdoptedSource != object.ServiceCredentialRuntimeSourceSavedKeepInEnv {
		t.Fatalf("saved resolver source = %#v", config.Resolution)
	}
	if config.Caller != "saved-resolver-caller" || config.MaxItems != 25 || config.LookupTimeout != 1200*time.Millisecond {
		t.Fatalf("saved bounded resolver policy should overlay legacy defaults: %#v", config)
	}
}

func TestInsightUsageIdentityResolverConfigStoreErrorFailsClosedWithStableBlocker(t *testing.T) {
	original := insightUsageIdentityResolverRuntimePolicyConfigLoader
	insightUsageIdentityResolverRuntimePolicyConfigLoader = func() (*object.ServiceCredentialGovernanceConfigResponse, error) {
		return nil, errors.New("private metadata store detail")
	}
	t.Cleanup(func() {
		insightUsageIdentityResolverRuntimePolicyConfigLoader = original
	})
	t.Setenv("insightUsageIdentityResolverEndpoint", "https://legacy.example.invalid/resolve")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-token")

	config, ok := getInsightUsageIdentityResolverConfig()

	if ok || config.Resolution.ErrorCode != object.ServiceCredentialRuntimeBlockerSavedConfigUnavailable {
		t.Fatalf("store error config = %#v/%t", config, ok)
	}
	if config.Endpoint != "" || config.Token != "" {
		t.Fatalf("store error must not retain legacy material: %#v", config)
	}
}

func TestInsightUsageIdentityResolverClientSendsBearerTokenAndDecodesStatuses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer identity-secret" {
			t.Fatalf("Authorization = %q, want bearer token", r.Header.Get("Authorization"))
		}
		var req insightUsageIdentityResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode request failed: %v", err)
		}
		if req.Caller != "aicodex-admin" || len(req.Items) != 2 {
			t.Fatalf("unexpected request: %+v", req)
		}
		_ = json.NewEncoder(w).Encode(insightUsageIdentityResolveEnvelope{
			Success: true,
			TraceId: req.TraceId,
			Data: insightUsageIdentityResolveResponse{Results: []insightUsageIdentityResolveResult{
				{RequestId: "u1", MappingStatus: MappingStatusOK, ApiUserId: 101},
				{RequestId: "u2", MappingStatus: MappingStatusMissing},
			}},
		})
	}))
	defer server.Close()

	resolver := insightUsageIdentityHTTPResolver{config: insightUsageIdentityResolverConfig{
		Endpoint:      server.URL,
		Token:         "identity-secret",
		Caller:        "aicodex-admin",
		MaxItems:      50,
		LookupTimeout: time.Second,
	}}
	results, providerErr := resolver.Resolve("trace-client-test", []insightUsageIdentityResolveItem{
		{RequestId: "u1", AdminSubject: "subject-1"},
		{RequestId: "u2", AdminSubject: "subject-2"},
	})
	if providerErr != nil {
		t.Fatalf("Resolve returned provider error: %+v", providerErr)
	}
	if len(results) != 2 || results[0].ApiUserId != 101 || results[1].MappingStatus != MappingStatusMissing {
		t.Fatalf("unexpected results: %+v", results)
	}
}

func withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t *testing.T, config *object.ServiceCredentialGovernanceConfigResponse) {
	t.Helper()
	store := &memoryServiceCredentialGovernanceConfigStore{}
	service := &object.ServiceCredentialGovernanceConfigService{Store: store}
	if config != nil {
		if _, _, err := service.SaveConfig(config); err != nil {
			t.Fatalf("SaveConfig() error = %v", err)
		}
	}
	original := insightUsageIdentityResolverRuntimePolicyConfigLoader
	insightUsageIdentityResolverRuntimePolicyConfigLoader = service.GetConfig
	t.Cleanup(func() {
		insightUsageIdentityResolverRuntimePolicyConfigLoader = original
	})
}

func TestInsightUsageIdentityResolverClientReturnsUnavailableForProtocolError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"success":false,"error":{"code":"UNAVAILABLE","message":"bad gateway"}}`))
	}))
	defer server.Close()

	resolver := insightUsageIdentityHTTPResolver{config: insightUsageIdentityResolverConfig{
		Endpoint:      server.URL,
		Token:         "identity-secret",
		Caller:        "aicodex-admin",
		MaxItems:      50,
		LookupTimeout: time.Second,
	}}
	results, providerErr := resolver.Resolve("trace-client-test", []insightUsageIdentityResolveItem{
		{RequestId: "u1", AdminSubject: "subject-1"},
	})
	if len(results) != 0 {
		t.Fatalf("results = %+v, want none for protocol error", results)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want PROVIDER_UNAVAILABLE", providerErr)
	}
}

func TestInsightUsageIdentityResolverClientRetriesTransportErrorOnce(t *testing.T) {
	calls := 0
	resolver := insightUsageIdentityHTTPResolver{
		config: insightUsageIdentityResolverConfig{
			Endpoint:      "http://api.example.test/api/usage-identity-provider/v1/wecom/resolve",
			Token:         "identity-secret",
			Caller:        "aicodex-admin",
			MaxItems:      50,
			LookupTimeout: time.Second,
		},
		client: &http.Client{Transport: insightUsageIdentityResolverRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			calls++
			if calls == 1 {
				return nil, errors.New("simulated EOF")
			}
			if !req.Close {
				t.Fatalf("req.Close = false, want true to avoid reusing stale provider connections")
			}
			var body insightUsageIdentityResolveRequest
			if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
				t.Fatalf("decode retry request failed: %v", err)
			}
			responseBody := bytes.NewBuffer(nil)
			_ = json.NewEncoder(responseBody).Encode(insightUsageIdentityResolveEnvelope{
				Success: true,
				TraceId: body.TraceId,
				Data: insightUsageIdentityResolveResponse{Results: []insightUsageIdentityResolveResult{
					{RequestId: "u1", MappingStatus: MappingStatusOK, ApiUserId: 101},
				}},
			})
			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body:       io.NopCloser(responseBody),
				Request:    req,
			}, nil
		})},
	}

	results, providerErr := resolver.Resolve("trace-client-retry", []insightUsageIdentityResolveItem{
		{RequestId: "u1", AdminSubject: "subject-1"},
	})
	if providerErr != nil {
		t.Fatalf("Resolve returned provider error after retry: %+v", providerErr)
	}
	if calls != 2 {
		t.Fatalf("calls = %d, want retry once", calls)
	}
	if len(results) != 1 || results[0].ApiUserId != 101 {
		t.Fatalf("unexpected results: %+v", results)
	}
}

func TestInsightCurrentUserRequiresFirstClassMappingWhenExternalIdentityExists(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	user := &object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}

	got, providerErr := buildInsightCurrentUserResponseWithTrace(user, nil, nil, generatedAt, "trace-current-user")
	if providerErr != nil {
		t.Fatalf("buildInsightCurrentUserResponseWithTrace returned error: %+v", providerErr)
	}
	if got.UsageIdentity.ApiUserId != "" || got.UsageIdentity.MappingStatus != MappingStatusMissing || got.UsageIdentity.MappingSource != "" {
		t.Fatalf("UsageIdentity = %+v, want missing first-class mapping", got.UsageIdentity)
	}
	if got.UsageIdentity.SourceConnectionId != object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123") || got.UsageIdentity.SourceType != object.SourceTypeWecom || got.UsageIdentity.ExternalSubjectId != "huangfanli" {
		t.Fatalf("source identity = %+v, want source metadata without api user fallback", got.UsageIdentity)
	}
}

func TestInsightUsageIdentityResolveItemPrefersWecomMappingExternalID(t *testing.T) {
	original := getInsightWecomUserMappingFunc
	getInsightWecomUserMappingFunc = func(organization string, corpId string, wecomUserId string) (*object.WecomUserMapping, error) {
		if organization != "org-a" || corpId != "ww123" || wecomUserId != "huangfanli" {
			t.Fatalf("mapping lookup = %s/%s/%s", organization, corpId, wecomUserId)
		}
		return &object.WecomUserMapping{ExternalId: "wecom:ww123:external-from-mapping", IsEnabled: true}, nil
	}
	t.Cleanup(func() { getInsightWecomUserMappingFunc = original })

	item, ok := buildInsightUsageIdentityResolveItem(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	})
	if !ok {
		t.Fatalf("expected resolver item")
	}
	if item.WecomExternalId != "wecom:ww123:external-from-mapping" {
		t.Fatalf("WecomExternalId = %q, want mapping external id", item.WecomExternalId)
	}
	if item.SourceConnectionId != object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123") || item.ExternalSubjectId != "huangfanli" {
		t.Fatalf("source-neutral resolver item = %+v", item)
	}
}

func TestInsightUsageIdentityResolveItemRejectsNonConfirmedExternalIdentityStatus(t *testing.T) {
	item, ok := buildInsightUsageIdentityResolveItem(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId:  "ww123",
			object.WecomUserPropertyUserId:  "huangfanli",
			"externalIdentityMappingStatus": object.PlatformMappingStatusConflicted,
		},
	})
	if ok {
		t.Fatalf("resolver item = %+v, want rejected non-confirmed external identity", item)
	}
}
