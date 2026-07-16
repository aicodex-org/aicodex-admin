package routers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/controllers"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"github.com/beego/beego/v2/server/web"
)

func TestInsightProviderInvalidBearerReachesControllerAndReturnsHTTP401Envelope(t *testing.T) {
	handler := newInsightProviderAuthFilterTestHandler()
	request := httptest.NewRequest(http.MethodGet, "/api/admin-provider/insight/v1/current-user", nil)
	request.Header.Set("Authorization", "Bearer definitely-not-a-provider-token")
	request.Header.Set("X-Trace-Id", "trace-router-invalid")
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body=%s", recorder.Code, recorder.Body.String())
	}
	assertInsightProviderRouterErrorEnvelope(t, recorder, controllers.InsightProviderErrorUnauthenticated, "trace-router-invalid")
}

func TestInsightAdminProviderPathMatchesOnlySupportedReadRoutes(t *testing.T) {
	for _, path := range []string{
		"/api/admin-provider/insight/v1/current-user",
		"/api/admin-provider/insight/v1/current-user/scope",
		"/api/admin-provider/insight/v1/current-user/organization-tree",
	} {
		if !isInsightAdminProviderPath(path) {
			t.Fatalf("supported provider path %q was not recognized", path)
		}
	}
	for _, path := range []string{
		"/api/admin-provider/insight/v1/current-user/extra",
		"/api/admin-provider/insight/v1/current-users",
		"/api/get-users",
	} {
		if isInsightAdminProviderPath(path) {
			t.Fatalf("unsupported provider path %q was recognized", path)
		}
	}
}

func TestInsightProviderHandoffCredentialFilterRejectsTamperedExpiredAndRevokedMaterial(t *testing.T) {
	tests := []struct {
		name       string
		prepare    func(t *testing.T, service *object.AdminSecureHandoffGrantService, created object.AdminSecureHandoffCreateGrantResult, credential string, now *time.Time) string
		wantStatus int
		wantCode   string
	}{
		{
			name: "tampered",
			prepare: func(t *testing.T, service *object.AdminSecureHandoffGrantService, created object.AdminSecureHandoffCreateGrantResult, credential string, now *time.Time) string {
				last := "0"
				if strings.HasSuffix(credential, last) {
					last = "1"
				}
				return credential[:len(credential)-1] + last
			},
			wantStatus: http.StatusUnauthorized,
			wantCode:   controllers.InsightProviderErrorUnauthenticated,
		},
		{
			name: "expired",
			prepare: func(t *testing.T, service *object.AdminSecureHandoffGrantService, created object.AdminSecureHandoffCreateGrantResult, credential string, now *time.Time) string {
				*now = now.Add(object.AdminSecureHandoffProviderRuntimeCredentialTTL + time.Second)
				return credential
			},
			wantStatus: http.StatusUnauthorized,
			wantCode:   controllers.InsightProviderErrorUnauthenticated,
		},
		{
			name: "revoked",
			prepare: func(t *testing.T, service *object.AdminSecureHandoffGrantService, created object.AdminSecureHandoffCreateGrantResult, credential string, now *time.Time) string {
				if _, err := service.RevokeGrant(created.SecureHandoffGrant.GrantId, "operator_cancelled"); err != nil {
					t.Fatalf("RevokeGrant() error = %v", err)
				}
				return credential
			},
			wantStatus: http.StatusForbidden,
			wantCode:   controllers.InsightProviderErrorAuthorizationFailed,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			now := time.Date(2026, 7, 16, 7, 0, 0, 0, time.UTC)
			service := &object.AdminSecureHandoffGrantService{
				Store: object.NewMemoryAdminSecureHandoffGrantStore(),
				Now:   func() time.Time { return now },
				UserLookup: func(userId string) (*object.User, error) {
					return &object.User{Owner: "built-in", Name: "admin", Roles: []*object.Role{}}, nil
				},
			}
			created, credential := issueConfirmedInsightProviderFilterCredential(t, service)
			credential = tc.prepare(t, service, created, credential, &now)

			originalAuthenticator := authenticateAdminSecureHandoffProviderCredential
			authenticateAdminSecureHandoffProviderCredential = service.AuthenticateProviderCredential
			t.Cleanup(func() {
				authenticateAdminSecureHandoffProviderCredential = originalAuthenticator
			})

			handler := newInsightProviderAuthFilterTestHandler()
			request := httptest.NewRequest(http.MethodGet, "/api/admin-provider/insight/v1/current-user", nil)
			request.Header.Set("Authorization", "Bearer "+credential)
			request.Header.Set("X-Trace-Id", "trace-router-"+tc.name)
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, request)

			if recorder.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d; body=%s", recorder.Code, tc.wantStatus, recorder.Body.String())
			}
			assertInsightProviderRouterErrorEnvelope(t, recorder, tc.wantCode, "trace-router-"+tc.name)
		})
	}
}

func TestInsightProviderHandoffCredentialPassesFilterAndTypedTrustFailsClosed(t *testing.T) {
	originalAuthenticator := authenticateAdminSecureHandoffProviderCredential
	authenticateAdminSecureHandoffProviderCredential = func(material string) (*object.AdminSecureHandoffProviderCredentialAuth, *object.AdminSecureHandoffProviderCredentialError) {
		if material != object.AdminSecureHandoffProviderRuntimeCredentialPrefix+"test.payload" {
			t.Fatalf("credential material was not passed to dedicated authenticator")
		}
		return &object.AdminSecureHandoffProviderCredentialAuth{
			Issuer:             object.AdminSecureHandoffIssuer,
			Subject:            "built-in/admin",
			Audience:           "insight_profile_admin_handoff",
			Scope:              object.AdminSecureHandoffProviderRuntimeScope,
			TargetOrganization: "business-org",
			User:               &object.User{Owner: "built-in", Name: "admin", Roles: []*object.Role{}},
		}, nil
	}
	t.Cleanup(func() {
		authenticateAdminSecureHandoffProviderCredential = originalAuthenticator
	})

	handler := newInsightProviderAuthFilterTestHandler()
	request := httptest.NewRequest(http.MethodGet, "/api/admin-provider/insight/v1/current-user", nil)
	request.Header.Set("Authorization", "Bearer "+object.AdminSecureHandoffProviderRuntimeCredentialPrefix+"test.payload")
	request.Header.Set("X-Trace-Id", "trace-router-trust")
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403 typed-trust rejection; body=%s", recorder.Code, recorder.Body.String())
	}
	assertInsightProviderRouterErrorEnvelope(t, recorder, controllers.InsightProviderErrorAuthorizationFailed, "trace-router-trust")
}

func newInsightProviderAuthFilterTestHandler() *web.ControllerRegister {
	handler := web.NewControllerRegister()
	handler.Add(
		"/api/admin-provider/insight/v1/current-user",
		&controllers.ApiController{},
		web.WithRouterMethods(&controllers.ApiController{}, "GET:GetInsightCurrentUser"),
	)
	if err := handler.InsertFilter("*", web.BeforeRouter, AutoSigninFilter); err != nil {
		panic(err)
	}
	return handler
}

func assertInsightProviderRouterErrorEnvelope(t *testing.T, recorder *httptest.ResponseRecorder, code string, traceId string) {
	t.Helper()
	var envelope controllers.InsightProviderEnvelope
	if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode provider envelope: %v; body=%s", err, recorder.Body.String())
	}
	if envelope.Status != "error" || envelope.TraceId != traceId || envelope.Error == nil || envelope.Error.Code != code {
		t.Fatalf("provider envelope = %#v, want error code=%s trace=%s", envelope, code, traceId)
	}
}

func issueConfirmedInsightProviderFilterCredential(t *testing.T, service *object.AdminSecureHandoffGrantService) (object.AdminSecureHandoffCreateGrantResult, string) {
	t.Helper()
	created, err := service.CreateGrant(object.AdminSecureHandoffCreateGrantRequest{
		Subject:              "built-in/admin",
		TargetRegistrationId: "insight-profile-import-v1",
		TargetWorkspaceId:    "insight-business-service",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         object.AdminSecureHandoffProviderType,
		Audience:             "insight_profile_admin_handoff",
		PackageHash:          "sha256:router-filter",
		TTLSeconds:           300,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}
	grant := created.SecureHandoffGrant
	redeemed, err := service.RedeemGrant(object.AdminSecureHandoffRedeemGrantRequest{
		GrantId:              grant.GrantId,
		Nonce:                grant.Nonce,
		TargetRegistrationId: grant.TargetRegistrationId,
		TargetWorkspaceId:    grant.TargetWorkspaceId,
		EnvironmentId:        grant.EnvironmentId,
		ProviderType:         grant.ProviderType,
		Audience:             grant.Audience,
		PackageHash:          grant.PackageHash,
	})
	if err != nil {
		t.Fatalf("RedeemGrant() error = %v", err)
	}
	if _, err = service.ConfirmGrant(object.AdminSecureHandoffConfirmGrantRequest{
		GrantId:         grant.GrantId,
		Nonce:           grant.Nonce,
		SecretBindingId: "binding-router",
		SecretRevision:  "rev-router",
		ConfigDigest:    "sha256:router-config",
		TraceMarker:     grant.TraceMarker,
	}); err != nil {
		t.Fatalf("ConfirmGrant() error = %v", err)
	}
	return created, redeemed.CredentialMaterial
}
