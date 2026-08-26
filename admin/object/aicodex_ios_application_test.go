package object

import (
	"strings"
	"testing"
	"time"
)

func TestNewAICodexIOSApplicationHasFixedNativeOIDCContract(t *testing.T) {
	application := newAICodexIOSApplication()

	if application.GetId() != "admin/app-aicodex-ios" || application.ClientId != AICodexIOSApplicationClientID {
		t.Fatalf("unexpected fixed application: id=%q client_id=%q", application.GetId(), application.ClientId)
	}
	if !application.PublicClient || !application.PkceRequired || application.ClientSecret != "" {
		t.Fatalf("native client policy mismatch: public=%v pkce=%v secret_present=%v", application.PublicClient, application.PkceRequired, application.ClientSecret != "")
	}
	if !sameStringSet(application.GrantTypes, []string{"authorization_code", "refresh_token"}) {
		t.Fatalf("grant types=%#v", application.GrantTypes)
	}
	if !application.IsRedirectUriValid(AICodexIOSDefaultRedirectURI) {
		t.Fatal("default native redirect must be registered")
	}
	for _, scope := range []string{"openid", "profile", "email", "offline_access", AICodexMobileControlRuntimeScope} {
		if !IsScopeValid(scope, application) {
			t.Fatalf("scope %q is missing", scope)
		}
	}
	if application.TokenSigningMethod != "RS256" || application.TokenFormat != "JWT-Standard" {
		t.Fatalf("unexpected signing contract: format=%q method=%q", application.TokenFormat, application.TokenSigningMethod)
	}
	if application.ExpireInHours != 0.25 || application.RefreshExpireInHours != 720 {
		t.Fatalf("unexpected TTL contract: access=%v refresh=%v", application.ExpireInHours, application.RefreshExpireInHours)
	}
	if !application.IsShared || application.OrganizationResolutionMode != ApplicationOrganizationResolutionModeSharedApplication || application.AllowedOrganizationStatus != ApplicationAllowedOrganizationStatusConfirmed {
		t.Fatalf("unexpected shared organization contract: shared=%v mode=%q status=%q", application.IsShared, application.OrganizationResolutionMode, application.AllowedOrganizationStatus)
	}
	if !sameStringSet(application.AllowedOrganizations, []string{"built-in"}) {
		t.Fatalf("unexpected initial organization allowlist: %#v", application.AllowedOrganizations)
	}
}

func TestAICodexIOSRedirectConfigurationIsAdditiveAndExact(t *testing.T) {
	t.Setenv(AICodexIOSRedirectsConfigName, "https://login.example.test/mobile/callback, mt.aicodex.ios:/oauth2redirect")
	application := newAICodexIOSApplication()

	if !application.IsRedirectUriValid(AICodexIOSDefaultRedirectURI) || !application.IsRedirectUriValid("https://login.example.test/mobile/callback") {
		t.Fatalf("configured redirects were not registered: %#v", application.RedirectUris)
	}
	if application.IsRedirectUriValid("https://login.example.test/mobile/callback/evil") {
		t.Fatal("native redirect matching must remain exact")
	}
}

func TestEnsureAICodexIOSApplicationContractRepairsSecurityFields(t *testing.T) {
	application := &Application{
		Owner:                      "other",
		Name:                       "legacy-ios",
		ClientId:                   "legacy-client",
		ClientSecret:               "must-be-removed",
		GrantTypes:                 []string{"password"},
		TokenSigningMethod:         "HS256",
		TokenFormat:                "JWT",
		OrganizationResolutionMode: "default",
	}

	if !ensureAICodexIOSApplicationContract(application) {
		t.Fatal("expected fixed contract repair")
	}
	target := newAICodexIOSApplication()
	if application.Owner != target.Owner || application.Name != target.Name || application.ClientId != target.ClientId {
		t.Fatalf("identity contract was not repaired: %#v", application)
	}
	if application.ClientSecret != "" || !application.PublicClient || !application.PkceRequired {
		t.Fatal("public-client security policy was not repaired")
	}
	if !sameStringSet(application.GrantTypes, target.GrantTypes) || !sameStringSet(application.AllowedOrganizations, target.AllowedOrganizations) {
		t.Fatal("grant or organization contract was not repaired")
	}
}

func TestEnsureAICodexIOSApplicationContractPreservesRotatedSigningCertificate(t *testing.T) {
	application := newAICodexIOSApplication()
	application.Cert = "cert-ios-rotated"

	if ensureAICodexIOSApplicationContract(application) {
		t.Fatal("a valid rotated certificate reference is deployment state, not fixed-client drift")
	}
	if application.Cert != "cert-ios-rotated" {
		t.Fatalf("rotated certificate was reset to %q", application.Cert)
	}

	application.Cert = ""
	if !ensureAICodexIOSApplicationContract(application) || application.Cert != "cert-built-in" {
		t.Fatalf("missing certificate was not repaired: %q", application.Cert)
	}
}

func TestAICodexIOSRequiresExactResourceAndValidPKCE(t *testing.T) {
	application := newAICodexIOSApplication()
	verifier := strings.Repeat("v", 43)
	challenge := pkceChallenge(verifier)

	if message := validateAICodexIOSResource(application, AICodexGatewayResourceIndicator); message != "" {
		t.Fatalf("valid resource rejected: %s", message)
	}
	if message := validateAICodexIOSResource(application, "https://gateway.example.test"); message == "" {
		t.Fatal("wrong resource must be rejected")
	}
	if message := validatePublicClientPkceRequest(application, "S256", challenge); message != "" {
		t.Fatalf("valid PKCE request rejected: %s", message)
	}
	if message := validatePublicClientPkceVerifier(application, verifier); message != "" {
		t.Fatalf("valid PKCE verifier rejected: %s", message)
	}
	if message := validatePublicClientPkceRequest(application, "plain", challenge); message == "" {
		t.Fatal("plain PKCE must be rejected")
	}
}

func TestAICodexIOSAuthorizationRequiresCodeAndIndependentNonce(t *testing.T) {
	application := newAICodexIOSApplication()
	if message := validateAICodexIOSAuthorizationRequest(application, "code", "native-nonce"); message != "" {
		t.Fatalf("valid native authorization rejected: %s", message)
	}
	if message := validateAICodexIOSAuthorizationRequest(application, "code", "  "); message == "" {
		t.Fatal("missing native nonce must be rejected")
	}
	if message := validateAICodexIOSAuthorizationRequest(application, "id_token", "native-nonce"); message == "" {
		t.Fatal("implicit native response type must be rejected")
	}
}

func TestAICodexIOSAuthorizationCodeIsBoundToRedirectURI(t *testing.T) {
	engine := newSQLiteTestEngine(t, new(Token))
	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() { ormer = oldOrmer })

	application := newAICodexIOSApplication()
	code := "native-redirect-bound-code"
	verifier := strings.Repeat("v", 43)
	token := &Token{
		Owner: application.Owner, Name: "native-redirect-bound", Application: application.Name,
		CodeHash: getTokenHash(code), CodeChallenge: pkceChallenge(verifier),
		RedirectUri: AICodexIOSDefaultRedirectURI, Resource: AICodexGatewayResourceIndicator,
		CodeExpireIn: time.Now().Add(time.Minute).Unix(),
	}
	if _, err := engine.Insert(token); err != nil {
		t.Fatalf("insert native authorization code: %v", err)
	}

	_, tokenError, err := GetAuthorizationCodeToken(
		application, "", code, verifier, AICodexGatewayResourceIndicator,
		"mt.aicodex.ios:/different-callback",
	)
	if err != nil {
		t.Fatalf("redirect mismatch returned runtime error: %v", err)
	}
	if tokenError == nil || tokenError.Error != InvalidGrant || tokenError.ErrorDescription != authorizationCodeWrongRedirectDescription {
		t.Fatalf("redirect mismatch result = %#v", tokenError)
	}
}

func TestAICodexIOSSharedApplicationUsesResolvedUserOrganizationInTokens(t *testing.T) {
	application := newAICodexIOSApplication()
	user := &User{Owner: "enterprise-a", Name: "alice"}
	if got := getTokenOrganization(application, user); got != "enterprise-a" {
		t.Fatalf("token organization=%q, want resolved user organization", got)
	}
	application.IsShared = false
	if got := getTokenOrganization(application, user); got != application.Organization {
		t.Fatalf("non-shared token organization=%q, want application organization %q", got, application.Organization)
	}
}

func TestOAuthRefreshScopeOnlyAllowsOriginalOrDownscopedGrant(t *testing.T) {
	granted := "openid profile offline_access aicodex.mobile_control"
	if !oauthScopeSubset(granted, granted) {
		t.Fatal("the original refresh scope must remain valid")
	}
	if !oauthScopeSubset("openid aicodex.mobile_control", granted) {
		t.Fatal("refresh downscoping must remain valid")
	}
	if oauthScopeSubset("openid admin", granted) {
		t.Fatal("refresh must not escalate beyond the persisted grant")
	}
}

func TestAICodexIOSDiscoveryPublishesNativeScopeAndRevocation(t *testing.T) {
	originalGetApplication := getApplicationForOidcDiscovery
	getApplicationForOidcDiscovery = func(id string) (*Application, error) {
		return newAICodexIOSApplication(), nil
	}
	t.Cleanup(func() { getApplicationForOidcDiscovery = originalGetApplication })

	discovery := GetOidcDiscovery("auth.example.test", AICodexIOSApplicationName)
	if discovery.RevocationEndpoint != "https://auth.example.test/api/login/oauth/revoke" {
		t.Fatalf("revocation_endpoint=%q", discovery.RevocationEndpoint)
	}
	if !testStringSliceContains(discovery.ScopesSupported, AICodexMobileControlRuntimeScope) {
		t.Fatalf("native scope missing from discovery: %#v", discovery.ScopesSupported)
	}
}
