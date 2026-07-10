package controllers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestCreateInsightAdminProviderAccessPackageReturnsRedactedGrantEnvelope(t *testing.T) {
	withAdminSecureHandoffGrantTestService(t)
	copySafeMetadata := json.RawMessage(`{"schema":"aicodex.admin.serviceCredentialGovernanceHandoff","version":"2026-06-22","generatedAt":"2026-07-09T01:00:00Z","targetConsumerAlias":"insight_business_service_access","adminOwnerAlias":"admin_identity_application_access","insightProfile":{"packageType":"copy_safe_handoff","targetConsumerAlias":"insight_business_service_access","adminOwnerAlias":"admin_identity_application_access"}}`)
	body, _ := json.Marshal(map[string]interface{}{
		"copySafeMetadata":     copySafeMetadata,
		"targetRegistrationId": "insight-registration-1",
		"targetWorkspaceId":    "insight-workspace-1",
		"environmentId":        "admin-runtime-1",
		"audience":             "insight-profile-import",
		"ttlSeconds":           300,
	})
	controller := newAdminSecureHandoffGrantTestController("POST", "/api/insight-admin-provider/handoff/access-package", body, "CreateInsightAdminProviderAccessPackage")
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.CreateInsightAdminProviderAccessPackage()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "ok" {
		t.Fatalf("response = %#v, want ok response", controller.Data["json"])
	}
	accessPackage, ok := resp.Data.(insightAdminAccessPackageResponse)
	if !ok {
		t.Fatalf("data = %#v, want insightAdminAccessPackageResponse", resp.Data)
	}
	if accessPackage.SchemaVersion != insightAccessPackageSchemaVersion ||
		accessPackage.Target != insightAccessPackageTarget ||
		accessPackage.LegacySchema != insightAdminAccessPackageSchema ||
		accessPackage.PackageType != "insight_admin_access_package" {
		t.Fatalf("access package shape mismatch: %#v", accessPackage)
	}
	if string(accessPackage.CopySafeHandoff) != string(accessPackage.CopySafeMetadata) {
		t.Fatalf("copySafeHandoff should mirror copySafeMetadata for Insight import compatibility: %#v", accessPackage)
	}
	if accessPackage.SecureHandoffGrant.Schema != object.AdminSecureHandoffGrantSchema ||
		accessPackage.SecureHandoffGrant.Status != object.AdminSecureHandoffStatusIssued ||
		accessPackage.SecureHandoffGrant.TargetRegistrationId != "insight-registration-1" ||
		accessPackage.SecureHandoffGrant.PackageHash == "" ||
		accessPackage.SecureHandoffGrant.Nonce == "" {
		t.Fatalf("secure grant envelope mismatch: %#v", accessPackage.SecureHandoffGrant)
	}
	if accessPackage.SecureHandoffGrant.OwnerRegistry.TrustedEndpointAlias != object.AdminSecureHandoffTrustedEndpointAlias ||
		accessPackage.SecureHandoffGrant.OwnerRegistry.Audience != accessPackage.SecureHandoffGrant.Audience ||
		accessPackage.SecureHandoffGrant.OwnerRegistry.ServiceIdentity != object.AdminSecureHandoffServiceIdentity ||
		accessPackage.SecureHandoffGrant.OwnerRegistry.EndpointReadiness != "ready" ||
		accessPackage.SecureHandoffGrant.OwnerRegistry.TargetRegistrationStatus != "approved" {
		t.Fatalf("owner registry shape mismatch: %#v", accessPackage.SecureHandoffGrant.OwnerRegistry)
	}
	assertAdminSecureHandoffControllerNoMaterial(t, accessPackage, "resolver-secret-value", "credentialMaterial", "Authorization", "Cookie")
}

func TestCreateInsightAdminProviderAccessPackageDoesNotRequireLegacyResolverToken(t *testing.T) {
	t.Setenv("insightUsageIdentityResolverToken", "")
	store := object.NewMemoryAdminSecureHandoffGrantStore()
	now := time.Date(2026, 7, 9, 2, 0, 0, 0, time.UTC)
	service := &object.AdminSecureHandoffGrantService{
		Store: store,
		Now:   func() time.Time { return now },
	}
	copySafeMetadata := json.RawMessage(`{"schema":"aicodex.admin.serviceCredentialGovernanceHandoff","version":"2026-06-22","generatedAt":"2026-07-09T02:00:00Z","targetConsumerAlias":"insight_business_service_access","adminOwnerAlias":"admin_identity_application_access","insightProfile":{"packageType":"copy_safe_handoff","targetConsumerAlias":"insight_business_service_access","adminOwnerAlias":"admin_identity_application_access","credentialReferenceStatus":"missing"}}`)

	accessPackage, err := buildInsightAdminAccessPackage(insightAdminAccessPackageCreateRequest{
		CopySafeMetadata: copySafeMetadata,
	}, service)
	if err != nil {
		t.Fatalf("buildInsightAdminAccessPackage() error = %v, want generated grant without legacy resolver token", err)
	}
	if accessPackage.SecureHandoffGrant.Status != object.AdminSecureHandoffStatusIssued ||
		accessPackage.SecureHandoffGrant.CredentialSuffix == "" ||
		accessPackage.SecureHandoffGrant.PackageHash == "" ||
		accessPackage.SecureHandoffGrant.Nonce == "" {
		t.Fatalf("secure handoff grant = %#v, want issued redacted envelope", accessPackage.SecureHandoffGrant)
	}
	if accessPackage.SecureHandoffGrant.OwnerRegistry.TrustedEndpointAlias != object.AdminSecureHandoffTrustedEndpointAlias ||
		accessPackage.SecureHandoffGrant.OwnerRegistry.Audience != accessPackage.SecureHandoffGrant.Audience {
		t.Fatalf("owner registry should align with redeem audience: %#v", accessPackage.SecureHandoffGrant.OwnerRegistry)
	}
	assertAdminSecureHandoffControllerNoMaterial(t, accessPackage, "resolver-secret-value", "credentialMaterial", "Authorization", "Cookie")

	redeemed, err := service.RedeemGrant(object.AdminSecureHandoffRedeemGrantRequest{
		GrantId:              accessPackage.SecureHandoffGrant.GrantId,
		Nonce:                accessPackage.SecureHandoffGrant.Nonce,
		TargetRegistrationId: accessPackage.SecureHandoffGrant.TargetRegistrationId,
		TargetWorkspaceId:    accessPackage.SecureHandoffGrant.TargetWorkspaceId,
		EnvironmentId:        accessPackage.SecureHandoffGrant.EnvironmentId,
		ProviderType:         accessPackage.SecureHandoffGrant.ProviderType,
		Audience:             accessPackage.SecureHandoffGrant.Audience,
		PackageHash:          accessPackage.SecureHandoffGrant.PackageHash,
	})
	if err != nil || redeemed.CredentialMaterial == "" || strings.Contains(redeemed.CredentialMaterial, "resolver-secret-value") {
		t.Fatalf("redeemed material unavailable or tied to legacy resolver token: status=%q reason=%q err=%v", redeemed.Status, redeemed.ReasonCode, err)
	}
}

func TestCreateInsightAdminProviderAccessPackageRejectsUnsafeMetadata(t *testing.T) {
	withAdminSecureHandoffGrantTestService(t)
	body, _ := json.Marshal(map[string]interface{}{
		"copySafeMetadata": json.RawMessage(`{"schema":"aicodex.admin.serviceCredentialGovernanceHandoff","privateUrl":"https://private.example.invalid/secret"}`),
	})
	controller := newAdminSecureHandoffGrantTestController("POST", "/api/insight-admin-provider/handoff/access-package", body, "CreateInsightAdminProviderAccessPackage")
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.CreateInsightAdminProviderAccessPackage()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "copy-safe metadata") {
		t.Fatalf("response = %#v, want copy-safe rejection", controller.Data["json"])
	}
}

func TestAdminSecureHandoffGrantControllerLifecycleReturnsMaterialOnlyOnRedeem(t *testing.T) {
	withAdminSecureHandoffGrantTestService(t)
	createBody, _ := json.Marshal(object.AdminSecureHandoffCreateGrantRequest{
		TargetRegistrationId: "insight-registration-2",
		TargetWorkspaceId:    "insight-workspace-2",
		EnvironmentId:        "admin-runtime-2",
		ProviderType:         object.AdminSecureHandoffProviderType,
		Audience:             "insight-profile-import",
		PackageHash:          "sha256:abcdef",
		TTLSeconds:           300,
	})
	createController := newAdminSecureHandoffGrantTestController("POST", "/api/insight-admin-provider/handoff/secure-grants", createBody, "CreateInsightAdminProviderSecureHandoffGrant")
	createController.Ctx.Input.SetData("currentUserId", "built-in/admin")
	createController.CreateInsightAdminProviderSecureHandoffGrant()
	createResp := createController.Data["json"].(*Response)
	created := createResp.Data.(object.AdminSecureHandoffCreateGrantResult)
	grantId := created.SecureHandoffGrant.GrantId
	nonce := created.SecureHandoffGrant.Nonce
	if nonce == "" {
		t.Fatalf("created secure handoff grant should include one-time nonce: %#v", created.SecureHandoffGrant)
	}
	assertAdminSecureHandoffControllerNoMaterial(t, created, "resolver-secret-value", "credentialMaterial")

	redeemBody, _ := json.Marshal(object.AdminSecureHandoffRedeemGrantRequest{
		Nonce:                nonce,
		TargetRegistrationId: "insight-registration-2",
		TargetWorkspaceId:    "insight-workspace-2",
		EnvironmentId:        "admin-runtime-2",
		ProviderType:         object.AdminSecureHandoffProviderType,
		Audience:             "insight-profile-import",
		PackageHash:          "sha256:abcdef",
	})
	redeemController := newAdminSecureHandoffGrantTestController("POST", "/api/insight-admin-provider/handoff/secure-grants/"+grantId+"/redeem", redeemBody, "RedeemInsightAdminProviderSecureHandoffGrant")
	redeemController.Ctx.Input.SetParam(":grantId", grantId)
	redeemController.RedeemInsightAdminProviderSecureHandoffGrant()
	redeemResp := redeemController.Data["json"].(*Response)
	redeemed := redeemResp.Data.(adminSecureHandoffGrantRedeemResponse)
	if redeemResp.Status != "ok" || redeemed.Status != object.AdminSecureHandoffStatusDelivered || redeemed.CredentialMaterial != "resolver-secret-value" {
		t.Fatalf("redeem response = %#v %#v, want one-time material", redeemResp, redeemed)
	}

	statusController := newAdminSecureHandoffGrantTestController("GET", "/api/insight-admin-provider/handoff/secure-grants/"+grantId+"/status", nil, "GetInsightAdminProviderSecureHandoffGrantStatus")
	statusController.Ctx.Input.SetData("currentUserId", "built-in/admin")
	statusController.Ctx.Input.SetParam(":grantId", grantId)
	statusController.GetInsightAdminProviderSecureHandoffGrantStatus()
	statusResp := statusController.Data["json"].(*Response)
	if statusResp.Status != "ok" {
		t.Fatalf("status response = %#v, want ok", statusResp)
	}
	assertAdminSecureHandoffControllerNoMaterial(t, statusResp.Data, "resolver-secret-value", "credentialMaterial")

	confirmBody, _ := json.Marshal(object.AdminSecureHandoffConfirmGrantRequest{
		Nonce:           nonce,
		SecretBindingId: "binding-1",
		SecretRevision:  "rev-1",
		ConfigDigest:    "sha256:123456",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	})
	confirmController := newAdminSecureHandoffGrantTestController("POST", "/api/insight-admin-provider/handoff/secure-grants/"+grantId+"/confirm", confirmBody, "ConfirmInsightAdminProviderSecureHandoffGrant")
	confirmController.Ctx.Input.SetParam(":grantId", grantId)
	confirmController.ConfirmInsightAdminProviderSecureHandoffGrant()
	confirmResp := confirmController.Data["json"].(*Response)
	confirmed := confirmResp.Data.(object.AdminSecureHandoffGrantStatusResponse)
	if confirmResp.Status != "ok" || confirmed.Status != object.AdminSecureHandoffStatusConfirmed {
		t.Fatalf("confirm response = %#v %#v, want confirmed", confirmResp, confirmed)
	}
	assertAdminSecureHandoffControllerNoMaterial(t, confirmed, "resolver-secret-value", "credentialMaterial")

	replayController := newAdminSecureHandoffGrantTestController("POST", "/api/insight-admin-provider/handoff/secure-grants/"+grantId+"/redeem", redeemBody, "RedeemInsightAdminProviderSecureHandoffGrant")
	replayController.Ctx.Input.SetParam(":grantId", grantId)
	replayController.RedeemInsightAdminProviderSecureHandoffGrant()
	replayResp := replayController.Data["json"].(*Response)
	if replayResp.Status != "error" {
		t.Fatalf("replay response = %#v, want error", replayResp)
	}
	assertAdminSecureHandoffControllerNoMaterial(t, replayResp.Data, "resolver-secret-value", "credentialMaterial")
}

func withAdminSecureHandoffGrantTestService(t *testing.T) {
	t.Helper()
	store := object.NewMemoryAdminSecureHandoffGrantStore()
	now := time.Date(2026, 7, 9, 1, 0, 0, 0, time.UTC)
	originalFactory := adminSecureHandoffGrantServiceFactory
	adminSecureHandoffGrantServiceFactory = func() *object.AdminSecureHandoffGrantService {
		return &object.AdminSecureHandoffGrantService{
			Store: store,
			Now:   func() time.Time { return now },
			Issuer: object.StaticAdminSecureHandoffCredentialIssuer{
				CredentialMaterial:  "resolver-secret-value",
				CredentialReference: "admin-resolver-credential",
			},
		}
	}
	t.Cleanup(func() {
		adminSecureHandoffGrantServiceFactory = originalFactory
	})
}

func newAdminSecureHandoffGrantTestController(method string, path string, body []byte, action string) *ApiController {
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	if body != nil {
		ctx.Input.RequestBody = body
	}
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", action, controller)
	controller.Ctx.Input.SetData("currentUserId", "")
	return controller
}

func assertAdminSecureHandoffControllerNoMaterial(t *testing.T, value interface{}, forbidden ...string) {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal value: %v", err)
	}
	for _, item := range forbidden {
		if strings.Contains(string(body), item) {
			t.Fatalf("response leaked %q in %s", item, string(body))
		}
	}
}
