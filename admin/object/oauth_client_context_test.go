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
