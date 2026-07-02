// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

type controllerDingTalkSyncConfigStore struct {
	configs []*object.DingTalkOrganizationSyncConfig
	err     error
}

func (s *controllerDingTalkSyncConfigStore) GetDingTalkOrganizationSyncConfigByOrganization(organization string) (*object.DingTalkOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	for _, config := range s.configs {
		if config != nil && config.Organization == organization {
			copied := *config
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *controllerDingTalkSyncConfigStore) SaveDingTalkOrganizationSyncConfig(config *object.DingTalkOrganizationSyncConfig) (bool, error) {
	return true, nil
}

func (s *controllerDingTalkSyncConfigStore) ListDingTalkOrganizationSyncConfigs() ([]*object.DingTalkOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.configs, nil
}

func newDingTalkOrganizationSyncPostTestController(methodName string, body string) *ApiController {
	request := httptest.NewRequest(http.MethodPost, "/api/dingtalk-org-sync", strings.NewReader(body))
	response := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(response, request)
	ctx.Input.RequestBody = []byte(body)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", methodName, controller)
	controller.Ctx.Input.SetData("currentUserId", "built-in/admin")
	return controller
}

func newDingTalkOrganizationSyncGetTestController(methodName string, target string) *ApiController {
	request := httptest.NewRequest(http.MethodGet, target, nil)
	response := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(response, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", methodName, controller)
	return controller
}

func requireDingTalkOrganizationSyncErrorResponse(t *testing.T, controller *ApiController, contains string) {
	t.Helper()
	response, ok := controller.Data["json"].(*Response)
	if !ok || response == nil {
		t.Fatalf("response = %#v, want controller Response", controller.Data["json"])
	}
	if response.Status != "error" || (contains != "" && !strings.Contains(response.Msg, contains)) {
		t.Fatalf("response = %#v, want error containing %q", response, contains)
	}
}

func TestNewDingTalkOrganizationSyncConfigResponseAttachesSourceStatus(t *testing.T) {
	sourceStatus := &object.OrganizationSyncSourceConflictStatus{
		DefaultOrganization:       "dingtalk-org",
		DefaultOrganizationSource: "configured",
		ConflictingProvider:       "WeCom",
		ConflictingOrganization:   "engineering",
		ConflictingConfigured:     true,
		ConflictingEnabled:        true,
		ConflictingOrganizations:  []string{"engineering"},
	}

	emptyResponse := newDingTalkOrganizationSyncConfigResponse("engineering", nil, sourceStatus)
	if emptyResponse.IsConfigured || emptyResponse.Config == nil || emptyResponse.Config.Organization != "engineering" {
		t.Fatalf("empty config response = %#v, want default config for engineering", emptyResponse)
	}
	if emptyResponse.DefaultOrganization != "dingtalk-org" || emptyResponse.ConflictingProvider != "WeCom" || !emptyResponse.ConflictingConfigured {
		t.Fatalf("source status = %#v, want default organization and WeCom conflict", emptyResponse)
	}

	configuredResponse := newDingTalkOrganizationSyncConfigResponse("engineering", &object.DingTalkOrganizationSyncConfig{
		Organization: "engineering",
		AppKey:       "ding-app",
	}, sourceStatus)
	if !configuredResponse.IsConfigured || configuredResponse.Config == nil || configuredResponse.Config.AppKey != "ding-app" {
		t.Fatalf("configured response = %#v, want persisted DingTalk config", configuredResponse)
	}
}

func TestDingTalkOrganizationSyncResponseHelpersHandleEmptyInputs(t *testing.T) {
	if firstDingTalkOrganizationSyncSourceStatus() != nil {
		t.Fatalf("firstDingTalkOrganizationSyncSourceStatus() should return nil without inputs")
	}
	response := newDingTalkOrganizationSyncConfigResponse("engineering", nil)
	if response.SourceStatus != nil || response.ConflictingConfigured {
		t.Fatalf("response without source status = %#v, want no conflict metadata", response)
	}
	applyDingTalkOrganizationSyncSourceStatus(nil, &object.OrganizationSyncSourceConflictStatus{ConflictingConfigured: true})
	applyDingTalkOrganizationSyncSourceStatus(response, nil)
	if response.SourceStatus != nil || response.ConflictingConfigured {
		t.Fatalf("nil source status should not mutate response: %#v", response)
	}
}

func TestNewDingTalkOrganizationSyncRunStartResponseMasksSecretsAndHandlesNil(t *testing.T) {
	empty := newDingTalkOrganizationSyncRunStartResponse(nil)
	if empty.RunId != "" || empty.Run != nil || empty.RecoveredStaleRun != nil {
		t.Fatalf("nil start response = %#v, want empty response", empty)
	}

	response := newDingTalkOrganizationSyncRunStartResponse(&object.DingTalkOrganizationSyncStartRunResult{
		Run: &object.DingTalkOrganizationSyncRun{
			Name:      "run-1",
			ErrorText: "failed with real-secret",
		},
		StaleRun: &object.DingTalkOrganizationSyncRun{
			Name:      "run-stale",
			ErrorText: "previous real-secret expired",
		},
	}, "real-secret")
	if response.RunId != "run-1" || response.Run == nil || response.RecoveredStaleRun == nil {
		t.Fatalf("start response = %#v, want run and recovered stale run", response)
	}
	if strings.Contains(response.Run.ErrorText, "real-secret") || strings.Contains(response.RecoveredStaleRun.ErrorText, "real-secret") {
		t.Fatalf("start response leaked secret: %#v", response)
	}
}

func TestDingTalkOrganizationSyncHandlersRejectMalformedJson(t *testing.T) {
	testCases := []struct {
		name       string
		methodName string
		invoke     func(*ApiController)
	}{
		{
			name:       "save config",
			methodName: "SaveDingTalkOrganizationSyncConfig",
			invoke:     (*ApiController).SaveDingTalkOrganizationSyncConfig,
		},
		{
			name:       "test config",
			methodName: "TestDingTalkOrganizationSyncConfig",
			invoke:     (*ApiController).TestDingTalkOrganizationSyncConfig,
		},
		{
			name:       "start run",
			methodName: "StartDingTalkOrganizationSyncRun",
			invoke:     (*ApiController).StartDingTalkOrganizationSyncRun,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			controller := newDingTalkOrganizationSyncPostTestController(tc.methodName, `{"organization":`)
			tc.invoke(controller)
			requireDingTalkOrganizationSyncErrorResponse(t, controller, "unexpected end of JSON input")
		})
	}
}

func TestDingTalkOrganizationSyncHandlersRejectMissingOrganizationBeforeStoreAccess(t *testing.T) {
	testCases := []struct {
		name       string
		controller *ApiController
		invoke     func(*ApiController)
	}{
		{
			name:       "get config",
			controller: newDingTalkOrganizationSyncGetTestController("GetDingTalkOrganizationSyncConfig", "/api/dingtalk-org-sync/config"),
			invoke:     (*ApiController).GetDingTalkOrganizationSyncConfig,
		},
		{
			name:       "save config",
			controller: newDingTalkOrganizationSyncPostTestController("SaveDingTalkOrganizationSyncConfig", `{}`),
			invoke:     (*ApiController).SaveDingTalkOrganizationSyncConfig,
		},
		{
			name:       "test config",
			controller: newDingTalkOrganizationSyncPostTestController("TestDingTalkOrganizationSyncConfig", `{}`),
			invoke:     (*ApiController).TestDingTalkOrganizationSyncConfig,
		},
		{
			name:       "start run",
			controller: newDingTalkOrganizationSyncPostTestController("StartDingTalkOrganizationSyncRun", `{}`),
			invoke:     (*ApiController).StartDingTalkOrganizationSyncRun,
		},
		{
			name:       "list runs",
			controller: newDingTalkOrganizationSyncGetTestController("GetDingTalkOrganizationSyncRuns", "/api/dingtalk-org-sync/runs"),
			invoke:     (*ApiController).GetDingTalkOrganizationSyncRuns,
		},
		{
			name:       "get run",
			controller: newDingTalkOrganizationSyncGetTestController("GetDingTalkOrganizationSyncRun", "/api/dingtalk-org-sync/runs/run-1"),
			invoke:     (*ApiController).GetDingTalkOrganizationSyncRun,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			tc.controller.Ctx.Input.SetData("currentUserId", "")
			tc.invoke(tc.controller)
			requireDingTalkOrganizationSyncErrorResponse(t, tc.controller, "organization")
		})
	}
}

func TestDingTalkOrganizationSyncHandlersRejectUnauthorizedOrganization(t *testing.T) {
	controller := newDingTalkOrganizationSyncGetTestController("GetDingTalkOrganizationSyncRuns", "/api/dingtalk-org-sync/runs?organization=engineering")
	controller.Ctx.Input.SetData("currentUserId", "")

	controller.GetDingTalkOrganizationSyncRuns()

	requireDingTalkOrganizationSyncErrorResponse(t, controller, "")
}

func TestResolveDingTalkOrganizationSyncConfigTargetUsesDefaultForGlobalAdmin(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetDingTalkOrganizationSyncConfig")
	service := &object.DingTalkOrganizationSyncConfigService{
		Store: &controllerDingTalkSyncConfigStore{configs: []*object.DingTalkOrganizationSyncConfig{
			{Organization: "engineering", AppKey: "ding-app", AppSecret: "secret", IsEnabled: true},
		}},
		WecomConfigStore:  &controllerWecomSyncConfigStore{},
		FeishuConfigStore: &controllerFeishuSyncConfigStore{},
	}

	organization, sourceStatus, ok := controller.resolveDingTalkOrganizationSyncConfigTarget("", service)
	if !ok || organization != "engineering" {
		t.Fatalf("resolveDingTalkOrganizationSyncConfigTarget() = organization:%q ok:%v, want engineering true", organization, ok)
	}
	if sourceStatus == nil || sourceStatus.DefaultOrganization != "engineering" || sourceStatus.SourceStatus == nil || sourceStatus.SourceStatus.State != object.OrganizationDirectorySourceStateOwned {
		t.Fatalf("source status = %#v, want owned DingTalk default organization", sourceStatus)
	}
}

func TestResolveDingTalkOrganizationSyncConfigTargetPropagatesSourceStatusError(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetDingTalkOrganizationSyncConfig")
	boom := errors.New("source status failed")
	service := &object.DingTalkOrganizationSyncConfigService{
		Store:             &controllerDingTalkSyncConfigStore{err: boom},
		WecomConfigStore:  &controllerWecomSyncConfigStore{},
		FeishuConfigStore: &controllerFeishuSyncConfigStore{},
	}

	organization, sourceStatus, ok := controller.resolveDingTalkOrganizationSyncConfigTarget("", service)
	if ok || organization != "" || sourceStatus != nil {
		t.Fatalf("resolveDingTalkOrganizationSyncConfigTarget() = %q %#v %v, want failure", organization, sourceStatus, ok)
	}
}

func TestResolveDingTalkOrganizationSyncConfigTargetUsesExplicitOrganization(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetDingTalkOrganizationSyncConfig")
	service := &object.DingTalkOrganizationSyncConfigService{
		Store: &controllerDingTalkSyncConfigStore{configs: []*object.DingTalkOrganizationSyncConfig{
			{Organization: "engineering", AppKey: "ding-app", AppSecret: "secret", IsEnabled: true},
		}},
		WecomConfigStore:  &controllerWecomSyncConfigStore{},
		FeishuConfigStore: &controllerFeishuSyncConfigStore{},
	}

	organization, sourceStatus, ok := controller.resolveDingTalkOrganizationSyncConfigTarget("engineering", service)
	if !ok || organization != "engineering" {
		t.Fatalf("resolveDingTalkOrganizationSyncConfigTarget(explicit) = organization:%q ok:%v, want engineering true", organization, ok)
	}
	if sourceStatus == nil || sourceStatus.SourceStatus == nil || sourceStatus.SourceStatus.State != object.OrganizationDirectorySourceStateOwned {
		t.Fatalf("source status = %#v, want owned DingTalk status", sourceStatus)
	}
}

func TestResolveDingTalkOrganizationSyncTargetUsesExplicitOrganization(t *testing.T) {
	organization, err := resolveDingTalkOrganizationSyncTarget("engineering", nil, true)
	if err != nil {
		t.Fatalf("resolveDingTalkOrganizationSyncTarget() error = %v", err)
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}

func TestResolveDingTalkOrganizationSyncTargetFallsBackToOrgAdminContext(t *testing.T) {
	organization, err := resolveDingTalkOrganizationSyncTarget("", &object.User{
		Owner:   "engineering",
		Name:    "admin",
		IsAdmin: true,
	}, false)
	if err != nil {
		t.Fatalf("resolveDingTalkOrganizationSyncTarget() error = %v", err)
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}

func TestResolveDingTalkOrganizationSyncTargetRequiresUnambiguousOrganization(t *testing.T) {
	_, err := resolveDingTalkOrganizationSyncTarget("", &object.User{Owner: "engineering", Name: "user"}, false)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("normal user without explicit organization error = %v", err)
	}
	_, err = resolveDingTalkOrganizationSyncTarget("", nil, true)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("global admin without explicit organization error = %v", err)
	}
}

func TestIsDingTalkOrganizationSyncAdmin(t *testing.T) {
	if !isDingTalkOrganizationSyncAdmin(nil, true, "engineering") {
		t.Fatalf("global admin should manage any organization")
	}
	if !isDingTalkOrganizationSyncAdmin(&object.User{Owner: "engineering", IsAdmin: true}, false, "engineering") {
		t.Fatalf("organization admin should manage own organization")
	}
	if isDingTalkOrganizationSyncAdmin(&object.User{Owner: "finance", IsAdmin: true}, false, "engineering") {
		t.Fatalf("organization admin must not manage another organization")
	}
	if isDingTalkOrganizationSyncAdmin(&object.User{Owner: "engineering", IsAdmin: false}, false, "engineering") {
		t.Fatalf("normal user must not manage organization sync APIs")
	}
}
