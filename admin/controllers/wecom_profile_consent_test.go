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
					Owner: "admin",
					Name:  "wecom-internal",
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
				Owner: "admin",
				Name:  "wecom-internal",
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
