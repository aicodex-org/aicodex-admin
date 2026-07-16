package idp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/oauth2"
)

func newTestLarkIdProvider(serverURL string, client *http.Client) *LarkIdProvider {
	provider := NewLarkIdProvider("cli_test", "secret_test", "https://auth.example.com/callback", false)
	provider.SetHttpClient(client)
	provider.LarkDomain = serverURL
	provider.Config.Endpoint.TokenURL = serverURL + "/open-apis/authen/v2/oauth/token"
	return provider
}

func TestLarkTokenCodeSuccessAcceptsStringAndNumericZero(t *testing.T) {
	if !isLarkTokenCodeSuccess("0") {
		t.Fatal("expected string code 0 to be treated as success")
	}
	if !isLarkTokenCodeSuccess(float64(0)) {
		t.Fatal("expected numeric code 0 to be treated as success")
	}
	if isLarkTokenCodeSuccess("20002") {
		t.Fatal("expected non-zero string code to be treated as failure")
	}
}

func TestLarkIdProviderGetTokenUsesV2OAuthEndpoint(t *testing.T) {
	var requestedPath string
	var tokenRequest map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if !strings.Contains(r.Header.Get("Content-Type"), "application/json") {
			t.Fatalf("expected JSON content type, got %s", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&tokenRequest); err != nil {
			t.Fatalf("failed to decode token request: %v", err)
		}

		_, _ = w.Write([]byte(`{
			"code": "0",
			"access_token": "u-token",
			"token_type": "Bearer",
			"expires_in": 7200,
			"refresh_token": "r-token",
			"refresh_token_expires_in": 604800,
			"scope": "auth:user.id:read"
		}`))
	}))
	defer server.Close()

	provider := newTestLarkIdProvider(server.URL, server.Client())
	token, err := provider.GetToken("auth-code")
	if err != nil {
		t.Fatalf("GetToken() returned error: %v", err)
	}

	if requestedPath != "/open-apis/authen/v2/oauth/token" {
		t.Fatalf("expected v2 token path, got %s", requestedPath)
	}
	expectedRequest := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     "cli_test",
		"client_secret": "secret_test",
		"code":          "auth-code",
		"redirect_uri":  "https://auth.example.com/callback",
	}
	for key, value := range expectedRequest {
		if tokenRequest[key] != value {
			t.Fatalf("expected %s=%q, got %q", key, value, tokenRequest[key])
		}
	}
	if token.AccessToken != "u-token" {
		t.Fatalf("expected access token u-token, got %s", token.AccessToken)
	}
	if token.TokenType != "Bearer" {
		t.Fatalf("expected token type Bearer, got %s", token.TokenType)
	}
	if token.RefreshToken != "r-token" {
		t.Fatalf("expected refresh token r-token, got %s", token.RefreshToken)
	}
	if time.Until(token.Expiry) <= 0 {
		t.Fatal("expected future token expiry")
	}
}

func TestLarkIdProviderGetUserInfoUsesV1UserInfoAndPrimaryUserId(t *testing.T) {
	var requestedPath string
	var authorization string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		authorization = r.Header.Get("Authorization")
		if r.Method != http.MethodGet {
			t.Fatalf("expected GET, got %s", r.Method)
		}

		_, _ = w.Write([]byte(`{
			"code": 0,
			"msg": "success",
			"data": {
				"name": "Zhang San",
				"avatar_url": "https://cdn.example.com/avatar.png",
				"open_id": "ou-open",
				"union_id": "on-union",
				"user_id": "uid-user",
				"tenant_key": "tenant-key",
				"enterprise_email": "zhangsan@example.com",
				"mobile": "+8613000288300"
			}
		}`))
	}))
	defer server.Close()

	provider := newTestLarkIdProvider(server.URL, server.Client())
	userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "u-token", TokenType: "Bearer"})
	if err != nil {
		t.Fatalf("GetUserInfo() returned error: %v", err)
	}

	if requestedPath != "/open-apis/authen/v1/user_info" {
		t.Fatalf("expected v1 user_info path, got %s", requestedPath)
	}
	if authorization != "Bearer u-token" {
		t.Fatalf("expected bearer authorization, got %s", authorization)
	}
	if userInfo.Id != "uid-user" {
		t.Fatalf("expected user_id as primary id, got %s", userInfo.Id)
	}
	if userInfo.Username != "uid-user" {
		t.Fatalf("expected user_id username, got %s", userInfo.Username)
	}
	if userInfo.UnionId != "on-union" {
		t.Fatalf("expected union id, got %s", userInfo.UnionId)
	}
	if userInfo.Email != "zhangsan@example.com" {
		t.Fatalf("expected enterprise email fallback, got %s", userInfo.Email)
	}
	expectedExtra := map[string]string{
		"user_id":    "uid-user",
		"open_id":    "ou-open",
		"union_id":   "on-union",
		"tenant_key": "tenant-key",
	}
	for key, value := range expectedExtra {
		if userInfo.Extra[key] != value {
			t.Fatalf("expected extra %s=%q, got %q", key, value, userInfo.Extra[key])
		}
	}
}

func TestLarkIdProviderGetUserInfoFallsBackToUnionThenOpenId(t *testing.T) {
	tests := []struct {
		name       string
		response   string
		expectedId string
	}{
		{
			name: "union_id",
			response: `{
				"code": 0,
				"data": {
					"name": "Zhang San",
					"open_id": "ou-open",
					"union_id": "on-union"
				}
			}`,
			expectedId: "on-union",
		},
		{
			name: "open_id",
			response: `{
				"code": 0,
				"data": {
					"name": "Zhang San",
					"open_id": "ou-open"
				}
			}`,
			expectedId: "ou-open",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_, _ = w.Write([]byte(tt.response))
			}))
			defer server.Close()

			provider := newTestLarkIdProvider(server.URL, server.Client())
			userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "u-token"})
			if err != nil {
				t.Fatalf("GetUserInfo() returned error: %v", err)
			}
			if userInfo.Id != tt.expectedId {
				t.Fatalf("expected id %s, got %s", tt.expectedId, userInfo.Id)
			}
			if userInfo.Username != tt.expectedId {
				t.Fatalf("expected username %s, got %s", tt.expectedId, userInfo.Username)
			}
		})
	}
}

func TestLarkIdProviderReturnsDiagnosableErrors(t *testing.T) {
	t.Run("token error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"code":"20002","error":"invalid_client","error_description":"client secret is invalid"}`))
		}))
		defer server.Close()

		provider := newTestLarkIdProvider(server.URL, server.Client())
		_, err := provider.GetToken("auth-code")
		assertSanitizedIdPError(t, err, []string{"client secret is invalid"}, "status 400")
	})

	t.Run("userinfo error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"code":99991663,"msg":"permission denied"}`))
		}))
		defer server.Close()

		provider := newTestLarkIdProvider(server.URL, server.Client())
		_, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "u-token"})
		assertSanitizedIdPError(t, err, []string{"permission denied"}, "status 403")
	})
}
