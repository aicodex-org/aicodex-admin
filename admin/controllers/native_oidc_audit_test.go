package controllers

import (
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestNativeOIDCAuditContractContainsOnlyPresenceAndStableResult(t *testing.T) {
	secretCode := "authorization-code-must-never-appear"
	secretToken := "refresh-token-must-never-appear"
	event := nativeOIDCTokenResult(&object.TokenWrapper{
		AccessToken:  secretToken,
		IdToken:      secretToken,
		RefreshToken: secretToken,
	})
	event.Name = "native_oidc.authorization.completed"
	event.Check = "authorization_code_exchange"
	event.CodePresent = secretCode != ""
	event.LatencyMS = 7

	message := formatNativeOIDCAuditEvent(event)
	for _, forbidden := range []string{secretCode, secretToken, "access_token=", "refresh_token="} {
		if strings.Contains(message, forbidden) {
			t.Fatalf("audit message leaked forbidden material %q: %s", forbidden, message)
		}
	}
	for _, required := range []string{
		"event=native_oidc.authorization.completed",
		"client_alias=aicodex-ios",
		"result=success",
		"code_present=true",
		"access_token_present=true",
		"id_token_present=true",
		"refresh_token_present=true",
		"latency_ms=7",
	} {
		if !strings.Contains(message, required) {
			t.Fatalf("audit message missing %q: %s", required, message)
		}
	}
}

func TestNativeOIDCRefreshInvalidGrantUsesStableErrorCode(t *testing.T) {
	event := nativeOIDCTokenResult(&object.TokenError{Error: object.InvalidGrant, ErrorDescription: "raw upstream detail"})
	event.Name = "native_oidc.refresh.completed"
	event.Check = "rotation"
	message := formatNativeOIDCAuditEvent(event)

	if !strings.Contains(message, "result=rejected") || !strings.Contains(message, "error_code=invalid_grant") {
		t.Fatalf("unexpected refresh audit message: %s", message)
	}
	if strings.Contains(message, "raw upstream detail") {
		t.Fatalf("error description must not enter audit message: %s", message)
	}
}
