package object

import (
	"strings"
	"testing"
)

func TestValidateOAuthClientRequestForApplicationAcceptsRegisteredRedirects(t *testing.T) {
	application := &Application{
		ClientId:     "client-web",
		RedirectUris: []string{"https://app.example.com/callback", "^aicodex://oauth/callback.*"},
	}

	if msg := ValidateOAuthClientRequestForApplication(application, "client-web", "code", "https://app.example.com/callback", "openid profile", "state", "en"); msg != "" {
		t.Fatalf("expected HTTPS redirect to pass, got %s", msg)
	}
	if msg := ValidateOAuthClientRequestForApplication(application, "client-web", "code", "aicodex://oauth/callback?code=123", "openid profile", "state", "en"); msg != "" {
		t.Fatalf("expected custom scheme redirect to pass, got %s", msg)
	}
}

func TestValidateOAuthClientRequestForApplicationRejectsTamperedContext(t *testing.T) {
	application := &Application{
		ClientId:     "client-web",
		RedirectUris: []string{"https://app.example.com/callback"},
		Scopes:       []*ScopeItem{{Name: "openid"}, {Name: "profile"}},
	}

	redirectMsg := ValidateOAuthClientRequestForApplication(application, "client-web", "code", "https://evil.example.com/callback", "openid", "state", "en")
	if !strings.Contains(redirectMsg, "Redirect URI") {
		t.Fatalf("expected redirect URI error, got %s", redirectMsg)
	}

	clientMsg := ValidateOAuthClientRequestForApplication(application, "other-client", "code", "https://app.example.com/callback", "openid", "state", "en")
	if !strings.Contains(clientMsg, "Invalid client_id") {
		t.Fatalf("expected client_id error, got %s", clientMsg)
	}

	responseTypeMsg := ValidateOAuthClientRequestForApplication(application, "client-web", "password", "https://app.example.com/callback", "openid", "state", "en")
	if !strings.Contains(responseTypeMsg, "Grant_type") {
		t.Fatalf("expected response type error, got %s", responseTypeMsg)
	}

	scopeMsg := ValidateOAuthClientRequestForApplication(application, "client-web", "code", "https://app.example.com/callback", "openid admin", "state", "en")
	if !strings.Contains(scopeMsg, "Invalid scope") {
		t.Fatalf("expected scope error, got %s", scopeMsg)
	}
}

func TestApplicationRedirectURIValidationRejectsSubstringFallback(t *testing.T) {
	application := &Application{
		ClientId:     "desktop-client",
		RedirectUris: []string{AICodexDesktopApplicationRedirectURI, "^aicodex://oauth/callback.*"},
	}

	if !application.IsRedirectUriValid(AICodexDesktopApplicationRedirectURI) {
		t.Fatal("expected exact desktop redirect URI to pass")
	}
	if !application.IsRedirectUriValid("aicodex://oauth/callback?code=123") {
		t.Fatal("expected anchored custom-scheme redirect regex to pass")
	}
	if application.IsRedirectUriValid("https://evil.example.com/callback?next=" + AICodexDesktopApplicationRedirectURI) {
		t.Fatal("substring fallback must not allow a tampered redirect URI")
	}
	if application.IsRedirectUriValid(AICodexDesktopApplicationRedirectURI + ".evil") {
		t.Fatal("exact desktop redirect URI must not allow suffix tampering")
	}
	if application.IsRedirectUriValid("http://localhost/callback") {
		t.Fatal("unregistered localhost redirect URI must not bypass the application allow-list")
	}
	if application.IsRedirectUriValid("https://desktop.chromiumapp.org/callback") {
		t.Fatal("unregistered chromiumapp redirect URI must not bypass the application allow-list")
	}
}

func TestApplicationRedirectURIValidationKeepsLegacyValidOriginWhenNoAllowList(t *testing.T) {
	application := &Application{
		ClientId:     "legacy-native-client",
		RedirectUris: []string{},
	}

	if !application.IsRedirectUriValid("http://localhost:1420/callback") {
		t.Fatal("legacy native clients without redirect allow-list should still accept valid localhost origins")
	}
	if application.IsRedirectUriValid("https://evil.example.com/callback") {
		t.Fatal("empty redirect allow-list must not accept arbitrary origins")
	}
}

func TestAuthorizationCodeTokenErrorDescriptionsDoNotExposeSensitiveMaterial(t *testing.T) {
	sensitiveValues := []string{
		"auth-code-secret",
		"pkce-challenge-secret",
		"admin/app-aicodex-desktop/token-secret",
	}
	descriptions := []string{
		authorizationCodeInvalidErrorDescription,
		authorizationCodeUsedErrorDescription,
		authorizationCodeWrongClientDescription,
		codeVerifierInvalidErrorDescription,
		"client_secret is invalid for application: [admin/app-aicodex-desktop]",
	}

	for _, description := range descriptions {
		for _, sensitive := range sensitiveValues {
			if strings.Contains(description, sensitive) {
				t.Fatalf("error description leaked sensitive material: %q", description)
			}
		}
	}
}

func TestAuthorizationCodeBindingRequiresSameApplication(t *testing.T) {
	application := &Application{
		Owner: "admin",
		Name:  AICodexDesktopApplicationName,
	}

	if !isAuthorizationCodeBoundToApplication(&Token{Owner: "admin", Application: AICodexDesktopApplicationName}, application) {
		t.Fatal("expected authorization code from the same application to pass")
	}
	if isAuthorizationCodeBoundToApplication(&Token{Owner: "admin", Application: "other-app"}, application) {
		t.Fatal("authorization code from another application must not be accepted")
	}
	if isAuthorizationCodeBoundToApplication(&Token{Owner: "other-owner", Application: AICodexDesktopApplicationName}, application) {
		t.Fatal("authorization code from another owner must not be accepted")
	}
	if isAuthorizationCodeBoundToApplication(nil, application) {
		t.Fatal("nil token must not be accepted")
	}
	if isAuthorizationCodeBoundToApplication(&Token{Owner: "admin", Application: AICodexDesktopApplicationName}, nil) {
		t.Fatal("nil application must not be accepted")
	}
}

func TestRefreshTokenBindingRequiresSameApplication(t *testing.T) {
	application := &Application{
		Owner: "admin",
		Name:  AICodexDesktopApplicationName,
	}

	if !isRefreshTokenBoundToApplication(&Token{Owner: "admin", Application: AICodexDesktopApplicationName}, application) {
		t.Fatal("expected refresh token from the same application to pass")
	}
	if isRefreshTokenBoundToApplication(&Token{Owner: "admin", Application: "other-app"}, application) {
		t.Fatal("refresh token from another application must not be accepted")
	}
	if isRefreshTokenBoundToApplication(&Token{Owner: "other-owner", Application: AICodexDesktopApplicationName}, application) {
		t.Fatal("refresh token from another owner must not be accepted")
	}
	if isRefreshTokenBoundToApplication(nil, application) {
		t.Fatal("nil token must not be accepted")
	}
	if isRefreshTokenBoundToApplication(&Token{Owner: "admin", Application: AICodexDesktopApplicationName}, nil) {
		t.Fatal("nil application must not be accepted")
	}
}
