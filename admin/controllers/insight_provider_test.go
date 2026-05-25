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
		{Owner: "org-b", Name: "outside", Properties: map[string]string{"aicodexApiUserId": "999"}},
	}

	got, providerErr := calculateInsightScope(currentUser, users, nil, generatedAt)
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
	if got.ApiOrganizationId != "00000000-0000-7000-8000-000000000123" {
		t.Fatalf("ApiOrganizationId = %q, want configured aicodex-api organization", got.ApiOrganizationId)
	}
	if containsString(got.AdminUserIds, "org-b/outside") || containsString(got.ApiUserIds, "999") {
		t.Fatalf("organization admin scope crossed organization boundary: %+v", got)
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

func TestInsightScopeReturnsAuthorizationFailedForMissingDepartmentMapping(t *testing.T) {
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
	}
	groups := []*object.Group{
		{Owner: "org-a", Name: "dev", DisplayName: "Dev", Manager: "org-a/lead"},
	}

	got, providerErr := calculateInsightScope(currentUser, users, groups, generatedAt)
	if providerErr == nil {
		t.Fatalf("calculateInsightScope returned scope %+v, want AUTHORIZATION_FAILED", got)
	}
	if providerErr.Code != InsightProviderErrorAuthorizationFailed || providerErr.MappingStatus != MappingStatusMissing {
		t.Fatalf("providerErr = %+v, want AUTHORIZATION_FAILED with MISSING mapping", providerErr)
	}
	if got != nil && got.ScopeType == ScopeTypeEmpty {
		t.Fatalf("mapping failure must not be downgraded to EMPTY scope: %+v", got)
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
