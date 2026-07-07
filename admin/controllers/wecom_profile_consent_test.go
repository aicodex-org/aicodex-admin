// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/form"
	"git.leagsoft.com/aicodex/aicodex-admin/idp"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
	"golang.org/x/oauth2"
)

type fakeWecomProfileConsentLoginIntentIssuer struct {
	request     *object.WecomProfileConsentLoginIntentIssueRequest
	syncRequest *object.WecomProfileConsentProfileSyncIntentIssueRequest
	provider    *object.Provider
	result      *object.WecomProfileConsentLoginIntentIssueResult
	err         error
}

type fakeWecomProfileConsentIntentCompleter struct {
	intentId  string
	pollToken string
	request   *wecomProfileConsentCompleteRequest
	response  *Response
	err       error
}

type fakeWecomProfileConsentCallbackAuthorizer struct {
	intent     *object.WecomProfileConsentIntent
	syncIntent *object.WecomProfileConsentIntent
	code       string
	syncCode   string
	result     *wecomProfileConsentCallbackAuthorizeResult
	syncResult *wecomProfileConsentProfileSyncAuthorizeResult
	err        error
}

type fakeWecomProfileConsentIdProvider struct {
	client      *http.Client
	token       *oauth2.Token
	userInfo    *idp.UserInfo
	tokenErr    error
	userInfoErr error
}

func (f *fakeWecomProfileConsentCallbackAuthorizer) AuthorizeLoginIntent(c *ApiController, intent *object.WecomProfileConsentIntent, code string) (*wecomProfileConsentCallbackAuthorizeResult, error) {
	f.intent = intent
	f.code = code
	return f.result, f.err
}

func (f *fakeWecomProfileConsentCallbackAuthorizer) AuthorizeProfileSyncIntent(c *ApiController, intent *object.WecomProfileConsentIntent, code string) (*wecomProfileConsentProfileSyncAuthorizeResult, error) {
	f.syncIntent = intent
	f.syncCode = code
	return f.syncResult, f.err
}

func (f *fakeWecomProfileConsentIntentCompleter) CompleteLoginIntent(c *ApiController, intentId string, pollToken string, request *wecomProfileConsentCompleteRequest) (*Response, error) {
	f.intentId = intentId
	f.pollToken = pollToken
	f.request = request
	return f.response, f.err
}

func (f *fakeWecomProfileConsentLoginIntentIssuer) IssueLoginIntent(request *object.WecomProfileConsentLoginIntentIssueRequest, provider *object.Provider) (*object.WecomProfileConsentLoginIntentIssueResult, error) {
	f.request = request
	f.provider = provider
	return f.result, f.err
}

func (f *fakeWecomProfileConsentLoginIntentIssuer) IssueProfileSyncIntent(request *object.WecomProfileConsentProfileSyncIntentIssueRequest, provider *object.Provider) (*object.WecomProfileConsentLoginIntentIssueResult, error) {
	f.syncRequest = request
	f.provider = provider
	return f.result, f.err
}

func (f *fakeWecomProfileConsentIdProvider) SetHttpClient(client *http.Client) {
	f.client = client
}

func (f *fakeWecomProfileConsentIdProvider) GetToken(code string) (*oauth2.Token, error) {
	if f.tokenErr != nil {
		return nil, f.tokenErr
	}
	if f.token != nil {
		return f.token, nil
	}
	return &oauth2.Token{AccessToken: "access-token"}, nil
}

func (f *fakeWecomProfileConsentIdProvider) GetUserInfo(token *oauth2.Token) (*idp.UserInfo, error) {
	if f.userInfoErr != nil {
		return nil, f.userInfoErr
	}
	return f.userInfo, nil
}

func TestSaveWecomProfileConsentOAuthProfileDoesNotPersistToken(t *testing.T) {
	oldSetProfile := setWecomProfileConsentUserOAuthProfile
	oldLinkAccount := linkWecomProfileConsentUserAccount
	defer func() {
		setWecomProfileConsentUserOAuthProfile = oldSetProfile
		linkWecomProfileConsentUserAccount = oldLinkAccount
	}()

	setCalled := false
	linkCalled := false
	setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
		setCalled = true
		if token != nil {
			t.Fatalf("token persisted for sensitive consent flow: %#v", token)
		}
		if providerType != "WeCom" {
			t.Fatalf("providerType = %q, want WeCom", providerType)
		}
		if len(userMapping) != 1 || userMapping[0]["userid"] != "wecom" {
			t.Fatalf("userMapping = %#v, want provider mapping to be forwarded", userMapping)
		}
		return true, nil
	}
	linkWecomProfileConsentUserAccount = func(user *object.User, field string, value string) (bool, error) {
		linkCalled = true
		if field != "WeCom" || value != "wecom-user-1" {
			t.Fatalf("LinkUserAccount(%q, %q), want WeCom/wecom-user-1", field, value)
		}
		return true, nil
	}

	err := saveWecomProfileConsentOAuthProfile(
		&object.Organization{Name: "built-in"},
		&object.User{Owner: "built-in", Name: "alice", Properties: map[string]string{}},
		&object.Provider{Type: "WeCom", UserMapping: map[string]string{"userid": "wecom"}},
		&idp.UserInfo{Id: "wecom-user-1"},
		"wecom-user-1",
	)
	if err != nil {
		t.Fatalf("saveWecomProfileConsentOAuthProfile() error = %v", err)
	}
	if !setCalled || !linkCalled {
		t.Fatalf("setCalled = %v, linkCalled = %v, want both true", setCalled, linkCalled)
	}
}

func TestRequireWecomProfileConsentUserTicketRejectsContactOnlyProfile(t *testing.T) {
	if err := requireWecomProfileConsentUserTicket(&idp.UserInfo{
		Extra: map[string]string{
			idp.WeComInternalExtraHasUserTicket: "true",
		},
	}); err != nil {
		t.Fatalf("requireWecomProfileConsentUserTicket() error = %v, want nil", err)
	}

	err := requireWecomProfileConsentUserTicket(&idp.UserInfo{
		Extra: map[string]string{
			idp.WeComInternalExtraHasUserTicket: "false",
		},
	})
	if err == nil || !strings.Contains(err.Error(), "user ticket is missing") {
		t.Fatalf("requireWecomProfileConsentUserTicket() error = %v, want missing user ticket", err)
	}
}

func TestRequiresEmailClaimForWecomProfileConsent(t *testing.T) {
	if requiresEmailClaimForWecomProfileConsent(nil) {
		t.Fatal("nil intent must not require email")
	}
	if requiresEmailClaimForWecomProfileConsent(&object.WecomProfileConsentIntent{}) {
		t.Fatal("missing login context must not require email")
	}
	if requiresEmailClaimForWecomProfileConsent(&object.WecomProfileConsentIntent{LoginContextJSON: "{"}) {
		t.Fatal("invalid login context must not require email")
	}

	intent := &object.WecomProfileConsentIntent{}
	if err := intent.SetLoginContext(&object.WecomProfileConsentLoginContext{Scope: "openid profile email"}); err != nil {
		t.Fatalf("SetLoginContext() error = %v", err)
	}
	if !requiresEmailClaimForWecomProfileConsent(intent) {
		t.Fatal("email scope must require email")
	}
}

func TestWecomProfileConsentScopeIncludesMatchesExactTokens(t *testing.T) {
	tests := []struct {
		name  string
		scope string
		want  bool
	}{
		{name: "space separated", scope: "openid profile email", want: true},
		{name: "plus separated", scope: "openid+profile+email", want: true},
		{name: "encoded space separated", scope: "openid%20profile%20email", want: true},
		{name: "comma separated", scope: "openid,profile,email", want: true},
		{name: "case insensitive", scope: "openid PROFILE EMAIL", want: true},
		{name: "does not match suffix scope", scope: "openid login:email", want: false},
		{name: "does not match prefixed scope", scope: "openid email_verified", want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := wecomProfileConsentScopeIncludes(tt.scope, "email"); got != tt.want {
				t.Fatalf("wecomProfileConsentScopeIncludes(%q) = %v, want %v", tt.scope, got, tt.want)
			}
		})
	}
}

func TestCreateWecomProfileConsentLoginIntent(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldNewIssuer := newWecomProfileConsentIntentIssuer
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		newWecomProfileConsentIntentIssuer = oldNewIssuer
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return &object.Application{
			Owner:        "admin",
			Name:         "app-built-in",
			Organization: "built-in",
			Providers: []*object.ProviderItem{
				{
					Owner:              "admin",
					Name:               "wecom-internal",
					TargetOrganization: "built-in",
					Provider: &object.Provider{
						Category: "OAuth",
						Type:     "WeCom",
					},
				},
			},
		}, nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return &object.Provider{
			Owner:        "admin",
			Name:         "wecom-internal",
			Category:     "OAuth",
			Type:         "WeCom",
			SubType:      "Internal",
			Method:       "Normal",
			ClientId:     "ww123",
			ClientSecret: "secret",
			AppId:        "1000002",
		}, nil
	}

	fakeIssuer := &fakeWecomProfileConsentLoginIntentIssuer{
		result: &object.WecomProfileConsentLoginIntentIssueResult{
			Intent: &object.WecomProfileConsentIntent{
				Name:      "intent-login-1",
				ExpiresAt: time.Date(2026, 6, 4, 10, 30, 0, 0, time.UTC),
			},
			Secrets: &object.WecomProfileConsentIssuedSecrets{
				State:     object.BuildWecomProfileConsentState("intent-login-1", "nonce-1"),
				PollToken: "poll-token-1",
			},
			AuthURL: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo#wechat_redirect",
		},
	}
	newWecomProfileConsentIntentIssuer = func() wecomProfileConsentLoginIntentIssuer {
		return fakeIssuer
	}

	controller, recorder := newWecomProfileConsentTestController(t, `{"application":"app-built-in","provider":"admin/wecom-internal","returnUrl":"/portal"}`)
	controller.CreateWecomProfileConsentLoginIntent()

	if fakeIssuer.request == nil {
		t.Fatal("issuer request was not captured")
	}
	if fakeIssuer.request.ClientKey == "" {
		t.Fatal("issuer request client key should not be empty")
	}
	if fakeIssuer.request.LoginContext == nil || fakeIssuer.request.LoginContext.Type != ResponseTypeLogin {
		t.Fatalf("login context = %#v, want default login type", fakeIssuer.request.LoginContext)
	}
	if fakeIssuer.request.LoginContext.Method != "signup" {
		t.Fatalf("login context method = %q, want signup", fakeIssuer.request.LoginContext.Method)
	}
	if fakeIssuer.request.CorpId != "ww123" || fakeIssuer.request.AgentId != "1000002" {
		t.Fatalf("issuer request corp/agent = (%q,%q)", fakeIssuer.request.CorpId, fakeIssuer.request.AgentId)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	if response["status"] != "ok" {
		t.Fatalf("response status = %#v, want ok", response["status"])
	}

	data, ok := response["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("response data = %#v", response["data"])
	}
	if data["intentId"] != "intent-login-1" {
		t.Fatalf("intentId = %#v, want intent-login-1", data["intentId"])
	}
	if data["pollToken"] != "poll-token-1" {
		t.Fatalf("pollToken = %#v, want poll-token-1", data["pollToken"])
	}
	shortAuthURL, ok := data["shortAuthUrl"].(string)
	if !ok || !strings.Contains(shortAuthURL, "/api/wecom-profile-consent/intents/intent-login-1/authorize?state=") {
		t.Fatalf("shortAuthUrl = %#v, want short authorize URL", data["shortAuthUrl"])
	}

	cookies := recorder.Result().Cookies()
	foundCookie := false
	for _, cookie := range cookies {
		if cookie.Name == object.WecomProfileConsentClientCookieName && cookie.Value != "" {
			foundCookie = true
			break
		}
	}
	if !foundCookie {
		t.Fatalf("cookie %q was not set", object.WecomProfileConsentClientCookieName)
	}
}

func TestCreateWecomProfileConsentLoginIntentRejectsInvalidRequests(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldNewIssuer := newWecomProfileConsentIntentIssuer
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		newWecomProfileConsentIntentIssuer = oldNewIssuer
	}()

	tests := []struct {
		name      string
		body      string
		app       *object.Application
		appErr    error
		provider  *object.Provider
		provErr   error
		issuerErr error
	}{
		{
			name: "invalid json",
			body: "{",
		},
		{
			name: "missing application",
			body: `{"provider":"admin/wecom-internal"}`,
		},
		{
			name: "missing provider",
			body: `{"application":"app-built-in"}`,
		},
		{
			name:   "application lookup error",
			body:   `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			appErr: errors.New("application lookup failed"),
		},
		{
			name: "application is missing",
			body: `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			app:  nil,
		},
		{
			name: "provider is not enabled",
			body: `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			app:  &object.Application{Owner: "admin", Name: "app-built-in", Organization: "built-in"},
		},
		{
			name:    "provider lookup error",
			body:    `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			app:     newWecomProfileConsentTestApplication(),
			provErr: errors.New("provider lookup failed"),
		},
		{
			name:     "provider is missing",
			body:     `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			app:      newWecomProfileConsentTestApplication(),
			provider: nil,
		},
		{
			name: "provider configuration is incomplete",
			body: `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			app:  newWecomProfileConsentTestApplication(),
			provider: func() *object.Provider {
				provider := newWecomProfileConsentTestProvider()
				provider.ClientSecret = ""
				return provider
			}(),
		},
		{
			name:      "issuer returns error",
			body:      `{"application":"app-built-in","provider":"admin/wecom-internal"}`,
			app:       newWecomProfileConsentTestApplication(),
			provider:  newWecomProfileConsentTestProvider(),
			issuerErr: errors.New("issuer failed"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fakeIssuer := &fakeWecomProfileConsentLoginIntentIssuer{err: tt.issuerErr}
			getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
				if tt.appErr != nil {
					return nil, tt.appErr
				}
				return tt.app, nil
			}
			getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
				if tt.provErr != nil {
					return nil, tt.provErr
				}
				return tt.provider, nil
			}
			newWecomProfileConsentIntentIssuer = func() wecomProfileConsentLoginIntentIssuer {
				return fakeIssuer
			}

			controller, recorder := newWecomProfileConsentTestController(t, tt.body)
			controller.CreateWecomProfileConsentLoginIntent()

			var response map[string]interface{}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("response json error = %v, body = %s", err, recorder.Body.String())
			}
			if response["status"] != "error" {
				t.Fatalf("response = %#v, want error", response)
			}
			if tt.issuerErr == nil && fakeIssuer.request != nil {
				t.Fatalf("issuer should not be called for invalid request: %#v", fakeIssuer.request)
			}
		})
	}
}

func TestAuthorizeWecomProfileConsentIntentRedirectsToOAuthURL(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldGetProvider := getWecomProfileConsentProvider
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		getWecomProfileConsentProvider = oldGetProvider
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-short-1", object.WecomProfileConsentIntentStatusPending)
	intent.ExpiresAt = time.Now().Add(5 * time.Minute).UTC()
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		if name != "intent-short-1" {
			t.Fatalf("intent name = %q, want intent-short-1", name)
		}
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		if id != "admin/wecom-internal" {
			t.Fatalf("provider id = %q, want admin/wecom-internal", id)
		}
		return newWecomProfileConsentTestProvider(), nil
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/intents/intent-short-1/authorize?state="+issued.State, "")
	controller.Ctx.Input.SetParam(":intentId", "intent-short-1")
	controller.AuthorizeWecomProfileConsentIntent()

	if recorder.Code != http.StatusFound {
		t.Fatalf("status = %d, want 302", recorder.Code)
	}
	location := recorder.Header().Get("Location")
	if !strings.HasPrefix(location, "https://open.weixin.qq.com/connect/oauth2/authorize?") {
		t.Fatalf("Location = %q, want WeCom OAuth2 URL", location)
	}
	if !strings.Contains(location, "scope=snsapi_privateinfo") || !strings.Contains(location, "state="+issued.State) {
		t.Fatalf("Location = %q, want sensitive scope and original state", location)
	}
	if !strings.Contains(location, "redirect_uri=https%3A%2F%2Fdoor.example.com%2Fapi%2Fwecom-profile-consent%2Fcallback") {
		t.Fatalf("Location = %q, want callback URL", location)
	}
}

func TestAuthorizeWecomProfileConsentIntentRejectsInvalidState(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
	}()

	intent, _ := newWecomProfileConsentCompleteTestIntent(t, "intent-short-invalid", object.WecomProfileConsentIntentStatusPending)
	intent.ExpiresAt = time.Now().Add(5 * time.Minute).UTC()
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/intents/intent-short-invalid/authorize?state=invalid-state", "")
	controller.Ctx.Input.SetParam(":intentId", "intent-short-invalid")
	controller.AuthorizeWecomProfileConsentIntent()

	if recorder.Code == http.StatusFound {
		t.Fatalf("status = %d, must not redirect invalid state", recorder.Code)
	}
	if strings.Contains(recorder.Body.String(), "poll-token") {
		t.Fatalf("response leaked poll token: %s", recorder.Body.String())
	}
}

func TestAuthorizeWecomProfileConsentIntentRejectsUnsafeRequests(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldGetProvider := getWecomProfileConsentProvider
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		getWecomProfileConsentProvider = oldGetProvider
	}()

	tests := []struct {
		name        string
		state       func(intent *object.WecomProfileConsentIntent, issued *object.WecomProfileConsentIssuedSecrets) string
		configure   func(intent *object.WecomProfileConsentIntent)
		nilIntent   bool
		refreshed   *object.WecomProfileConsentIntent
		providerSet bool
		provider    *object.Provider
		providerErr error
	}{
		{
			name: "missing state",
			state: func(intent *object.WecomProfileConsentIntent, issued *object.WecomProfileConsentIssuedSecrets) string {
				return ""
			},
		},
		{
			name: "state belongs to another intent",
			state: func(intent *object.WecomProfileConsentIntent, issued *object.WecomProfileConsentIssuedSecrets) string {
				return object.BuildWecomProfileConsentState("other-intent", "nonce")
			},
		},
		{
			name:      "intent is not found",
			nilIntent: true,
		},
		{
			name: "state hash mismatch",
			state: func(intent *object.WecomProfileConsentIntent, issued *object.WecomProfileConsentIssuedSecrets) string {
				return object.BuildWecomProfileConsentState(intent.Name, "different-nonce")
			},
		},
		{
			name: "expired refreshed intent",
			refreshed: func() *object.WecomProfileConsentIntent {
				intent, _ := newWecomProfileConsentCompleteTestIntent(t, "intent-short-unsafe", object.WecomProfileConsentIntentStatusExpired)
				return intent
			}(),
		},
		{
			name: "completed intent",
			configure: func(intent *object.WecomProfileConsentIntent) {
				intent.Status = object.WecomProfileConsentIntentStatusCompleted
			},
		},
		{
			name: "profile sync intent",
			configure: func(intent *object.WecomProfileConsentIntent) {
				intent.IntentType = object.WecomProfileConsentIntentTypeProfileSync
			},
		},
		{
			name:        "provider lookup error",
			providerErr: errors.New("provider lookup failed"),
		},
		{
			name:        "provider is missing",
			providerSet: true,
			provider:    nil,
		},
		{
			name:      "corp boundary mismatch",
			configure: func(intent *object.WecomProfileConsentIntent) { intent.CorpId = "ww-other" },
		},
		{
			name:      "agent boundary mismatch",
			configure: func(intent *object.WecomProfileConsentIntent) { intent.AgentId = "1000003" },
		},
		{
			name: "provider configuration is incomplete",
			provider: func() *object.Provider {
				provider := newWecomProfileConsentTestProvider()
				provider.ClientSecret = ""
				return provider
			}(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-short-unsafe", object.WecomProfileConsentIntentStatusPending)
			intent.ExpiresAt = time.Now().Add(5 * time.Minute).UTC()
			if tt.configure != nil {
				tt.configure(intent)
			}
			state := issued.State
			if tt.state != nil {
				state = tt.state(intent, issued)
			}

			getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
				if tt.nilIntent {
					return nil, nil
				}
				return intent, nil
			}
			expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
				if tt.refreshed != nil {
					return tt.refreshed, true, nil
				}
				return intent, false, nil
			}
			getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
				if tt.providerErr != nil {
					return nil, tt.providerErr
				}
				if tt.providerSet || tt.provider != nil {
					return tt.provider, nil
				}
				return newWecomProfileConsentTestProvider(), nil
			}

			target := "/api/wecom-profile-consent/intents/intent-short-unsafe/authorize"
			if state != "" {
				target += "?state=" + state
			}
			controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, target, "")
			controller.Ctx.Input.SetParam(":intentId", "intent-short-unsafe")
			controller.AuthorizeWecomProfileConsentIntent()

			if recorder.Code == http.StatusFound {
				t.Fatalf("status = %d, must not redirect unsafe request", recorder.Code)
			}
			if strings.Contains(recorder.Body.String(), issued.PollToken) {
				t.Fatalf("response leaked poll token: %s", recorder.Body.String())
			}
		})
	}
}

func TestCreateWecomProfileConsentProfileSyncIntentCreatesIntentForUniqueCurrentIdentity(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetUser := getWecomProfileConsentUser
	oldNewIssuer := newWecomProfileConsentIntentIssuer
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentUser = oldGetUser
		newWecomProfileConsentIntentIssuer = oldNewIssuer
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return newWecomProfileConsentTestProvider(), nil
	}
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		return &object.User{
			Owner: "built-in",
			Name:  "alice",
			Wecom: "zhangsan",
			Properties: map[string]string{
				object.WecomUserPropertyCorpId: "ww123",
				object.WecomUserPropertyUserId: "zhangsan",
			},
		}, nil
	}

	fakeIssuer := &fakeWecomProfileConsentLoginIntentIssuer{
		result: &object.WecomProfileConsentLoginIntentIssueResult{
			Intent: &object.WecomProfileConsentIntent{
				Name:      "intent-profile-sync-1",
				ExpiresAt: time.Date(2026, 6, 4, 10, 30, 0, 0, time.UTC),
			},
			Secrets: &object.WecomProfileConsentIssuedSecrets{PollToken: "poll-token-1"},
			AuthURL: "https://open.weixin.qq.com/connect/oauth2/authorize?scope=snsapi_privateinfo#wechat_redirect",
		},
	}
	newWecomProfileConsentIntentIssuer = func() wecomProfileConsentLoginIntentIssuer {
		return fakeIssuer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/profile-sync-intents", `{"application":"app-built-in","provider":"admin/wecom-internal"}`)
	controller.Ctx.Input.SetData("currentUserId", "built-in/alice")
	controller.CreateWecomProfileConsentProfileSyncIntent()

	if fakeIssuer.syncRequest == nil {
		t.Fatal("profile sync issuer request was not captured")
	}
	if fakeIssuer.syncRequest.SubjectOwner != "built-in" || fakeIssuer.syncRequest.SubjectName != "alice" || fakeIssuer.syncRequest.ExpectedWecomUserId != "zhangsan" {
		t.Fatalf("sync request = %#v", fakeIssuer.syncRequest)
	}
	if fakeIssuer.syncRequest.CorpId != "ww123" || fakeIssuer.syncRequest.ProviderName != "wecom-internal" {
		t.Fatalf("sync request provider boundary = %#v", fakeIssuer.syncRequest)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	if response["status"] != "ok" {
		t.Fatalf("response = %#v", response)
	}
}

func TestCreateWecomProfileConsentProfileSyncIntentRejectsConflictingCurrentIdentity(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetUser := getWecomProfileConsentUser
	oldNewIssuer := newWecomProfileConsentIntentIssuer
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentUser = oldGetUser
		newWecomProfileConsentIntentIssuer = oldNewIssuer
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return newWecomProfileConsentTestProvider(), nil
	}
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		return &object.User{
			Owner: "built-in",
			Name:  "alice",
			Wecom: "zhangsan",
			Properties: map[string]string{
				object.WecomUserPropertyCorpId: "ww123",
				object.WecomUserPropertyUserId: "lisi",
			},
		}, nil
	}
	fakeIssuer := &fakeWecomProfileConsentLoginIntentIssuer{}
	newWecomProfileConsentIntentIssuer = func() wecomProfileConsentLoginIntentIssuer {
		return fakeIssuer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/profile-sync-intents", `{"application":"app-built-in","provider":"wecom-internal"}`)
	controller.Ctx.Input.SetData("currentUserId", "built-in/alice")
	controller.CreateWecomProfileConsentProfileSyncIntent()

	if fakeIssuer.syncRequest != nil {
		t.Fatalf("issuer should not be called for conflicting identity: %#v", fakeIssuer.syncRequest)
	}
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	if response["status"] != "error" || !strings.Contains(response["msg"].(string), "conflict") {
		t.Fatalf("response = %#v, want conflict error", response)
	}
}

func TestCreateWecomProfileConsentProfileSyncIntentRejectsUnboundCurrentIdentity(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetUser := getWecomProfileConsentUser
	oldNewIssuer := newWecomProfileConsentIntentIssuer
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentUser = oldGetUser
		newWecomProfileConsentIntentIssuer = oldNewIssuer
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return newWecomProfileConsentTestProvider(), nil
	}
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		return &object.User{Owner: "built-in", Name: "alice"}, nil
	}
	fakeIssuer := &fakeWecomProfileConsentLoginIntentIssuer{}
	newWecomProfileConsentIntentIssuer = func() wecomProfileConsentLoginIntentIssuer {
		return fakeIssuer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/profile-sync-intents", `{"application":"app-built-in","provider":"wecom-internal"}`)
	controller.Ctx.Input.SetData("currentUserId", "built-in/alice")
	controller.CreateWecomProfileConsentProfileSyncIntent()

	if fakeIssuer.syncRequest != nil {
		t.Fatalf("issuer should not be called for unbound identity: %#v", fakeIssuer.syncRequest)
	}
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	if response["status"] != "error" || !strings.Contains(response["msg"].(string), "no linked WeCom identity") {
		t.Fatalf("response = %#v, want unbound identity error", response)
	}
}

func TestCreateWecomProfileConsentProfileSyncIntentRejectsMappingToDifferentUser(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetUser := getWecomProfileConsentUser
	oldGetMapping := getWecomProfileConsentWecomUserMapping
	oldNewIssuer := newWecomProfileConsentIntentIssuer
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentUser = oldGetUser
		getWecomProfileConsentWecomUserMapping = oldGetMapping
		newWecomProfileConsentIntentIssuer = oldNewIssuer
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return newWecomProfileConsentTestProvider(), nil
	}
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		return &object.User{
			Owner: "built-in",
			Name:  "alice",
			Wecom: "zhangsan",
		}, nil
	}
	getWecomProfileConsentWecomUserMapping = func(organization string, corpId string, wecomUserId string) (*object.WecomUserMapping, error) {
		return &object.WecomUserMapping{
			UserOwner: "built-in",
			UserName:  "bob",
			IsEnabled: true,
		}, nil
	}
	fakeIssuer := &fakeWecomProfileConsentLoginIntentIssuer{}
	newWecomProfileConsentIntentIssuer = func() wecomProfileConsentLoginIntentIssuer {
		return fakeIssuer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/profile-sync-intents", `{"application":"app-built-in","provider":"wecom-internal"}`)
	controller.Ctx.Input.SetData("currentUserId", "built-in/alice")
	controller.CreateWecomProfileConsentProfileSyncIntent()

	if fakeIssuer.syncRequest != nil {
		t.Fatalf("issuer should not be called for conflicting mapping: %#v", fakeIssuer.syncRequest)
	}
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	if response["status"] != "error" || !strings.Contains(response["msg"].(string), "conflict") {
		t.Fatalf("response = %#v, want conflict error", response)
	}
}

func TestHandleWecomProfileConsentCallbackRejectsInvalidStateBeforeAuthorizing(t *testing.T) {
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()
	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state=invalid-state", "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.intent != nil || fakeAuthorizer.code != "" {
		t.Fatalf("authorizer should not be called for invalid state: %#v", fakeAuthorizer)
	}
	if !strings.Contains(recorder.Body.String(), "授权失败") {
		t.Fatalf("callback body = %q, want failure page", recorder.Body.String())
	}
}

func TestHandleWecomProfileConsentCallbackAuthorizesPendingIntent(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	service := &object.WecomProfileConsentIntentService{
		Now:            func() time.Time { return time.Date(2026, 6, 4, 12, 20, 0, 0, time.UTC) },
		GenerateName:   func() string { return "intent-callback-1" },
		GenerateSecret: func() string { return "secret-callback-1" },
	}
	intent, issued, err := service.NewIntent(&object.WecomProfileConsentIntentCreateRequest{
		Owner:        "built-in",
		Application:  "app-built-in",
		ProviderName: "wecom-internal",
	})
	if err != nil {
		t.Fatalf("NewIntent() error = %v", err)
	}
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionWecomProfileConsentIntent = func(name string, allowedStatuses []object.WecomProfileConsentIntentStatus, mutate object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
		changed, err := mutate(intent)
		if err != nil {
			return nil, false, err
		}
		return intent, changed, nil
	}

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{
		result: &wecomProfileConsentCallbackAuthorizeResult{
			User:        &object.User{Owner: "built-in", Name: "alice"},
			WecomUserId: "zhangsan",
		},
	}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.intent == nil || fakeAuthorizer.intent.Name != "intent-callback-1" || fakeAuthorizer.code != "auth-code" {
		t.Fatalf("authorizer call = %#v", fakeAuthorizer)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusAuthorized || intent.ResolvedUserName != "alice" || intent.WecomUserId != "zhangsan" {
		t.Fatalf("authorized intent = %#v", intent)
	}
	if !strings.Contains(recorder.Body.String(), "授权完成") {
		t.Fatalf("callback body = %q, want success page", recorder.Body.String())
	}
}

func TestHandleWecomProfileConsentCallbackKeepsAuthorizedIntentIdempotent(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-authorized-repeat", object.WecomProfileConsentIntentStatusAuthorized)
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionWecomProfileConsentIntent = newWecomProfileConsentTransitionStub(t, intent)

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.intent != nil || fakeAuthorizer.code != "" {
		t.Fatalf("authorizer should not be called for already authorized intent: %#v", fakeAuthorizer)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusAuthorized {
		t.Fatalf("authorized intent status = %q, want %q", intent.Status, object.WecomProfileConsentIntentStatusAuthorized)
	}
	if !strings.Contains(recorder.Body.String(), "授权完成") {
		t.Fatalf("callback body = %q, want success page", recorder.Body.String())
	}
}

func TestHandleWecomProfileConsentCallbackMarksFailedWhenAuthorizationFails(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-auth-failed", object.WecomProfileConsentIntentStatusPending)
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionWecomProfileConsentIntent = newWecomProfileConsentTransitionStub(t, intent)

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.intent == nil || fakeAuthorizer.code != "auth-code" {
		t.Fatalf("authorizer call = %#v", fakeAuthorizer)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusFailed || intent.ErrorCode != "authorization_failed" {
		t.Fatalf("failed intent = %#v", intent)
	}
	if !strings.Contains(recorder.Body.String(), "授权失败") {
		t.Fatalf("callback body = %q, want failure page", recorder.Body.String())
	}
}

func TestHandleWecomProfileConsentCallbackMarksEmailPermissionFailure(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-email-permission", object.WecomProfileConsentIntentStatusPending)
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionWecomProfileConsentIntent = newWecomProfileConsentTransitionStub(t, intent)

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{
		err: errWecomProfileConsentEmailPermissionRequired,
	}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.intent == nil || fakeAuthorizer.code != "auth-code" {
		t.Fatalf("authorizer call = %#v", fakeAuthorizer)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusFailed || intent.ErrorCode != wecomProfileConsentEmailPermissionRequiredCode {
		t.Fatalf("failed intent = %#v", intent)
	}
	if !strings.Contains(intent.ErrorText, "个人敏感信息管理") || !strings.Contains(intent.ErrorText, "邮箱") {
		t.Fatalf("error text = %q, want WeCom private email permission guidance", intent.ErrorText)
	}
	if !strings.Contains(recorder.Body.String(), "授权失败") {
		t.Fatalf("callback body = %q, want failure page", recorder.Body.String())
	}
}

func TestHandleWecomProfileConsentCallbackMarksFailedWhenAuthorizeTransitionFails(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-transition-failed", object.WecomProfileConsentIntentStatusPending)
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionCalls := 0
	transitionWecomProfileConsentIntent = func(name string, allowedStatuses []object.WecomProfileConsentIntentStatus, mutate object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
		transitionCalls++
		if transitionCalls == 1 {
			return intent, false, errors.New("transition failed")
		}
		changed, err := mutate(intent)
		return intent, changed, err
	}

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{
		result: &wecomProfileConsentCallbackAuthorizeResult{
			User:        &object.User{Owner: "built-in", Name: "alice"},
			WecomUserId: "zhangsan",
		},
	}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if transitionCalls != 2 {
		t.Fatalf("transitionCalls = %d, want authorize failure plus mark failed", transitionCalls)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusFailed || intent.ErrorCode != "authorization_failed" {
		t.Fatalf("failed intent = %#v", intent)
	}
	if !strings.Contains(recorder.Body.String(), "授权失败") {
		t.Fatalf("callback body = %q, want failure page", recorder.Body.String())
	}
}

func TestHandleWecomProfileConsentCallbackRejectsExpiredIntentBeforeAuthorizing(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-expired", object.WecomProfileConsentIntentStatusPending)
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		intent.Status = object.WecomProfileConsentIntentStatusExpired
		intent.ErrorCode = "intent_expired"
		return intent, true, nil
	}
	transitionWecomProfileConsentIntent = newWecomProfileConsentTransitionStub(t, intent)

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.intent != nil || fakeAuthorizer.code != "" {
		t.Fatalf("authorizer should not be called for expired intent: %#v", fakeAuthorizer)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusExpired || intent.ErrorCode != "intent_expired" {
		t.Fatalf("expired intent = %#v", intent)
	}
	if !strings.Contains(recorder.Body.String(), "授权失败") {
		t.Fatalf("callback body = %q, want failure page", recorder.Body.String())
	}
}

func TestDefaultWecomProfileConsentCallbackAuthorizerRejectsCorpBoundaryMismatch(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetOrganization := getWecomProfileConsentOrganization
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentOrganization = oldGetOrganization
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		provider := newWecomProfileConsentTestProvider()
		provider.ClientId = "ww-other"
		return provider, nil
	}
	getWecomProfileConsentOrganization = func(id string) (*object.Organization, error) {
		return &object.Organization{Owner: "admin", Name: "built-in"}, nil
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback", "")
	_, err := (&defaultWecomProfileConsentCallbackAuthorizer{}).AuthorizeLoginIntent(controller, &object.WecomProfileConsentIntent{
		Application:  "app-built-in",
		ProviderName: "wecom-internal",
		CorpId:       "ww123",
		AgentId:      "1000002",
	}, "auth-code")
	if err == nil || !strings.Contains(err.Error(), "corp boundary mismatch") {
		t.Fatalf("AuthorizeLoginIntent() error = %v, want corp boundary mismatch", err)
	}
}

func TestDefaultWecomProfileConsentCallbackAuthorizerRejectsOIDCEmailScopeWithoutEmail(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetOrganization := getWecomProfileConsentOrganization
	oldGetIdProvider := getWecomProfileConsentIdProvider
	oldGetUserByField := getWecomProfileConsentUserByField
	oldFindLarkUser := findWecomProfileConsentLarkUser
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentOrganization = oldGetOrganization
		getWecomProfileConsentIdProvider = oldGetIdProvider
		getWecomProfileConsentUserByField = oldGetUserByField
		findWecomProfileConsentLarkUser = oldFindLarkUser
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return newWecomProfileConsentTestProvider(), nil
	}
	getWecomProfileConsentOrganization = func(id string) (*object.Organization, error) {
		return &object.Organization{Owner: "admin", Name: "built-in"}, nil
	}
	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		t.Fatalf("must reject missing email before user lookup, got %s=%s", field, value)
		return nil, nil
	}
	findWecomProfileConsentLarkUser = func(owner string, userInfo *idp.UserInfo) (*object.User, string, error) {
		t.Fatalf("must reject missing email before fallback user lookup")
		return nil, "", nil
	}
	getWecomProfileConsentIdProvider = func(idpInfo *idp.ProviderInfo, redirectURL string) (idp.IdProvider, error) {
		return &fakeWecomProfileConsentIdProvider{
			userInfo: &idp.UserInfo{
				Id: "zhangsan",
				Extra: map[string]string{
					"userid":                            "zhangsan",
					"corp_id":                           "ww123",
					idp.WeComInternalExtraHasUserTicket: "true",
				},
			},
		}, nil
	}

	intent, _ := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-email-scope", object.WecomProfileConsentIntentStatusPending)
	if err := intent.SetLoginContext(&object.WecomProfileConsentLoginContext{
		Type:         "login",
		Method:       "signup",
		ResponseType: "code",
		Scope:        "openid profile email",
	}); err != nil {
		t.Fatalf("SetLoginContext() error = %v", err)
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback", "")
	result, err := (&defaultWecomProfileConsentCallbackAuthorizer{}).AuthorizeLoginIntent(controller, intent, "auth-code")
	if result != nil {
		t.Fatalf("AuthorizeLoginIntent() result = %#v, want nil", result)
	}
	if !errors.Is(err, errWecomProfileConsentEmailPermissionRequired) {
		t.Fatalf("AuthorizeLoginIntent() error = %v, want email permission required", err)
	}
}

func TestDefaultWecomProfileConsentCallbackAuthorizerAllowsOIDCEmailScopeWithEmail(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetProvider := getWecomProfileConsentProvider
	oldGetOrganization := getWecomProfileConsentOrganization
	oldGetIdProvider := getWecomProfileConsentIdProvider
	oldGetUserByField := getWecomProfileConsentUserByField
	oldSetProfile := setWecomProfileConsentUserOAuthProfile
	oldLinkAccount := linkWecomProfileConsentUserAccount
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentProvider = oldGetProvider
		getWecomProfileConsentOrganization = oldGetOrganization
		getWecomProfileConsentIdProvider = oldGetIdProvider
		getWecomProfileConsentUserByField = oldGetUserByField
		setWecomProfileConsentUserOAuthProfile = oldSetProfile
		linkWecomProfileConsentUserAccount = oldLinkAccount
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return newWecomProfileConsentTestApplication(), nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return newWecomProfileConsentTestProvider(), nil
	}
	getWecomProfileConsentOrganization = func(id string) (*object.Organization, error) {
		return &object.Organization{Owner: "admin", Name: "built-in"}, nil
	}
	getWecomProfileConsentIdProvider = func(idpInfo *idp.ProviderInfo, redirectURL string) (idp.IdProvider, error) {
		return &fakeWecomProfileConsentIdProvider{
			userInfo: &idp.UserInfo{
				Id:    "zhangsan",
				Email: "zhangsan@example.com",
				Extra: map[string]string{
					"userid":                            "zhangsan",
					"corp_id":                           "ww123",
					idp.WeComInternalExtraHasUserTicket: "true",
				},
			},
		}, nil
	}
	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		if organizationName != "built-in" || field != "WeCom" || value != "zhangsan" {
			t.Fatalf("GetUserByField(%q, %q, %q)", organizationName, field, value)
		}
		return &object.User{Owner: "built-in", Name: "alice"}, nil
	}
	setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
		if token != nil {
			t.Fatalf("token persisted for sensitive consent flow: %#v", token)
		}
		if providerType != "WeCom" || userInfo.Email != "zhangsan@example.com" {
			t.Fatalf("profile save providerType=%q userInfo=%#v", providerType, userInfo)
		}
		return true, nil
	}
	linkWecomProfileConsentUserAccount = func(user *object.User, field string, value string) (bool, error) {
		if user.Name != "alice" || field != "WeCom" || value != "zhangsan" {
			t.Fatalf("LinkUserAccount(%#v, %q, %q)", user, field, value)
		}
		return true, nil
	}

	intent, _ := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-email-scope-success", object.WecomProfileConsentIntentStatusPending)
	if err := intent.SetLoginContext(&object.WecomProfileConsentLoginContext{
		Type:         "login",
		Method:       "signup",
		ResponseType: "code",
		Scope:        "openid profile email",
	}); err != nil {
		t.Fatalf("SetLoginContext() error = %v", err)
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback", "")
	result, err := (&defaultWecomProfileConsentCallbackAuthorizer{}).AuthorizeLoginIntent(controller, intent, "auth-code")
	if err != nil {
		t.Fatalf("AuthorizeLoginIntent() error = %v", err)
	}
	if result == nil || result.User == nil || result.User.Name != "alice" || result.WecomUserId != "zhangsan" {
		t.Fatalf("AuthorizeLoginIntent() result = %#v", result)
	}
}

func TestDefaultWecomProfileConsentCallbackAuthorizerRejectsInvalidLoginInputs(t *testing.T) {
	tests := []struct {
		name            string
		configure       func(intent *object.WecomProfileConsentIntent)
		application     *object.Application
		applicationErr  error
		organization    *object.Organization
		organizationErr error
		provider        *object.Provider
		providerErr     error
		idProvider      idp.IdProvider
		idProviderErr   error
		userLookupErr   error
		wantErr         string
	}{
		{name: "application lookup error", applicationErr: errors.New("application lookup failed"), wantErr: "application lookup failed"},
		{name: "application missing", application: nil, wantErr: "application is invalid"},
		{name: "provider item missing", application: &object.Application{Owner: "admin", Name: "app-built-in", Organization: "built-in"}, wantErr: "provider is not enabled"},
		{name: "organization lookup error", organizationErr: errors.New("organization lookup failed"), wantErr: "organization lookup failed"},
		{name: "organization missing", organization: nil, wantErr: "organization is unavailable"},
		{name: "provider lookup error", providerErr: errors.New("provider lookup failed"), wantErr: "provider lookup failed"},
		{name: "provider missing", provider: nil, wantErr: "provider is invalid"},
		{name: "provider incomplete", provider: func() *object.Provider {
			provider := newWecomProfileConsentTestProvider()
			provider.ClientSecret = ""
			return provider
		}(), wantErr: "configuration is incomplete"},
		{name: "corp boundary mismatch", configure: func(intent *object.WecomProfileConsentIntent) {
			intent.CorpId = "ww-other"
		}, wantErr: "corp boundary mismatch"},
		{name: "agent boundary mismatch", configure: func(intent *object.WecomProfileConsentIntent) {
			intent.AgentId = "1000003"
		}, wantErr: "agent boundary mismatch"},
		{name: "id provider lookup error", idProviderErr: errors.New("id provider failed"), wantErr: "id provider failed"},
		{name: "id provider missing", idProvider: nil, wantErr: "provider is unsupported"},
		{name: "token exchange error", idProvider: &fakeWecomProfileConsentIdProvider{tokenErr: errors.New("token failed")}, wantErr: "token failed"},
		{name: "token invalid", idProvider: &fakeWecomProfileConsentIdProvider{token: &oauth2.Token{}}, wantErr: "token is invalid"},
		{name: "userinfo error", idProvider: &fakeWecomProfileConsentIdProvider{userInfoErr: errors.New("userinfo failed")}, wantErr: "userinfo failed"},
		{name: "userinfo missing", idProvider: &fakeWecomProfileConsentIdProvider{}, wantErr: "user info is invalid"},
		{name: "user ticket missing", idProvider: &fakeWecomProfileConsentIdProvider{userInfo: &idp.UserInfo{Id: "zhangsan"}}, wantErr: "user ticket is missing"},
		{name: "wecom user missing", idProvider: &fakeWecomProfileConsentIdProvider{userInfo: &idp.UserInfo{
			Extra: map[string]string{idp.WeComInternalExtraHasUserTicket: "true"},
		}}, wantErr: "wecom user is invalid"},
		{name: "userinfo corp mismatch", idProvider: &fakeWecomProfileConsentIdProvider{userInfo: &idp.UserInfo{
			Id: "zhangsan",
			Extra: map[string]string{
				"corp_id":                           "ww-other",
				idp.WeComInternalExtraHasUserTicket: "true",
			},
		}}, wantErr: "corp boundary mismatch"},
		{name: "user lookup error", userLookupErr: errors.New("user lookup failed"), wantErr: "user lookup failed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oldGetApplication := getWecomProfileConsentApplication
			oldGetProvider := getWecomProfileConsentProvider
			oldGetOrganization := getWecomProfileConsentOrganization
			oldGetIdProvider := getWecomProfileConsentIdProvider
			oldGetUserByField := getWecomProfileConsentUserByField
			oldSetProfile := setWecomProfileConsentUserOAuthProfile
			oldLinkAccount := linkWecomProfileConsentUserAccount
			defer func() {
				getWecomProfileConsentApplication = oldGetApplication
				getWecomProfileConsentProvider = oldGetProvider
				getWecomProfileConsentOrganization = oldGetOrganization
				getWecomProfileConsentIdProvider = oldGetIdProvider
				getWecomProfileConsentUserByField = oldGetUserByField
				setWecomProfileConsentUserOAuthProfile = oldSetProfile
				linkWecomProfileConsentUserAccount = oldLinkAccount
			}()

			application := tt.application
			if application == nil && tt.applicationErr == nil && tt.wantErr != "application is invalid" {
				application = newWecomProfileConsentTestApplication()
			}
			organization := tt.organization
			if organization == nil && tt.organizationErr == nil && tt.wantErr != "organization is invalid" && tt.wantErr != "organization is unavailable" {
				organization = &object.Organization{Owner: "admin", Name: "built-in"}
			}
			provider := tt.provider
			if provider == nil && tt.providerErr == nil && tt.wantErr != "provider is invalid" {
				provider = newWecomProfileConsentTestProvider()
			}
			idProvider := tt.idProvider
			if idProvider == nil && tt.idProviderErr == nil && tt.wantErr != "provider is unsupported" {
				idProvider = &fakeWecomProfileConsentIdProvider{userInfo: &idp.UserInfo{
					Id:    "zhangsan",
					Email: "zhangsan@example.com",
					Extra: map[string]string{
						"userid":                            "zhangsan",
						"corp_id":                           "ww123",
						idp.WeComInternalExtraHasUserTicket: "true",
					},
				}}
			}

			getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
				return application, tt.applicationErr
			}
			getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
				return provider, tt.providerErr
			}
			getWecomProfileConsentOrganization = func(id string) (*object.Organization, error) {
				return organization, tt.organizationErr
			}
			getWecomProfileConsentIdProvider = func(idpInfo *idp.ProviderInfo, redirectURL string) (idp.IdProvider, error) {
				return idProvider, tt.idProviderErr
			}
			getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
				if tt.userLookupErr != nil {
					return nil, tt.userLookupErr
				}
				return &object.User{Owner: "built-in", Name: "alice"}, nil
			}
			setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
				return true, nil
			}
			linkWecomProfileConsentUserAccount = func(user *object.User, field string, value string) (bool, error) {
				return true, nil
			}

			intent, _ := newWecomProfileConsentCompleteTestIntent(t, "intent-callback-invalid-"+strings.ReplaceAll(tt.name, " ", "-"), object.WecomProfileConsentIntentStatusPending)
			if tt.configure != nil {
				tt.configure(intent)
			}
			controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback", "")
			result, err := (&defaultWecomProfileConsentCallbackAuthorizer{}).AuthorizeLoginIntent(controller, intent, "auth-code")
			if result != nil {
				t.Fatalf("AuthorizeLoginIntent() result = %#v, want nil", result)
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("AuthorizeLoginIntent() error = %v, want containing %q", err, tt.wantErr)
			}
		})
	}
}

func TestHandleWecomProfileConsentCallbackCompletesProfileSyncIntent(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	service := &object.WecomProfileConsentIntentService{
		Now:            func() time.Time { return time.Date(2026, 6, 4, 12, 20, 0, 0, time.UTC) },
		GenerateName:   func() string { return "intent-sync-callback-1" },
		GenerateSecret: func() string { return "secret-sync-callback-1" },
	}
	intent, issued, err := service.NewIntent(&object.WecomProfileConsentIntentCreateRequest{
		Owner:               "built-in",
		Application:         "app-built-in",
		ProviderName:        "wecom-internal",
		CorpId:              "ww123",
		IntentType:          object.WecomProfileConsentIntentTypeProfileSync,
		SubjectOwner:        "built-in",
		SubjectName:         "alice",
		ExpectedWecomUserId: "zhangsan",
	})
	if err != nil {
		t.Fatalf("NewIntent() error = %v", err)
	}
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionWecomProfileConsentIntent = func(name string, allowedStatuses []object.WecomProfileConsentIntentStatus, mutate object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
		changed, err := mutate(intent)
		if err != nil {
			return nil, false, err
		}
		return intent, changed, nil
	}

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{
		syncResult: &wecomProfileConsentProfileSyncAuthorizeResult{
			User:        &object.User{Owner: "built-in", Name: "alice"},
			CorpId:      "ww123",
			WecomUserId: "zhangsan",
		},
	}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if fakeAuthorizer.syncIntent == nil || fakeAuthorizer.syncIntent.Name != "intent-sync-callback-1" || fakeAuthorizer.syncCode != "auth-code" {
		t.Fatalf("profile sync authorizer call = %#v", fakeAuthorizer)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusCompleted || intent.CompletedAt.IsZero() || intent.ResolvedUserName != "alice" || intent.WecomUserId != "zhangsan" {
		t.Fatalf("completed profile sync intent = %#v", intent)
	}
	if !strings.Contains(recorder.Body.String(), "授权完成") {
		t.Fatalf("callback body = %q, want success page", recorder.Body.String())
	}
}

func TestAuthorizeWecomProfileConsentLoginIntentUsesProviderTargetOrganization(t *testing.T) {
	oldGetApplication := getWecomProfileConsentApplication
	oldGetOrganization := getWecomProfileConsentOrganization
	oldGetProvider := getWecomProfileConsentProvider
	defer func() {
		getWecomProfileConsentApplication = oldGetApplication
		getWecomProfileConsentOrganization = oldGetOrganization
		getWecomProfileConsentProvider = oldGetProvider
	}()

	getWecomProfileConsentApplication = func(id string) (*object.Application, error) {
		return &object.Application{
			Owner:        "admin",
			Name:         "app-aicodex-insight-60",
			Organization: "wecom-org",
			Providers: []*object.ProviderItem{
				{
					Owner:              "admin",
					Name:               "wecom-internal",
					TargetOrganization: "feishu-test",
					Provider: &object.Provider{
						Category: "OAuth",
						Type:     "WeCom",
					},
				},
			},
		}, nil
	}

	var organizationLookup string
	getWecomProfileConsentOrganization = func(id string) (*object.Organization, error) {
		organizationLookup = id
		return &object.Organization{Owner: "admin", Name: "feishu-test"}, nil
	}
	getWecomProfileConsentProvider = func(id string) (*object.Provider, error) {
		return nil, errors.New("stop before oauth")
	}

	_, err := (&defaultWecomProfileConsentCallbackAuthorizer{}).AuthorizeLoginIntent(&ApiController{}, &object.WecomProfileConsentIntent{
		Application:  "app-aicodex-insight-60",
		ProviderName: "wecom-internal",
	}, "code")

	if err == nil || !strings.Contains(err.Error(), "stop before oauth") {
		t.Fatalf("AuthorizeLoginIntent() error = %v, want provider lookup stop", err)
	}
	if organizationLookup != "admin/feishu-test" {
		t.Fatalf("organization lookup = %q, want admin/feishu-test", organizationLookup)
	}
}

func TestResolveWecomProfileConsentLoginUserUsesResolvedOrganizationForExistingUser(t *testing.T) {
	oldGetUserByField := getWecomProfileConsentUserByField
	oldSetProfile := setWecomProfileConsentUserOAuthProfile
	oldLinkAccount := linkWecomProfileConsentUserAccount
	defer func() {
		getWecomProfileConsentUserByField = oldGetUserByField
		setWecomProfileConsentUserOAuthProfile = oldSetProfile
		linkWecomProfileConsentUserAccount = oldLinkAccount
	}()

	var lookupOwner string
	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		lookupOwner = organizationName
		if field != "WeCom" || value != "wecom-user-1" {
			t.Fatalf("GetUserByField(%q, %q), want WeCom/wecom-user-1", field, value)
		}
		return &object.User{Owner: organizationName, Name: "alice", Properties: map[string]string{}}, nil
	}
	setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
		if organization.Name != "feishu-test" || user.Owner != "feishu-test" {
			t.Fatalf("profile organization/user = %s/%s, want feishu-test/feishu-test", organization.Name, user.Owner)
		}
		return true, nil
	}
	linkWecomProfileConsentUserAccount = func(user *object.User, field string, value string) (bool, error) {
		if field != "WeCom" || value != "wecom-user-1" {
			t.Fatalf("LinkUserAccount(%q, %q), want WeCom/wecom-user-1", field, value)
		}
		return true, nil
	}

	user, err := resolveWecomProfileConsentLoginUser(
		&ApiController{},
		&object.Application{Name: "insight", Organization: "wecom-org"},
		&object.Organization{Name: "feishu-test"},
		&object.ProviderItem{},
		&object.Provider{Type: "WeCom"},
		&idp.UserInfo{Id: "wecom-user-1"},
		"wecom-user-1",
	)
	if err != nil {
		t.Fatalf("resolveWecomProfileConsentLoginUser() error = %v", err)
	}
	if lookupOwner != "feishu-test" || user.Owner != "feishu-test" {
		t.Fatalf("lookup/user owner = %q/%q, want feishu-test/feishu-test", lookupOwner, user.Owner)
	}
}

func TestResolveWecomProfileConsentLoginUserUsesResolvedOrganizationForLarkIdentifiers(t *testing.T) {
	oldFindLarkUser := findWecomProfileConsentLarkUser
	oldSetProfile := setWecomProfileConsentUserOAuthProfile
	oldLinkAccount := linkWecomProfileConsentUserAccount
	defer func() {
		findWecomProfileConsentLarkUser = oldFindLarkUser
		setWecomProfileConsentUserOAuthProfile = oldSetProfile
		linkWecomProfileConsentUserAccount = oldLinkAccount
	}()

	var lookupOwner string
	findWecomProfileConsentLarkUser = func(organizationName string, userInfo *idp.UserInfo) (*object.User, string, error) {
		lookupOwner = organizationName
		if userInfo.Id != "lark-user-1" {
			t.Fatalf("Lark userInfo.Id = %q, want lark-user-1", userInfo.Id)
		}
		return &object.User{Owner: organizationName, Name: "alice", Properties: map[string]string{}}, "user_id", nil
	}
	setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
		if organization.Name != "feishu-test" || user.Owner != "feishu-test" || providerType != "Lark" {
			t.Fatalf("profile organization/user/provider = %s/%s/%s", organization.Name, user.Owner, providerType)
		}
		return true, nil
	}
	linkWecomProfileConsentUserAccount = func(user *object.User, field string, value string) (bool, error) {
		if field != "Lark" || value != "lark-user-1" {
			t.Fatalf("LinkUserAccount(%q, %q), want Lark/lark-user-1", field, value)
		}
		return true, nil
	}

	user, err := resolveWecomProfileConsentLoginUser(
		&ApiController{},
		&object.Application{Name: "insight", Organization: "wecom-org"},
		&object.Organization{Name: "feishu-test"},
		&object.ProviderItem{},
		&object.Provider{Type: "Lark"},
		&idp.UserInfo{Id: "lark-user-1"},
		"lark-user-1",
	)
	if err != nil {
		t.Fatalf("resolveWecomProfileConsentLoginUser() error = %v", err)
	}
	if lookupOwner != "feishu-test" || user.Owner != "feishu-test" {
		t.Fatalf("lookup/user owner = %q/%q, want feishu-test/feishu-test", lookupOwner, user.Owner)
	}
}

func TestResolveWecomProfileConsentLoginUserCreatesInResolvedOrganizationWhenNoExistingUser(t *testing.T) {
	oldGetUserByField := getWecomProfileConsentUserByField
	oldGetUser := getWecomProfileConsentUser
	oldGetUserCount := getWecomProfileConsentUserCount
	oldAddUser := addWecomProfileConsentUser
	oldSetProfile := setWecomProfileConsentUserOAuthProfile
	oldLinkAccount := linkWecomProfileConsentUserAccount
	defer func() {
		getWecomProfileConsentUserByField = oldGetUserByField
		getWecomProfileConsentUser = oldGetUser
		getWecomProfileConsentUserCount = oldGetUserCount
		addWecomProfileConsentUser = oldAddUser
		setWecomProfileConsentUserOAuthProfile = oldSetProfile
		linkWecomProfileConsentUserAccount = oldLinkAccount
	}()

	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		if organizationName != "feishu-test" {
			t.Fatalf("GetUserByField organization = %q, want feishu-test", organizationName)
		}
		return nil, nil
	}
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		if id != "feishu-test/bob" {
			t.Fatalf("existing lookup id = %q, want feishu-test/bob", id)
		}
		return nil, nil
	}
	getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
		if owner != "feishu-test" {
			t.Fatalf("count owner = %q, want feishu-test", owner)
		}
		return 1, nil
	}
	var addedUser *object.User
	addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
		addedUser = user
		return true, nil
	}
	setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
		return true, nil
	}
	linkWecomProfileConsentUserAccount = func(user *object.User, field string, value string) (bool, error) {
		return true, nil
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/test", "")
	user, err := resolveWecomProfileConsentLoginUser(
		controller,
		&object.Application{Name: "insight", Organization: "wecom-org", EnableSignUp: true},
		&object.Organization{Name: "feishu-test", InitScore: 2000},
		&object.ProviderItem{CanSignUp: true, BindingRule: &[]string{}},
		&object.Provider{Type: "WeCom"},
		&idp.UserInfo{Id: "wecom-user-1", Username: "bob", DisplayName: "Bob"},
		"wecom-user-1",
	)
	if err != nil {
		t.Fatalf("resolveWecomProfileConsentLoginUser() error = %v", err)
	}
	if user != addedUser || user.Owner != "feishu-test" || user.RegisterSource != "feishu-test/insight" {
		t.Fatalf("created user = %#v, want feishu-test owner/source", user)
	}
}

func TestResolveWecomProfileConsentLoginUserPropagatesLookupError(t *testing.T) {
	oldGetUserByField := getWecomProfileConsentUserByField
	defer func() {
		getWecomProfileConsentUserByField = oldGetUserByField
	}()

	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		if organizationName != "feishu-test" {
			t.Fatalf("GetUserByField organization = %q, want feishu-test", organizationName)
		}
		return nil, errors.New("lookup failed")
	}

	_, err := resolveWecomProfileConsentLoginUser(
		&ApiController{},
		&object.Application{Name: "insight", Organization: "wecom-org"},
		&object.Organization{Name: "feishu-test"},
		&object.ProviderItem{},
		&object.Provider{Type: "WeCom"},
		&idp.UserInfo{Id: "wecom-user-1"},
		"wecom-user-1",
	)
	if err == nil || !strings.Contains(err.Error(), "lookup failed") {
		t.Fatalf("resolveWecomProfileConsentLoginUser() error = %v, want lookup failed", err)
	}
}

func TestResolveWecomProfileConsentLoginUserPropagatesCreateError(t *testing.T) {
	oldGetUserByField := getWecomProfileConsentUserByField
	defer func() {
		getWecomProfileConsentUserByField = oldGetUserByField
	}()

	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		return nil, nil
	}

	_, err := resolveWecomProfileConsentLoginUser(
		&ApiController{},
		&object.Application{Name: "insight", Organization: "wecom-org", EnableSignUp: false},
		&object.Organization{Name: "feishu-test"},
		&object.ProviderItem{CanSignUp: true, BindingRule: &[]string{}},
		&object.Provider{Type: "WeCom"},
		&idp.UserInfo{Id: "wecom-user-1", Username: "alice"},
		"wecom-user-1",
	)
	if err == nil || !strings.Contains(err.Error(), "sign up is disabled") {
		t.Fatalf("resolveWecomProfileConsentLoginUser() error = %v, want sign up disabled", err)
	}
}

func TestResolveWecomProfileConsentLoginUserPropagatesProfileSaveError(t *testing.T) {
	oldGetUserByField := getWecomProfileConsentUserByField
	oldSetProfile := setWecomProfileConsentUserOAuthProfile
	defer func() {
		getWecomProfileConsentUserByField = oldGetUserByField
		setWecomProfileConsentUserOAuthProfile = oldSetProfile
	}()

	getWecomProfileConsentUserByField = func(organizationName string, field string, value string) (*object.User, error) {
		return &object.User{Owner: organizationName, Name: "alice", Properties: map[string]string{}}, nil
	}
	setWecomProfileConsentUserOAuthProfile = func(organization *object.Organization, user *object.User, providerType string, userInfo *idp.UserInfo, token *oauth2.Token, userMapping ...map[string]string) (bool, error) {
		return false, errors.New("profile save failed")
	}

	_, err := resolveWecomProfileConsentLoginUser(
		&ApiController{},
		&object.Application{Name: "insight", Organization: "wecom-org"},
		&object.Organization{Name: "feishu-test"},
		&object.ProviderItem{},
		&object.Provider{Type: "WeCom"},
		&idp.UserInfo{Id: "wecom-user-1"},
		"wecom-user-1",
	)
	if err == nil || !strings.Contains(err.Error(), "profile save failed") {
		t.Fatalf("resolveWecomProfileConsentLoginUser() error = %v, want profile save failed", err)
	}
}

func TestCreateWecomProfileConsentLoginUserUsesResolvedOrganization(t *testing.T) {
	oldGetUser := getWecomProfileConsentUser
	oldGetUserCount := getWecomProfileConsentUserCount
	oldAddUser := addWecomProfileConsentUser
	defer func() {
		getWecomProfileConsentUser = oldGetUser
		getWecomProfileConsentUserCount = oldGetUserCount
		addWecomProfileConsentUser = oldAddUser
	}()

	var existingLookup string
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		existingLookup = id
		return nil, nil
	}
	var countOwner string
	getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
		countOwner = owner
		return 5, nil
	}
	var addedUser *object.User
	addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
		addedUser = user
		return true, nil
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/test", "")
	user, err := createWecomProfileConsentLoginUser(
		controller,
		&object.Application{Name: "insight", Organization: "wecom-org", EnableSignUp: true, DefaultGroup: "default-group"},
		&object.Organization{Name: "feishu-test", UseEmailAsUsername: true, InitScore: 3000},
		&object.ProviderItem{CanSignUp: true, SignupGroup: "provider-group"},
		&idp.UserInfo{Id: "wecom-user-1", Username: "alice", Email: "alice@example.test", DisplayName: "Alice"},
	)
	if err != nil {
		t.Fatalf("createWecomProfileConsentLoginUser() error = %v", err)
	}
	if existingLookup != "feishu-test/alice@example.test" || countOwner != "feishu-test" {
		t.Fatalf("existing lookup/count owner = %q/%q, want feishu-test/alice@example.test/feishu-test", existingLookup, countOwner)
	}
	if addedUser == nil || user != addedUser {
		t.Fatalf("added user = %#v, returned user = %#v, want same user", addedUser, user)
	}
	if user.Owner != "feishu-test" || user.RegisterSource != "feishu-test/insight" || user.Score != 3000 {
		t.Fatalf("created user owner/source/score = %q/%q/%d", user.Owner, user.RegisterSource, user.Score)
	}
	if len(user.Groups) != 1 || user.Groups[0] != "provider-group" {
		t.Fatalf("created user groups = %#v, want provider signup group", user.Groups)
	}
}

func TestCreateWecomProfileConsentLoginUserRejectsDisabledSignup(t *testing.T) {
	tests := []struct {
		name         string
		application  *object.Application
		providerItem *object.ProviderItem
		wantErr      string
	}{
		{
			name:         "application signup disabled",
			application:  &object.Application{Name: "insight", EnableSignUp: false},
			providerItem: &object.ProviderItem{CanSignUp: true},
			wantErr:      "sign up is disabled",
		},
		{
			name:         "provider signup disabled",
			application:  &object.Application{Name: "insight", EnableSignUp: true},
			providerItem: &object.ProviderItem{CanSignUp: false},
			wantErr:      "provider sign up is disabled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := createWecomProfileConsentLoginUser(
				&ApiController{},
				tt.application,
				&object.Organization{Name: "feishu-test"},
				tt.providerItem,
				&idp.UserInfo{Id: "wecom-user-1", Username: "alice"},
			)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("createWecomProfileConsentLoginUser() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestCreateWecomProfileConsentLoginUserHandlesUsernameConflictAndDefaultGroup(t *testing.T) {
	oldGetUser := getWecomProfileConsentUser
	oldGetUserCount := getWecomProfileConsentUserCount
	oldAddUser := addWecomProfileConsentUser
	defer func() {
		getWecomProfileConsentUser = oldGetUser
		getWecomProfileConsentUserCount = oldGetUserCount
		addWecomProfileConsentUser = oldAddUser
	}()

	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		if id != "feishu-test/alice" {
			t.Fatalf("existing lookup id = %q, want feishu-test/alice", id)
		}
		return &object.User{Owner: "feishu-test", Name: "alice"}, nil
	}
	getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
		if owner != "feishu-test" {
			t.Fatalf("count owner = %q, want feishu-test", owner)
		}
		return 2, nil
	}
	var addedUser *object.User
	addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
		addedUser = user
		return true, nil
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/test", "")
	user, err := createWecomProfileConsentLoginUser(
		controller,
		&object.Application{Name: "insight", Organization: "wecom-org", EnableSignUp: true, DefaultGroup: "default-group"},
		&object.Organization{Name: "feishu-test", InitScore: 3000},
		&object.ProviderItem{CanSignUp: true},
		&idp.UserInfo{Id: "wecom-user-1", Username: "alice", DisplayName: "Alice"},
	)
	if err != nil {
		t.Fatalf("createWecomProfileConsentLoginUser() error = %v", err)
	}
	if user != addedUser || !strings.HasPrefix(user.Name, "alice_") {
		t.Fatalf("created user name = %q, want alice_ conflict suffix", user.Name)
	}
	if len(user.Groups) != 1 || user.Groups[0] != "default-group" {
		t.Fatalf("created user groups = %#v, want default group", user.Groups)
	}
}

func TestCreateWecomProfileConsentLoginUserGeneratesFallbackUsernameInResolvedOrganization(t *testing.T) {
	oldGetUser := getWecomProfileConsentUser
	oldGetUserCount := getWecomProfileConsentUserCount
	oldAddUser := addWecomProfileConsentUser
	defer func() {
		getWecomProfileConsentUser = oldGetUser
		getWecomProfileConsentUserCount = oldGetUserCount
		addWecomProfileConsentUser = oldAddUser
	}()

	var existingLookup string
	getWecomProfileConsentUser = func(id string) (*object.User, error) {
		existingLookup = id
		return nil, nil
	}
	getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
		return 0, nil
	}
	var addedUser *object.User
	addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
		addedUser = user
		return true, nil
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/test", "")
	user, err := createWecomProfileConsentLoginUser(
		controller,
		&object.Application{Name: "insight", Organization: "wecom-org", EnableSignUp: true},
		&object.Organization{Name: "feishu-test", InitScore: 1000},
		&object.ProviderItem{CanSignUp: true},
		&idp.UserInfo{},
	)
	if err != nil {
		t.Fatalf("createWecomProfileConsentLoginUser() error = %v", err)
	}
	if user != addedUser || !strings.HasPrefix(existingLookup, "feishu-test/") || existingLookup == "feishu-test/" {
		t.Fatalf("existing lookup/user = %q/%#v, want generated username in feishu-test", existingLookup, user)
	}
	if user.Owner != "feishu-test" || user.Id == "" || user.Name == "" {
		t.Fatalf("created user owner/id/name = %q/%q/%q", user.Owner, user.Id, user.Name)
	}
}

func TestCreateWecomProfileConsentLoginUserPropagatesStoreErrors(t *testing.T) {
	tests := []struct {
		name      string
		setup     func()
		wantError string
	}{
		{
			name: "existing lookup error",
			setup: func() {
				getWecomProfileConsentUser = func(id string) (*object.User, error) {
					return nil, errors.New("existing lookup failed")
				}
			},
			wantError: "existing lookup failed",
		},
		{
			name: "count error",
			setup: func() {
				getWecomProfileConsentUser = func(id string) (*object.User, error) {
					return nil, nil
				}
				getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
					return 0, errors.New("count failed")
				}
			},
			wantError: "count failed",
		},
		{
			name: "add user error",
			setup: func() {
				getWecomProfileConsentUser = func(id string) (*object.User, error) {
					return nil, nil
				}
				getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
					return 0, nil
				}
				addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
					return false, errors.New("add failed")
				}
			},
			wantError: "add failed",
		},
		{
			name: "add user not affected",
			setup: func() {
				getWecomProfileConsentUser = func(id string) (*object.User, error) {
					return nil, nil
				}
				getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
					return 0, nil
				}
				addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
					return false, nil
				}
			},
			wantError: "failed to create user",
		},
	}

	oldGetUser := getWecomProfileConsentUser
	oldGetUserCount := getWecomProfileConsentUserCount
	oldAddUser := addWecomProfileConsentUser
	defer func() {
		getWecomProfileConsentUser = oldGetUser
		getWecomProfileConsentUserCount = oldGetUserCount
		addWecomProfileConsentUser = oldAddUser
	}()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			getWecomProfileConsentUser = oldGetUser
			getWecomProfileConsentUserCount = func(owner string, field string, value string, groupName string) (int64, error) {
				return 0, nil
			}
			addWecomProfileConsentUser = func(user *object.User, lang string) (bool, error) {
				return true, nil
			}
			tt.setup()

			controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/test", "")
			_, err := createWecomProfileConsentLoginUser(
				controller,
				&object.Application{Name: "insight", Organization: "wecom-org", EnableSignUp: true},
				&object.Organization{Name: "feishu-test", InitScore: 1000},
				&object.ProviderItem{CanSignUp: true},
				&idp.UserInfo{Id: "wecom-user-1", Username: "alice"},
			)
			if err == nil || !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("createWecomProfileConsentLoginUser() error = %v, want %q", err, tt.wantError)
			}
		})
	}
}

func TestHandleWecomProfileConsentCallbackRejectsProfileSyncUserMismatch(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	oldTransition := transitionWecomProfileConsentIntent
	oldNewAuthorizer := newWecomProfileConsentCallbackAuthorizer
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
		transitionWecomProfileConsentIntent = oldTransition
		newWecomProfileConsentCallbackAuthorizer = oldNewAuthorizer
	}()

	service := &object.WecomProfileConsentIntentService{
		Now:            func() time.Time { return time.Date(2026, 6, 4, 12, 20, 0, 0, time.UTC) },
		GenerateName:   func() string { return "intent-sync-callback-mismatch" },
		GenerateSecret: func() string { return "secret-sync-callback-mismatch" },
	}
	intent, issued, err := service.NewIntent(&object.WecomProfileConsentIntentCreateRequest{
		Owner:               "built-in",
		Application:         "app-built-in",
		ProviderName:        "wecom-internal",
		CorpId:              "ww123",
		IntentType:          object.WecomProfileConsentIntentTypeProfileSync,
		SubjectOwner:        "built-in",
		SubjectName:         "alice",
		ExpectedWecomUserId: "zhangsan",
	})
	if err != nil {
		t.Fatalf("NewIntent() error = %v", err)
	}
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}
	transitionWecomProfileConsentIntent = func(name string, allowedStatuses []object.WecomProfileConsentIntentStatus, mutate object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
		changed, err := mutate(intent)
		if err != nil {
			return nil, false, err
		}
		return intent, changed, nil
	}

	fakeAuthorizer := &fakeWecomProfileConsentCallbackAuthorizer{
		syncResult: &wecomProfileConsentProfileSyncAuthorizeResult{
			User:        &object.User{Owner: "built-in", Name: "alice"},
			CorpId:      "ww123",
			WecomUserId: "lisi",
		},
	}
	newWecomProfileConsentCallbackAuthorizer = func() wecomProfileConsentCallbackAuthorizer {
		return fakeAuthorizer
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/callback?code=auth-code&state="+issued.State, "")
	controller.HandleWecomProfileConsentCallback()

	if intent.Status != object.WecomProfileConsentIntentStatusFailed || intent.CompletedAt.IsZero() == false {
		t.Fatalf("mismatched profile sync intent = %#v", intent)
	}
	if !strings.Contains(recorder.Body.String(), "授权失败") {
		t.Fatalf("callback body = %q, want failure page", recorder.Body.String())
	}
}

func TestGetWecomProfileConsentIntentStatusUsesHeaderPollToken(t *testing.T) {
	oldGetIntent := getWecomProfileConsentIntentByName
	oldExpireIntent := expireWecomProfileConsentIntentIfNeeded
	defer func() {
		getWecomProfileConsentIntentByName = oldGetIntent
		expireWecomProfileConsentIntentIfNeeded = oldExpireIntent
	}()

	service := &object.WecomProfileConsentIntentService{
		Now:            func() time.Time { return time.Date(2026, 6, 4, 12, 0, 0, 0, time.UTC) },
		GenerateName:   func() string { return "intent-status-1" },
		GenerateSecret: func() string { return "secret-status-1" },
	}
	intent, issued, err := service.NewIntent(&object.WecomProfileConsentIntentCreateRequest{
		Owner:        "built-in",
		Application:  "app-built-in",
		ProviderName: "wecom-internal",
	})
	if err != nil {
		t.Fatalf("NewIntent() error = %v", err)
	}
	intent.Status = object.WecomProfileConsentIntentStatusAuthorized
	getWecomProfileConsentIntentByName = func(name string) (*object.WecomProfileConsentIntent, error) {
		if name != "intent-status-1" {
			t.Fatalf("intent name = %q, want intent-status-1", name)
		}
		return intent, nil
	}
	expireWecomProfileConsentIntentIfNeeded = func(name string, now time.Time) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodGet, "/api/wecom-profile-consent/intents/intent-status-1", "")
	controller.Ctx.Input.SetParam(":intentId", "intent-status-1")
	controller.Ctx.Request.Header.Set(wecomProfileConsentPollTokenHeader, issued.PollToken)
	controller.GetWecomProfileConsentIntentStatus()

	body := recorder.Body.String()
	if strings.Contains(body, issued.PollToken) {
		t.Fatalf("response must not contain poll token, got %s", body)
	}
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	data := response["data"].(map[string]interface{})
	if response["status"] != "ok" || data["status"] != string(object.WecomProfileConsentIntentStatusAuthorized) {
		t.Fatalf("response = %#v", response)
	}
}

func TestCompleteWecomProfileConsentLoginIntentPassesBodyPollTokenAndMfaFields(t *testing.T) {
	oldNewCompleter := newWecomProfileConsentIntentCompleter
	defer func() {
		newWecomProfileConsentIntentCompleter = oldNewCompleter
	}()

	fakeCompleter := &fakeWecomProfileConsentIntentCompleter{
		response: &Response{Status: "ok", Data: "built-in/alice"},
	}
	newWecomProfileConsentIntentCompleter = func() wecomProfileConsentIntentCompleter {
		return fakeCompleter
	}

	controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/intents/intent-complete-1/complete", `{"pollToken":"poll-token-1","mfaType":"totp","passcode":"123456"}`)
	controller.Ctx.Input.SetParam(":intentId", "intent-complete-1")
	controller.CompleteWecomProfileConsentLoginIntent()

	if fakeCompleter.intentId != "intent-complete-1" || fakeCompleter.pollToken != "poll-token-1" {
		t.Fatalf("complete intent/token = (%q,%q)", fakeCompleter.intentId, fakeCompleter.pollToken)
	}
	if fakeCompleter.request == nil || fakeCompleter.request.MfaType != "totp" || fakeCompleter.request.Passcode != "123456" {
		t.Fatalf("complete request = %#v", fakeCompleter.request)
	}
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("response json error = %v", err)
	}
	if response["status"] != "ok" || response["data"] != "built-in/alice" {
		t.Fatalf("response = %#v", response)
	}
}

func TestCompleteWecomProfileConsentLoginIntentAdvancesAuthorizedMfaStates(t *testing.T) {
	tests := []struct {
		name       string
		user       *object.User
		org        *object.Organization
		wantStatus object.WecomProfileConsentIntentStatus
		wantBody   string
	}{
		{
			name:       "no mfa completes intent",
			user:       newWecomProfileConsentCompleteTestUser(true),
			org:        &object.Organization{Owner: "admin", Name: "built-in"},
			wantStatus: object.WecomProfileConsentIntentStatusCompleted,
		},
		{
			name: "existing mfa moves to mfa pending",
			user: func() *object.User {
				user := newWecomProfileConsentCompleteTestUser(false)
				user.PreferredMfaType = object.TotpType
				user.TotpSecret = "totp-secret"
				return user
			}(),
			org:        &object.Organization{Owner: "admin", Name: "built-in", MfaRememberInHours: 1},
			wantStatus: object.WecomProfileConsentIntentStatusMfaPending,
			wantBody:   object.NextMfa,
		},
		{
			name: "required mfa keeps required flow and completes intent",
			user: newWecomProfileConsentCompleteTestUser(false),
			org: &object.Organization{
				Owner: "admin",
				Name:  "built-in",
				MfaItems: []*object.MfaItem{
					{Name: object.TotpType, Rule: "Required"},
				},
			},
			wantStatus: object.WecomProfileConsentIntentStatusCompleted,
			wantBody:   object.RequiredMfa,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oldTransition := transitionWecomProfileConsentIntent
			oldCheckMfaEnable := checkWecomProfileConsentMfaEnable
			defer func() {
				transitionWecomProfileConsentIntent = oldTransition
				checkWecomProfileConsentMfaEnable = oldCheckMfaEnable
			}()

			intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-complete-"+strings.ReplaceAll(tt.name, " ", "-"), object.WecomProfileConsentIntentStatusAuthorized)
			transitionWecomProfileConsentIntent = newWecomProfileConsentTransitionStub(t, intent)
			checkWecomProfileConsentMfaEnable = func(c *ApiController, user *object.User, organization *object.Organization, verificationType string) bool {
				status := getWecomProfileConsentMfaStatus(user, organization, verificationType)
				if status == "" {
					return false
				}
				c.ResponseOk(status)
				return true
			}

			controller, recorder := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/intents/"+intent.Name+"/complete", "")
			_, err := (&defaultWecomProfileConsentIntentCompleter{}).completeAuthorizedLoginIntent(controller, intent, issued.PollToken, newWecomProfileConsentCompleteTestApplication(tt.org), tt.user, tt.org, &form.AuthForm{})
			if err != nil {
				t.Fatalf("completeAuthorizedLoginIntent() error = %v", err)
			}
			if intent.Status != tt.wantStatus {
				t.Fatalf("intent status = %q, want %q", intent.Status, tt.wantStatus)
			}
			if tt.wantStatus == object.WecomProfileConsentIntentStatusCompleted && intent.CompletedAt.IsZero() {
				t.Fatalf("completed intent should have CompletedAt: %#v", intent)
			}
			if tt.wantBody != "" && !strings.Contains(recorder.Body.String(), tt.wantBody) {
				t.Fatalf("response body = %q, want %q", recorder.Body.String(), tt.wantBody)
			}
		})
	}
}

func TestCompleteWecomProfileConsentLoginIntentCompletesMfaPendingAfterMfaVerification(t *testing.T) {
	oldTransition := transitionWecomProfileConsentIntent
	oldVerifyMfa := verifyWecomProfileConsentMfaForComplete
	defer func() {
		transitionWecomProfileConsentIntent = oldTransition
		verifyWecomProfileConsentMfaForComplete = oldVerifyMfa
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-complete-mfa-pending", object.WecomProfileConsentIntentStatusMfaPending)
	transitionWecomProfileConsentIntent = newWecomProfileConsentTransitionStub(t, intent)
	verifyWecomProfileConsentMfaForComplete = func(c *ApiController, user *object.User, organization *object.Organization, authForm *form.AuthForm) error {
		if authForm == nil || authForm.MfaType != object.TotpType || authForm.Passcode != "master-passcode" {
			t.Fatalf("mfa auth form = %#v", authForm)
		}
		return nil
	}

	user := newWecomProfileConsentCompleteTestUser(true)
	user.PreferredMfaType = object.TotpType
	user.TotpSecret = "totp-secret"
	org := &object.Organization{Owner: "admin", Name: "built-in"}
	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/intents/intent-complete-mfa-pending/complete", "")
	_, err := (&defaultWecomProfileConsentIntentCompleter{}).completeMfaPendingLoginIntent(controller, intent, issued.PollToken, newWecomProfileConsentCompleteTestApplication(org), user, org, &form.AuthForm{
		MfaType:  object.TotpType,
		Passcode: "master-passcode",
	})
	if err != nil {
		t.Fatalf("completeMfaPendingLoginIntent() error = %v", err)
	}
	if intent.Status != object.WecomProfileConsentIntentStatusCompleted || intent.CompletedAt.IsZero() {
		t.Fatalf("completed intent = %#v", intent)
	}
}

func TestCompleteWecomProfileConsentLoginIntentRejectsRepeatedConsumption(t *testing.T) {
	oldTransition := transitionWecomProfileConsentIntent
	defer func() {
		transitionWecomProfileConsentIntent = oldTransition
	}()

	intent, issued := newWecomProfileConsentCompleteTestIntent(t, "intent-complete-consumed", object.WecomProfileConsentIntentStatusAuthorized)
	transitionWecomProfileConsentIntent = func(name string, allowedStatuses []object.WecomProfileConsentIntentStatus, mutate object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
		return intent, false, nil
	}

	controller, _ := newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/intents/intent-complete-consumed/complete", "")
	_, err := (&defaultWecomProfileConsentIntentCompleter{}).completeAuthorizedLoginIntent(controller, intent, issued.PollToken, newWecomProfileConsentCompleteTestApplication(&object.Organization{Owner: "admin", Name: "built-in"}), newWecomProfileConsentCompleteTestUser(true), &object.Organization{Owner: "admin", Name: "built-in"}, &form.AuthForm{})
	if err == nil || !strings.Contains(err.Error(), "already been consumed") {
		t.Fatalf("completeAuthorizedLoginIntent() error = %v, want already consumed", err)
	}
}

func newWecomProfileConsentTestController(t *testing.T, body string) (*ApiController, *httptest.ResponseRecorder) {
	return newWecomProfileConsentTestControllerWithRequest(t, http.MethodPost, "/api/wecom-profile-consent/login-intents", body)
}

func newWecomProfileConsentTestControllerWithRequest(t *testing.T, method string, target string, body string) (*ApiController, *httptest.ResponseRecorder) {
	t.Helper()

	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Host = "door.example.com"
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept-Language", "zh-CN")

	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	ctx.Input.RequestBody = []byte(body)

	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "CreateWecomProfileConsentLoginIntent", controller)
	return controller, recorder
}

func newWecomProfileConsentTestApplication() *object.Application {
	return &object.Application{
		Owner:        "admin",
		Name:         "app-built-in",
		Organization: "built-in",
		Providers: []*object.ProviderItem{
			{
				Owner:              "admin",
				Name:               "wecom-internal",
				TargetOrganization: "built-in",
				Provider: &object.Provider{
					Category: "OAuth",
					Type:     "WeCom",
				},
			},
		},
	}
}

func newWecomProfileConsentTestProvider() *object.Provider {
	return &object.Provider{
		Owner:        "admin",
		Name:         "wecom-internal",
		Category:     "OAuth",
		Type:         "WeCom",
		SubType:      "Internal",
		Method:       "Normal",
		ClientId:     "ww123",
		ClientSecret: "secret",
		AppId:        "1000002",
	}
}

func newWecomProfileConsentCompleteTestIntent(t *testing.T, name string, status object.WecomProfileConsentIntentStatus) (*object.WecomProfileConsentIntent, *object.WecomProfileConsentIssuedSecrets) {
	t.Helper()

	service := &object.WecomProfileConsentIntentService{
		Now:            func() time.Time { return time.Date(2026, 6, 4, 13, 0, 0, 0, time.UTC) },
		GenerateName:   func() string { return name },
		GenerateSecret: func() string { return "secret-" + name },
	}
	intent, issued, err := service.NewIntent(&object.WecomProfileConsentIntentCreateRequest{
		Owner:        "built-in",
		Organization: "built-in",
		Application:  "app-built-in",
		ProviderName: "wecom-internal",
		IntentType:   object.WecomProfileConsentIntentTypeLogin,
		LoginContext: &object.WecomProfileConsentLoginContext{
			Type:         ResponseTypeLogin,
			Method:       "signup",
			SigninMethod: "wecom",
		},
	})
	if err != nil {
		t.Fatalf("NewIntent() error = %v", err)
	}
	intent.Status = status
	intent.ResolvedUserOwner = "built-in"
	intent.ResolvedUserName = "alice"
	return intent, issued
}

func newWecomProfileConsentTransitionStub(t *testing.T, intent *object.WecomProfileConsentIntent) func(string, []object.WecomProfileConsentIntentStatus, object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
	t.Helper()

	return func(name string, allowedStatuses []object.WecomProfileConsentIntentStatus, mutate object.WecomProfileConsentIntentMutator) (*object.WecomProfileConsentIntent, bool, error) {
		if name != intent.Name {
			t.Fatalf("transition intent name = %q, want %q", name, intent.Name)
		}
		allowed := len(allowedStatuses) == 0
		for _, allowedStatus := range allowedStatuses {
			if intent.Status == allowedStatus {
				allowed = true
				break
			}
		}
		if !allowed {
			return intent, false, nil
		}
		changed, err := mutate(intent)
		return intent, changed, err
	}
}

func newWecomProfileConsentCompleteTestUser(forbidden bool) *object.User {
	return &object.User{
		Owner:       "built-in",
		Name:        "alice",
		Id:          "alice",
		Type:        "normal-user",
		DisplayName: "Alice",
		IsForbidden: forbidden,
	}
}

func newWecomProfileConsentCompleteTestApplication(org *object.Organization) *object.Application {
	return &object.Application{
		Owner:           "admin",
		Name:            "app-built-in",
		Organization:    "built-in",
		OrganizationObj: org,
	}
}
