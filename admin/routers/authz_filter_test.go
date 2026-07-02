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

package routers

import (
	stdcontext "context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"github.com/beego/beego/v2/server/web"
	beecontext "github.com/beego/beego/v2/server/web/context"
)

type authzFilterSessionStore struct {
	data      map[interface{}]interface{}
	setErr    error
	deleteErr error
}

func (s *authzFilterSessionStore) Set(ctx stdcontext.Context, key, value interface{}) error {
	if s.setErr != nil {
		return s.setErr
	}
	s.data[key] = value
	return nil
}

func (s *authzFilterSessionStore) Get(ctx stdcontext.Context, key interface{}) interface{} {
	return s.data[key]
}

func (s *authzFilterSessionStore) Delete(ctx stdcontext.Context, key interface{}) error {
	if s.deleteErr != nil {
		return s.deleteErr
	}
	delete(s.data, key)
	return nil
}

func (s *authzFilterSessionStore) SessionID(ctx stdcontext.Context) string {
	return "session-test"
}

func (s *authzFilterSessionStore) SessionReleaseIfPresent(ctx stdcontext.Context, w http.ResponseWriter) {
}

func (s *authzFilterSessionStore) SessionRelease(ctx stdcontext.Context, w http.ResponseWriter) {}

func (s *authzFilterSessionStore) Flush(ctx stdcontext.Context) error {
	s.data = map[interface{}]interface{}{}
	return nil
}

func newAuthzFilterTestContext(method string, target string, body string) *beecontext.Context {
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	response := httptest.NewRecorder()
	ctx := beecontext.NewContext()
	ctx.Reset(response, request)
	ctx.Input.RequestBody = []byte(body)
	return ctx
}

func TestGetUsernameAndSubjectCoverSessionStates(t *testing.T) {
	ctx := newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	ctx.Input.CruSession = &authzFilterSessionStore{data: map[interface{}]interface{}{
		"username":    "engineering/admin",
		"SessionData": `{"ExpireTime":` + strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10) + `}`,
	}}
	if username := getUsername(ctx); username != "engineering/admin" {
		t.Fatalf("getUsername(valid session) = %q, want engineering/admin", username)
	}
	owner, name := getSubject(ctx)
	if owner != "engineering" || name != "admin" {
		t.Fatalf("getSubject() = %q/%q, want engineering/admin", owner, name)
	}

	ctx = newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	expiredStore := &authzFilterSessionStore{data: map[interface{}]interface{}{
		"username":    "engineering/admin",
		"SessionData": `{"ExpireTime":1}`,
	}}
	ctx.Input.CruSession = expiredStore
	if username := getUsername(ctx); username != "" {
		t.Fatalf("getUsername(expired session) = %q, want empty", username)
	}
	if expiredStore.data["username"] != "" || expiredStore.data["SessionData"] != nil {
		t.Fatalf("expired session store = %#v, want username cleared and SessionData deleted", expiredStore.data)
	}

	ctx = newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	ctx.Input.CruSession = &authzFilterSessionStore{
		data: map[interface{}]interface{}{
			"username":    "engineering/admin",
			"SessionData": `{"ExpireTime":1}`,
		},
		setErr: assertAnError{},
	}
	if username := getUsername(ctx); username != "" {
		t.Fatalf("getUsername(expired set error) = %q, want empty", username)
	}

	ctx = newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	ctx.Input.CruSession = &authzFilterSessionStore{
		data: map[interface{}]interface{}{
			"username":    "engineering/admin",
			"SessionData": `{"ExpireTime":1}`,
		},
		deleteErr: assertAnError{},
	}
	if username := getUsername(ctx); username != "" {
		t.Fatalf("getUsername(expired delete error) = %q, want empty", username)
	}

	ctx = newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	ctx.Input.CruSession = &authzFilterSessionStore{data: map[interface{}]interface{}{
		"username":    "engineering/admin",
		"SessionData": `{`,
	}}
	if username := getUsername(ctx); username != "" {
		t.Fatalf("getUsername(malformed session) = %q, want empty", username)
	}

	ctx = newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	ctx.Input.CruSession = &authzFilterSessionStore{data: map[interface{}]interface{}{}}
	owner, name = getSubject(ctx)
	if owner != "anonymous" || name != "anonymous" {
		t.Fatalf("getSubject(no username) = %q/%q, want anonymous/anonymous", owner, name)
	}

	impOwner, impName, impUsername := getImpersonateUser(ctx, "engineering", "admin", "engineering/admin")
	if impOwner != "engineering" || impName != "admin" || impUsername != "engineering/admin" {
		t.Fatalf("getImpersonateUser(no cookie) = %q/%q/%q, want original subject", impOwner, impName, impUsername)
	}
}

type assertAnError struct{}

func (assertAnError) Error() string {
	return "assertion error"
}

func TestGetWecomOrganizationSyncObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/wecom-org-sync/config", http.MethodGet, "built-in", nil)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "built-in" || name != "" {
		t.Fatalf("object = %q/%q, want built-in/<empty>", owner, name)
	}
}

func TestGetWecomOrganizationSyncObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering","corpId":"ww123"}`)
	owner, name, ok := getModuleOrganizationObject("/api/wecom-org-sync/config", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetWecomOrganizationSyncDryRunPreviewObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering"}`)
	owner, name, ok := getModuleOrganizationObject("/api/wecom-org-sync/dry-run-preview", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected WeCom dry-run preview organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("dry-run object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetWecomOrganizationSyncDryRunHistoryObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/wecom-org-sync/dry-run-history/history-1", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected WeCom dry-run history organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("dry-run history object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/config", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncRunObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/runs/run-1", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected module organization run object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("run object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering","appId":"cli_123"}`)
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/config", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected module organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncDryRunPreviewObjectUsesOrganizationBody(t *testing.T) {
	body := []byte(`{"organization":"engineering"}`)
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/dry-run-preview", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected dry-run preview organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("dry-run object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncDryRunHistoryObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/dry-run-history/history-1", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected dry-run history organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("dry-run history object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncUserBindingConflictObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/user-binding-conflicts", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected user binding conflict organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("user binding conflict object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetFeishuOrganizationSyncHandoffEvidenceObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/feishu-org-sync/handoff-evidence", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected handoff evidence organization object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("handoff evidence object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetDingTalkOrganizationSyncObjectUsesOrganizationQueryAndBody(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/dingtalk-org-sync/config", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected DingTalk organization sync query object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("query object = %q/%q, want engineering/<empty>", owner, name)
	}

	body := []byte(`{"organization":"finance","appKey":"ding-app"}`)
	owner, name, ok = getModuleOrganizationObject("/api/dingtalk-org-sync/config", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected DingTalk organization sync body object to be parsed")
	}
	if owner != "finance" || name != "" {
		t.Fatalf("body object = %q/%q, want finance/<empty>", owner, name)
	}
}

func TestGetDingTalkOrganizationSyncObjectCoversConfigTestAndRuns(t *testing.T) {
	testCases := []struct {
		name              string
		path              string
		method            string
		queryOrganization string
		body              []byte
		wantOwner         string
	}{
		{
			name:      "config test reads organization from request body",
			path:      "/api/dingtalk-org-sync/config/test",
			method:    http.MethodPost,
			body:      []byte(`{"organization":"engineering","appKey":"ding-app"}`),
			wantOwner: "engineering",
		},
		{
			name:      "run creation reads organization from request body",
			path:      "/api/dingtalk-org-sync/runs",
			method:    http.MethodPost,
			body:      []byte(`{"organization":"finance","triggerType":"manual"}`),
			wantOwner: "finance",
		},
		{
			name:              "run list reads organization from query",
			path:              "/api/dingtalk-org-sync/runs",
			method:            http.MethodGet,
			queryOrganization: "ops",
			wantOwner:         "ops",
		},
		{
			name:              "run detail reads organization from query",
			path:              "/api/dingtalk-org-sync/runs/run-1",
			method:            http.MethodGet,
			queryOrganization: "support",
			wantOwner:         "support",
		},
		{
			name:      "malformed body keeps route recognized without granting an owner",
			path:      "/api/dingtalk-org-sync/runs",
			method:    http.MethodPost,
			body:      []byte(`{"organization":`),
			wantOwner: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			owner, name, ok := getModuleOrganizationObject(tc.path, tc.method, tc.queryOrganization, tc.body)
			if !ok {
				t.Fatalf("expected DingTalk organization sync route to be recognized")
			}
			if owner != tc.wantOwner || name != "" {
				t.Fatalf("object = %q/%q, want %q/<empty>", owner, name, tc.wantOwner)
			}
		})
	}
}

func TestInitAPIRegistersDingTalkOrganizationSyncRoutes(t *testing.T) {
	previousApp := web.BeeApp
	web.BeeApp = web.NewHttpSever()
	t.Cleanup(func() {
		web.BeeApp = previousApp
	})

	InitAPI()

	testCases := []struct {
		name        string
		method      string
		path        string
		wantPattern string
		wantAction  string
	}{
		{
			name:        "get config",
			method:      http.MethodGet,
			path:        "/api/dingtalk-org-sync/config",
			wantPattern: "/api/dingtalk-org-sync/config",
			wantAction:  "GetDingTalkOrganizationSyncConfig",
		},
		{
			name:        "save config",
			method:      http.MethodPost,
			path:        "/api/dingtalk-org-sync/config",
			wantPattern: "/api/dingtalk-org-sync/config",
			wantAction:  "SaveDingTalkOrganizationSyncConfig",
		},
		{
			name:        "test config",
			method:      http.MethodPost,
			path:        "/api/dingtalk-org-sync/config/test",
			wantPattern: "/api/dingtalk-org-sync/config/test",
			wantAction:  "TestDingTalkOrganizationSyncConfig",
		},
		{
			name:        "start run",
			method:      http.MethodPost,
			path:        "/api/dingtalk-org-sync/runs",
			wantPattern: "/api/dingtalk-org-sync/runs",
			wantAction:  "StartDingTalkOrganizationSyncRun",
		},
		{
			name:        "list runs",
			method:      http.MethodGet,
			path:        "/api/dingtalk-org-sync/runs",
			wantPattern: "/api/dingtalk-org-sync/runs",
			wantAction:  "GetDingTalkOrganizationSyncRuns",
		},
		{
			name:        "get run",
			method:      http.MethodGet,
			path:        "/api/dingtalk-org-sync/runs/run-1",
			wantPattern: "/api/dingtalk-org-sync/runs/:runId",
			wantAction:  "GetDingTalkOrganizationSyncRun",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.path, nil)
			context := beecontext.NewContext()
			context.Reset(httptest.NewRecorder(), request)

			routerInfo, found := web.BeeApp.Handlers.FindRouter(context)
			if !found {
				t.Fatalf("expected route %s %s to be registered", tc.method, tc.path)
			}
			if routerInfo.GetPattern() != tc.wantPattern {
				t.Fatalf("pattern = %q, want %q", routerInfo.GetPattern(), tc.wantPattern)
			}
			if action := routerInfo.GetMethod()[tc.method]; action != tc.wantAction {
				t.Fatalf("action = %q, want %q", action, tc.wantAction)
			}
		})
	}
}

func TestGetObjectCoversModuleAndGenericBranches(t *testing.T) {
	testCases := []struct {
		name      string
		method    string
		target    string
		body      string
		setup     func(*beecontext.Context)
		wantOwner string
		wantName  string
		wantErr   bool
	}{
		{
			name:      "dingtalk module query organization",
			method:    http.MethodGet,
			target:    "/api/dingtalk-org-sync/runs?organization=engineering",
			wantOwner: "engineering",
		},
		{
			name:      "dingtalk module body organization",
			method:    http.MethodPost,
			target:    "/api/dingtalk-org-sync/runs",
			body:      `{"organization":"finance"}`,
			wantOwner: "finance",
		},
		{
			name:   "server route uses path params",
			method: http.MethodPost,
			target: "/api/server/server-owner/server-name",
			setup: func(ctx *beecontext.Context) {
				ctx.Input.SetParam(":owner", "server-owner")
				ctx.Input.SetParam(":name", "server-name")
			},
			wantOwner: "server-owner",
			wantName:  "server-name",
		},
		{
			name:      "get policies resolves adapter id",
			method:    http.MethodGet,
			target:    "/api/get-policies?id=/&adapterId=built-in/adapter-a",
			wantOwner: "built-in",
			wantName:  "adapter-a",
		},
		{
			name:      "get policies resolves object id",
			method:    http.MethodGet,
			target:    "/api/get-policies?id=engineering/policy-a",
			wantOwner: "engineering",
			wantName:  "policy-a",
		},
		{
			name:      "get by id resolves owner and name",
			method:    http.MethodGet,
			target:    "/api/get-user?id=engineering/alice",
			wantOwner: "engineering",
			wantName:  "alice",
		},
		{
			name:      "get owner query falls back to owner object",
			method:    http.MethodGet,
			target:    "/api/get-users?owner=engineering",
			wantOwner: "engineering",
		},
		{
			name:   "get collection without owner returns empty object",
			method: http.MethodGet,
			target: "/api/get-users",
		},
		{
			name:      "policy mutation resolves id query",
			method:    http.MethodPost,
			target:    "/api/update-policy?id=engineering/policy-a",
			wantOwner: "engineering",
			wantName:  "policy-a",
		},
		{
			name:   "post empty body reads form owner and name",
			method: http.MethodPost,
			target: "/api/update-user",
			setup: func(ctx *beecontext.Context) {
				ctx.Request.Form = url.Values{"owner": []string{"engineering"}, "name": []string{"alice"}}
			},
			wantOwner: "engineering",
			wantName:  "alice",
		},
		{
			name:      "application suffix reads organization",
			method:    http.MethodPost,
			target:    "/api/update-application",
			body:      `{"organization":"engineering","name":"app-a"}`,
			wantOwner: "engineering",
			wantName:  "app-a",
		},
		{
			name:   "application suffix malformed body returns empty object",
			method: http.MethodPost,
			target: "/api/update-application",
			body:   `{"organization":`,
		},
		{
			name:      "organization suffix mirrors name",
			method:    http.MethodPost,
			target:    "/api/update-organization",
			body:      `{"owner":"built-in","name":"engineering"}`,
			wantOwner: "engineering",
			wantName:  "engineering",
		},
		{
			name:      "delete resource extracts resource name",
			method:    http.MethodPost,
			target:    "/api/delete-resource",
			body:      `{"owner":"built-in","name":"applications/app-a/resources/tree/resource-a"}`,
			wantOwner: "built-in",
			wantName:  "resource-a",
		},
		{
			name:   "malformed generic body falls back to empty object",
			method: http.MethodPost,
			target: "/api/update-user",
			body:   `{"owner":`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := newAuthzFilterTestContext(tc.method, tc.target, tc.body)
			if tc.setup != nil {
				tc.setup(ctx)
			}
			owner, name, err := getObject(ctx)
			if tc.wantErr && err == nil {
				t.Fatalf("getObject() error = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("getObject() error = %v", err)
			}
			if owner != tc.wantOwner || name != tc.wantName {
				t.Fatalf("object = %q/%q, want %q/%q", owner, name, tc.wantOwner, tc.wantName)
			}
		})
	}
}

func TestAuthzFilterHelpersCoverOrganizationAndPathNormalization(t *testing.T) {
	if got := resolveModuleOrganizationQuery("/api/organization-sync-api-keys", "", "engineering/admin"); got != "engineering" {
		t.Fatalf("resolveModuleOrganizationQuery() = %q, want engineering", got)
	}
	if got := resolveModuleOrganizationQuery("/api/organization-sync-api-keys", "", "invalid-user-id"); got != "" {
		t.Fatalf("resolveModuleOrganizationQuery() = %q, want empty for invalid user id", got)
	}
	if got := getCurrentUserIdFromContext(newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")); got != "" {
		t.Fatalf("getCurrentUserIdFromContext() = %q, want empty when absent", got)
	}
	currentUserCtx := newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")
	currentUserCtx.Input.SetData("currentUserId", "engineering/admin")
	if got := getCurrentUserIdFromContext(currentUserCtx); got != "engineering/admin" {
		t.Fatalf("getCurrentUserIdFromContext() = %q, want engineering/admin", got)
	}

	pathCases := []struct {
		path string
		want string
	}{
		{"/cas/built-in/app/serviceValidate", "/cas"},
		{"/scim/v2/Users", "/scim"},
		{"/api/login/oauth/access_token", "/api/login/oauth"},
		{"/api/webauthn/signin/begin", "/api/webauthn"},
		{"/api/saml/redirect/built-in/app", "/api/saml/redirect"},
		{"/api/dingtalk-org-sync/runs", "/api/dingtalk-org-sync/runs"},
	}
	for _, tc := range pathCases {
		ctx := newAuthzFilterTestContext(http.MethodGet, tc.path, "")
		if got := getUrlPath(ctx); got != tc.want {
			t.Fatalf("getUrlPath(%q) = %q, want %q", tc.path, got, tc.want)
		}
	}

	mcpCtx := newAuthzFilterTestContext(http.MethodPost, "/api/mcp", `{"method":"tools/call"}`)
	extra := getExtraInfo(mcpCtx, "/api/mcp")
	if extra == nil || extra["detailPathUrl"] != "tools/call" {
		t.Fatalf("getExtraInfo() = %#v, want MCP method detail", extra)
	}
	if extra := getExtraInfo(newAuthzFilterTestContext(http.MethodPost, "/api/mcp", `{"method":1}`), "/api/mcp"); extra != nil {
		t.Fatalf("getExtraInfo() = %#v, want nil for non-string method", extra)
	}
	if extra := getExtraInfo(newAuthzFilterTestContext(http.MethodPost, "/api/mcp", `{`), "/api/mcp"); extra != nil {
		t.Fatalf("getExtraInfo() = %#v, want nil for malformed body", extra)
	}
	if extra := getExtraInfo(newAuthzFilterTestContext(http.MethodGet, "/api/get-users", ""), "/api/get-users"); extra != nil {
		t.Fatalf("getExtraInfo(non-mcp) = %#v, want nil", extra)
	}

	if !isOrganizationSyncApiKeyReadPath(http.MethodGet, "/api/organization-sync/export") {
		t.Fatalf("organization sync api key should allow export reads")
	}
	if isOrganizationSyncApiKeyReadPath(http.MethodPost, "/api/organization-sync/export") {
		t.Fatalf("organization sync api key must reject write method")
	}
	if isOrganizationSyncApiKeyReadPath(http.MethodGet, "/api/dingtalk-org-sync/config") {
		t.Fatalf("organization sync api key must not allow dingtalk config reads")
	}

	if got := formatExtraInfo(map[string]interface{}{"detailPathUrl": "tools/call"}); !strings.Contains(got, "tools/call") {
		t.Fatalf("formatExtraInfo() = %q, want serialized method", got)
	}
	if got := formatExtraInfo(nil); got != "" {
		t.Fatalf("formatExtraInfo(nil) = %q, want empty", got)
	}
	if got := formatExtraInfo(map[string]interface{}{"bad": func() {}}); got != "" {
		t.Fatalf("formatExtraInfo(unmarshalable) = %q, want empty", got)
	}

	if willLog("anonymous", "anonymous", http.MethodGet, "/api/get-account", "", "") {
		t.Fatalf("anonymous get-account should not be logged")
	}
	if !willLog("engineering", "admin", http.MethodGet, "/api/dingtalk-org-sync/runs", "engineering", "") {
		t.Fatalf("non-anonymous dingtalk route should be logged")
	}
	if auth := getOrganizationSyncApiKeyAuth(newAuthzFilterTestContext(http.MethodGet, "/api/get-users", "")); auth != nil {
		t.Fatalf("getOrganizationSyncApiKeyAuth() = %#v, want nil without context data", auth)
	}
}

func TestApiFilterAllowsOrganizationSyncApiKeyReadPath(t *testing.T) {
	ctx := newAuthzFilterTestContext(http.MethodGet, "/api/organization-sync/export", "")
	ctx.Input.SetData(object.OrganizationSyncApiKeyContextKey, &object.OrganizationSyncApiKeyAuth{
		Owner:        "built-in",
		Name:         "sync-key",
		Organization: "engineering",
	})

	ApiFilter(ctx)

	if currentUser := ctx.Input.GetData("currentUserId"); currentUser != "" {
		t.Fatalf("currentUserId = %#v, want empty organization sync api key subject", currentUser)
	}
}

func TestGetOrganizationManagementScopeObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/org-management-scope/current", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization management scope object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationSyncApiKeysObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-sync-api-keys", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization sync api key object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("api key object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationTreeOperationsObjectUsesOrganization(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-tree-operations/diagnostics", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization tree operations object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("diagnostics object = %q/%q, want engineering/<empty>", owner, name)
	}

	body := []byte(`{"organization":"engineering","triggerType":"refresh_status"}`)
	owner, name, ok = getModuleOrganizationObject("/api/organization-tree-operations/refresh", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected organization tree refresh object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("refresh object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryQualityObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/directory", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory quality object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("directory quality object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationPlanObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-plan", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation plan object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation plan object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationActionDraftObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-action-drafts", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation action draft object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation action draft object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationPreflightObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-preflight", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation preflight object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation preflight object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationApprovalPreviewObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-approval-preview", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation approval preview object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation approval preview object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationApprovalPacketAuditObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-approval-packet-audit", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation approval packet audit object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation approval packet audit object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationApprovalPacketOperatorNotesObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-approval-packet-operator-notes", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation approval packet operator notes object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation approval packet operator notes object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationOperatorNotePersistenceReadinessObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-operator-note-persistence-readiness", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation operator note persistence readiness object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation operator note persistence readiness object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchObjectUsesOrganizationQuery(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/organization-master-data-quality/remediation-operator-note-readonly-audit-search", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected organization directory remediation operator note readonly audit search object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("remediation operator note readonly audit search object = %q/%q, want engineering/<empty>", owner, name)
	}
}

func TestGetModuleOrganizationObjectIgnoresUnscopedApi(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/get-providers", http.MethodGet, "engineering", nil)
	if ok || owner != "" || name != "" {
		t.Fatalf("unscoped api object = %q/%q/%v, want empty false", owner, name, ok)
	}
}

func TestGetModuleOrganizationObjectCoversMutationBodies(t *testing.T) {
	testCases := []struct {
		name      string
		path      string
		body      []byte
		wantOwner string
		wantName  string
	}{
		{
			name:      "organization sync api key mutation reads organization and name",
			path:      "/api/organization-sync-api-keys",
			body:      []byte(`{"organization":"engineering","name":"sync-key"}`),
			wantOwner: "engineering",
			wantName:  "sync-key",
		},
		{
			name: "organization sync api key malformed body stays scoped",
			path: "/api/organization-sync-api-keys",
			body: []byte(`{"organization":`),
		},
		{
			name: "organization tree malformed body stays scoped",
			path: "/api/organization-tree-operations/refresh",
			body: []byte(`{"organization":`),
		},
		{
			name: "platform mapping malformed body stays scoped",
			path: "/api/update-platform-api-user-mapping",
			body: []byte(`{"organizationId":`),
		},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			owner, name, ok := getModuleOrganizationObject(tc.path, http.MethodPost, "", tc.body)
			if !ok {
				t.Fatalf("expected %s to be recognized as module scoped", tc.path)
			}
			if owner != tc.wantOwner || name != tc.wantName {
				t.Fatalf("object = %q/%q, want %q/%q", owner, name, tc.wantOwner, tc.wantName)
			}
		})
	}
}

func TestGetPlatformApiMappingObjectUsesOrganization(t *testing.T) {
	owner, name, ok := getModuleOrganizationObject("/api/get-platform-api-organization-mappings", http.MethodGet, "engineering", nil)
	if !ok {
		t.Fatalf("expected platform API mapping object to be parsed")
	}
	if owner != "engineering" || name != "" {
		t.Fatalf("organization mappings object = %q/%q, want engineering/<empty>", owner, name)
	}

	body := []byte(`{"organizationId":"engineering","adminSubject":"alice","name":"api-user-map-alice"}`)
	owner, name, ok = getModuleOrganizationObject("/api/update-platform-api-user-mapping", http.MethodPost, "", body)
	if !ok {
		t.Fatalf("expected platform API mapping update object to be parsed")
	}
	if owner != "engineering" || name != "api-user-map-alice" {
		t.Fatalf("user mapping object = %q/%q, want engineering/api-user-map-alice", owner, name)
	}
}

func TestResolveModuleOrganizationQueryFallsBackToCurrentUserOwnerForScopeAudit(t *testing.T) {
	organization := resolveModuleOrganizationQuery("/api/org-management-scope/current", "", "engineering/alice")
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}
