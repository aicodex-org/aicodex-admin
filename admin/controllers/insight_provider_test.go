package controllers

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"github.com/golang-jwt/jwt/v5"
)

func TestInsightCurrentUserResponseUsesWhitelistAndRedactsSensitiveFields(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	user := &object.User{
		Owner:                "org-a",
		Name:                 "alice",
		Id:                   "casdoor-user-alice",
		DisplayName:          "Alice",
		Password:             "plain-password",
		AccessToken:          "access-token-value",
		OriginalToken:        "original-token-value",
		OriginalRefreshToken: "refresh-token-value",
		Phone:                "13800000000",
		Email:                "alice@example.com",
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "00000000-0000-7000-8000-000000000123", map[string]string{"org-a/alice": "101"})

	got := buildInsightCurrentUserResponse(user, []string{"admin"}, []InsightProviderGroup{
		{DepartmentId: "org-a/dev", DepartmentName: "Dev"},
	}, generatedAt)

	if got.AdminUserId != "org-a/alice" {
		t.Fatalf("AdminUserId = %q, want org-a/alice", got.AdminUserId)
	}
	if got.UsageIdentity.ApiUserId != "101" || got.UsageIdentity.MappingStatus != MappingStatusOK {
		t.Fatalf("UsageIdentity = %+v, want deterministic api user mapping", got.UsageIdentity)
	}
	if got.ApiOrganizationId != "00000000-0000-7000-8000-000000000123" {
		t.Fatalf("ApiOrganizationId = %q, want configured aicodex-api organization", got.ApiOrganizationId)
	}
	if got.OrgVersion == "" || got.ScopeVersion == "" || got.Freshness != object.PlatformFreshnessFresh {
		t.Fatalf("current-user version/freshness = orgVersion:%q scopeVersion:%q freshness:%q", got.OrgVersion, got.ScopeVersion, got.Freshness)
	}

	raw, err := json.Marshal(got)
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	for _, forbidden := range []string{"plain-password", "access-token-value", "original-token-value", "refresh-token-value", "13800000000", "alice@example.com", "password", "accessToken", "phone", "email"} {
		if strings.Contains(body, forbidden) {
			t.Fatalf("current-user response leaked sensitive value or field %q: %s", forbidden, body)
		}
	}
}

func TestInsightCurrentUserUsesSavedResolverPolicyWhenLocalMappingMissing(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	var resolverRequest insightUsageIdentityResolveRequest
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Header.Get("Authorization") != "Bearer legacy-resolver-token" {
			t.Fatalf("resolver Authorization = %q, want bearer service token", r.Header.Get("Authorization"))
		}
		if err := json.NewDecoder(r.Body).Decode(&resolverRequest); err != nil {
			t.Fatalf("decode resolver request failed: %v", err)
		}
		_ = json.NewEncoder(w).Encode(insightUsageIdentityResolveEnvelope{
			Success: true,
			TraceId: resolverRequest.TraceId,
			Data: insightUsageIdentityResolveResponse{Results: []insightUsageIdentityResolveResult{{
				RequestId:     "org-a/huangfanli",
				MappingStatus: MappingStatusOK,
				ApiUserId:     701,
			}}},
		})
	}))
	defer server.Close()

	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, &object.ServiceCredentialGovernanceConfigResponse{
		Groups: []object.ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			SourceClass:               "env_config",
			CredentialReferenceStatus: "configured",
			KeepInEnv:                 true,
			CallerPolicy:              "saved-resolver-caller",
			BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1200.0, "maxItems": 1.0},
		}},
	})
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")
	t.Setenv("insightUsageIdentityResolverCaller", "legacy-resolver-caller")
	t.Setenv("insightUsageIdentityResolverMaxItems", "200")
	t.Setenv("insightUsageIdentityResolverTimeoutMs", "5000")

	got, providerErr := buildInsightCurrentUserResponseWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, nil, nil, generatedAt, "trace-current-user-resolver")

	if providerErr != nil {
		t.Fatalf("buildInsightCurrentUserResponseWithTrace returned error: %+v", providerErr)
	}
	if calls != 1 {
		t.Fatalf("resolver calls = %d, want 1", calls)
	}
	if resolverRequest.Caller != "saved-resolver-caller" || len(resolverRequest.Items) != 1 {
		t.Fatalf("resolver request = %+v, want saved caller and one item", resolverRequest)
	}
	if got.UsageIdentity.ApiUserId != "701" || got.UsageIdentity.MappingStatus != MappingStatusOK {
		t.Fatalf("UsageIdentity = %+v, want resolver mapping", got.UsageIdentity)
	}
	if got.UsageIdentity.SourceConnectionId != object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123") || got.UsageIdentity.ExternalSubjectId != "huangfanli" {
		t.Fatalf("source identity = %+v, want source metadata preserved", got.UsageIdentity)
	}
}

func TestInsightCurrentUserLocalMappingDoesNotCallSavedResolver(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		t.Fatalf("resolver should not be called when local mapping exists")
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{"org-a/huangfanli": "901"})

	got, providerErr := buildInsightCurrentUserResponseWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, nil, nil, generatedAt, "trace-current-user-local")

	if providerErr != nil {
		t.Fatalf("buildInsightCurrentUserResponseWithTrace returned error: %+v", providerErr)
	}
	if calls != 0 {
		t.Fatalf("resolver calls = %d, want 0", calls)
	}
	if got.UsageIdentity.ApiUserId != "901" || got.UsageIdentity.MappingStatus != MappingStatusOK {
		t.Fatalf("UsageIdentity = %+v, want local mapping", got.UsageIdentity)
	}
}

func TestInsightCurrentUserSavedResolverDisabledFailsClosedBeforeOutbound(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		t.Fatalf("resolver should not be called when saved policy is disabled")
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	got, providerErr := buildInsightCurrentUserResponseWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, nil, nil, generatedAt, "trace-current-user-disabled")

	if got != nil {
		t.Fatalf("response = %+v, want fail-closed error", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want unavailable missing fail-closed", providerErr)
	}
	if calls != 0 {
		t.Fatalf("resolver calls = %d, want 0", calls)
	}
}

func TestInsightCurrentUserSavedResolverExternalReferenceFailsClosedBeforeOutbound(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		t.Fatalf("resolver should not be called when saved external reference is unresolved")
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	got, providerErr := buildInsightCurrentUserResponseWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, nil, nil, generatedAt, "trace-current-user-external")

	if got != nil {
		t.Fatalf("response = %+v, want fail-closed error", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want unresolved reference fail-closed", providerErr)
	}
	if calls != 0 {
		t.Fatalf("resolver calls = %d, want 0", calls)
	}
}

func TestInsightCurrentUserResolverInvalidFailsClosed(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req insightUsageIdentityResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode resolver request failed: %v", err)
		}
		_ = json.NewEncoder(w).Encode(insightUsageIdentityResolveEnvelope{
			Success: true,
			TraceId: req.TraceId,
			Data: insightUsageIdentityResolveResponse{Results: []insightUsageIdentityResolveResult{{
				RequestId:     "org-a/huangfanli",
				MappingStatus: MappingStatusInvalid,
				ErrorCode:     "caller_scope_mismatch",
			}}},
		})
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	got, providerErr := buildInsightCurrentUserResponseWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, nil, nil, generatedAt, "trace-current-user-invalid")

	if got != nil {
		t.Fatalf("response = %+v, want fail-closed error", got)
	}
	if providerErr == nil || providerErr.MappingStatus != MappingStatusInvalid {
		t.Fatalf("providerErr = %+v, want invalid mapping fail-closed", providerErr)
	}
}

func TestInsightCurrentUserResolverProtocolErrorFailsClosed(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(insightUsageIdentityResolveEnvelope{
			Success: false,
			Error:   &InsightProviderError{Code: InsightProviderErrorUnavailable, Message: "resolver unavailable"},
		})
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	got, providerErr := buildInsightCurrentUserResponseWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, nil, nil, generatedAt, "trace-current-user-protocol")

	if got != nil {
		t.Fatalf("response = %+v, want fail-closed error", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want unavailable missing fail-closed", providerErr)
	}
}

func TestInsightUsageIdentityResolverKeepsMissingFallbackWithoutSavedConfig(t *testing.T) {
	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, nil)
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")

	identity, providerErr := resolveInsightUsageIdentityWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}, "trace-no-saved")

	if providerErr != nil {
		t.Fatalf("resolveInsightUsageIdentityWithTrace returned error: %+v", providerErr)
	}
	if identity.MappingStatus != MappingStatusMissing || identity.SourceType != object.SourceTypeWecom {
		t.Fatalf("identity = %+v, want missing fallback with source metadata", identity)
	}
}

func TestInsightUsageIdentityResolverSkipsUnsafeItemWithoutOutbound(t *testing.T) {
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
	t.Setenv("insightUsageIdentityResolverEndpoint", "http://127.0.0.1:1")
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	identity, providerErr := resolveInsightUsageIdentityWithTrace(&object.User{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId:  "ww123",
			object.WecomUserPropertyUserId:  "huangfanli",
			"externalIdentityMappingStatus": object.PlatformMappingStatusConflicted,
		},
	}, "trace-unsafe")

	if providerErr != nil {
		t.Fatalf("resolveInsightUsageIdentityWithTrace returned error: %+v", providerErr)
	}
	if identity.MappingStatus != MappingStatusMissing {
		t.Fatalf("identity = %+v, want missing without resolver outbound", identity)
	}
}

func TestBuildInsightUsageIdentityFromResolverResultStatuses(t *testing.T) {
	tests := []struct {
		name          string
		results       []insightUsageIdentityResolveResult
		wantStatus    string
		wantApiUserId string
	}{
		{
			name:          "ok",
			results:       []insightUsageIdentityResolveResult{{RequestId: "req-1", MappingStatus: MappingStatusOK, ApiUserId: 42}},
			wantStatus:    MappingStatusOK,
			wantApiUserId: "42",
		},
		{
			name:       "ok non positive id",
			results:    []insightUsageIdentityResolveResult{{RequestId: "req-1", MappingStatus: MappingStatusOK}},
			wantStatus: MappingStatusInvalid,
		},
		{
			name:       "ambiguous",
			results:    []insightUsageIdentityResolveResult{{RequestId: "req-1", MappingStatus: MappingStatusAmbiguous}},
			wantStatus: MappingStatusAmbiguous,
		},
		{
			name:       "invalid",
			results:    []insightUsageIdentityResolveResult{{RequestId: "req-1", MappingStatus: MappingStatusInvalid}},
			wantStatus: MappingStatusInvalid,
		},
		{
			name:       "missing",
			results:    []insightUsageIdentityResolveResult{{RequestId: "req-1", MappingStatus: MappingStatusMissing}},
			wantStatus: MappingStatusMissing,
		},
		{
			name:       "unmatched",
			results:    []insightUsageIdentityResolveResult{{RequestId: "other", MappingStatus: MappingStatusOK, ApiUserId: 42}},
			wantStatus: MappingStatusMissing,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildInsightUsageIdentityFromResolverResult("req-1", tt.results)
			if got.MappingStatus != tt.wantStatus || got.ApiUserId != tt.wantApiUserId {
				t.Fatalf("identity = %+v, want status %q apiUserId %q", got, tt.wantStatus, tt.wantApiUserId)
			}
		})
	}
}

func TestPreloadInsightUsageIdentityCacheFallbackBranches(t *testing.T) {
	if providerErr := preloadInsightUsageIdentityCache(nil, nil); providerErr != nil {
		t.Fatalf("nil cache preload returned error: %+v", providerErr)
	}

	cache := newInsightUsageIdentityCache()
	cache.items["org-a/cached"] = InsightUsageIdentity{ApiUserId: "100", MappingStatus: MappingStatusOK}
	if providerErr := preloadInsightUsageIdentityCache([]*object.User{{Owner: "org-a", Name: "cached"}}, cache); providerErr != nil {
		t.Fatalf("cached preload returned error: %+v", providerErr)
	}

	withInsightUsageIdentityResolverRuntimePolicyConfigForTest(t, nil)
	t.Setenv("insightUsageIdentityResolverEndpoint", "")
	t.Setenv("insightUsageIdentityResolverToken", "")
	cache = newInsightUsageIdentityCache()
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
	if providerErr := preloadInsightUsageIdentityCache([]*object.User{user}, cache); providerErr != nil {
		t.Fatalf("no saved config preload returned error: %+v", providerErr)
	}
	if cache.items[user.GetId()].MappingStatus != MappingStatusMissing {
		t.Fatalf("cache item = %+v, want missing fallback", cache.items[user.GetId()])
	}
}

func TestPreloadInsightUsageIdentityCacheResolverErrorFailsClosed(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(insightUsageIdentityResolveEnvelope{
			Success: false,
			Error:   &InsightProviderError{Code: InsightProviderErrorUnavailable, Message: "resolver unavailable"},
		})
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	providerErr := preloadInsightUsageIdentityCache([]*object.User{{
		Owner: "org-a",
		Name:  "huangfanli",
		Id:    "admin-subject-huangfanli",
		Wecom: "huangfanli",
		Properties: map[string]string{
			object.WecomUserPropertyCorpId: "ww123",
			object.WecomUserPropertyUserId: "huangfanli",
		},
	}}, newInsightUsageIdentityCache())
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want unavailable missing fail-closed", providerErr)
	}
}

func TestInsightScopeUsesSavedResolverPolicyWhenLocalMappingMissing(t *testing.T) {
	generatedAt := time.Date(2026, 6, 22, 8, 0, 0, 0, time.UTC)
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		var req insightUsageIdentityResolveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode resolver request failed: %v", err)
		}
		if req.Caller != "saved-resolver-caller" {
			t.Fatalf("resolver caller = %q, want saved-resolver-caller", req.Caller)
		}
		results := make([]insightUsageIdentityResolveResult, 0, len(req.Items))
		for _, item := range req.Items {
			switch item.RequestId {
			case "org-a/owner":
				results = append(results, insightUsageIdentityResolveResult{RequestId: item.RequestId, MappingStatus: MappingStatusOK, ApiUserId: 700})
			case "org-a/member":
				results = append(results, insightUsageIdentityResolveResult{RequestId: item.RequestId, MappingStatus: MappingStatusOK, ApiUserId: 701})
			default:
				results = append(results, insightUsageIdentityResolveResult{RequestId: item.RequestId, MappingStatus: MappingStatusMissing})
			}
		}
		_ = json.NewEncoder(w).Encode(insightUsageIdentityResolveEnvelope{
			Success: true,
			TraceId: req.TraceId,
			Data:    insightUsageIdentityResolveResponse{Results: results},
		})
	}))
	defer server.Close()

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
	t.Setenv("insightUsageIdentityResolverEndpoint", server.URL)
	t.Setenv("insightUsageIdentityResolverToken", "legacy-resolver-token")

	currentUser := &object.User{Owner: "org-a", Name: "owner", Id: "admin-subject-owner", IsAdmin: true, Wecom: "owner", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "owner"}}
	member := &object.User{Owner: "org-a", Name: "member", Id: "admin-subject-member", Groups: []string{"org-a/dev"}, Wecom: "member", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "member"}}

	got, providerErr := calculateInsightScope(currentUser, []*object.User{currentUser, member}, []*object.Group{{Owner: "org-a", Name: "dev", DisplayName: "Dev"}}, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	if calls != 1 {
		t.Fatalf("resolver calls = %d, want one batched resolver call", calls)
	}
	if !containsString(got.ApiUserIds, "700") || !containsString(got.ApiUserIds, "701") {
		t.Fatalf("scope ApiUserIds = %+v, want resolver ids", got.ApiUserIds)
	}
}

func TestInsightCurrentUserDisplayNamePrefersOrganizationDisplayName(t *testing.T) {
	user := &object.User{
		Owner:       "org-a",
		Name:        "wecom-user-huangfanli",
		DisplayName: "黄凡力",
		FirstName:   "Fanley",
		LastName:    "Huang",
	}

	got := buildInsightCurrentUserResponse(user, nil, nil, time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC))

	if got.DisplayName != "黄凡力" {
		t.Fatalf("DisplayName = %q, want organization display name", got.DisplayName)
	}
}

func TestInsightScopeForOrganizationAdminStaysInOwnOrganization(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner:   "org-a",
		Name:    "owner",
		IsAdmin: true,
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member"},
		{Owner: "org-a", Name: "unmapped"},
		{Owner: "org-b", Name: "outside"},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "00000000-0000-7000-8000-000000000123", map[string]string{
		"org-a/owner":  "100",
		"org-a/member": "101",
	})

	got, providerErr := calculateInsightScopeForOrganizationWithTrace(currentUser, "org-a", users, nil, generatedAt, "trace-admin-scope")
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeAllCompany {
		t.Fatalf("ScopeType = %q, want %q", got.ScopeType, ScopeTypeAllCompany)
	}
	if got.Organization != "org-a" {
		t.Fatalf("Organization = %q, want org-a", got.Organization)
	}
	if got.AdminUserId != "org-a/owner" {
		t.Fatalf("AdminUserId = %q, want current admin user", got.AdminUserId)
	}
	if got.TraceId == "" || got.OrgVersion == "" || got.Freshness != object.PlatformFreshnessFresh || got.LifecycleStatus != object.PlatformLifecycleStatusActive {
		t.Fatalf("scope trace/version/freshness/lifecycle not set: %+v", got)
	}
	if got.ApiOrganizationId != "00000000-0000-7000-8000-000000000123" {
		t.Fatalf("ApiOrganizationId = %q, want configured aicodex-api organization", got.ApiOrganizationId)
	}
	if containsString(got.AdminUserIds, "org-b/outside") || containsString(got.ApiUserIds, "999") {
		t.Fatalf("organization admin scope crossed organization boundary: %+v", got)
	}
	if containsString(got.AdminUserIds, "org-a/unmapped") {
		t.Fatalf("organization admin scope should skip users without usage mapping: %+v", got)
	}
}

func TestInsightAllCompanyScopeIncludesDepartmentUsageMappings(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner:   "org-a",
		Name:    "owner",
		IsAdmin: true,
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "dev-a", Groups: []string{"org-a/dev"}},
		{Owner: "org-a", Name: "dev-b", Groups: []string{"org-a/dev"}},
		{Owner: "org-a", Name: "qa-a", Groups: []string{"org-a/qa"}},
		{Owner: "org-a", Name: "missing", Groups: []string{"org-a/dev"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev"},
		{Owner: "org-a", Name: "qa", DisplayName: "QA"},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "00000000-0000-7000-8000-000000000123", map[string]string{
		"org-a/owner": "100",
		"org-a/dev-a": "101",
		"org-a/dev-b": "102",
		"org-a/qa-a":  "201",
	})

	got, providerErr := calculateInsightScope(currentUser, users, groups, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeAllCompany {
		t.Fatalf("ScopeType = %q, want %q", got.ScopeType, ScopeTypeAllCompany)
	}
	if len(got.Departments) != 2 {
		t.Fatalf("departments len = %d, want 2: %+v", len(got.Departments), got.Departments)
	}
	dev := findInsightDepartmentScope(got.Departments, "org-a/dev")
	if dev == nil || !containsString(dev.ApiUserIds, "101") || !containsString(dev.ApiUserIds, "102") || containsString(dev.AdminUserIds, "org-a/missing") {
		t.Fatalf("dev department mapping = %+v, want only mapped direct members", dev)
	}
	qa := findInsightDepartmentScope(got.Departments, "org-a/qa")
	if qa == nil || !containsString(qa.ApiUserIds, "201") {
		t.Fatalf("qa department mapping = %+v, want mapped qa member", qa)
	}
}

func TestInsightProviderUsesPlatformDepartmentSourceMetadataForWecomGroups(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	sourceConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123")
	currentUser := &object.User{
		Owner:   "org-a",
		Name:    "owner",
		IsAdmin: true,
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Groups: []string{"org-a/wecom-dept-2"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "wecom-dept-2", DisplayName: "研发", Type: object.WecomDepartmentGroupType, IsEnabled: true},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "00000000-0000-7000-8000-000000000123", map[string]string{
		"org-a/owner":  "100",
		"org-a/member": "101",
	})
	departmentMetadata := buildInsightDepartmentSourceMetadataIndex([]*object.PlatformDepartment{
		{
			OrganizationId:     "org-a",
			DepartmentId:       "org-a/wecom-dept-2",
			SourceConnectionId: sourceConnectionId,
			LifecycleStatus:    object.PlatformLifecycleStatusActive,
		},
	})

	scope, providerErr := calculateInsightScopeForOrganizationWithDepartmentMetadata(currentUser, "org-a", users, groups, generatedAt, "trace-source-metadata", departmentMetadata)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	dept := findInsightDepartmentScope(scope.Departments, "org-a/wecom-dept-2")
	if dept == nil || dept.SourceType != object.SourceTypeWecom || dept.SourceConnectionId != sourceConnectionId {
		t.Fatalf("department source metadata = %+v, want wecom source connection %q", dept, sourceConnectionId)
	}

	tree := buildInsightOrganizationTreeForOrganizationWithDepartmentMetadata(currentUser, "org-a", groups, departmentMetadata)
	if len(tree) != 1 || tree[0].SourceType != object.SourceTypeWecom || tree[0].SourceConnectionId != sourceConnectionId {
		t.Fatalf("tree source metadata = %+v, want wecom source connection %q", tree, sourceConnectionId)
	}
}

func TestInsightOrganizationTreeReadModelBuildsPlatformEnvelopeForAdmin(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	sourceConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123")
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments: []object.OrganizationManagementScopeDepartment{
				{DepartmentId: "org-a/dev"},
				{DepartmentId: "org-a/platform"},
			},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-tree-1"},
			{OrganizationId: "org-a", DepartmentId: "org-a/platform", ParentDepartmentId: "org-a/dev", DisplayName: "Platform", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-tree-1"},
			{OrganizationId: "org-a", DepartmentId: "org-a/disabled", DisplayName: "Disabled", LifecycleStatus: object.PlatformLifecycleStatusDisabled, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-tree-1"},
		},
		SourceConnections: []object.SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessFresh},
		},
		SyncBatches: []object.OrgSyncBatch{
			{OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, BatchId: "batch-1", Status: object.OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-tree-1", Freshness: object.PlatformFreshnessFresh, FinishedAt: generatedAt.Add(-time.Minute)},
		},
	})

	if got.Organization != "org-a" || got.ReadModelSource != "platform_department" {
		t.Fatalf("tree metadata = %+v, want org-a platform_department", got)
	}
	if got.OrgVersion != "orgv-tree-1" || got.Freshness != object.PlatformFreshnessFresh || got.GeneratedAt != formatInsightTime(generatedAt) {
		t.Fatalf("version metadata = %+v, want latest platform org version and freshness", got)
	}
	if got.Lineage.SourceService != "aicodex-admin" || got.Lineage.SourceType != object.SourceTypeWecom || got.Lineage.SourceConnectionId != sourceConnectionId || got.Lineage.BatchId != "batch-1" {
		t.Fatalf("lineage = %+v, want redacted source metadata", got.Lineage)
	}
	if len(got.Nodes) != 2 || len(got.List) != 2 {
		t.Fatalf("nodes/list len = %d/%d, want 2 active platform nodes", len(got.Nodes), len(got.List))
	}
	root := got.Nodes[0]
	if root.DepartmentId != "org-a/dev" || root.DepartmentPath != "Dev" || !root.HasChildren || root.VisibilitySource != "admin" {
		t.Fatalf("root node = %+v, want admin-visible Dev root", root)
	}
	child := got.Nodes[1]
	if child.DepartmentId != "org-a/platform" || child.ParentDepartmentId != "org-a/dev" || child.DepartmentPath != "Dev/Platform" || child.SourceType != object.SourceTypeWecom {
		t.Fatalf("child node = %+v, want Platform child with source metadata", child)
	}
	for _, node := range got.Nodes {
		if strings.Contains(strings.ToLower(node.Lineage.Digest), "token") || strings.Contains(node.DepartmentName, "13800000000") {
			t.Fatalf("node lineage/display leaked sensitive data: %+v", node)
		}
	}
}

func TestInsightOrganizationTreeEnvelopeKeepsVersionInsideData(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "member"},
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeSelf,
		},
	})
	payload, err := json.Marshal(InsightProviderEnvelope{Status: "ok", TraceId: "trace-redacted", Data: got})
	if err != nil {
		t.Fatalf("marshal organization-tree envelope: %v", err)
	}
	var envelope map[string]any
	if err := json.Unmarshal(payload, &envelope); err != nil {
		t.Fatalf("unmarshal organization-tree envelope: %v", err)
	}
	if _, ok := envelope["orgVersion"]; ok {
		t.Fatalf("top-level orgVersion found in envelope: %s", payload)
	}
	data, ok := envelope["data"].(map[string]any)
	if !ok {
		t.Fatalf("data envelope missing: %s", payload)
	}
	if data["orgVersion"] == nil || data["scopeVersion"] == nil {
		t.Fatalf("data version fields missing: %s", payload)
	}
	if data["orgVersion"] == "" && data["scopeVersion"] == "" {
		t.Fatalf("data version fields empty: %s", payload)
	}
}

func TestInsightOrganizationTreeReadModelUsesLatestUsableSyncBatchForVersion(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments:  []object.OrganizationManagementScopeDepartment{{DepartmentId: "org-a/dev"}},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive, OrgVersion: "orgv-department"},
		},
		SyncBatches: []object.OrgSyncBatch{
			{OrganizationId: "org-a", BatchId: "failed-newer", Status: object.OrgSyncBatchStatusFailed, OrgVersion: "orgv-failed", Freshness: object.PlatformFreshnessUnavailable, FinishedAt: generatedAt.Add(time.Minute)},
			{OrganizationId: "org-a", BatchId: "running-newer", Status: object.OrgSyncBatchStatusRunning, OrgVersion: "orgv-running", Freshness: object.PlatformFreshnessUnknown, FinishedAt: generatedAt.Add(2 * time.Minute)},
			{OrganizationId: "org-a", BatchId: "success-usable", Status: object.OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-success", Freshness: object.PlatformFreshnessFresh, FinishedAt: generatedAt.Add(-time.Minute)},
			{OrganizationId: "org-a", BatchId: "partial-empty-version", Status: object.OrgSyncBatchStatusPartial, Freshness: object.PlatformFreshnessStale, FinishedAt: generatedAt},
		},
	})

	if got.OrgVersion != "orgv-success" || got.Freshness != object.PlatformFreshnessFresh || got.Lineage.BatchId != "success-usable" {
		t.Fatalf("version metadata = %+v lineage=%+v, want latest usable succeeded batch", got, got.Lineage)
	}
	if strings.Contains(got.OrgVersion, "2026-06-10T08") {
		t.Fatalf("orgVersion must not be derived from request time: %+v", got)
	}
}

func TestInsightOrganizationTreeReadModelFailClosedForUntrustedSourceConnection(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true}
	activeConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww-active")
	disabledConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww-disabled")

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments: []object.OrganizationManagementScopeDepartment{
				{DepartmentId: "org-a/active"},
				{DepartmentId: "org-a/disabled-source"},
			},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/active", DisplayName: "Active", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: activeConnectionId, OrgVersion: "orgv-tree-1"},
			{OrganizationId: "org-a", DepartmentId: "org-a/disabled-source", DisplayName: "Disabled Source", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: disabledConnectionId, OrgVersion: "orgv-tree-1"},
		},
		SourceConnections: []object.SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: activeConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessFresh},
			{OrganizationId: "org-a", SourceConnectionId: disabledConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusDisabled, Freshness: object.PlatformFreshnessStale},
		},
	})

	if len(got.Nodes) != 1 || got.Nodes[0].DepartmentId != "org-a/active" {
		t.Fatalf("nodes = %+v, want only department from ACTIVE/FRESH source connection", got.Nodes)
	}
}

func TestInsightOrganizationTreeReadModelRejectsUntrustedSuccessfulEmptyTree(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true}
	disabledConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww-disabled")
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments:  []object.OrganizationManagementScopeDepartment{{DepartmentId: "org-a/disabled-source"}},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/disabled-source", DisplayName: "Disabled Source", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: disabledConnectionId, OrgVersion: "orgv-tree-1"},
		},
		SourceConnections: []object.SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: disabledConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusDisabled, Freshness: object.PlatformFreshnessStale},
		},
	}
	got := buildInsightOrganizationTreeReadModel(input)

	providerErr := validateInsightOrganizationTreeReadModelTrusted(input, got)

	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want provider unavailable for untrusted empty tree", providerErr)
	}
}

func TestInsightOrganizationTreeReadModelTrustAllowsBusinessEmptyTree(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "member"},
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeSelf,
		},
	}
	got := buildInsightOrganizationTreeReadModel(input)

	if providerErr := validateInsightOrganizationTreeReadModelTrusted(input, got); providerErr != nil {
		t.Fatalf("providerErr = %+v, want business empty tree to stay status=ok", providerErr)
	}
}

func TestInsightOrganizationTreeReadModelTrustAllowsNonEmptyTree(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	sourceConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123")
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "owner", IsAdmin: true},
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments:  []object.OrganizationManagementScopeDepartment{{DepartmentId: "org-a/dev"}},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-tree-1"},
		},
		SourceConnections: []object.SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessFresh},
		},
	}
	got := buildInsightOrganizationTreeReadModel(input)

	if providerErr := validateInsightOrganizationTreeReadModelTrusted(input, got); providerErr != nil {
		t.Fatalf("providerErr = %+v, want non-empty trusted tree to stay status=ok", providerErr)
	}
}

func TestInsightOrganizationTreeReadModelTrustAllowsCompatGroupTree(t *testing.T) {
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "lead"},
		Organization: "org-a",
		Groups: []*object.Group{
			{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
		},
	}
	got := buildInsightOrganizationTreeReadModel(input)

	if providerErr := validateInsightOrganizationTreeReadModelTrusted(input, got); providerErr != nil {
		t.Fatalf("providerErr = %+v, want compat group tree to stay status=ok", providerErr)
	}
}

func TestInsightOrganizationTreeReadModelDirectLeaderDoesNotExpandDepartmentTree(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead"}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeDirectLeader,
			Users: []object.OrganizationManagementScopeUser{
				{UserId: "org-a/member", MainDepartmentId: "org-a/dev"},
			},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/root", DisplayName: "Root", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", ParentDepartmentId: "org-a/root", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/platform", ParentDepartmentId: "org-a/dev", DisplayName: "Platform", LifecycleStatus: object.PlatformLifecycleStatusActive},
		},
		SyncBatches: []object.OrgSyncBatch{
			{OrganizationId: "org-a", BatchId: "batch-1", Status: object.OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-tree-1", Freshness: object.PlatformFreshnessFresh, FinishedAt: generatedAt.Add(-time.Minute)},
		},
	})

	if len(got.Nodes) != 1 {
		t.Fatalf("direct leader visible nodes = %+v, want only subordinate's department", got.Nodes)
	}
	if got.Nodes[0].DepartmentId != "org-a/dev" || got.Nodes[0].ParentDepartmentId != "" || got.Nodes[0].HasChildren || got.Nodes[0].VisibilitySource != "direct_leader" {
		t.Fatalf("direct leader node = %+v, want only direct subordinate department without ancestor/descendant expansion", got.Nodes[0])
	}
}

func TestInsightOrganizationTreeReadModelDepartmentManagerUsesScopeDepartments(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead"}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeDepartmentManager,
			Departments: []object.OrganizationManagementScopeDepartment{
				{DepartmentId: "org-a/dev"},
				{DepartmentId: "org-a/platform"},
			},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/platform", ParentDepartmentId: "org-a/dev", DisplayName: "Platform", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/finance", DisplayName: "Finance", LifecycleStatus: object.PlatformLifecycleStatusActive},
		},
	})

	if len(got.Nodes) != 2 {
		t.Fatalf("department manager visible nodes = %+v, want managed subtree only", got.Nodes)
	}
	for _, node := range got.Nodes {
		if node.VisibilitySource != "department_manager" {
			t.Fatalf("node visibilitySource = %+v, want department_manager", got.Nodes)
		}
		if node.DepartmentId == "org-a/finance" {
			t.Fatalf("unauthorized sibling leaked into organization tree: %+v", got.Nodes)
		}
	}
}

func TestInsightOrganizationTreeReadModelGuardsDepartmentCycles(t *testing.T) {
	generatedAt := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments: []object.OrganizationManagementScopeDepartment{
				{DepartmentId: "org-a/a"},
				{DepartmentId: "org-a/b"},
			},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/a", ParentDepartmentId: "org-a/b", DisplayName: "A", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/b", ParentDepartmentId: "org-a/a", DisplayName: "B", LifecycleStatus: object.PlatformLifecycleStatusActive},
		},
	})

	if len(got.Nodes) != 2 {
		t.Fatalf("cycle nodes = %+v, want finite two-node result", got.Nodes)
	}
	for _, node := range got.Nodes {
		if node.DepartmentPath == "" {
			t.Fatalf("cycle node should still have diagnostic path: %+v", node)
		}
	}
}

func TestInsightOrganizationTreeReadModelUsesCompatGroupWhenPlatformMissing(t *testing.T) {
	currentUser := &object.User{Owner: "org-a", Name: "lead"}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "org-a",
		Groups: []*object.Group{
			{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
			{Owner: "org-a", Name: "platform", ParentId: "dev", DisplayName: "Platform"},
		},
	})

	if got.ReadModelSource != "compat_group" || len(got.Nodes) != 2 || len(got.List) != 2 {
		t.Fatalf("compat tree = %+v, want group fallback with compatible list", got)
	}
	if got.Freshness != object.PlatformFreshnessUnknown {
		t.Fatalf("compat freshness = %q, want UNKNOWN without platform snapshot version", got.Freshness)
	}
}

func TestInsightOrganizationTreeReadModelReturnsEmptyWithoutScope(t *testing.T) {
	currentUser := &object.User{Owner: "org-a", Name: "member"}

	got := buildInsightOrganizationTreeReadModel(insightOrganizationTreeReadModelInput{
		CurrentUser:  currentUser,
		Organization: "",
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive},
		},
	})

	if got.Organization != "org-a" || len(got.Nodes) != 0 || got.ReadModelSource != "platform_department" {
		t.Fatalf("empty scope tree = %+v, want org-a platform envelope with no visible nodes", got)
	}
	if got.OrgVersion == "" && got.ScopeVersion == "" {
		t.Fatalf("empty scope tree version = org:%q scope:%q, want at least one version for status=ok", got.OrgVersion, got.ScopeVersion)
	}
	if got.Freshness == "" || got.GeneratedAt == "" || got.Lineage.Digest == "" || got.ReadModelSource == "" {
		t.Fatalf("empty scope tree diagnostics = %+v, want freshness/generatedAt/lineage/readModelSource", got)
	}
}

func TestInsightScopeRejectsForbiddenOrDeletedCurrentUser(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	for _, currentUser := range []*object.User{
		{Owner: "org-a", Name: "forbidden", IsForbidden: true},
		{Owner: "org-a", Name: "deleted", IsDeleted: true},
	} {
		got, providerErr := calculateInsightScope(currentUser, []*object.User{currentUser}, nil, generatedAt)
		if got != nil {
			t.Fatalf("scope = %+v, want nil for forbidden/deleted current user %+v", got, currentUser)
		}
		if providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed {
			t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED", providerErr)
		}
	}
}

func TestInsightScopeExcludesForbiddenAndDeletedUsers(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member"},
		{Owner: "org-a", Name: "forbidden", IsForbidden: true},
		{Owner: "org-a", Name: "deleted", IsDeleted: true},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{
		"org-a/owner":     "100",
		"org-a/member":    "101",
		"org-a/forbidden": "102",
		"org-a/deleted":   "103",
	})

	got, providerErr := calculateInsightScope(currentUser, users, nil, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	for _, blocked := range []string{"org-a/forbidden", "org-a/deleted"} {
		if containsString(got.AdminUserIds, blocked) {
			t.Fatalf("scope leaked inactive admin user %s: %+v", blocked, got)
		}
	}
	for _, blocked := range []string{"102", "103"} {
		if containsString(got.ApiUserIds, blocked) {
			t.Fatalf("scope leaked inactive api user %s: %+v", blocked, got)
		}
	}
}

func TestInsightGlobalAdminScopeUsesRequestedOrganizationWhenEmpty(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "built-in", Name: "admin"}

	got, providerErr := calculateInsightScopeForOrganization(currentUser, "org-a", []*object.User{}, nil, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganization returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeAllCompany || got.Organization != "org-a" {
		t.Fatalf("scope = %+v, want ALL_COMPANY for requested org-a", got)
	}
	if len(got.AdminUserIds) != 0 || len(got.ApiUserIds) != 0 {
		t.Fatalf("empty organization scope should keep explicit organization with empty users: %+v", got)
	}
}

func TestInsightScopeRequiresAuthenticatedCurrentUser(t *testing.T) {
	got, providerErr := calculateInsightScope(nil, nil, nil, time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC))
	if got != nil {
		t.Fatalf("scope = %+v, want nil for unauthenticated user", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnauthenticated {
		t.Fatalf("providerErr = %+v, want UNAUTHENTICATED", providerErr)
	}
}

func TestInsightScopeSkipsUsersWithoutDepartmentUsageMapping(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner: "org-a",
		Name:  "lead",
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "missing", Groups: []string{"org-a/dev"}},
		{Owner: "org-a", Name: "mapped", Groups: []string{"org-a/dev"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{
		"org-a/lead":   "200",
		"org-a/mapped": "201",
	})

	got, providerErr := calculateInsightScope(currentUser, users, groups, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeDepartmentTree || len(got.Departments) != 1 {
		t.Fatalf("scope = %+v, want department scope with queryable users", got)
	}
	dept := got.Departments[0]
	if containsString(dept.AdminUserIds, "org-a/missing") || containsString(got.AdminUserIds, "org-a/missing") {
		t.Fatalf("department scope should skip users without usage mapping: %+v", got)
	}
	if !containsString(dept.AdminUserIds, "org-a/mapped") || !containsString(dept.ApiUserIds, "201") {
		t.Fatalf("department scope lost mapped user: %+v", got)
	}
}

func TestInsightQueryableScopeSkipsMissingPlatformApiUserMappings(t *testing.T) {
	users := []*object.User{
		{Owner: "org-a", Name: "mapped", Id: "subject-mapped"},
		{Owner: "org-a", Name: "missing", Id: "subject-missing"},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{"org-a/mapped": "201"})

	adminUserIds, apiUserIds, mappingStatus := mapInsightQueryableUsersToUsageIds(users)
	if mappingStatus != MappingStatusOK {
		t.Fatalf("mappingStatus = %q, want OK when missing queryable users are skipped", mappingStatus)
	}
	if !containsString(adminUserIds, "org-a/mapped") || !containsString(apiUserIds, "201") {
		t.Fatalf("mapped user was not retained: adminUserIds=%+v apiUserIds=%+v", adminUserIds, apiUserIds)
	}
	if containsString(adminUserIds, "org-a/missing") {
		t.Fatalf("missing user should be skipped for queryable scopes: %+v", adminUserIds)
	}
}

func TestInsightScopeIgnoresLegacyAmbiguousPropertyWithoutFirstClassMapping(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner: "org-a",
		Name:  "member",
		Properties: map[string]string{
			"aicodexApiUserId": "201 202",
		},
	}

	got, providerErr := calculateInsightScope(currentUser, []*object.User{currentUser}, nil, generatedAt)
	if providerErr == nil {
		t.Fatalf("calculateInsightScope returned scope %+v, want AUTHORIZATION_FAILED", got)
	}
	if providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with MISSING first-class mapping", providerErr)
	}
	if got != nil && got.ScopeType == ScopeTypeEmpty {
		t.Fatalf("legacy property must not be downgraded to EMPTY scope: %+v", got)
	}
}

func TestInsightScopeReturnsAuthorizationFailedForInvalidAPIUserID(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner: "org-a",
		Name:  "member",
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{"org-a/member": "api-user-member"})

	got, providerErr := calculateInsightScope(currentUser, []*object.User{currentUser}, nil, generatedAt)
	if providerErr == nil {
		t.Fatalf("calculateInsightScope returned scope %+v, want AUTHORIZATION_FAILED", got)
	}
	if providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusInvalid {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with INVALID mapping", providerErr)
	}
	if got != nil && got.ScopeType == ScopeTypeEmpty {
		t.Fatalf("invalid mapping must not be downgraded to EMPTY scope: %+v", got)
	}
}

func TestInsightScopeReturnsAuthorizationFailedForDuplicateAPIUserID(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner:   "org-a",
		Name:    "owner",
		IsAdmin: true,
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member"},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{
		"org-a/owner":  "201",
		"org-a/member": "201",
	})

	got, providerErr := calculateInsightScope(currentUser, users, nil, generatedAt)
	if providerErr == nil {
		t.Fatalf("calculateInsightScope returned scope %+v, want AUTHORIZATION_FAILED", got)
	}
	if providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusAmbiguous {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with AMBIGUOUS duplicate api user mapping", providerErr)
	}
}

func TestInsightScopeReturnsEmptyWhenManagedDepartmentHasNoQueryableUsers(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner: "org-a",
		Name:  "lead",
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
	}

	got, providerErr := calculateInsightScope(currentUser, []*object.User{currentUser}, groups, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeEmpty || len(got.AdminUserIds) != 0 || len(got.ApiUserIds) != 0 {
		t.Fatalf("scope = %+v, want explicit EMPTY scope with empty user lists", got)
	}
	if got.AdminUserId != "org-a/lead" {
		t.Fatalf("AdminUserId = %q, want current admin user for EMPTY scope", got.AdminUserId)
	}
}

func TestInsightDepartmentTreeReturnsPerDepartmentMappings(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner: "org-a",
		Name:  "lead",
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Groups: []string{"org-a/dev"}},
		{Owner: "org-a", Name: "child", Groups: []string{"org-a/platform"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "lead"},
		{Owner: "org-a", Name: "platform", DisplayName: "Platform", ParentId: "dev"},
	}
	installInsightPlatformApiMappingFixtures(t, "org-a", "", map[string]string{
		"org-a/member": "201",
		"org-a/child":  "202",
	})

	got, providerErr := calculateInsightScope(currentUser, users, groups, generatedAt)
	if providerErr != nil {
		t.Fatalf("calculateInsightScope returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeDepartmentTree {
		t.Fatalf("ScopeType = %q, want %q", got.ScopeType, ScopeTypeDepartmentTree)
	}
	if len(got.Departments) != 1 {
		t.Fatalf("departments len = %d, want 1: %+v", len(got.Departments), got.Departments)
	}
	dept := got.Departments[0]
	if dept.DepartmentId != "org-a/dev" || !dept.IncludeChildDepartments || dept.MappingStatus != MappingStatusOK {
		t.Fatalf("department mapping = %+v, want dev subtree with OK mapping", dept)
	}
	if dept.LifecycleStatus != object.PlatformLifecycleStatusActive || dept.SourceType != "group" {
		t.Fatalf("department lifecycle/source metadata = %+v, want active group metadata", dept)
	}
	for _, want := range []string{"org-a/member", "org-a/child"} {
		if !containsString(dept.AdminUserIds, want) {
			t.Fatalf("department adminUserIds = %+v, missing %s", dept.AdminUserIds, want)
		}
	}
	for _, want := range []string{"201", "202"} {
		if !containsString(dept.ApiUserIds, want) {
			t.Fatalf("department apiUserIds = %+v, missing %s", dept.ApiUserIds, want)
		}
	}
}

func TestInsightBearerTokenAudienceMismatchReturnsAuthorizationFailed(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")

	token, err := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{
		"aud": "other-client",
	}).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}

	user, providerErr := getInsightProviderUserByBearerToken(token, "admin.example.test", "trace-audience")
	if user != nil {
		t.Fatalf("user = %+v, want nil for audience mismatch", user)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED", providerErr)
	}
}

func TestFindInsightUserBySubjectMatchesStableAdminUserId(t *testing.T) {
	users := []*object.User{
		{Owner: "built-in", Name: "aicodex-admin-dev", Id: "def793d3-0a95-4e1b-957d-4e9ed3f7e689"},
	}

	got := findInsightUserBySubject(users, "built-in/aicodex-admin-dev")

	if got != users[0] {
		t.Fatalf("matched user = %+v, want stable owner/name subject", got)
	}
}

func TestFindInsightUserBySubjectKeepsLegacyUuidMatch(t *testing.T) {
	users := []*object.User{
		{Owner: "built-in", Name: "aicodex-admin-dev", Id: "def793d3-0a95-4e1b-957d-4e9ed3f7e689"},
	}

	got := findInsightUserBySubject(users, "def793d3-0a95-4e1b-957d-4e9ed3f7e689")

	if got != users[0] {
		t.Fatalf("matched user = %+v, want legacy UUID subject", got)
	}
}

func TestParseInsightProviderClaimsAcceptsStandardJwtAccessToken(t *testing.T) {
	oldStandardParser := parseInsightStandardJwtTokenByApplication
	oldLegacyParser := parseInsightJwtTokenByApplication
	t.Cleanup(func() {
		parseInsightStandardJwtTokenByApplication = oldStandardParser
		parseInsightJwtTokenByApplication = oldLegacyParser
	})

	parseInsightStandardJwtTokenByApplication = func(token string, application *object.Application) (*object.ClaimsStandard, error) {
		if token != "standard-token" || application.ClientId != "aicodex-insight-dev" {
			t.Fatalf("standard parser input token=%q application=%+v", token, application)
		}
		return &object.ClaimsStandard{
			TokenType: "access-token",
			Scope:     "openid profile insight.scope.read",
			RegisteredClaims: jwt.RegisteredClaims{
				Issuer:   "http://localhost:8000",
				Subject:  "built-in/aicodex-admin-dev",
				Audience: jwt.ClaimStrings{"aicodex-insight-dev"},
			},
		}, nil
	}
	parseInsightJwtTokenByApplication = func(token string, application *object.Application) (*object.Claims, error) {
		t.Fatalf("legacy parser should not be used for JWT-Standard")
		return nil, nil
	}

	got, err := parseInsightProviderClaimsByApplication("standard-token", &object.Application{
		ClientId:    "aicodex-insight-dev",
		TokenFormat: "JWT-Standard",
	})
	if err != nil {
		t.Fatalf("parseInsightProviderClaimsByApplication returned error: %v", err)
	}
	if got.TokenType != "access-token" || got.Scope != "openid profile insight.scope.read" || got.Subject != "built-in/aicodex-admin-dev" {
		t.Fatalf("claims = %+v, want standard access-token claims", got)
	}
	if len(got.Audience) != 1 || got.Audience[0] != "aicodex-insight-dev" || got.Issuer != "http://localhost:8000" {
		t.Fatalf("registered claims = aud:%+v iss:%q, want standard OIDC claims", got.Audience, got.Issuer)
	}
}

func TestParseInsightProviderClaimsKeepsLegacyJwtAccessTokenPath(t *testing.T) {
	oldStandardParser := parseInsightStandardJwtTokenByApplication
	oldLegacyParser := parseInsightJwtTokenByApplication
	t.Cleanup(func() {
		parseInsightStandardJwtTokenByApplication = oldStandardParser
		parseInsightJwtTokenByApplication = oldLegacyParser
	})

	parseInsightStandardJwtTokenByApplication = func(token string, application *object.Application) (*object.ClaimsStandard, error) {
		t.Fatalf("standard parser should not be used for legacy JWT")
		return nil, nil
	}
	parseInsightJwtTokenByApplication = func(token string, application *object.Application) (*object.Claims, error) {
		if token != "legacy-token" || application.ClientId != "legacy-insight-client" {
			t.Fatalf("legacy parser input token=%q application=%+v", token, application)
		}
		return &object.Claims{
			TokenType: "access-token",
			Scope:     "insight.scope.read",
			RegisteredClaims: jwt.RegisteredClaims{
				Subject:  "legacy-user-uuid",
				Audience: jwt.ClaimStrings{"legacy-insight-client"},
			},
		}, nil
	}

	got, err := parseInsightProviderClaimsByApplication("legacy-token", &object.Application{
		ClientId:    "legacy-insight-client",
		TokenFormat: "JWT",
	})
	if err != nil {
		t.Fatalf("parseInsightProviderClaimsByApplication returned error: %v", err)
	}
	if got.Subject != "legacy-user-uuid" || got.Scope != "insight.scope.read" {
		t.Fatalf("claims = %+v, want legacy JWT claims", got)
	}
}

func TestInsightAllowedAudienceSelectionOnlyUsesConfiguredAudiences(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "insight-client")

	got := getInsightAllowedTokenAudiences([]string{"other-client", "insight-client"})
	if len(got) != 1 || got[0] != "insight-client" {
		t.Fatalf("allowed audiences = %+v, want only configured insight-client", got)
	}
	if isInsightAudienceAllowed([]string{"other-client"}) {
		t.Fatalf("unconfigured audience must not be accepted")
	}
	if !isInsightAudienceAllowed([]string{"insight-client"}) {
		t.Fatalf("configured audience should be accepted")
	}
}

func TestInsightAudienceRequiresExplicitConfiguration(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "")
	t.Setenv("insightProviderAudience", "")

	if isInsightAudienceAllowed([]string{"any-admin-client"}) {
		t.Fatalf("audience without explicit insight provider configuration must be rejected")
	}
}

func TestInsightRequiredScopesDefaultToInsightScopes(t *testing.T) {
	t.Setenv("insightProviderRequiredScopes", "")

	if hasInsightRequiredScopes("profile") {
		t.Fatalf("missing default insight scope should be rejected")
	}
	if !hasInsightRequiredScopes("profile insight.scope.read") {
		t.Fatalf("default insight scopes should be accepted")
	}
}

func TestInsightProviderTrustUsesSavedRuntimePolicyOverLegacyEnv(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "legacy-client")
	t.Setenv("insightProviderAllowedIssuers", "legacy-issuer")
	t.Setenv("insightProviderRequiredScopes", "legacy.scope")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:                  "insight_provider_trust",
		Enabled:              true,
		SourceClass:          "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{"allowedAudiences": []string{"saved-client"}, "requiredScopes": []string{"saved.scope"}, "allowedIssuerDigests": []string{testInsightIssuerDigest("saved-issuer")}, "issuerMode": "digest_allowlist"},
	}})

	if got := getInsightAllowedTokenAudiences([]string{"legacy-client", "saved-client"}); len(got) != 1 || got[0] != "saved-client" {
		t.Fatalf("saved policy should select only saved audience, got %+v", got)
	}
	if isInsightIssuerAllowed("legacy-issuer") {
		t.Fatalf("saved policy must not fall back to legacy issuer")
	}
	if !isInsightIssuerAllowed("saved-issuer") {
		t.Fatalf("saved issuer digest should be accepted")
	}
	if hasInsightRequiredScopes("legacy.scope") {
		t.Fatalf("saved policy must not fall back to legacy scopes")
	}
	if !hasInsightRequiredScopes("saved.scope") {
		t.Fatalf("saved scope should be accepted")
	}
}

func TestInsightProviderTrustSavedDisabledFailClosed(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "legacy-client")
	t.Setenv("insightProviderAllowedIssuers", "legacy-issuer")
	t.Setenv("insightProviderRequiredScopes", "legacy.scope")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:                  "insight_provider_trust",
		Enabled:              false,
		SourceClass:          "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{"allowedAudiences": []string{"saved-client"}, "requiredScopes": []string{"saved.scope"}, "allowedIssuerDigests": []string{testInsightIssuerDigest("saved-issuer")}, "issuerMode": "digest_allowlist"},
	}})

	if isInsightAudienceAllowed([]string{"legacy-client", "saved-client"}) {
		t.Fatalf("disabled saved policy should reject all audiences")
	}
	if isInsightIssuerAllowed("legacy-issuer") || isInsightIssuerAllowed("saved-issuer") {
		t.Fatalf("disabled saved policy should reject all issuers")
	}
	if hasInsightRequiredScopes("legacy.scope saved.scope") {
		t.Fatalf("disabled saved policy should reject all scopes")
	}
}

func TestInsightProviderTrustSavedMismatchDoesNotFallbackToEnv(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "legacy-client")
	t.Setenv("insightProviderAllowedIssuers", "legacy-issuer")
	t.Setenv("insightProviderRequiredScopes", "legacy.scope")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:                  "insight_provider_trust",
		Enabled:              true,
		SourceClass:          "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{"allowedAudiences": []string{"saved-client"}, "requiredScopes": []string{"saved.scope"}, "allowedIssuerDigests": []string{testInsightIssuerDigest("saved-issuer")}, "issuerMode": "digest_allowlist"},
	}})

	if isInsightAudienceAllowed([]string{"legacy-client"}) {
		t.Fatalf("legacy audience must not pass when saved policy is explicit")
	}
	if isInsightIssuerAllowed("legacy-issuer") {
		t.Fatalf("legacy issuer must not pass when saved policy is explicit")
	}
	if hasInsightRequiredScopes("legacy.scope") {
		t.Fatalf("legacy scope must not pass when saved policy is explicit")
	}
}

func TestInsightProviderTrustPolicyKeepsLegacyFallbackWithoutExplicitFields(t *testing.T) {
	t.Setenv("insightProviderAllowedAudiences", "legacy-client")
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:         "insight_provider_trust",
		Enabled:     true,
		SourceClass: "admin_config",
	}})

	policy := getInsightProviderTrustRuntimePolicy()
	if policy.Explicit {
		t.Fatalf("sparse saved trust group should not override legacy config: %#v", policy)
	}
	if !isInsightAudienceAllowed([]string{"legacy-client"}) {
		t.Fatalf("legacy audience should still be accepted without explicit saved policy")
	}
}

func TestInsightProviderTrustPolicySupportsAnyNonEmptyIssuerModeAndDefaultsScopes(t *testing.T) {
	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:         "insight_provider_trust",
		Enabled:     true,
		SourceClass: "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{
			"allowedAudiences": []interface{}{"saved-client"},
			"issuerMode":       "any_non_empty",
		},
	}})

	policy := getInsightProviderTrustRuntimePolicy()
	if !policy.Explicit || !policy.RequiredScopesDefaulted || !policy.CannotInfer {
		t.Fatalf("policy should default scopes and mark cannotInfer for any_non_empty: %#v", policy)
	}
	if !isInsightIssuerAllowed("any-saved-issuer") {
		t.Fatalf("any_non_empty issuer mode should accept non-empty issuer")
	}
	if !hasInsightRequiredScopes("profile insight.scope.read") {
		t.Fatalf("defaulted saved scopes should require existing insight defaults")
	}
}

func TestInsightProviderTrustPolicyStoreErrorFailsClosed(t *testing.T) {
	storeErr := errors.New("metadata store unavailable")
	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{Store: &memoryServiceCredentialGovernanceConfigStore{err: storeErr}}
	}
	defer func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	}()

	if isInsightAudienceAllowed([]string{"legacy-client"}) || isInsightIssuerAllowed("legacy-issuer") || hasInsightRequiredScopes("profile insight.scope.read") {
		t.Fatalf("metadata store error should fail closed")
	}
}

func TestInsightProviderTrustPolicyParsingCoversSparseAndJsonShapes(t *testing.T) {
	if policy := buildInsightProviderTrustRuntimePolicyFromConfig(nil); policy.Explicit {
		t.Fatalf("nil config should not be explicit: %#v", policy)
	}
	if policy := buildInsightProviderTrustRuntimePolicyFromConfig(&object.ServiceCredentialGovernanceConfigResponse{IsConfigured: false}); policy.Explicit {
		t.Fatalf("unconfigured response should not be explicit: %#v", policy)
	}
	if policy := buildInsightProviderTrustRuntimePolicyFromConfig(&object.ServiceCredentialGovernanceConfigResponse{IsConfigured: true, Groups: []object.ServiceCredentialGovernanceConfigGroup{{Key: "keep_in_env"}}}); policy.Explicit {
		t.Fatalf("missing trust group should not be explicit: %#v", policy)
	}
	policy := map[string]interface{}{
		"allowedAudiences":     "saved-client",
		"requiredScopes":       []interface{}{"profile", "insight.scope.read"},
		"allowedIssuerDigests": []string{testInsightIssuerDigest("saved-issuer")},
		"issuerMode":           "digest_allowlist",
		"ignoredNumber":        123,
	}
	if got := insightPolicyString(policy, "issuerMode"); got != "digest_allowlist" {
		t.Fatalf("issuer mode = %q, want digest_allowlist", got)
	}
	if got := insightPolicyString(policy, "ignoredNumber"); got != "" {
		t.Fatalf("non-string policy value should return empty string, got %q", got)
	}
	if got := insightPolicyStringSlice(policy, "allowedAudiences"); len(got) != 1 || got[0] != "saved-client" {
		t.Fatalf("string policy value should normalize to slice, got %#v", got)
	}
	if got := insightPolicyStringSlice(policy, "requiredScopes"); len(got) != 2 || got[0] != "insight.scope.read" || got[1] != "profile" {
		t.Fatalf("json array policy value should normalize and sort, got %#v", got)
	}
	if got := insightPolicyStringSlice(policy, "ignoredNumber"); got != nil {
		t.Fatalf("unsupported policy value should return nil, got %#v", got)
	}
	if hasInsightProviderTrustRuntimePolicyFields(object.ServiceCredentialGovernanceConfigGroup{}) {
		t.Fatalf("empty trust group should not have explicit policy fields")
	}
	if hasInsightProviderTrustRuntimePolicyFields(object.ServiceCredentialGovernanceConfigGroup{BoundedRuntimePolicy: map[string]interface{}{"timeoutMs": 1000}}) {
		t.Fatalf("unrelated bounded policy key should not mark trust policy explicit")
	}
	if !hasInsightProviderTrustRuntimePolicyFields(object.ServiceCredentialGovernanceConfigGroup{BoundedRuntimePolicy: map[string]interface{}{"issuerMode": "digest_allowlist"}}) {
		t.Fatalf("issuerMode should mark trust policy explicit")
	}
}

func testInsightIssuerDigest(issuer string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(issuer)))
	return fmt.Sprintf("sha256:%x", sum[:])
}

func TestInsightOrganizationTreeOnlyReturnsManageableGroupNodes(t *testing.T) {
	currentUser := &object.User{Owner: "org-a", Name: "lead"}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
		{Owner: "org-a", Name: "platform", DisplayName: "Platform", ParentId: "dev"},
		{Owner: "org-b", Name: "external", DisplayName: "External", Manager: "org-a/lead"},
	}

	got := buildInsightOrganizationTree(currentUser, groups)
	if len(got) != 2 {
		t.Fatalf("visible node len = %d, want 2: %+v", len(got), got)
	}

	root := got[0]
	if root.DepartmentId != "org-a/dev" || root.DepartmentPath != "Dev" || !root.HasChildren || root.SourceType != "group" {
		t.Fatalf("root node = %+v, want dev node with path and children", root)
	}
	if root.LifecycleStatus != object.PlatformLifecycleStatusActive {
		t.Fatalf("root lifecycle status = %q, want ACTIVE", root.LifecycleStatus)
	}
	child := got[1]
	if child.DepartmentId != "org-a/platform" || child.ParentDepartmentId != "org-a/dev" || child.DepartmentPath != "Dev/Platform" || child.HasChildren {
		t.Fatalf("child node = %+v, want platform child under dev", child)
	}
}

func TestInsightGlobalAdminOrganizationTreeUsesRequestedOrganization(t *testing.T) {
	currentUser := &object.User{Owner: "built-in", Name: "admin"}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev"},
		{Owner: "built-in", Name: "ops", DisplayName: "Ops"},
	}

	got := buildInsightOrganizationTreeForOrganization(currentUser, "org-a", groups)
	if len(got) != 1 {
		t.Fatalf("visible node len = %d, want 1 org-a node: %+v", len(got), got)
	}
	if got[0].DepartmentId != "org-a/dev" || got[0].DepartmentName != "Dev" {
		t.Fatalf("node = %+v, want requested organization node", got[0])
	}
}

func TestInsightOrganizationTreeReturnsEmptyForUserWithoutManagedGroups(t *testing.T) {
	currentUser := &object.User{Owner: "org-a", Name: "member"}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
	}

	got := buildInsightOrganizationTree(currentUser, groups)
	if len(got) != 0 {
		t.Fatalf("visible nodes = %+v, want empty tree for user without managed groups", got)
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func findInsightDepartmentScope(departments []InsightDepartmentScope, departmentId string) *InsightDepartmentScope {
	for i := range departments {
		if departments[i].DepartmentId == departmentId {
			return &departments[i]
		}
	}
	return nil
}

func installInsightPlatformApiMappingFixtures(t *testing.T, organizationId string, apiOrganizationId string, userMappings map[string]string) {
	t.Helper()
	originalOrgLookup := getInsightPlatformApiOrganizationMappingFunc
	originalUserLookup := getInsightPlatformApiUserMappingByAdminSubjectFunc

	orgMappings := map[string]*object.PlatformApiOrganizationMapping{}
	if organizationId != "" && apiOrganizationId != "" {
		orgMappings[organizationId] = &object.PlatformApiOrganizationMapping{
			OrganizationId:    organizationId,
			ApiOrganizationId: apiOrganizationId,
			MappingStatus:     object.PlatformMappingStatusConfirmed,
			MappingSource:     object.PlatformApiMappingSourceManual,
		}
	}

	userMappingByKey := map[string]*object.PlatformApiUserMapping{}
	for adminSubject, apiUserId := range userMappings {
		userMappingByKey[organizationId+"\x00"+adminSubject] = &object.PlatformApiUserMapping{
			OrganizationId: organizationId,
			AdminSubject:   adminSubject,
			ApiUserId:      apiUserId,
			MappingStatus:  object.PlatformMappingStatusConfirmed,
			MappingSource:  object.PlatformApiMappingSourceManual,
		}
	}

	getInsightPlatformApiOrganizationMappingFunc = func(organizationId string) (*object.PlatformApiOrganizationMapping, error) {
		if mapping := orgMappings[organizationId]; mapping != nil {
			return mapping, nil
		}
		return nil, object.ErrPlatformApiOrganizationMappingMissing
	}
	getInsightPlatformApiUserMappingByAdminSubjectFunc = func(organizationId string, adminSubject string) (*object.PlatformApiUserMapping, error) {
		if mapping := userMappingByKey[organizationId+"\x00"+adminSubject]; mapping != nil {
			return mapping, nil
		}
		return nil, object.ErrPlatformApiUserMappingMissing
	}
	t.Cleanup(func() {
		getInsightPlatformApiOrganizationMappingFunc = originalOrgLookup
		getInsightPlatformApiUserMappingByAdminSubjectFunc = originalUserLookup
	})
}
