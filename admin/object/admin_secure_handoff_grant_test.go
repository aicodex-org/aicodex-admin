package object

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"

	"github.com/xorm-io/xorm"
)

func TestAdminSecureHandoffGrantLifecycleRedactsEnvelopeAndPreventsReplay(t *testing.T) {
	service := &AdminSecureHandoffGrantService{
		Store: NewMemoryAdminSecureHandoffGrantStore(),
		Now:   func() time.Time { return time.Date(2026, 7, 9, 1, 0, 0, 0, time.UTC) },
		Issuer: StaticAdminSecureHandoffCredentialIssuer{
			CredentialMaterial:  "admin-provider-secret-value-123456",
			CredentialReference: "admin-provider-credential-ref",
			CredentialSuffix:    "3456",
		},
	}

	created, err := service.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		TTLSeconds:           600,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}
	if created.SecureHandoffGrant.Schema != AdminSecureHandoffGrantSchema || created.SecureHandoffGrant.Status != AdminSecureHandoffStatusIssued {
		t.Fatalf("created envelope = %#v", created.SecureHandoffGrant)
	}
	if created.SecureHandoffGrant.CredentialSuffix != "3456" || created.SecureHandoffGrant.OwnerRegistryReadiness != "ready" {
		t.Fatalf("created redacted summary = %#v", created.SecureHandoffGrant)
	}
	if created.SecureHandoffGrant.Nonce == "" {
		t.Fatalf("created envelope should include one-time nonce: %#v", created.SecureHandoffGrant)
	}
	if created.SecureHandoffGrant.OwnerRegistry.TrustedEndpointAlias != AdminSecureHandoffTrustedEndpointAlias ||
		created.SecureHandoffGrant.OwnerRegistry.Audience != created.SecureHandoffGrant.Audience ||
		created.SecureHandoffGrant.OwnerRegistry.ServiceIdentity != AdminSecureHandoffServiceIdentity ||
		created.SecureHandoffGrant.OwnerRegistry.EndpointReadiness != "ready" ||
		created.SecureHandoffGrant.OwnerRegistry.TargetRegistrationStatus != "approved" {
		t.Fatalf("owner registry shape mismatch: %#v", created.SecureHandoffGrant.OwnerRegistry)
	}
	assertAdminSecureHandoffNoSensitiveMaterial(t, created)

	delivered, err := service.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce,
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err != nil {
		t.Fatalf("RedeemGrant() error = %v", err)
	}
	if delivered.Status != AdminSecureHandoffStatusDelivered || delivered.CredentialMaterial != "admin-provider-secret-value-123456" {
		t.Fatalf("delivered response = %#v", delivered)
	}

	status, err := service.QueryGrantStatus(created.SecureHandoffGrant.GrantId)
	if err != nil {
		t.Fatalf("QueryGrantStatus() error = %v", err)
	}
	if status.Status != AdminSecureHandoffStatusDelivered || status.CredentialMaterial != "" {
		t.Fatalf("status should be redacted delivered state: %#v", status)
	}
	assertAdminSecureHandoffNoSensitiveMaterial(t, status)

	confirmed, err := service.ConfirmGrant(AdminSecureHandoffConfirmGrantRequest{
		GrantId:         created.SecureHandoffGrant.GrantId,
		Nonce:           created.SecureHandoffGrant.Nonce,
		SecretBindingId: "secret-binding-admin-owner",
		SecretRevision:  "rev-1",
		ConfigDigest:    "sha256:abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	})
	if err != nil {
		t.Fatalf("ConfirmGrant() error = %v", err)
	}
	if confirmed.Status != AdminSecureHandoffStatusConfirmed {
		t.Fatalf("confirmed status = %#v", confirmed)
	}

	replayed, err := service.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce,
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err == nil || replayed.CredentialMaterial != "" {
		t.Fatalf("confirmed grant replay should fail closed without material: response=%#v err=%v", replayed, err)
	}
}

func TestAdminSecureHandoffGrantRejectsMismatchedExpiredAndRevokedRedeem(t *testing.T) {
	now := time.Date(2026, 7, 9, 2, 0, 0, 0, time.UTC)
	service := &AdminSecureHandoffGrantService{
		Store: NewMemoryAdminSecureHandoffGrantStore(),
		Now:   func() time.Time { return now },
		Issuer: StaticAdminSecureHandoffCredentialIssuer{
			CredentialMaterial:  "admin-provider-secret-value-abcdef",
			CredentialReference: "admin-provider-credential-ref",
			CredentialSuffix:    "cdef",
		},
	}
	created, err := service.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          "sha256:1123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		TTLSeconds:           60,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}

	wrongNonce, err := service.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce + "-wrong",
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err == nil || wrongNonce.ReasonCode != AdminSecureHandoffReasonInvalidRequest || wrongNonce.CredentialMaterial != "" {
		t.Fatalf("nonce mismatch should fail closed: response=%#v err=%v", wrongNonce, err)
	}

	mismatched, err := service.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce,
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "other-workspace",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err == nil || mismatched.ReasonCode != AdminSecureHandoffReasonTargetMismatch || mismatched.CredentialMaterial != "" {
		t.Fatalf("workspace mismatch should fail closed: response=%#v err=%v", mismatched, err)
	}

	revoked, err := service.RevokeGrant(created.SecureHandoffGrant.GrantId, "operator_cancelled")
	if err != nil {
		t.Fatalf("RevokeGrant() error = %v", err)
	}
	if revoked.Status != AdminSecureHandoffStatusRevoked {
		t.Fatalf("revoked status = %#v", revoked)
	}
	afterRevoke, err := service.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce,
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err == nil || afterRevoke.ReasonCode != AdminSecureHandoffReasonRevoked || afterRevoke.CredentialMaterial != "" {
		t.Fatalf("revoked grant should fail closed: response=%#v err=%v", afterRevoke, err)
	}

	expiring, err := service.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          "sha256:2123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		TTLSeconds:           1,
	})
	if err != nil {
		t.Fatalf("CreateGrant() expiring error = %v", err)
	}
	now = now.Add(2 * time.Second)
	expired, err := service.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              expiring.SecureHandoffGrant.GrantId,
		Nonce:                expiring.SecureHandoffGrant.Nonce,
		TargetRegistrationId: "insight-target-60",
		TargetWorkspaceId:    "workspace-60",
		EnvironmentId:        "test-60",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          expiring.SecureHandoffGrant.PackageHash,
	})
	if err == nil || expired.ReasonCode != AdminSecureHandoffReasonExpired || expired.CredentialMaterial != "" {
		t.Fatalf("expired grant should fail closed: response=%#v err=%v", expired, err)
	}
}

func TestAdminSecureHandoffGrantDefaultStorePersistsAcrossServiceInstances(t *testing.T) {
	withAdminSecureHandoffGrantSqliteStore(t)
	now := time.Date(2026, 7, 9, 3, 0, 0, 0, time.UTC)
	creator := &AdminSecureHandoffGrantService{
		Now: func() time.Time { return now },
		Issuer: StaticAdminSecureHandoffCredentialIssuer{
			CredentialMaterial:  "admin-provider-secret-value-persisted",
			CredentialReference: "admin-provider-credential-ref",
			CredentialSuffix:    "sted",
		},
	}
	created, err := creator.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		TargetRegistrationId: "insight-target-persisted",
		TargetWorkspaceId:    "workspace-persisted",
		EnvironmentId:        "test-persisted",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          "sha256:3123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		TTLSeconds:           600,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}

	redeemer := &AdminSecureHandoffGrantService{Now: func() time.Time { return now.Add(time.Second) }}
	delivered, err := redeemer.RedeemGrant(AdminSecureHandoffRedeemGrantRequest{
		GrantId:              created.SecureHandoffGrant.GrantId,
		Nonce:                created.SecureHandoffGrant.Nonce,
		TargetRegistrationId: "insight-target-persisted",
		TargetWorkspaceId:    "workspace-persisted",
		EnvironmentId:        "test-persisted",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight",
		PackageHash:          created.SecureHandoffGrant.PackageHash,
	})
	if err != nil {
		t.Fatalf("RedeemGrant() from persisted store error = %v", err)
	}
	if delivered.Status != AdminSecureHandoffStatusDelivered || delivered.CredentialMaterial != "admin-provider-secret-value-persisted" {
		t.Fatalf("delivered persisted grant = %#v", delivered)
	}

	confirmer := &AdminSecureHandoffGrantService{Now: func() time.Time { return now.Add(2 * time.Second) }}
	confirmed, err := confirmer.ConfirmGrant(AdminSecureHandoffConfirmGrantRequest{
		GrantId:         created.SecureHandoffGrant.GrantId,
		Nonce:           created.SecureHandoffGrant.Nonce,
		SecretBindingId: "secret-binding-admin-owner",
		SecretRevision:  "rev-persisted",
		ConfigDigest:    "sha256:abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	})
	if err != nil {
		t.Fatalf("ConfirmGrant() persisted error = %v", err)
	}
	if confirmed.Status != AdminSecureHandoffStatusConfirmed {
		t.Fatalf("confirmed persisted grant = %#v", confirmed)
	}
	record, err := defaultAdminSecureHandoffGrantStore{}.GetAdminSecureHandoffGrant(created.SecureHandoffGrant.GrantId)
	if err != nil {
		t.Fatalf("GetAdminSecureHandoffGrant() error = %v", err)
	}
	if record.CredentialMaterial != "" || record.Nonce != created.SecureHandoffGrant.Nonce || record.ConfirmedAt.IsZero() {
		t.Fatalf("persisted closed record should retain nonce/audit and clear material: %#v", record)
	}
}

func assertAdminSecureHandoffNoSensitiveMaterial(t *testing.T, value interface{}) {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal value: %v", err)
	}
	text := string(body)
	for _, forbidden := range []string{
		"admin-provider-secret-value",
		"Authorization",
		"Cookie",
		"clientSecret",
		"client_secret",
		"privateKey",
		"private_key",
		"https://",
		"rawPayload",
		"raw_id",
		"secret-value",
	} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("secure handoff response leaked %q in %s", forbidden, text)
		}
	}
}

func withAdminSecureHandoffGrantSqliteStore(t *testing.T) {
	t.Helper()
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("NewEngine() error = %v", err)
	}
	if err := engine.Sync2(new(AdminSecureHandoffGrant)); err != nil {
		t.Fatalf("Sync2() error = %v", err)
	}
	originalOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		ormer = originalOrmer
		_ = engine.Close()
	})
}
