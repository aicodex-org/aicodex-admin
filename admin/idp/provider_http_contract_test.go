package idp

import (
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"golang.org/x/oauth2"
)

func replaceDefaultHTTPClient(t *testing.T, client *http.Client) {
	t.Helper()
	previous := http.DefaultClient
	http.DefaultClient = client
	t.Cleanup(func() {
		http.DefaultClient = previous
	})
}

func idpJSONResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       &idpTrackingBody{reader: strings.NewReader(body)},
	}
}

func assertFormTokenRequest(t *testing.T, request *http.Request, expected map[string]string) {
	t.Helper()
	if request.URL.RawQuery != "" {
		t.Fatalf("expected credential-free URL query, got %q", request.URL.RawQuery)
	}
	if !strings.HasPrefix(request.Header.Get("Content-Type"), "application/x-www-form-urlencoded") {
		t.Fatalf("expected form content type, got %q", request.Header.Get("Content-Type"))
	}
	if err := request.ParseForm(); err != nil {
		t.Fatalf("failed to parse form body: %v", err)
	}
	for key, value := range expected {
		if request.PostForm.Get(key) != value {
			t.Fatalf("expected form %s=%q, got %q", key, value, request.PostForm.Get(key))
		}
	}
}

func TestGiteeIdProviderHTTPContract(t *testing.T) {
	t.Run("token uses injected client and form body", func(t *testing.T) {
		var captured *http.Request
		injected := &http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return idpJSONResponse(http.StatusOK, `{"access_token":"gitee-token","token_type":"bearer","expires_in":3600}`), nil
		})}
		replaceDefaultHTTPClient(t, &http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, errors.New("global client must not be used")
		})})
		provider := NewGiteeIdProvider("gitee-client", "gitee-secret", "https://admin.example.test/callback")
		provider.Config.Endpoint.TokenURL = "https://gitee.example.test/oauth/token"
		provider.SetHttpClient(injected)

		token, err := provider.GetToken("gitee-code")
		if err != nil {
			t.Fatalf("GetToken() returned error: %v", err)
		}
		if captured == nil {
			t.Fatal("expected injected transport to receive token request")
		}
		assertFormTokenRequest(t, captured, map[string]string{
			"grant_type":    "authorization_code",
			"client_id":     "gitee-client",
			"client_secret": "gitee-secret",
			"code":          "gitee-code",
			"redirect_uri":  "https://admin.example.test/callback",
		})
		if token.AccessToken != "gitee-token" {
			t.Fatalf("expected gitee token, got %q", token.AccessToken)
		}
		if provider.Client != injected {
			t.Fatal("expected injected client pointer to remain unchanged")
		}
	})

	t.Run("profile uses authorization header", func(t *testing.T) {
		var captured *http.Request
		provider := NewGiteeIdProvider("client", "secret", "https://admin.example.test/callback")
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return idpJSONResponse(http.StatusOK, `{"id":42,"login":"gitee-user","name":"Gitee User","email":"gitee@example.test"}`), nil
		})})

		userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "profile-token"})
		if err != nil {
			t.Fatalf("GetUserInfo() returned error: %v", err)
		}
		if captured.URL.RawQuery != "" {
			t.Fatalf("profile token leaked into query: %q", captured.URL.RawQuery)
		}
		if captured.Header.Get("Authorization") != "token profile-token" {
			t.Fatalf("unexpected authorization header %q", captured.Header.Get("Authorization"))
		}
		if userInfo.Id != "42" || userInfo.Username != "Gitee User" {
			t.Fatalf("unexpected user info: %+v", userInfo)
		}
	})

	t.Run("request and status errors are sanitized", func(t *testing.T) {
		provider := NewGiteeIdProvider("client", "gitee-secret", "https://admin.example.test/callback")
		provider.Config.Endpoint.TokenURL = "://gitee-secret/gitee-code"
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			t.Fatal("transport must not run for invalid endpoint")
			return nil, nil
		})})

		_, err := provider.GetToken("gitee-code")
		assertSanitizedIdPError(t, err, []string{"gitee-secret", "gitee-code"}, "create request")

		provider.Config.Endpoint.TokenURL = "https://gitee.example.test/oauth/token"
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return idpJSONResponse(http.StatusFound, "response-body-secret"), nil
		})})
		_, err = provider.GetToken("gitee-code")
		assertSanitizedIdPError(t, err, []string{"gitee-secret", "gitee-code", "response-body-secret"}, "status 302")
	})

	t.Run("generic resource request uses injected client and sanitizes status", func(t *testing.T) {
		calls := 0
		provider := NewGiteeIdProvider("client", "secret", "https://admin.example.test/callback")
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			calls++
			if calls == 1 {
				return idpJSONResponse(http.StatusOK, `{"ok":true}`), nil
			}
			return idpJSONResponse(http.StatusBadGateway, "gitee-resource-secret"), nil
		})})

		body, err := provider.GetUrlResp("https://gitee.example.test/resource")
		if err != nil || body != `{"ok":true}` {
			t.Fatalf("GetUrlResp() returned body %q, error %v", body, err)
		}
		_, err = provider.GetUrlResp("https://gitee.example.test/resource")
		assertSanitizedIdPError(t, err, []string{"gitee-resource-secret"}, "status 502")
	})
}

func TestLinkedInIdProviderHTTPContract(t *testing.T) {
	t.Run("token uses injected client and form body", func(t *testing.T) {
		var captured *http.Request
		injected := &http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return idpJSONResponse(http.StatusOK, `{"access_token":"linkedin-token","expires_in":3600}`), nil
		})}
		replaceDefaultHTTPClient(t, &http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, errors.New("global client must not be used")
		})})
		provider := NewLinkedInIdProvider("linkedin-client", "linkedin-secret", "https://admin.example.test/callback")
		provider.Config.Endpoint.TokenURL = "https://linkedin.example.test/oauth/token"
		provider.SetHttpClient(injected)

		token, err := provider.GetToken("linkedin-code")
		if err != nil {
			t.Fatalf("GetToken() returned error: %v", err)
		}
		if captured == nil {
			t.Fatal("expected injected transport to receive token request")
		}
		assertFormTokenRequest(t, captured, map[string]string{
			"grant_type":    "authorization_code",
			"client_id":     "linkedin-client",
			"client_secret": "linkedin-secret",
			"code":          "linkedin-code",
			"redirect_uri":  "https://admin.example.test/callback",
		})
		if token.AccessToken != "linkedin-token" {
			t.Fatalf("expected linkedin token, got %q", token.AccessToken)
		}
	})

	t.Run("profile requests use injected client", func(t *testing.T) {
		requests := make([]*http.Request, 0, 2)
		injected := &http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			requests = append(requests, request)
			if strings.Contains(request.URL.Path, "emailAddress") {
				return idpJSONResponse(http.StatusOK, `{"elements":[{"handle~":{"emailAddress":"linkedin@example.test"}}]}`), nil
			}
			return idpJSONResponse(http.StatusOK, `{"id":"linkedin-id","firstName":{"localized":{"en_US":"Linked"}},"lastName":{"localized":{"en_US":"In"}},"profilePicture":{"displayImage~":{"elements":[{"identifiers":[{"identifier":"https://cdn.example.test/avatar.png"}]}]}}}`), nil
		})}
		globalCalls := 0
		replaceDefaultHTTPClient(t, &http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			globalCalls++
			if strings.Contains(request.URL.Path, "emailAddress") {
				return idpJSONResponse(http.StatusOK, `{"elements":[{"handle~":{"emailAddress":"global@example.test"}}]}`), nil
			}
			return idpJSONResponse(http.StatusOK, `{"id":"global","firstName":{"localized":{"en_US":"Global"}},"lastName":{"localized":{"en_US":"Client"}},"profilePicture":{"displayImage~":{"elements":[{"identifiers":[{"identifier":"https://cdn.example.test/global.png"}]}]}}}`), nil
		})})
		provider := NewLinkedInIdProvider("client", "secret", "https://admin.example.test/callback")
		provider.SetHttpClient(injected)

		userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "linkedin-profile-token"})
		if err != nil {
			t.Fatalf("GetUserInfo() returned error: %v", err)
		}
		if globalCalls != 0 {
			t.Fatalf("expected global client to be bypassed, got %d calls", globalCalls)
		}
		if len(requests) != 2 {
			t.Fatalf("expected two injected profile requests, got %d", len(requests))
		}
		for _, request := range requests {
			if request.Header.Get("Authorization") != "Bearer linkedin-profile-token" {
				t.Fatalf("unexpected authorization header %q", request.Header.Get("Authorization"))
			}
			if strings.Contains(request.URL.RawQuery, "linkedin-profile-token") {
				t.Fatalf("profile token leaked into query: %q", request.URL.RawQuery)
			}
		}
		if userInfo.Id != "linkedin-id" || userInfo.Email != "linkedin@example.test" {
			t.Fatalf("unexpected user info: %+v", userInfo)
		}
	})

	t.Run("request and status errors are sanitized", func(t *testing.T) {
		provider := NewLinkedInIdProvider("client", "linkedin-secret", "https://admin.example.test/callback")
		provider.Config.Endpoint.TokenURL = "://linkedin-secret/linkedin-code"
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			t.Fatal("transport must not run for invalid endpoint")
			return nil, nil
		})})

		_, err := provider.GetToken("linkedin-code")
		assertSanitizedIdPError(t, err, []string{"linkedin-secret", "linkedin-code"}, "create request")

		provider.Config.Endpoint.TokenURL = "https://linkedin.example.test/oauth/token"
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return idpJSONResponse(http.StatusInternalServerError, "response-body-token"), nil
		})})
		_, err = provider.GetToken("linkedin-code")
		assertSanitizedIdPError(t, err, []string{"linkedin-secret", "linkedin-code", "response-body-token"}, "status 500")

		_, err = provider.GetUrlRespWithAuthorization("://linkedin-profile-token", "linkedin-profile-token")
		assertSanitizedIdPError(t, err, []string{"linkedin-profile-token"}, "create request")
	})
}

func TestCasdoorIdProviderHTTPContract(t *testing.T) {
	t.Run("token uses injected client and form body", func(t *testing.T) {
		var captured *http.Request
		injected := &http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return idpJSONResponse(http.StatusOK, `{"access_token":"casdoor-token","expires_in":3600}`), nil
		})}
		replaceDefaultHTTPClient(t, &http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, errors.New("global client must not be used")
		})})
		provider := NewCasdoorIdProvider("casdoor-client", "casdoor-secret", "https://admin.example.test/callback", "https://door.example.test")
		provider.SetHttpClient(injected)

		token, err := provider.GetToken("casdoor-code")
		if err != nil {
			t.Fatalf("GetToken() returned error: %v", err)
		}
		if captured == nil {
			t.Fatal("expected injected transport to receive token request")
		}
		assertFormTokenRequest(t, captured, map[string]string{
			"grant_type":    "authorization_code",
			"client_id":     "casdoor-client",
			"client_secret": "casdoor-secret",
			"code":          "casdoor-code",
		})
		if token.AccessToken != "casdoor-token" {
			t.Fatalf("expected casdoor token, got %q", token.AccessToken)
		}
	})

	t.Run("profile uses bearer header", func(t *testing.T) {
		var captured *http.Request
		provider := NewCasdoorIdProvider("client", "secret", "https://admin.example.test/callback", "https://door.example.test")
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return idpJSONResponse(http.StatusOK, `{"sub":"casdoor-id","preferred_username":"casdoor-user","name":"Casdoor User","email":"casdoor@example.test"}`), nil
		})})

		userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "casdoor-profile-token"})
		if err != nil {
			t.Fatalf("GetUserInfo() returned error: %v", err)
		}
		if captured.Header.Get("Authorization") != "Bearer casdoor-profile-token" {
			t.Fatalf("unexpected authorization header %q", captured.Header.Get("Authorization"))
		}
		if captured.URL.RawQuery != "" {
			t.Fatalf("profile token leaked into query: %q", captured.URL.RawQuery)
		}
		if userInfo.Id != "casdoor-id" || userInfo.Username != "casdoor-user" {
			t.Fatalf("unexpected user info: %+v", userInfo)
		}
	})

	t.Run("invalid token response does not leak access token", func(t *testing.T) {
		provider := NewCasdoorIdProvider("client", "casdoor-secret", "https://admin.example.test/callback", "https://door.example.test")
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return idpJSONResponse(http.StatusOK, `{"access_token":"response-access-token","expires_in":0}`), nil
		})})
		replaceDefaultHTTPClient(t, provider.Client)

		_, err := provider.GetToken("casdoor-code")
		assertSanitizedIdPError(t, err, []string{"casdoor-secret", "casdoor-code", "response-access-token"}, "token response")
	})

	t.Run("request and provider errors are sanitized", func(t *testing.T) {
		provider := NewCasdoorIdProvider("client", "casdoor-secret", "https://admin.example.test/callback", "https://door.example.test")
		provider.Config.Endpoint.TokenURL = "://casdoor-secret/casdoor-code"
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			t.Fatal("transport must not run for invalid endpoint")
			return nil, nil
		})})

		_, err := provider.GetToken("casdoor-code")
		assertSanitizedIdPError(t, err, []string{"casdoor-secret", "casdoor-code"}, "create request")

		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return idpJSONResponse(http.StatusOK, `{"status":"error","msg":"casdoor-profile-token response-body-secret"}`), nil
		})})
		_, err = provider.GetUserInfo(&oauth2.Token{AccessToken: "casdoor-profile-token"})
		assertSanitizedIdPError(t, err, []string{"casdoor-profile-token", "response-body-secret"}, "provider rejected")
	})
}

func TestLarkIdProviderHTTPContract(t *testing.T) {
	t.Run("nil client uses bounded fallback", func(t *testing.T) {
		provider := NewLarkIdProvider("client", "secret", "https://admin.example.test/callback", false)

		client := provider.getHttpClient()
		if client == nil || client == http.DefaultClient {
			t.Fatal("expected independent fallback client")
		}
		if client.Timeout != 30*time.Second {
			t.Fatalf("expected 30s fallback timeout, got %s", client.Timeout)
		}
	})

	t.Run("all non-2xx and provider errors are sanitized", func(t *testing.T) {
		tests := []struct {
			name      string
			status    int
			body      string
			required  string
			forbidden []string
		}{
			{
				name:      "redirect status",
				status:    http.StatusFound,
				body:      `{"code":"0","access_token":"unexpected-token","expires_in":3600}`,
				required:  "status 302",
				forbidden: []string{"unexpected-token"},
			},
			{
				name:      "provider code",
				status:    http.StatusOK,
				body:      `{"code":"20002","msg":"secret_test","error_description":"token_test"}`,
				required:  "code 20002",
				forbidden: []string{"secret_test", "token_test"},
			},
			{
				name:      "provider code contains credential",
				status:    http.StatusOK,
				body:      `{"code":"secret_test token_test"}`,
				required:  "code unknown",
				forbidden: []string{"secret_test", "token_test"},
			},
			{
				name:      "missing access token",
				status:    http.StatusOK,
				body:      `{"code":"0","access_token":""}`,
				required:  "invalid token response",
				forbidden: []string{"secret_test"},
			},
		}
		for _, test := range tests {
			t.Run(test.name, func(t *testing.T) {
				provider := NewLarkIdProvider("client", "secret_test", "https://admin.example.test/callback", false)
				provider.Config.Endpoint.TokenURL = "https://lark.example.test/token"
				provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
					return idpJSONResponse(test.status, test.body), nil
				})})

				_, err := provider.GetToken("lark-code")
				assertSanitizedIdPError(t, err, test.forbidden, test.required)
			})
		}
	})
}

func TestWeChatMiniProgramIdProviderHTTPContract(t *testing.T) {
	t.Run("constructor uses bounded fallback", func(t *testing.T) {
		provider := NewWeChatMiniProgramIdProvider("mini-app", "mini-secret")
		if provider.Client == nil || provider.Client == http.DefaultClient {
			t.Fatal("expected independent fallback client")
		}
		if provider.Client.Timeout != 30*time.Second {
			t.Fatalf("expected 30s fallback timeout, got %s", provider.Client.Timeout)
		}
	})

	t.Run("injected client preserves query protocol", func(t *testing.T) {
		var captured *http.Request
		provider := NewWeChatMiniProgramIdProvider("mini-app", "mini-secret")
		injected := &http.Client{Transport: idpRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return idpJSONResponse(http.StatusOK, `{"openid":"open-id","session_key":"session-key","unionid":"union-id"}`), nil
		})}
		provider.SetHttpClient(injected)

		session, err := provider.GetSessionByCode("mini-code")
		if err != nil {
			t.Fatalf("GetSessionByCode() returned error: %v", err)
		}
		if provider.Client != injected || captured == nil {
			t.Fatal("expected injected client to execute request")
		}
		query := captured.URL.Query()
		if query.Get("appid") != "mini-app" || query.Get("secret") != "mini-secret" || query.Get("js_code") != "mini-code" {
			t.Fatalf("unexpected jscode2session query: %v", query)
		}
		if session.Openid != "open-id" || session.Unionid != "union-id" {
			t.Fatalf("unexpected session: %+v", session)
		}
	})

	t.Run("status transport and provider errors are sanitized", func(t *testing.T) {
		tests := []struct {
			name      string
			transport idpRoundTripFunc
			required  string
		}{
			{
				name: "non-2xx",
				transport: func(*http.Request) (*http.Response, error) {
					return idpJSONResponse(http.StatusBadGateway, `{"errcode":0,"errmsg":"response-body-secret"}`), nil
				},
				required: "status 502",
			},
			{
				name: "transport error",
				transport: func(*http.Request) (*http.Response, error) {
					return nil, errors.New("transport error")
				},
				required: "request failed",
			},
			{
				name: "provider error",
				transport: func(*http.Request) (*http.Response, error) {
					return idpJSONResponse(http.StatusOK, `{"errcode":40029,"errmsg":"mini-secret mini-code"}`), nil
				},
				required: "code 40029",
			},
		}

		for _, test := range tests {
			t.Run(test.name, func(t *testing.T) {
				provider := NewWeChatMiniProgramIdProvider("mini-app", "mini-secret")
				provider.SetHttpClient(&http.Client{Transport: test.transport})

				_, err := provider.GetSessionByCode("mini-code")
				assertSanitizedIdPError(t, err, []string{"mini-secret", "mini-code", "response-body-secret"}, test.required)
			})
		}
	})

	t.Run("request creation error is sanitized", func(t *testing.T) {
		provider := NewWeChatMiniProgramIdProvider("mini-app", "mini-secret")
		provider.SetHttpClient(&http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
			t.Fatal("transport must not run for invalid request URL")
			return nil, nil
		})})

		_, err := provider.GetSessionByCode("mini-code\n")
		assertSanitizedIdPError(t, err, []string{"mini-secret", "mini-code"}, "create request")
	})
}

func assertSanitizedIdPError(t *testing.T, err error, forbidden []string, required string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error containing %q", required)
	}
	if !strings.Contains(err.Error(), required) {
		t.Fatalf("expected error containing %q, got %v", required, err)
	}
	for _, value := range forbidden {
		if strings.Contains(err.Error(), value) {
			t.Fatalf("error leaked %q: %v", value, err)
		}
	}
}
