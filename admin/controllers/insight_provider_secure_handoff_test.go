package controllers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestInsightProviderSecureHandoffTrustFailuresStayAuthorizationFailed(t *testing.T) {
	auth := &object.AdminSecureHandoffProviderCredentialAuth{
		Issuer:             object.AdminSecureHandoffIssuer,
		Subject:            "built-in/admin",
		Audience:           "insight_profile_admin_handoff",
		Scope:              object.AdminSecureHandoffProviderRuntimeScope,
		TargetOrganization: "business-org",
		User:               &object.User{Owner: "built-in", Name: "admin", Roles: []*object.Role{}},
	}

	t.Run("saved disabled", func(t *testing.T) {
		withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
			Key:         object.ServiceCredentialRuntimeGroupInsightProviderTrust,
			Enabled:     false,
			SourceClass: "admin_config",
			BoundedRuntimePolicy: map[string]interface{}{
				"allowedAudiences": []string{"insight_profile_admin_handoff"},
				"requiredScopes":   []string{"profile", "insight.scope.read"},
				"issuerMode":       "any_non_empty",
			},
		}})
		controller, _ := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user", "GetInsightCurrentUser", auth)
		if user, providerErr := controller.requireInsightProviderUser("trace-disabled"); user != nil || providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed {
			t.Fatalf("saved disabled result = user:%#v error:%#v", user, providerErr)
		}
	})

	t.Run("store unavailable", func(t *testing.T) {
		originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
			return &object.ServiceCredentialGovernanceConfigService{Store: &memoryServiceCredentialGovernanceConfigStore{err: errors.New("store unavailable")}}
		}
		t.Cleanup(func() {
			applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
		})
		controller, _ := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user", "GetInsightCurrentUser", auth)
		if user, providerErr := controller.requireInsightProviderUser("trace-store"); user != nil || providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed {
			t.Fatalf("store unavailable result = user:%#v error:%#v", user, providerErr)
		}
	})

	t.Run("invalid saved policy", func(t *testing.T) {
		originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
			return &object.ServiceCredentialGovernanceConfigService{Store: &memoryServiceCredentialGovernanceConfigStore{config: &object.ServiceCredentialGovernanceConfig{
				ConfigJson: `{"source":"admin_config","isConfigured":true,"groups":[{"key":"insight_provider_trust","enabled":true,"sourceClass":"admin_config","boundedRuntimePolicy":{"allowedAudiences":["insight_profile_admin_handoff"],"requiredScopes":123,"issuerMode":"any_non_empty"}}]}`,
			}}}
		}
		t.Cleanup(func() {
			applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
		})
		controller, _ := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user", "GetInsightCurrentUser", auth)
		if user, providerErr := controller.requireInsightProviderUser("trace-invalid"); user != nil || providerErr == nil || providerErr.Code != InsightProviderErrorAuthorizationFailed {
			t.Fatalf("invalid saved policy result = user:%#v error:%#v", user, providerErr)
		}
	})
}

func TestInsightProviderSecureHandoffContextRejectsMismatchedAuthorizationClaims(t *testing.T) {
	baseAuth := object.AdminSecureHandoffProviderCredentialAuth{
		Issuer:             object.AdminSecureHandoffIssuer,
		Subject:            "built-in/admin",
		Audience:           "insight_profile_admin_handoff",
		Scope:              object.AdminSecureHandoffProviderRuntimeScope,
		TargetOrganization: "business-org",
		User:               &object.User{Owner: "built-in", Name: "admin", Roles: []*object.Role{}},
	}
	tests := []struct {
		name     string
		auth     object.AdminSecureHandoffProviderCredentialAuth
		policy   map[string]interface{}
		wantCode string
	}{
		{
			name: "missing target organization",
			auth: func() object.AdminSecureHandoffProviderCredentialAuth {
				auth := baseAuth
				auth.TargetOrganization = ""
				return auth
			}(),
			policy: map[string]interface{}{
				"allowedAudiences": []string{"insight_profile_admin_handoff"},
				"requiredScopes":   []string{"profile", "insight.scope.read"},
				"issuerMode":       "any_non_empty",
			},
			wantCode: InsightProviderErrorUnauthenticated,
		},
		{
			name: "built-in target organization",
			auth: func() object.AdminSecureHandoffProviderCredentialAuth {
				auth := baseAuth
				auth.TargetOrganization = "built-in"
				return auth
			}(),
			policy: map[string]interface{}{
				"allowedAudiences": []string{"insight_profile_admin_handoff"},
				"requiredScopes":   []string{"profile", "insight.scope.read"},
				"issuerMode":       "any_non_empty",
			},
			wantCode: InsightProviderErrorUnauthenticated,
		},
		{
			name: "audience mismatch",
			auth: baseAuth,
			policy: map[string]interface{}{
				"allowedAudiences": []string{"other-audience"},
				"requiredScopes":   []string{"profile", "insight.scope.read"},
				"issuerMode":       "any_non_empty",
			},
			wantCode: InsightProviderErrorAuthorizationFailed,
		},
		{
			name: "issuer mismatch",
			auth: baseAuth,
			policy: map[string]interface{}{
				"allowedAudiences":     []string{"insight_profile_admin_handoff"},
				"requiredScopes":       []string{"profile", "insight.scope.read"},
				"allowedIssuerDigests": []string{testInsightIssuerDigest("other-issuer")},
				"issuerMode":           "digest_allowlist",
			},
			wantCode: InsightProviderErrorAuthorizationFailed,
		},
		{
			name: "scope mismatch",
			auth: baseAuth,
			policy: map[string]interface{}{
				"allowedAudiences": []string{"insight_profile_admin_handoff"},
				"requiredScopes":   []string{"custom.scope"},
				"issuerMode":       "any_non_empty",
			},
			wantCode: InsightProviderErrorAuthorizationFailed,
		},
		{
			name: "inactive user",
			auth: func() object.AdminSecureHandoffProviderCredentialAuth {
				auth := baseAuth
				auth.User = &object.User{Owner: "built-in", Name: "admin", IsForbidden: true, Roles: []*object.Role{}}
				return auth
			}(),
			policy: map[string]interface{}{
				"allowedAudiences": []string{"insight_profile_admin_handoff"},
				"requiredScopes":   []string{"profile", "insight.scope.read"},
				"issuerMode":       "any_non_empty",
			},
			wantCode: InsightProviderErrorAuthorizationFailed,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
				Key:                  object.ServiceCredentialRuntimeGroupInsightProviderTrust,
				Enabled:              true,
				SourceClass:          "admin_config",
				BoundedRuntimePolicy: tc.policy,
			}})
			controller, _ := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user", "GetInsightCurrentUser", &tc.auth)
			if user, providerErr := controller.requireInsightProviderUser("trace-mismatch"); user != nil || providerErr == nil || providerErr.Code != tc.wantCode {
				t.Fatalf("mismatch result = user:%#v error:%#v", user, providerErr)
			}
		})
	}

	controller, _ := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user", "GetInsightCurrentUser", &baseAuth)
	controller.Ctx.Input.SetData(object.AdminSecureHandoffProviderCredentialContextKey, "invalid-context-type")
	if user, providerErr := controller.requireInsightProviderUser("trace-invalid-context"); user != nil || providerErr == nil || providerErr.Code != InsightProviderErrorUnauthenticated {
		t.Fatalf("invalid context result = user:%#v error:%#v", user, providerErr)
	}
}

func TestInsightProviderSecureHandoffCredentialCallsCurrentUserAndScope(t *testing.T) {
	now := time.Date(2026, 7, 16, 6, 0, 0, 0, time.UTC)
	user := &object.User{Owner: "built-in", Name: "admin", DisplayName: "Admin", Roles: []*object.Role{}, Groups: []string{}}
	service := &object.AdminSecureHandoffGrantService{
		Store: object.NewMemoryAdminSecureHandoffGrantStore(),
		Now:   func() time.Time { return now },
		UserLookup: func(userId string) (*object.User, error) {
			return user, nil
		},
	}
	created, err := service.CreateGrant(object.AdminSecureHandoffCreateGrantRequest{
		Subject:              user.GetId(),
		TargetRegistrationId: "insight-profile-import-v1",
		TargetWorkspaceId:    "insight-business-service",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         object.AdminSecureHandoffProviderType,
		Audience:             "insight_profile_admin_handoff",
		PackageHash:          "sha256:provider-controller",
		TTLSeconds:           300,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}
	redeemed, err := service.RedeemGrant(object.AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce,
		TargetRegistrationId: created.SecureHandoffGrant.TargetRegistrationId,
		TargetWorkspaceId:    created.SecureHandoffGrant.TargetWorkspaceId,
		EnvironmentId:        created.SecureHandoffGrant.EnvironmentId,
		ProviderType:         created.SecureHandoffGrant.ProviderType,
		Audience:             created.SecureHandoffGrant.Audience,
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err != nil {
		t.Fatalf("RedeemGrant() error = %v", err)
	}
	if _, err = service.ConfirmGrant(object.AdminSecureHandoffConfirmGrantRequest{
		GrantId:         created.SecureHandoffGrant.GrantId,
		Nonce:           created.SecureHandoffGrant.Nonce,
		SecretBindingId: "binding-controller",
		SecretRevision:  "rev-controller",
		ConfigDigest:    "sha256:controller-config",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	}); err != nil {
		t.Fatalf("ConfirmGrant() error = %v", err)
	}
	auth, authErr := service.AuthenticateProviderCredential(redeemed.CredentialMaterial)
	if authErr != nil {
		t.Fatalf("AuthenticateProviderCredential() error = %v", authErr)
	}

	withServiceCredentialGovernanceStatusConfig(t, []object.ServiceCredentialGovernanceConfigGroup{{
		Key:         object.ServiceCredentialRuntimeGroupInsightProviderTrust,
		Enabled:     true,
		SourceClass: "admin_config",
		BoundedRuntimePolicy: map[string]interface{}{
			"allowedAudiences": []string{"insight_profile_admin_handoff"},
			"requiredScopes":   []string{"profile", "insight.scope.read"},
			"issuerMode":       "any_non_empty",
		},
	}})
	businessMember := &object.User{Owner: "business-org", Name: "member", DisplayName: "Business Member", Roles: []*object.Role{}, Groups: []string{}}
	installInsightPlatformApiMappingFixtures(t, "business-org", "00000000-0000-7000-8000-000000000160", map[string]string{businessMember.GetId(): "160"})
	originalScopeSource := getInsightProviderScopeSourceFunc
	originalRoleIds := getInsightProviderRoleIdsFunc
	originalUserGroups := getInsightProviderUserGroupsFunc
	originalTreeSource := getInsightProviderOrganizationTreeSourceFunc
	getInsightProviderScopeSourceFunc = func(organization string) ([]*object.User, []*object.Group, []*object.PlatformDepartment, error) {
		if organization != "business-org" {
			t.Fatalf("scope source organization = %q, want business-org", organization)
		}
		return []*object.User{businessMember}, []*object.Group{}, []*object.PlatformDepartment{}, nil
	}
	getInsightProviderRoleIdsFunc = func(*object.User) ([]string, error) { return []string{}, nil }
	getInsightProviderUserGroupsFunc = func(*object.User) ([]InsightProviderGroup, error) { return []InsightProviderGroup{}, nil }
	getInsightProviderOrganizationTreeSourceFunc = func(_ *object.User, organization string, _ bool) (*object.OrganizationManagementScope, []*object.Group, []*object.PlatformDepartment, []*object.SourceConnection, []*object.OrgSyncBatch, error) {
		if organization != "business-org" {
			t.Fatalf("organization-tree source organization = %q, want business-org", organization)
		}
		return &object.OrganizationManagementScope{Organization: organization, ScopeType: object.OrganizationManagementScopeTypeAdmin}, []*object.Group{}, []*object.PlatformDepartment{}, []*object.SourceConnection{}, []*object.OrgSyncBatch{}, nil
	}
	t.Cleanup(func() {
		getInsightProviderScopeSourceFunc = originalScopeSource
		getInsightProviderRoleIdsFunc = originalRoleIds
		getInsightProviderUserGroupsFunc = originalUserGroups
		getInsightProviderOrganizationTreeSourceFunc = originalTreeSource
	})

	currentUserController, currentUserRecorder := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user?organization=wrong-org", "GetInsightCurrentUser", auth)
	currentUserController.GetInsightCurrentUser()
	if currentUserRecorder.Code != http.StatusOK {
		t.Fatalf("current-user status = %d, want 200", currentUserRecorder.Code)
	}
	currentEnvelope, ok := currentUserController.Data["json"].(InsightProviderEnvelope)
	if !ok || currentEnvelope.Status != "ok" {
		t.Fatalf("current-user envelope = %#v, want ok", currentUserController.Data["json"])
	}
	currentData, ok := currentEnvelope.Data.(*InsightCurrentUserResponse)
	if !ok || currentData.Organization != "business-org" || currentData.ApiOrganizationId != "00000000-0000-7000-8000-000000000160" || currentData.UsageIdentity.MappingStatus != MappingStatusMissing || currentData.UsageIdentity.ApiUserId != "" {
		t.Fatalf("current-user data = %#v, want business target with missing personal mapping", currentEnvelope.Data)
	}

	scopeController, scopeRecorder := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user/scope?organization=wrong-org", "GetInsightCurrentUserScope", auth)
	scopeController.GetInsightCurrentUserScope()
	if scopeRecorder.Code != http.StatusOK {
		t.Fatalf("scope status = %d, want 200", scopeRecorder.Code)
	}
	scopeEnvelope, ok := scopeController.Data["json"].(InsightProviderEnvelope)
	if !ok || scopeEnvelope.Status != "ok" {
		t.Fatalf("scope envelope = %#v, want ok", scopeController.Data["json"])
	}
	scopeData, ok := scopeEnvelope.Data.(*InsightScopeResponse)
	if !ok || scopeData.Organization != "business-org" || len(scopeData.ApiUserIds) != 1 || scopeData.ApiUserIds[0] != "160" {
		t.Fatalf("scope data = %#v, want confirmed business-org member only", scopeEnvelope.Data)
	}

	treeController, treeRecorder := newInsightSecureHandoffProviderController(http.MethodGet, "/api/admin-provider/insight/v1/current-user/organization-tree?organization=wrong-org", "GetInsightCurrentUserOrganizationTree", auth)
	treeController.GetInsightCurrentUserOrganizationTree()
	if treeRecorder.Code != http.StatusOK {
		t.Fatalf("organization-tree status = %d, want 200", treeRecorder.Code)
	}
	treeEnvelope, ok := treeController.Data["json"].(InsightProviderEnvelope)
	if !ok || treeEnvelope.Status != "ok" {
		t.Fatalf("organization-tree envelope = %#v, want ok", treeController.Data["json"])
	}
	treeData, ok := treeEnvelope.Data.(InsightOrganizationTreeResponse)
	if !ok || treeData.Organization != "business-org" {
		t.Fatalf("organization-tree data = %#v, want business-org", treeEnvelope.Data)
	}
}

func newInsightSecureHandoffProviderController(method string, path string, action string, auth *object.AdminSecureHandoffProviderCredentialAuth) (*ApiController, *httptest.ResponseRecorder) {
	request := httptest.NewRequest(method, path, nil)
	request.Header.Set("Authorization", "Bearer redacted-runtime-credential")
	request.Header.Set("X-Trace-Id", "trace-secure-handoff-controller")
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	ctx.Input.SetData(object.AdminSecureHandoffProviderCredentialContextKey, auth)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", action, controller)
	return controller, recorder
}
