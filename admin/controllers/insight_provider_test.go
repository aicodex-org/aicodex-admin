package controllers

import (
	"encoding/json"
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
		Properties: map[string]string{
			"aicodexApiUserId":         "101",
			"aicodexApiOrganizationId": "00000000-0000-7000-8000-000000000123",
		},
	}

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
		Properties: map[string]string{
			"aicodexApiUserId":         "100",
			"aicodexApiOrganizationId": "00000000-0000-7000-8000-000000000123",
		},
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Properties: map[string]string{"aicodexApiUserId": "101"}},
		{Owner: "org-a", Name: "unmapped"},
		{Owner: "org-b", Name: "outside", Properties: map[string]string{"aicodexApiUserId": "999"}},
	}

	got, providerErr := calculateInsightScopeForOrganizationWithResolver(currentUser, "org-a", users, nil, generatedAt, nil, "trace-admin-scope")
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
		Properties: map[string]string{
			"aicodexApiUserId":         "100",
			"aicodexApiOrganizationId": "00000000-0000-7000-8000-000000000123",
		},
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "dev-a", Groups: []string{"org-a/dev"}, Properties: map[string]string{"aicodexApiUserId": "101"}},
		{Owner: "org-a", Name: "dev-b", Groups: []string{"org-a/dev"}, Properties: map[string]string{"aicodexApiUserId": "102"}},
		{Owner: "org-a", Name: "qa-a", Groups: []string{"org-a/qa"}, Properties: map[string]string{"aicodexApiUserId": "201"}},
		{Owner: "org-a", Name: "missing", Groups: []string{"org-a/dev"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev"},
		{Owner: "org-a", Name: "qa", DisplayName: "QA"},
	}

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
		Properties: map[string]string{
			"aicodexApiUserId": "100",
		},
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Groups: []string{"org-a/wecom-dept-2"}, Properties: map[string]string{"aicodexApiUserId": "101"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "wecom-dept-2", DisplayName: "研发", Type: object.WecomDepartmentGroupType, IsEnabled: true},
	}
	departmentMetadata := buildInsightDepartmentSourceMetadataIndex([]*object.PlatformDepartment{
		{
			OrganizationId:     "org-a",
			DepartmentId:       "org-a/wecom-dept-2",
			SourceConnectionId: sourceConnectionId,
			LifecycleStatus:    object.PlatformLifecycleStatusActive,
		},
	})

	scope, providerErr := calculateInsightScopeForOrganizationWithResolverAndDepartmentMetadata(currentUser, "org-a", users, groups, generatedAt, nil, "trace-source-metadata", departmentMetadata)
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

func TestInsightScopeRejectsForbiddenOrDeletedCurrentUser(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	for _, currentUser := range []*object.User{
		{Owner: "org-a", Name: "forbidden", IsForbidden: true, Properties: map[string]string{"aicodexApiUserId": "102"}},
		{Owner: "org-a", Name: "deleted", IsDeleted: true, Properties: map[string]string{"aicodexApiUserId": "103"}},
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
	currentUser := &object.User{Owner: "org-a", Name: "owner", IsAdmin: true, Properties: map[string]string{"aicodexApiUserId": "100"}}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Properties: map[string]string{"aicodexApiUserId": "101"}},
		{Owner: "org-a", Name: "forbidden", IsForbidden: true, Properties: map[string]string{"aicodexApiUserId": "102"}},
		{Owner: "org-a", Name: "deleted", IsDeleted: true, Properties: map[string]string{"aicodexApiUserId": "103"}},
	}

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
		Properties: map[string]string{
			"aicodexApiUserId": "200",
		},
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "missing", Groups: []string{"org-a/dev"}},
		{Owner: "org-a", Name: "mapped", Groups: []string{"org-a/dev"}, Properties: map[string]string{"aicodexApiUserId": "201"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
	}

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

func TestInsightQueryableScopeSkipsResolverMissingUsers(t *testing.T) {
	users := []*object.User{
		{Owner: "org-a", Name: "mapped", Id: "subject-mapped"},
		{Owner: "org-a", Name: "missing", Id: "subject-missing"},
	}
	resolver := &stubInsightUsageIdentityResolver{results: []insightUsageIdentityResolveResult{
		{RequestId: "org-a/mapped", MappingStatus: MappingStatusOK, ApiUserId: 201},
		{RequestId: "org-a/missing", MappingStatus: MappingStatusMissing},
	}}

	adminUserIds, apiUserIds, mappingStatus, providerErr := mapInsightQueryableUsersToUsageIdsWithResolver(users, resolver, "trace-skip-missing")
	if providerErr != nil {
		t.Fatalf("mapInsightQueryableUsersToUsageIdsWithResolver returned error: %+v", providerErr)
	}
	if mappingStatus != MappingStatusOK {
		t.Fatalf("mappingStatus = %q, want OK when resolver reports missing queryable users", mappingStatus)
	}
	if !containsString(adminUserIds, "org-a/mapped") || !containsString(apiUserIds, "201") {
		t.Fatalf("mapped user was not retained: adminUserIds=%+v apiUserIds=%+v", adminUserIds, apiUserIds)
	}
	if containsString(adminUserIds, "org-a/missing") {
		t.Fatalf("resolver missing user should be skipped for queryable scopes: %+v", adminUserIds)
	}
}

func TestInsightScopeReturnsAuthorizationFailedForAmbiguousMapping(t *testing.T) {
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
	if providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusAmbiguous {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with AMBIGUOUS mapping", providerErr)
	}
	if got != nil && got.ScopeType == ScopeTypeEmpty {
		t.Fatalf("ambiguous mapping must not be downgraded to EMPTY scope: %+v", got)
	}
}

func TestInsightScopeReturnsAuthorizationFailedForInvalidAPIUserID(t *testing.T) {
	generatedAt := time.Date(2026, 5, 21, 8, 0, 0, 0, time.UTC)
	currentUser := &object.User{
		Owner: "org-a",
		Name:  "member",
		Properties: map[string]string{
			"aicodexApiUserId": "api-user-member",
		},
	}

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
		Properties: map[string]string{
			"aicodexApiUserId": "201",
		},
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Properties: map[string]string{"aicodexApiUserId": "201"}},
	}

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
		Properties: map[string]string{
			"aicodexApiUserId": "200",
		},
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
		Properties: map[string]string{
			"aicodexApiUserId": "200",
		},
	}
	users := []*object.User{
		currentUser,
		{Owner: "org-a", Name: "member", Groups: []string{"org-a/dev"}, Properties: map[string]string{"aicodexApiUserId": "201"}},
		{Owner: "org-a", Name: "child", Groups: []string{"org-a/platform"}, Properties: map[string]string{"aicodexApiUserId": "202"}},
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "lead"},
		{Owner: "org-a", Name: "platform", DisplayName: "Platform", ParentId: "dev"},
	}

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
