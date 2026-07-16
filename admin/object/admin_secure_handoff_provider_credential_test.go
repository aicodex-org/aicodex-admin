package object

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestAdminSecureHandoffProviderCredentialParserRejectsMalformedMaterial(t *testing.T) {
	secret := strings.Repeat("0", 64)
	tests := []string{
		"not-a-runtime-credential",
		AdminSecureHandoffProviderRuntimeCredentialPrefix + "payload-only",
		AdminSecureHandoffProviderRuntimeCredentialPrefix + "e30.00",
		AdminSecureHandoffProviderRuntimeCredentialPrefix + "e30." + strings.Repeat("z", 64),
		AdminSecureHandoffProviderRuntimeCredentialPrefix + "***." + secret,
		AdminSecureHandoffProviderRuntimeCredentialPrefix + base64.RawURLEncoding.EncodeToString([]byte("{")) + "." + secret,
		AdminSecureHandoffProviderRuntimeCredentialPrefix + base64.RawURLEncoding.EncodeToString([]byte("{}")) + "." + secret,
	}
	for _, material := range tests {
		if claims, err := parseAdminSecureHandoffProviderCredential(material); err == nil {
			t.Fatalf("malformed credential parsed as %#v", claims)
		}
	}
}

func TestAdminSecureHandoffProviderCredentialIssuerRejectsMissingOrInvalidIdentity(t *testing.T) {
	if credential, err := issueAdminSecureHandoffProviderRuntimeCredential(AdminSecureHandoffCreateGrantRequest{}); err == nil || credential.Material != "" {
		t.Fatalf("missing identity credential = %#v error=%v", credential, err)
	}
	now := time.Date(2026, 7, 16, 3, 30, 0, 0, time.UTC)
	if credential, err := issueAdminSecureHandoffProviderRuntimeCredential(AdminSecureHandoffCreateGrantRequest{
		GrantId:          "adm-grant-invalid-expiry",
		Subject:          "built-in/admin",
		IssuedAt:         now,
		RuntimeExpiresAt: now.Add(-time.Second),
	}); err == nil || credential.Material != "" {
		t.Fatalf("invalid expiry credential = %#v error=%v", credential, err)
	}
}

func TestAdminSecureHandoffProviderCredentialIssuerFailsClosedWithoutEntropy(t *testing.T) {
	originalReader := readAdminSecureHandoffProviderRandom
	readAdminSecureHandoffProviderRandom = func([]byte) (int, error) {
		return 0, errors.New("entropy unavailable")
	}
	t.Cleanup(func() {
		readAdminSecureHandoffProviderRandom = originalReader
	})
	now := time.Date(2026, 7, 16, 3, 40, 0, 0, time.UTC)
	credential, err := issueAdminSecureHandoffProviderRuntimeCredential(AdminSecureHandoffCreateGrantRequest{
		GrantId:              "adm-grant-entropy",
		Subject:              "built-in/admin",
		Audience:             "insight_profile_admin_handoff",
		TargetRegistrationId: "insight-profile-import-v1",
		TargetWorkspaceId:    "insight-business-service",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         AdminSecureHandoffProviderType,
		IssuedAt:             now,
		RuntimeExpiresAt:     now.Add(AdminSecureHandoffProviderRuntimeCredentialTTL),
	})
	if err == nil || credential.Material != "" {
		t.Fatalf("entropy failure credential = %#v error=%v", credential, err)
	}
}

func TestAdminSecureHandoffProviderCredentialDefaultUserLookupIsAvailable(t *testing.T) {
	if lookup := (&AdminSecureHandoffGrantService{}).userLookup(); lookup == nil {
		t.Fatalf("default user lookup is nil")
	}
}

func TestAdminSecureHandoffProviderCredentialRejectsRecordAndUserMismatch(t *testing.T) {
	now := time.Date(2026, 7, 16, 3, 45, 0, 0, time.UTC)
	store := NewMemoryAdminSecureHandoffGrantStore()
	service := &AdminSecureHandoffGrantService{
		Store: store,
		Now:   func() time.Time { return now },
		UserLookup: func(userId string) (*User, error) {
			return &User{Owner: "built-in", Name: "admin", Roles: []*Role{}}, nil
		},
	}
	created, credential := issueConfirmedAdminSecureHandoffProviderCredential(t, service)

	missingService := &AdminSecureHandoffGrantService{Store: NewMemoryAdminSecureHandoffGrantStore(), Now: service.Now}
	if auth, authErr := missingService.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.Code != AdminSecureHandoffProviderCredentialUnauthenticated {
		t.Fatalf("missing record auth = %#v error=%#v", auth, authErr)
	}

	record, err := store.GetAdminSecureHandoffGrant(created.SecureHandoffGrant.GrantId)
	if err != nil {
		t.Fatalf("GetAdminSecureHandoffGrant() error = %v", err)
	}
	record.TargetWorkspaceId = "wrong-persisted-workspace"
	if err = store.SaveAdminSecureHandoffGrant(record); err != nil {
		t.Fatalf("SaveAdminSecureHandoffGrant() error = %v", err)
	}
	if auth, authErr := service.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.ReasonCode != AdminSecureHandoffReasonTargetMismatch {
		t.Fatalf("record mismatch auth = %#v error=%#v", auth, authErr)
	}
	record.TargetWorkspaceId = created.SecureHandoffGrant.TargetWorkspaceId
	if err = store.SaveAdminSecureHandoffGrant(record); err != nil {
		t.Fatalf("restore record error = %v", err)
	}
	record.PackageHash = "sha256:wrong-target-binding"
	if err = store.SaveAdminSecureHandoffGrant(record); err != nil {
		t.Fatalf("save target binding mismatch: %v", err)
	}
	if auth, authErr := service.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.ReasonCode != AdminSecureHandoffReasonTargetMismatch {
		t.Fatalf("target binding mismatch auth = %#v error=%#v", auth, authErr)
	}
	record.PackageHash = created.SecureHandoffGrant.PackageHash
	if err = store.SaveAdminSecureHandoffGrant(record); err != nil {
		t.Fatalf("restore target binding: %v", err)
	}

	lookupErrorService := &AdminSecureHandoffGrantService{
		Store: store,
		Now:   service.Now,
		UserLookup: func(string) (*User, error) {
			return nil, errors.New("lookup unavailable")
		},
	}
	if auth, authErr := lookupErrorService.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.Code != AdminSecureHandoffProviderCredentialAuthorizationFailed {
		t.Fatalf("lookup error auth = %#v error=%#v", auth, authErr)
	}
	mismatchedUserService := &AdminSecureHandoffGrantService{
		Store: store,
		Now:   service.Now,
		UserLookup: func(string) (*User, error) {
			return &User{Owner: "built-in", Name: "other"}, nil
		},
	}
	if auth, authErr := mismatchedUserService.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.Code != AdminSecureHandoffProviderCredentialAuthorizationFailed {
		t.Fatalf("mismatched user auth = %#v error=%#v", auth, authErr)
	}

	now = now.Add(-time.Second)
	if auth, authErr := service.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.ReasonCode != AdminSecureHandoffReasonCredentialExpired {
		t.Fatalf("not-yet-valid auth = %#v error=%#v", auth, authErr)
	}
}

func TestAdminSecureHandoffProviderCredentialClosedStatesAndErrorsAreRedacted(t *testing.T) {
	if got := (*AdminSecureHandoffProviderCredentialError)(nil).Error(); !strings.Contains(got, "rejected") {
		t.Fatalf("nil error text = %q", got)
	}
	credentialErr := newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialAuthorizationFailed, AdminSecureHandoffReasonStateClosed)
	if got := credentialErr.Error(); !strings.Contains(got, AdminSecureHandoffReasonStateClosed) || strings.Contains(got, AdminSecureHandoffProviderRuntimeCredentialPrefix) {
		t.Fatalf("credential error text = %q", got)
	}

	for _, status := range []string{AdminSecureHandoffStatusFailed, AdminSecureHandoffStatusExpired} {
		t.Run(status, func(t *testing.T) {
			now := time.Date(2026, 7, 16, 3, 55, 0, 0, time.UTC)
			store := NewMemoryAdminSecureHandoffGrantStore()
			service := &AdminSecureHandoffGrantService{
				Store: store,
				Now:   func() time.Time { return now },
				UserLookup: func(string) (*User, error) {
					return &User{Owner: "built-in", Name: "admin"}, nil
				},
			}
			created, credential := issueConfirmedAdminSecureHandoffProviderCredential(t, service)
			record, err := store.GetAdminSecureHandoffGrant(created.SecureHandoffGrant.GrantId)
			if err != nil {
				t.Fatalf("GetAdminSecureHandoffGrant() error = %v", err)
			}
			record.Status = status
			if err = store.SaveAdminSecureHandoffGrant(record); err != nil {
				t.Fatalf("SaveAdminSecureHandoffGrant() error = %v", err)
			}
			auth, authErr := service.AuthenticateProviderCredential(credential)
			if auth != nil || authErr == nil {
				t.Fatalf("closed status auth = %#v error=%#v", auth, authErr)
			}
			if status == AdminSecureHandoffStatusExpired && authErr.ReasonCode != AdminSecureHandoffReasonCredentialExpired {
				t.Fatalf("expired reason = %#v", authErr)
			}
			if status == AdminSecureHandoffStatusFailed && authErr.ReasonCode != AdminSecureHandoffReasonStateClosed {
				t.Fatalf("failed reason = %#v", authErr)
			}
		})
	}
}

func TestAdminSecureHandoffProviderCredentialConcurrentRedeemReturnsMaterialOnce(t *testing.T) {
	service := &AdminSecureHandoffGrantService{
		Store: NewMemoryAdminSecureHandoffGrantStore(),
		Now:   func() time.Time { return time.Date(2026, 7, 16, 4, 0, 0, 0, time.UTC) },
	}
	created, err := service.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		Subject:              "built-in/admin",
		TargetRegistrationId: "insight-registration-concurrent",
		TargetWorkspaceId:    "insight-workspace-concurrent",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight_profile_admin_handoff",
		PackageHash:          "sha256:runtime-concurrent",
		TTLSeconds:           300,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}

	const attempts = 16
	start := make(chan struct{})
	results := make(chan AdminSecureHandoffGrantStatusResponse, attempts)
	errors := make(chan error, attempts)
	var waitGroup sync.WaitGroup
	for i := 0; i < attempts; i++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-start
			response, redeemErr := service.RedeemGrant(redeemAdminSecureHandoffProviderCredentialRequest(created.SecureHandoffGrant))
			results <- response
			errors <- redeemErr
		}()
	}
	close(start)
	waitGroup.Wait()
	close(results)
	close(errors)

	materialCount := 0
	successCount := 0
	for response := range results {
		if response.CredentialMaterial != "" {
			materialCount++
		}
	}
	for redeemErr := range errors {
		if redeemErr == nil {
			successCount++
		}
	}
	if successCount != 1 || materialCount != 1 {
		t.Fatalf("concurrent redeem success=%d material=%d, want exactly one", successCount, materialCount)
	}
}

func TestAdminSecureHandoffProviderCredentialAuthenticatesOnlyConfirmedGrant(t *testing.T) {
	now := time.Date(2026, 7, 16, 4, 30, 0, 0, time.UTC)
	store := NewMemoryAdminSecureHandoffGrantStore()
	user := &User{Owner: "built-in", Name: "admin", Roles: []*Role{}}
	service := &AdminSecureHandoffGrantService{
		Store: store,
		Now:   func() time.Time { return now },
		UserLookup: func(userId string) (*User, error) {
			if userId != "built-in/admin" {
				t.Fatalf("user lookup id = %q, want built-in/admin", userId)
			}
			return user, nil
		},
	}

	created, err := service.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		Subject:              "built-in/admin",
		TargetRegistrationId: "insight-registration-runtime",
		TargetWorkspaceId:    "insight-workspace-runtime",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight_profile_admin_handoff",
		PackageHash:          "sha256:runtime-package",
		TTLSeconds:           300,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}
	redeemed, err := service.RedeemGrant(redeemAdminSecureHandoffProviderCredentialRequest(created.SecureHandoffGrant))
	if err != nil {
		t.Fatalf("RedeemGrant() error = %v", err)
	}
	if !IsAdminSecureHandoffProviderRuntimeCredential(redeemed.CredentialMaterial) {
		t.Fatalf("redeemed credential is not a versioned runtime credential")
	}
	credential := redeemed.CredentialMaterial

	if auth, authErr := service.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.Code != AdminSecureHandoffProviderCredentialAuthorizationFailed {
		t.Fatalf("delivered credential auth = %#v error=%#v, want fail-closed before confirm", auth, authErr)
	}

	record, err := store.GetAdminSecureHandoffGrant(created.SecureHandoffGrant.GrantId)
	if err != nil {
		t.Fatalf("GetAdminSecureHandoffGrant() error = %v", err)
	}
	if record.CredentialMaterial == "" || record.CredentialMaterial == credential || strings.Contains(record.CredentialMaterial, credential) {
		t.Fatalf("persisted credential verifier did not replace raw material")
	}

	if _, err = service.ConfirmGrant(AdminSecureHandoffConfirmGrantRequest{
		GrantId:         created.SecureHandoffGrant.GrantId,
		Nonce:           created.SecureHandoffGrant.Nonce,
		SecretBindingId: "binding-runtime",
		SecretRevision:  "rev-runtime",
		ConfigDigest:    "sha256:runtime-config",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	}); err != nil {
		t.Fatalf("ConfirmGrant() error = %v", err)
	}

	auth, authErr := service.AuthenticateProviderCredential(credential)
	if authErr != nil {
		t.Fatalf("AuthenticateProviderCredential() error = %v", authErr)
	}
	if auth == nil || auth.User != user || auth.Subject != "built-in/admin" || auth.Audience != "insight_profile_admin_handoff" {
		t.Fatalf("authenticated runtime credential = %#v", auth)
	}
	if auth.TargetRegistrationId != "insight-registration-runtime" || auth.TargetWorkspaceId != "insight-workspace-runtime" || auth.TargetOrganization != "business-org" || auth.EnvironmentId != "admin-runtime" || auth.ProviderType != AdminSecureHandoffProviderType {
		t.Fatalf("runtime credential target = %#v", auth)
	}
	if auth.Scope != AdminSecureHandoffProviderRuntimeScope {
		t.Fatalf("runtime credential scope = %q, want %q", auth.Scope, AdminSecureHandoffProviderRuntimeScope)
	}
}

func TestAdminSecureHandoffProviderCredentialRejectsTamperedExpiredAndRevokedMaterial(t *testing.T) {
	now := time.Date(2026, 7, 16, 5, 0, 0, 0, time.UTC)
	store := NewMemoryAdminSecureHandoffGrantStore()
	service := &AdminSecureHandoffGrantService{
		Store: store,
		Now:   func() time.Time { return now },
		UserLookup: func(userId string) (*User, error) {
			return &User{Owner: "built-in", Name: "admin", Roles: []*Role{}}, nil
		},
	}
	created, credential := issueConfirmedAdminSecureHandoffProviderCredential(t, service)

	tampered := tamperAdminSecureHandoffProviderCredentialTarget(t, credential)
	if auth, authErr := service.AuthenticateProviderCredential(tampered); auth != nil || authErr == nil || authErr.Code != AdminSecureHandoffProviderCredentialUnauthenticated {
		t.Fatalf("tampered auth = %#v error=%#v, want unauthenticated", auth, authErr)
	}

	now = now.Add(AdminSecureHandoffProviderRuntimeCredentialTTL + time.Second)
	if auth, authErr := service.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.ReasonCode != AdminSecureHandoffReasonCredentialExpired {
		t.Fatalf("expired auth = %#v error=%#v, want credential expired", auth, authErr)
	}

	now = time.Date(2026, 7, 16, 5, 1, 0, 0, time.UTC)
	if _, err := service.RevokeGrant(created.SecureHandoffGrant.GrantId, "operator_cancelled"); err != nil {
		t.Fatalf("RevokeGrant() error = %v", err)
	}
	if auth, authErr := service.AuthenticateProviderCredential(credential); auth != nil || authErr == nil || authErr.ReasonCode != AdminSecureHandoffReasonRevoked {
		t.Fatalf("revoked auth = %#v error=%#v, want revoked", auth, authErr)
	}
}

func TestAdminSecureHandoffProviderCredentialVerifierPersistsAcrossServiceInstances(t *testing.T) {
	withAdminSecureHandoffGrantSqliteStore(t)
	now := time.Date(2026, 7, 16, 5, 30, 0, 0, time.UTC)
	creator := &AdminSecureHandoffGrantService{Now: func() time.Time { return now }}
	created, err := creator.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		Subject:              "built-in/admin",
		TargetRegistrationId: "insight-registration-persisted",
		TargetWorkspaceId:    "insight-workspace-persisted",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight_profile_admin_handoff",
		PackageHash:          "sha256:runtime-persisted",
		TTLSeconds:           300,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}
	redeemer := &AdminSecureHandoffGrantService{Now: func() time.Time { return now.Add(time.Second) }}
	redeemed, err := redeemer.RedeemGrant(redeemAdminSecureHandoffProviderCredentialRequest(created.SecureHandoffGrant))
	if err != nil {
		t.Fatalf("RedeemGrant() error = %v", err)
	}
	confirmer := &AdminSecureHandoffGrantService{Now: func() time.Time { return now.Add(2 * time.Second) }}
	if _, err = confirmer.ConfirmGrant(AdminSecureHandoffConfirmGrantRequest{
		GrantId:         created.SecureHandoffGrant.GrantId,
		Nonce:           created.SecureHandoffGrant.Nonce,
		SecretBindingId: "binding-persisted-runtime",
		SecretRevision:  "rev-persisted-runtime",
		ConfigDigest:    "sha256:persisted-runtime-config",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	}); err != nil {
		t.Fatalf("ConfirmGrant() error = %v", err)
	}
	validator := &AdminSecureHandoffGrantService{
		Now: func() time.Time { return now.Add(3 * time.Second) },
		UserLookup: func(userId string) (*User, error) {
			return &User{Owner: "built-in", Name: "admin", Roles: []*Role{}}, nil
		},
	}
	if auth, authErr := validator.AuthenticateProviderCredential(redeemed.CredentialMaterial); authErr != nil || auth == nil || auth.Subject != "built-in/admin" {
		t.Fatalf("cross-instance auth = %#v error=%#v", auth, authErr)
	}
}

func issueConfirmedAdminSecureHandoffProviderCredential(t *testing.T, service *AdminSecureHandoffGrantService) (AdminSecureHandoffCreateGrantResult, string) {
	t.Helper()
	created, err := service.CreateGrant(AdminSecureHandoffCreateGrantRequest{
		Subject:              "built-in/admin",
		TargetRegistrationId: "insight-registration-runtime",
		TargetWorkspaceId:    "insight-workspace-runtime",
		TargetOrganization:   "business-org",
		EnvironmentId:        "admin-runtime",
		ProviderType:         AdminSecureHandoffProviderType,
		Audience:             "insight_profile_admin_handoff",
		PackageHash:          "sha256:runtime-package",
		TTLSeconds:           300,
	})
	if err != nil {
		t.Fatalf("CreateGrant() error = %v", err)
	}
	redeemed, err := service.RedeemGrant(redeemAdminSecureHandoffProviderCredentialRequest(created.SecureHandoffGrant))
	if err != nil {
		t.Fatalf("RedeemGrant() error = %v", err)
	}
	if _, err = service.ConfirmGrant(AdminSecureHandoffConfirmGrantRequest{
		GrantId:         created.SecureHandoffGrant.GrantId,
		Nonce:           created.SecureHandoffGrant.Nonce,
		SecretBindingId: "binding-runtime",
		SecretRevision:  "rev-runtime",
		ConfigDigest:    "sha256:runtime-config",
		TraceMarker:     created.SecureHandoffGrant.TraceMarker,
	}); err != nil {
		t.Fatalf("ConfirmGrant() error = %v", err)
	}
	return created, redeemed.CredentialMaterial
}

func redeemAdminSecureHandoffProviderCredentialRequest(grant AdminSecureHandoffGrantEnvelope) AdminSecureHandoffRedeemGrantRequest {
	return AdminSecureHandoffRedeemGrantRequest{
		GrantId:              grant.GrantId,
		Nonce:                grant.Nonce,
		TargetRegistrationId: grant.TargetRegistrationId,
		TargetWorkspaceId:    grant.TargetWorkspaceId,
		EnvironmentId:        grant.EnvironmentId,
		ProviderType:         grant.ProviderType,
		Audience:             grant.Audience,
		PackageHash:          grant.PackageHash,
	}
}

func tamperAdminSecureHandoffProviderCredentialTarget(t *testing.T, credential string) string {
	t.Helper()
	parts := strings.Split(credential, ".")
	if len(parts) != 2 {
		t.Fatalf("credential part count = %d, want 2", len(parts))
	}
	payloadText := strings.TrimPrefix(parts[0], AdminSecureHandoffProviderRuntimeCredentialPrefix)
	payload, err := base64.RawURLEncoding.DecodeString(payloadText)
	if err != nil {
		t.Fatalf("decode credential payload: %v", err)
	}
	claims := map[string]interface{}{}
	if err = json.Unmarshal(payload, &claims); err != nil {
		t.Fatalf("unmarshal credential payload: %v", err)
	}
	claims["targetOrganization"] = "wrong-business-org"
	payload, err = json.Marshal(claims)
	if err != nil {
		t.Fatalf("marshal credential payload: %v", err)
	}
	return AdminSecureHandoffProviderRuntimeCredentialPrefix + base64.RawURLEncoding.EncodeToString(payload) + "." + parts[1]
}
