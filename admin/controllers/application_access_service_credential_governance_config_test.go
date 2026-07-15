package controllers

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

type memoryServiceCredentialGovernanceConfigStore struct {
	config *object.ServiceCredentialGovernanceConfig
	saved  *object.ServiceCredentialGovernanceConfig
	err    error
}

func (s *memoryServiceCredentialGovernanceConfigStore) GetServiceCredentialGovernanceConfig() (*object.ServiceCredentialGovernanceConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.config == nil {
		return nil, nil
	}
	copy := *s.config
	return &copy, nil
}

func (s *memoryServiceCredentialGovernanceConfigStore) SaveServiceCredentialGovernanceConfig(config *object.ServiceCredentialGovernanceConfig) (bool, error) {
	if s.err != nil {
		return false, s.err
	}
	if config == nil {
		return false, nil
	}
	copy := *config
	s.config = &copy
	s.saved = &copy
	return true, nil
}

func TestServiceCredentialGovernanceConfigServiceDefaultsAreSanitized(t *testing.T) {
	service := &object.ServiceCredentialGovernanceConfigService{
		Store: &memoryServiceCredentialGovernanceConfigStore{},
		Now:   func() time.Time { return time.Date(2026, 6, 21, 6, 0, 0, 0, time.UTC) },
	}

	config, err := service.GetConfig()
	if err != nil {
		t.Fatalf("GetConfig() error = %v", err)
	}
	if config.Source != "admin_service_credential_governance_config" {
		t.Fatalf("source = %q, want admin_service_credential_governance_config", config.Source)
	}
	if len(config.Groups) != 4 {
		t.Fatalf("groups length = %d, want 4", len(config.Groups))
	}

	resolver := serviceCredentialGovernanceConfigGroupByKey(t, config.Groups, "usage_identity_resolver")
	if resolver.CredentialReferenceStatus != "missing" || resolver.SourceClass != "admin_config" {
		t.Fatalf("resolver default mismatch: %#v", resolver)
	}
	keepInEnv := serviceCredentialGovernanceConfigGroupByKey(t, config.Groups, "keep_in_env")
	if !keepInEnv.KeepInEnv || keepInEnv.SourceClass != "env_config" {
		t.Fatalf("keep-in-env default mismatch: %#v", keepInEnv)
	}

	body, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("marshal config: %v", err)
	}
	for _, forbidden := range []string{"secret-value", "Authorization", "Cookie", "clientSecret", "privateKey", "https://"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("sanitized default leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestServiceCredentialGovernanceConfigServiceSavesAndReadsBackReferenceMetadata(t *testing.T) {
	store := &memoryServiceCredentialGovernanceConfigStore{}
	service := &object.ServiceCredentialGovernanceConfigService{
		Store: store,
		Now:   func() time.Time { return time.Date(2026, 6, 21, 6, 5, 0, 0, time.UTC) },
	}

	saved, _, err := service.SaveConfig(&object.ServiceCredentialGovernanceConfigResponse{
		Groups: []object.ServiceCredentialGovernanceConfigGroup{
			{
				Key:                       "usage_identity_resolver",
				Enabled:                   true,
				Owner:                     "admin_outbound_resolver",
				SourceClass:               "external_secret_system",
				CredentialReferenceStatus: "external_secret",
				CredentialReferenceKey:    "vault:usage-identity-resolver",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 1500.0, "maxItems": 25.0},
				RemediationRoute:          "/platform-api-mappings",
				NextAction:                "核对 resolver 凭据引用",
			},
			{
				Key:                       "gateway_organization_projection",
				Enabled:                   true,
				Owner:                     "admin_gateway_projection_producer",
				SourceClass:               "external_secret_system",
				CredentialReferenceStatus: "external_secret",
				CredentialReferenceKey:    "vault:gateway-projection-publisher",
				CallerPolicy:              "aicodex-admin",
				BoundedRuntimePolicy:      map[string]interface{}{"timeoutMs": 2500.0, "maxRetries": 2.0},
				RemediationRoute:          "/platform-api-mappings",
				NextAction:                "核对 Gateway projection 发布凭据引用",
			},
		},
	})
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}
	if !saved.IsConfigured || store.saved == nil {
		t.Fatalf("SaveConfig() did not persist metadata: saved=%#v store=%#v", saved, store.saved)
	}

	readBack, err := service.GetConfig()
	if err != nil {
		t.Fatalf("GetConfig() after save error = %v", err)
	}
	resolver := serviceCredentialGovernanceConfigGroupByKey(t, readBack.Groups, "usage_identity_resolver")
	if resolver.CredentialReferenceKey != "vault:usage-identity-resolver" || resolver.CallerPolicy != "aicodex-admin" {
		t.Fatalf("resolver readback mismatch: %#v", resolver)
	}
	if resolver.BoundedRuntimePolicy["timeoutMs"] != float64(1500) {
		t.Fatalf("resolver policy mismatch: %#v", resolver.BoundedRuntimePolicy)
	}
}

func TestServiceCredentialGovernanceConfigServiceRejectsSensitivePayload(t *testing.T) {
	store := &memoryServiceCredentialGovernanceConfigStore{}
	service := &object.ServiceCredentialGovernanceConfigService{Store: store}

	_, _, err := service.SaveConfig(&object.ServiceCredentialGovernanceConfigResponse{
		Groups: []object.ServiceCredentialGovernanceConfigGroup{{
			Key:                       "usage_identity_resolver",
			Enabled:                   true,
			Owner:                     "admin_outbound_resolver",
			SourceClass:               "admin_config",
			CredentialReferenceStatus: "configured",
			CredentialReferenceKey:    "https://resolver.internal.example.invalid/token",
			CallerPolicy:              "Bearer resolver-secret-value",
		}},
	})
	if err == nil {
		t.Fatalf("SaveConfig() error = nil, want sensitive payload rejection")
	}
	if store.saved != nil {
		t.Fatalf("sensitive payload should not be saved: %#v", store.saved)
	}
	if strings.Contains(err.Error(), "resolver-secret-value") || strings.Contains(err.Error(), "resolver.internal.example.invalid") {
		t.Fatalf("error leaked sensitive value: %v", err)
	}
}

func TestSaveInsightAdminProviderHandoffConfigRequiresAdminAndRejectsMalformedJson(t *testing.T) {
	controller := newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[]`))
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.SaveInsightAdminProviderHandoffConfig()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" {
		t.Fatalf("response = %#v, want malformed JSON error", controller.Data["json"])
	}

	controller = newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[]}`))
	controller.Ctx.Input.SetData("currentUserId", "tenant-a/operator")

	controller.SaveInsightAdminProviderHandoffConfig()

	resp, ok = controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "administrator") {
		t.Fatalf("response = %#v, want administrator required error", controller.Data["json"])
	}
}

func TestGetInsightAdminProviderHandoffConfigRequiresLoginAndHandlesStoreError(t *testing.T) {
	controller := newServiceCredentialGovernanceConfigTestController("GET", nil)

	controller.GetInsightAdminProviderHandoffConfig()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "Please login first") {
		t.Fatalf("response = %#v, want login required error", controller.Data["json"])
	}

	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{
			Store: &memoryServiceCredentialGovernanceConfigStore{err: errors.New("metadata store unavailable")},
		}
	}
	defer func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	}()

	controller = newServiceCredentialGovernanceConfigTestController("GET", nil)
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")
	controller.GetInsightAdminProviderHandoffConfig()

	resp, ok = controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || resp.Msg != object.ServiceCredentialRuntimeBlockerSavedConfigUnavailable {
		t.Fatalf("response = %#v, want stable store blocker", controller.Data["json"])
	}
}

func TestSaveInsightAdminProviderHandoffConfigHandlesStoreError(t *testing.T) {
	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{
			Store: &memoryServiceCredentialGovernanceConfigStore{err: errors.New("metadata store unavailable")},
		}
	}
	defer func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	}()

	controller := newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[{"key":"keep_in_env","sourceClass":"env_config","credentialReferenceStatus":"external_secret"}]}`))
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")
	controller.SaveInsightAdminProviderHandoffConfig()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || resp.Msg != object.ServiceCredentialRuntimeBlockerSavedConfigUnavailable {
		t.Fatalf("response = %#v, want stable store blocker", controller.Data["json"])
	}
}

func TestDiagnoseInsightAdminProviderHandoffConfigRequiresAdminAndRejectsMalformedJson(t *testing.T) {
	controller := newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[]`))
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.DiagnoseInsightAdminProviderHandoffConfig()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" {
		t.Fatalf("response = %#v, want malformed JSON error", controller.Data["json"])
	}

	controller = newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[]}`))
	controller.Ctx.Input.SetData("currentUserId", "tenant-a/operator")

	controller.DiagnoseInsightAdminProviderHandoffConfig()

	resp, ok = controller.Data["json"].(*Response)
	if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, "administrator") {
		t.Fatalf("response = %#v, want administrator required error", controller.Data["json"])
	}
}

func TestDiagnoseInsightAdminProviderHandoffConfigReturnsCopySafeDiagnostic(t *testing.T) {
	controller := newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[{"key":"usage_identity_resolver","enabled":true,"owner":"admin_outbound_resolver","sourceClass":"external_secret_system","credentialReferenceStatus":"external_secret","credentialReferenceKey":"vault:usage-identity-resolver","callerPolicy":"aicodex-admin","boundedRuntimePolicy":{"timeoutMs":1500,"maxItems":25},"nextAction":"核对 resolver 引用"}]}`))
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.DiagnoseInsightAdminProviderHandoffConfig()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "ok" {
		t.Fatalf("diagnose response = %#v, want ok", controller.Data["json"])
	}
	diagnostic, ok := resp.Data.(object.ServiceCredentialGovernanceDiagnosticResponse)
	if !ok {
		t.Fatalf("diagnose data = %#v, want diagnostic response", resp.Data)
	}
	if len(diagnostic.Groups) != 1 || diagnostic.Groups[0].StableAlias != object.ServiceCredentialRuntimeBlockerReferenceUnresolved {
		t.Fatalf("diagnostic groups = %#v", diagnostic.Groups)
	}
	if diagnostic.Groups[0].AdoptedSource != object.ServiceCredentialRuntimeSourceSavedSecretRef || diagnostic.Groups[0].CredentialReferenceKey != "vault:usage-identity-resolver" || diagnostic.Groups[0].ErrorCode != object.ServiceCredentialRuntimeBlockerReferenceUnresolved {
		t.Fatalf("diagnostic runtime resolution = %#v", diagnostic.Groups[0])
	}
	body, err := json.Marshal(diagnostic)
	if err != nil {
		t.Fatalf("marshal diagnostic: %v", err)
	}
	for _, forbidden := range []string{"resolver-secret-value", "Authorization", "Cookie", "clientSecret", "privateKey", "https://resolver.internal"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("diagnostic leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestGetAndSaveInsightAdminProviderHandoffConfigRoundTrip(t *testing.T) {
	store := &memoryServiceCredentialGovernanceConfigStore{}
	originalFactory := applicationAccessServiceCredentialGovernanceConfigServiceFactory
	applicationAccessServiceCredentialGovernanceConfigServiceFactory = func() *object.ServiceCredentialGovernanceConfigService {
		return &object.ServiceCredentialGovernanceConfigService{
			Store: store,
			Now:   func() time.Time { return time.Date(2026, 6, 21, 6, 10, 0, 0, time.UTC) },
		}
	}
	defer func() {
		applicationAccessServiceCredentialGovernanceConfigServiceFactory = originalFactory
	}()

	controller := newServiceCredentialGovernanceConfigTestController("POST", []byte(`{"groups":[{"key":"usage_identity_resolver","enabled":true,"owner":"admin_outbound_resolver","sourceClass":"external_secret_system","credentialReferenceStatus":"external_secret","credentialReferenceKey":"vault:usage-identity-resolver","callerPolicy":"aicodex-admin","boundedRuntimePolicy":{"timeoutMs":1500},"remediationRoute":"/platform-api-mappings","nextAction":"核对 resolver 凭据引用"}]}`))
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

	controller.SaveInsightAdminProviderHandoffConfig()

	resp, ok := controller.Data["json"].(*Response)
	if !ok || resp.Status != "ok" {
		t.Fatalf("save response = %#v, want ok", controller.Data["json"])
	}
	saved, ok := resp.Data.(*object.ServiceCredentialGovernanceConfigResponse)
	if !ok {
		t.Fatalf("save data = %#v, want config response", resp.Data)
	}
	if !saved.IsConfigured {
		t.Fatalf("save should return configured response: %#v", saved)
	}

	getController := newServiceCredentialGovernanceConfigTestController("GET", nil)
	getController.Ctx.Input.SetData("currentUserId", "built-in/admin")
	getController.GetInsightAdminProviderHandoffConfig()

	getResp, ok := getController.Data["json"].(*Response)
	if !ok || getResp.Status != "ok" {
		t.Fatalf("get response = %#v, want ok", getController.Data["json"])
	}
	readBack, ok := getResp.Data.(*object.ServiceCredentialGovernanceConfigResponse)
	if !ok {
		t.Fatalf("get data = %#v, want config response", getResp.Data)
	}
	resolver := serviceCredentialGovernanceConfigGroupByKey(t, readBack.Groups, "usage_identity_resolver")
	if resolver.CredentialReferenceKey != "vault:usage-identity-resolver" {
		t.Fatalf("resolver config readback mismatch: %#v", resolver)
	}

	body, err := json.Marshal(readBack)
	if err != nil {
		t.Fatalf("marshal readback: %v", err)
	}
	for _, forbidden := range []string{"resolver-secret-value", "Authorization", "Cookie", "clientSecret", "privateKey", "https://resolver.internal"} {
		if strings.Contains(string(body), forbidden) {
			t.Fatalf("readback leaked %q in %s", forbidden, string(body))
		}
	}
}

func TestApplicationAccessServiceCredentialGovernanceConfigHandlersRejectLegacyEndpoints(t *testing.T) {
	cases := []struct {
		name    string
		method  string
		body    []byte
		call    func(*ApiController)
		newPath string
	}{
		{
			name:    "get config",
			method:  "GET",
			call:    (*ApiController).GetApplicationAccessServiceCredentialGovernanceConfig,
			newPath: "/api/insight-admin-provider/handoff/config",
		},
		{
			name:    "save config",
			method:  "POST",
			body:    []byte(`{"groups":[]}`),
			call:    (*ApiController).SaveApplicationAccessServiceCredentialGovernanceConfig,
			newPath: "/api/insight-admin-provider/handoff/config",
		},
		{
			name:    "diagnostics",
			method:  "POST",
			body:    []byte(`{"groups":[]}`),
			call:    (*ApiController).DiagnoseApplicationAccessServiceCredentialGovernanceConfig,
			newPath: "/api/insight-admin-provider/handoff/diagnostics",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			controller := newServiceCredentialGovernanceConfigTestController(tc.method, tc.body)
			controller.Ctx.Input.SetData("currentUserId", "built-in/admin")

			tc.call(controller)

			resp, ok := controller.Data["json"].(*Response)
			if !ok || resp.Status != "error" || !strings.Contains(resp.Msg, tc.newPath) {
				t.Fatalf("response = %#v, want deprecated endpoint error with %s", controller.Data["json"], tc.newPath)
			}
		})
	}
}

func serviceCredentialGovernanceConfigGroupByKey(t *testing.T, groups []object.ServiceCredentialGovernanceConfigGroup, key string) object.ServiceCredentialGovernanceConfigGroup {
	t.Helper()
	for _, group := range groups {
		if group.Key == key {
			return group
		}
	}
	t.Fatalf("group %q not found in %#v", key, groups)
	return object.ServiceCredentialGovernanceConfigGroup{}
}

func newServiceCredentialGovernanceConfigTestController(method string, body []byte) *ApiController {
	path := "/api/insight-admin-provider/handoff/config"
	if method == "POST" {
		path = "/api/insight-admin-provider/handoff/config"
	}
	request := httptest.NewRequest(method, path, strings.NewReader(string(body)))
	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	ctx.Input.RequestBody = body
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "ServiceCredentialGovernanceConfig", controller)
	controller.Ctx.Input.SetData("currentUserId", "")
	return controller
}
