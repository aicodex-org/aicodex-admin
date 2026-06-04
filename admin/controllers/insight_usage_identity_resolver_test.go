package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

type stubInsightUsageIdentityResolver struct {
	results       []insightUsageIdentityResolveResult
	providerErr   *InsightProviderError
	capturedItems []insightUsageIdentityResolveItem
	callCount     int
}

type insightUsageIdentityResolverRoundTripFunc func(req *http.Request) (*http.Response, error)

func (f insightUsageIdentityResolverRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func (s *stubInsightUsageIdentityResolver) Enabled() bool {
	return true
}

func (s *stubInsightUsageIdentityResolver) Resolve(traceId string, items []insightUsageIdentityResolveItem) ([]insightUsageIdentityResolveResult, *InsightProviderError) {
	s.callCount++
	s.capturedItems = append(s.capturedItems, items...)
	if s.providerErr != nil {
		return nil, s.providerErr
	}
	return s.results, nil
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

func TestInsightCurrentUserUsesWecomResolverWhenManualMappingMissing(t *testing.T) {
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
	resolver := &stubInsightUsageIdentityResolver{
		results: []insightUsageIdentityResolveResult{
			{RequestId: "org-a/huangfanli", MappingStatus: MappingStatusOK, ApiUserId: 101},
		},
	}

	got, providerErr := buildInsightCurrentUserResponseWithResolver(user, nil, nil, generatedAt, resolver, "trace-current-user")
	if providerErr != nil {
		t.Fatalf("buildInsightCurrentUserResponseWithResolver returned error: %+v", providerErr)
	}
	if got.UsageIdentity.ApiUserId != "101" || got.UsageIdentity.MappingStatus != MappingStatusOK || got.UsageIdentity.MappingSource != "wecom.resolver" {
		t.Fatalf("UsageIdentity = %+v, want resolver OK mapping", got.UsageIdentity)
	}
	if resolver.callCount != 1 || len(resolver.capturedItems) != 1 {
		t.Fatalf("resolver calls = %d items=%+v, want one item", resolver.callCount, resolver.capturedItems)
	}
	item := resolver.capturedItems[0]
	if item.RequestId != "org-a/huangfanli" || item.AdminSubject != "admin-subject-huangfanli" || item.WecomExternalId != "wecom:ww123:huangfanli" {
		t.Fatalf("resolver item = %+v, want admin subject and WeCom external identity", item)
	}
	if item.SourceConnectionId != object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123") || item.SourceType != object.SourceTypeWecom || item.ExternalSubjectId != "huangfanli" {
		t.Fatalf("resolver item source-neutral fields = %+v", item)
	}
}

func TestInsightCurrentUserRejectsUnexpectedResolverRequestId(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	user := &object.User{Owner: "org-a", Name: "huangfanli", Id: "admin-subject-huangfanli"}
	resolver := &stubInsightUsageIdentityResolver{
		results: []insightUsageIdentityResolveResult{
			{RequestId: "org-a/other", MappingStatus: MappingStatusOK, ApiUserId: 999},
		},
	}

	got, providerErr := buildInsightCurrentUserResponseWithResolver(user, nil, nil, generatedAt, resolver, "trace-current-user")
	if got != nil {
		t.Fatalf("response = %+v, want nil for unexpected resolver requestId", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want PROVIDER_UNAVAILABLE for resolver protocol mismatch", providerErr)
	}
}

func TestInsightCurrentUserRejectsOmittedResolverRequestId(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	user := &object.User{Owner: "org-a", Name: "huangfanli", Id: "admin-subject-huangfanli"}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{}}

	got, providerErr := buildInsightCurrentUserResponseWithResolver(user, nil, nil, generatedAt, resolver, "trace-current-user")
	if got != nil {
		t.Fatalf("response = %+v, want nil when resolver omits requestId", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want PROVIDER_UNAVAILABLE for omitted resolver requestId", providerErr)
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

func TestInsightCurrentUserReturnsUnavailableWhenResolverFails(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	user := &object.User{Owner: "org-a", Name: "huangfanli", Id: "admin-subject-huangfanli"}
	resolver := &stubInsightUsageIdentityResolver{
		providerErr: newInsightProviderError(InsightProviderErrorUnavailable, "api resolver unavailable", "trace-current-user", ""),
	}

	got, providerErr := buildInsightCurrentUserResponseWithResolver(user, nil, nil, generatedAt, resolver, "trace-current-user")
	if got != nil {
		t.Fatalf("response = %+v, want nil when resolver unavailable", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want PROVIDER_UNAVAILABLE", providerErr)
	}
}

func TestInsightDepartmentScopeUsesResolverBatchAndBackfillsApiUserIds(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead", Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/dev"}, Wecom: "member-a", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "member-a"}},
		{Owner: "org-a", Name: "member-b", Id: "subject-b", Groups: []string{"org-a/dev"}, Wecom: "member-b", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "member-b"}},
	}
	groups := []*object.Group{{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"}}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusOK, ApiUserId: 201},
		{RequestId: "org-a/member-b", MappingStatus: MappingStatusOK, ApiUserId: 202},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-scope")
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganizationWithResolver returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeDepartmentTree || len(got.Departments) != 1 {
		t.Fatalf("scope = %+v, want department tree", got)
	}
	if !reflect.DeepEqual(got.ApiUserIds, []string{"201", "202"}) {
		t.Fatalf("top apiUserIds = %+v, want [201 202]", got.ApiUserIds)
	}
	if !reflect.DeepEqual(got.Departments[0].ApiUserIds, []string{"201", "202"}) {
		t.Fatalf("department apiUserIds = %+v, want [201 202]", got.Departments[0].ApiUserIds)
	}
	if resolver.callCount != 1 || len(resolver.capturedItems) != 2 {
		t.Fatalf("resolver calls = %d items=%+v, want one batch with two members", resolver.callCount, resolver.capturedItems)
	}
}

func TestInsightScopeRejectsDuplicateResolverRequestId(t *testing.T) {
	users := []*object.User{{Owner: "org-a", Name: "member", Id: "subject-member"}}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member", MappingStatus: MappingStatusOK, ApiUserId: 201},
		{RequestId: "org-a/member", MappingStatus: MappingStatusOK, ApiUserId: 202},
	}}

	_, _, _, providerErr := mapInsightQueryableUsersToUsageIdsWithResolver(users, resolver, "trace-duplicate-request")
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want PROVIDER_UNAVAILABLE for duplicate resolver requestId", providerErr)
	}
}

func TestInsightScopeRejectsOmittedResolverRequestId(t *testing.T) {
	users := []*object.User{
		{Owner: "org-a", Name: "member-a", Id: "subject-a"},
		{Owner: "org-a", Name: "member-b", Id: "subject-b"},
	}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusOK, ApiUserId: 201},
	}}

	_, _, _, providerErr := mapInsightQueryableUsersToUsageIdsWithResolver(users, resolver, "trace-omitted-request")
	if providerErr == nil || providerErr.Code != InsightProviderErrorUnavailable {
		t.Fatalf("providerErr = %+v, want PROVIDER_UNAVAILABLE for omitted resolver requestId", providerErr)
	}
}

func TestInsightDepartmentScopeSkipsResolverMissingMapping(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead", Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/dev"}},
	}
	groups := []*object.Group{{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"}}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusMissing},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-scope")
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganizationWithResolver returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeEmpty || len(got.AdminUserIds) != 0 || len(got.ApiUserIds) != 0 {
		t.Fatalf("scope = %+v, want EMPTY scope after skipping missing department users", got)
	}
}

func TestInsightSelfScopeRejectsResolverMissingMapping(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "member", Id: "subject-member"}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member", MappingStatus: MappingStatusMissing},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", []*object.User{currentUser}, nil, generatedAt, resolver, "trace-scope")
	if got != nil {
		t.Fatalf("scope = %+v, want nil for missing self resolver mapping", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with MISSING", providerErr)
	}
}

func TestInsightDepartmentScopeRejectsResolverAmbiguousMapping(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead", Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/dev"}},
	}
	groups := []*object.Group{{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"}}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusAmbiguous},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-scope")
	if got != nil {
		t.Fatalf("scope = %+v, want nil for ambiguous resolver mapping", got)
	}
	if providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusAmbiguous {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with AMBIGUOUS", providerErr)
	}
}

func TestInsightDepartmentScopeBatchesResolverCandidatesAcrossDepartments(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead", Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/dev"}},
		{Owner: "org-a", Name: "member-b", Id: "subject-b", Groups: []string{"org-a/ops"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
		{Owner: "org-a", Name: "ops", DisplayName: "Ops", Manager: "org-a/lead"},
	}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusOK, ApiUserId: 201},
		{RequestId: "org-a/member-b", MappingStatus: MappingStatusOK, ApiUserId: 202},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-scope")
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganizationWithResolver returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeDepartmentTree || len(got.Departments) != 2 {
		t.Fatalf("scope = %+v, want two departments", got)
	}
	if resolver.callCount != 1 || len(resolver.capturedItems) != 2 {
		t.Fatalf("resolver calls = %d items=%+v, want one de-duplicated batch", resolver.callCount, resolver.capturedItems)
	}
}

func TestInsightAllCompanyScopeReusesResolverCacheAcrossDepartments(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "admin", IsAdmin: true, Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/dev"}, Wecom: "member-a", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "member-a"}},
		{Owner: "org-a", Name: "member-b", Id: "subject-b", Groups: []string{"org-a/ops"}, Wecom: "member-b", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "member-b"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev"},
		{Owner: "org-a", Name: "ops", DisplayName: "Ops"},
	}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusOK, ApiUserId: 201},
		{RequestId: "org-a/member-b", MappingStatus: MappingStatusOK, ApiUserId: 202},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-all-company")
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganizationWithResolver returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeAllCompany || len(got.Departments) != 2 {
		t.Fatalf("scope = %+v, want all-company scope with two departments", got)
	}
	if resolver.callCount != 1 || len(resolver.capturedItems) != 2 {
		t.Fatalf("resolver calls = %d items=%+v, want one preheated batch reused by departments", resolver.callCount, resolver.capturedItems)
	}
}

func TestInsightDepartmentScopeReusesResolverMissingCacheAcrossDepartments(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead", Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/backend"}, Wecom: "member-a", Properties: map[string]string{object.WecomUserPropertyCorpId: "ww123", object.WecomUserPropertyUserId: "member-a"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
		{Owner: "org-a", Name: "backend", DisplayName: "Backend", ParentId: "dev", Manager: "org-a/lead"},
	}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusMissing},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-missing-cache")
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganizationWithResolver returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeEmpty {
		t.Fatalf("scope = %+v, want empty scope when only missing mappings exist", got)
	}
	if resolver.callCount != 1 || len(resolver.capturedItems) != 1 {
		t.Fatalf("resolver calls = %d items=%+v, want one preheated missing mapping reused by departments", resolver.callCount, resolver.capturedItems)
	}
}

func TestInsightDepartmentScopeDeduplicatesOverlappingResolverCandidates(t *testing.T) {
	generatedAt := time.Date(2026, 5, 29, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{Owner: "org-a", Name: "lead", Properties: map[string]string{"aicodexApiUserId": "200"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member-a", Id: "subject-a", Groups: []string{"org-a/backend"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
		{Owner: "org-a", Name: "backend", DisplayName: "Backend", ParentId: "dev", Manager: "org-a/lead"},
	}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/member-a", MappingStatus: MappingStatusOK, ApiUserId: 201},
	}}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, groups, generatedAt, resolver, "trace-scope")
	if providerErr != nil {
		t.Fatalf("calculateInsightScopeForOrganizationWithResolver returned error: %+v", providerErr)
	}
	if got.ScopeType != ScopeTypeDepartmentTree || len(got.Departments) != 2 {
		t.Fatalf("scope = %+v, want parent and child departments", got)
	}
	if resolver.callCount != 1 || len(resolver.capturedItems) != 1 {
		t.Fatalf("resolver calls = %d items=%+v, want one de-duplicated item", resolver.callCount, resolver.capturedItems)
	}
}
