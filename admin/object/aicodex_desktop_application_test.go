package object

import (
	"strings"
	"testing"
)

func TestNewAICodexDesktopApplicationHasFixedOIDCContract(t *testing.T) {
	application := newAICodexDesktopApplication()

	if application.Owner != AICodexDesktopApplicationOwner || application.Name != AICodexDesktopApplicationName {
		t.Fatalf("unexpected application id: %s/%s", application.Owner, application.Name)
	}
	if application.ClientId != AICodexDesktopApplicationClientID {
		t.Fatalf("clientId=%q, want %q", application.ClientId, AICodexDesktopApplicationClientID)
	}
	if !application.IsRedirectUriValid(AICodexDesktopApplicationRedirectURI) {
		t.Fatalf("desktop redirect URI should be accepted")
	}
	for _, grantType := range []string{"authorization_code", "refresh_token"} {
		if !IsGrantTypeValid(grantType, application.GrantTypes) {
			t.Fatalf("missing grant type %q in %#v", grantType, application.GrantTypes)
		}
	}
	for _, scope := range []string{"openid", "profile", "email", "offline_access", AICodexGatewayRuntimeScope} {
		if !IsScopeValid(scope, application) {
			t.Fatalf("missing scope %q in %#v", scope, application.Scopes)
		}
	}
	if application.TokenFormat != "JWT-Standard" {
		t.Fatalf("token format=%q, want JWT-Standard", application.TokenFormat)
	}
	if application.ExpireInHours <= 0 || application.RefreshExpireInHours <= application.ExpireInHours {
		t.Fatalf("unexpected token lifetimes: access=%v refresh=%v", application.ExpireInHours, application.RefreshExpireInHours)
	}
}

func TestEnsureAICodexDesktopApplicationContractRepairsMissingFields(t *testing.T) {
	application := &Application{
		Owner:              AICodexDesktopApplicationOwner,
		Name:               AICodexDesktopApplicationName,
		ClientId:           "legacy-client",
		RedirectUris:       []string{},
		GrantTypes:         []string{"authorization_code"},
		Scopes:             []*ScopeItem{{Name: "openid"}},
		TokenFormat:        "JWT",
		TokenSigningMethod: "HS256",
	}

	if !ensureAICodexDesktopApplicationContract(application) {
		t.Fatal("expected contract repair to report changes")
	}
	if application.ClientId != AICodexDesktopApplicationClientID {
		t.Fatalf("clientId=%q, want %q", application.ClientId, AICodexDesktopApplicationClientID)
	}
	if !application.IsRedirectUriValid(AICodexDesktopApplicationRedirectURI) {
		t.Fatal("expected repaired desktop redirect URI")
	}
	if !IsGrantTypeValid("refresh_token", application.GrantTypes) {
		t.Fatalf("expected refresh_token grant, got %#v", application.GrantTypes)
	}
	if !IsScopeValid(AICodexGatewayRuntimeScope, application) {
		t.Fatalf("expected Gateway runtime scope, got %#v", application.Scopes)
	}
	if application.TokenFormat != "JWT-Standard" {
		t.Fatalf("token format=%q, want JWT-Standard", application.TokenFormat)
	}
	if application.TokenSigningMethod != "RS256" {
		t.Fatalf("token signing method=%q, want RS256", application.TokenSigningMethod)
	}
}

func TestEnsureAICodexDesktopApplicationContractRepairsLegacyClientApplicationName(t *testing.T) {
	application := &Application{
		Owner:    AICodexDesktopApplicationOwner,
		Name:     "legacy-aicodex-desktop",
		ClientId: AICodexDesktopApplicationClientID,
	}
	originalId := application.GetId()

	if !ensureAICodexDesktopApplicationContract(application) {
		t.Fatal("expected legacy application to be repaired")
	}
	if application.GetId() == originalId {
		t.Fatalf("expected fixed application id to differ from legacy id %q", originalId)
	}
	if application.GetId() != "admin/app-aicodex-desktop" {
		t.Fatalf("application id=%q, want admin/app-aicodex-desktop", application.GetId())
	}
}

func TestAICodexDesktopApplicationDiscoveryContract(t *testing.T) {
	t.Setenv("originFrontend", "https://login.example.com")
	originalGetApplication := getApplicationForOidcDiscovery
	getApplicationForOidcDiscovery = func(id string) (*Application, error) {
		if id != "admin/app-aicodex-desktop" {
			t.Fatalf("unexpected application id: %s", id)
		}
		return newAICodexDesktopApplication(), nil
	}
	t.Cleanup(func() {
		getApplicationForOidcDiscovery = originalGetApplication
	})

	discovery := GetOidcDiscovery("auth.example.com", AICodexDesktopApplicationName)

	if discovery.Issuer != "https://auth.example.com/.well-known/app-aicodex-desktop" {
		t.Fatalf("issuer=%q", discovery.Issuer)
	}
	if discovery.AuthorizationEndpoint != "https://login.example.com/login/oauth/authorize" {
		t.Fatalf("authorization_endpoint=%q", discovery.AuthorizationEndpoint)
	}
	if discovery.TokenEndpoint != "https://auth.example.com/api/login/oauth/access_token" {
		t.Fatalf("token_endpoint=%q", discovery.TokenEndpoint)
	}
	if discovery.JwksUri != "https://auth.example.com/.well-known/app-aicodex-desktop/jwks" {
		t.Fatalf("jwks_uri=%q", discovery.JwksUri)
	}
	if !testStringSliceContains(discovery.GrantTypesSupported, "refresh_token") {
		t.Fatalf("grant_types_supported missing refresh_token: %#v", discovery.GrantTypesSupported)
	}
	for _, scope := range []string{"openid", "profile", "email", "offline_access", AICodexGatewayRuntimeScope} {
		if !testStringSliceContains(discovery.ScopesSupported, scope) {
			t.Fatalf("scopes_supported missing %q: %#v", scope, discovery.ScopesSupported)
		}
	}
	if !testStringSliceContains(discovery.CodeChallengeMethodsSupported, "S256") {
		t.Fatalf("code_challenge_methods_supported missing S256: %#v", discovery.CodeChallengeMethodsSupported)
	}
}

func TestAICodexDesktopApplicationRequiresPkceChallenge(t *testing.T) {
	application := newAICodexDesktopApplication()
	if !isAICodexDesktopPkceChallengeMissing(application, "") {
		t.Fatal("expected fixed desktop client to require a PKCE challenge")
	}
	if !isAICodexDesktopPkceChallengeMissing(application, "   ") {
		t.Fatal("expected blank PKCE challenge to be rejected")
	}
	if isAICodexDesktopPkceChallengeMissing(application, "pkce-challenge") {
		t.Fatal("expected non-empty PKCE challenge to pass")
	}
	if isAICodexDesktopPkceChallengeMissing(&Application{ClientId: "other-client"}, "") {
		t.Fatal("ordinary applications must not inherit the fixed desktop PKCE rule")
	}
}

func TestAICodexDesktopApplicationRequiresS256PkceRequest(t *testing.T) {
	application := newAICodexDesktopApplication()
	validChallenge := pkceChallenge(strings.Repeat("a", 43))

	if message := validateAICodexDesktopPkceRequest(application, "S256", validChallenge); message != "" {
		t.Fatalf("valid desktop PKCE request should pass, got %q", message)
	}
	if message := validateAICodexDesktopPkceRequest(application, "", validChallenge); message == "" {
		t.Fatal("expected missing challenge method to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceRequest(application, "plain", validChallenge); message == "" {
		t.Fatal("expected non-S256 challenge method to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceRequest(application, "S256", "pkce-challenge"); message == "" {
		t.Fatal("expected malformed S256 challenge to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceRequest(&Application{ClientId: "other-client"}, "", ""); message != "" {
		t.Fatalf("ordinary applications must not inherit desktop PKCE validation, got %q", message)
	}
}

func TestAICodexDesktopApplicationRequiresValidPkceVerifier(t *testing.T) {
	application := newAICodexDesktopApplication()

	if message := validateAICodexDesktopPkceVerifier(application, strings.Repeat("a", 43)); message != "" {
		t.Fatalf("valid desktop PKCE verifier should pass, got %q", message)
	}
	if message := validateAICodexDesktopPkceVerifier(application, ""); message == "" {
		t.Fatal("expected empty verifier to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceVerifier(application, strings.Repeat("a", 42)); message == "" {
		t.Fatal("expected short verifier to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceVerifier(application, strings.Repeat("a", 129)); message == "" {
		t.Fatal("expected long verifier to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceVerifier(application, strings.Repeat("a", 42)+"!"); message == "" {
		t.Fatal("expected verifier with invalid characters to fail for desktop public client")
	}
	if message := validateAICodexDesktopPkceVerifier(&Application{ClientId: "other-client"}, ""); message != "" {
		t.Fatalf("ordinary applications must not inherit desktop verifier validation, got %q", message)
	}
}

func testStringSliceContains(items []string, value string) bool {
	for _, item := range items {
		if strings.TrimSpace(item) == value {
			return true
		}
	}
	return false
}
