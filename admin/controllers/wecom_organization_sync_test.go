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
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

type controllerWecomSyncConfigStore struct {
	configs []*object.WecomOrganizationSyncConfig
	err     error
}

func (s *controllerWecomSyncConfigStore) GetWecomOrganizationSyncConfigByOrganization(organization string) (*object.WecomOrganizationSyncConfig, error) {
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

func (s *controllerWecomSyncConfigStore) SaveWecomOrganizationSyncConfig(config *object.WecomOrganizationSyncConfig) (bool, error) {
	return true, nil
}

func (s *controllerWecomSyncConfigStore) ListWecomOrganizationSyncConfigs() ([]*object.WecomOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.configs, nil
}

type controllerFeishuSyncConfigStore struct {
	configs []*object.FeishuOrganizationSyncConfig
	err     error
}

func (s *controllerFeishuSyncConfigStore) GetFeishuOrganizationSyncConfigByOrganization(organization string) (*object.FeishuOrganizationSyncConfig, error) {
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

func (s *controllerFeishuSyncConfigStore) SaveFeishuOrganizationSyncConfig(config *object.FeishuOrganizationSyncConfig) (bool, error) {
	return true, nil
}

func (s *controllerFeishuSyncConfigStore) ListFeishuOrganizationSyncConfigs() ([]*object.FeishuOrganizationSyncConfig, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.configs, nil
}

func newOrganizationSyncConfigTargetTestController(methodName string) *ApiController {
	request := httptest.NewRequest("GET", "/api/org-sync/config", nil)
	response := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(response, request)
	controller := &ApiController{}
	controller.Init(ctx, "ApiController", methodName, controller)
	controller.Ctx.Input.SetData("currentUserId", "app/app-admin")
	return controller
}

func TestNewWecomOrganizationSyncConfigResponseAttachesSourceStatus(t *testing.T) {
	sourceStatus := &object.OrganizationSyncSourceConflictStatus{
		DefaultOrganization:       "wecom-org",
		DefaultOrganizationSource: "configured",
		ConflictingProvider:       "Feishu/Lark",
		ConflictingOrganization:   "engineering",
		ConflictingConfigured:     true,
		ConflictingEnabled:        true,
		ConflictingOrganizations:  []string{"engineering"},
	}

	emptyResponse := newWecomOrganizationSyncConfigResponse("engineering", nil, sourceStatus)
	if emptyResponse.IsConfigured || emptyResponse.Config == nil || emptyResponse.Config.Organization != "engineering" {
		t.Fatalf("empty config response = %#v, want default config for engineering", emptyResponse)
	}
	if emptyResponse.DefaultOrganization != "wecom-org" || emptyResponse.ConflictingProvider != "Feishu/Lark" || !emptyResponse.ConflictingConfigured {
		t.Fatalf("source status = %#v, want default organization and Feishu/Lark conflict", emptyResponse)
	}
	if !emptyResponse.ConflictingEnabled || len(emptyResponse.ConflictingOrganizations) != 1 || emptyResponse.ConflictingOrganizations[0] != "engineering" {
		t.Fatalf("conflict details = enabled:%v organizations:%v, want enabled engineering", emptyResponse.ConflictingEnabled, emptyResponse.ConflictingOrganizations)
	}

	configuredResponse := newWecomOrganizationSyncConfigResponse("engineering", &object.WecomOrganizationSyncConfig{
		Organization: "engineering",
		CorpId:       "ww123",
	}, sourceStatus)
	if !configuredResponse.IsConfigured || configuredResponse.Config == nil || configuredResponse.Config.CorpId != "ww123" {
		t.Fatalf("configured response = %#v, want persisted WeCom config", configuredResponse)
	}
}

func TestResolveWecomOrganizationSyncConfigTargetUsesDefaultForGlobalAdmin(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetWecomOrganizationSyncConfig")
	service := &object.WecomOrganizationSyncConfigService{
		Store: &controllerWecomSyncConfigStore{configs: []*object.WecomOrganizationSyncConfig{
			{Organization: "engineering", CorpId: "ww123"},
		}},
		FeishuConfigStore: &controllerFeishuSyncConfigStore{configs: []*object.FeishuOrganizationSyncConfig{
			{Organization: "engineering", AppId: "cli_a", IsEnabled: true},
		}},
	}

	organization, sourceStatus, ok := controller.resolveWecomOrganizationSyncConfigTarget("", service)
	if !ok || organization != "engineering" {
		t.Fatalf("resolveWecomOrganizationSyncConfigTarget() = organization:%q ok:%v, want engineering true", organization, ok)
	}
	if sourceStatus == nil || sourceStatus.DefaultOrganization != "engineering" || sourceStatus.ConflictingProvider != "Feishu/Lark" {
		t.Fatalf("sourceStatus = %#v, want default engineering and Feishu/Lark conflict", sourceStatus)
	}
}

func TestResolveWecomOrganizationSyncConfigTargetUsesExplicitOrganization(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetWecomOrganizationSyncConfig")
	service := &object.WecomOrganizationSyncConfigService{
		Store: &controllerWecomSyncConfigStore{configs: []*object.WecomOrganizationSyncConfig{
			{Organization: "engineering", CorpId: "ww123"},
		}},
		FeishuConfigStore: &controllerFeishuSyncConfigStore{configs: []*object.FeishuOrganizationSyncConfig{
			{Organization: "finance", AppId: "cli_b", IsEnabled: false},
		}},
	}

	organization, sourceStatus, ok := controller.resolveWecomOrganizationSyncConfigTarget("finance", service)
	if !ok || organization != "finance" {
		t.Fatalf("resolveWecomOrganizationSyncConfigTarget() = organization:%q ok:%v, want finance true", organization, ok)
	}
	if sourceStatus == nil || sourceStatus.ConflictingOrganization != "finance" || sourceStatus.ConflictingEnabled {
		t.Fatalf("sourceStatus = %#v, want disabled Feishu/Lark conflict for finance", sourceStatus)
	}
}

func TestResolveWecomOrganizationSyncTargetUsesExplicitOrganization(t *testing.T) {
	organization, err := resolveWecomOrganizationSyncTarget("built-in", nil, true)
	if err != nil {
		t.Fatalf("resolveWecomOrganizationSyncTarget() error = %v", err)
	}
	if organization != "built-in" {
		t.Fatalf("organization = %q, want built-in", organization)
	}
}

func TestResolveWecomOrganizationSyncTargetFallsBackToOrgAdminContext(t *testing.T) {
	organization, err := resolveWecomOrganizationSyncTarget("", &object.User{
		Owner:   "engineering",
		Name:    "admin",
		IsAdmin: true,
	}, false)
	if err != nil {
		t.Fatalf("resolveWecomOrganizationSyncTarget() error = %v", err)
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}

func TestResolveWecomOrganizationSyncTargetRequiresUnambiguousOrganization(t *testing.T) {
	_, err := resolveWecomOrganizationSyncTarget("", &object.User{
		Owner: "engineering",
		Name:  "user",
	}, false)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("normal user without explicit organization error = %v", err)
	}

	_, err = resolveWecomOrganizationSyncTarget("", nil, true)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("global admin without explicit organization error = %v", err)
	}
}

func TestIsWecomOrganizationSyncAdmin(t *testing.T) {
	if !isWecomOrganizationSyncAdmin(nil, true, "built-in") {
		t.Fatalf("global admin should manage any organization")
	}
	if !isWecomOrganizationSyncAdmin(&object.User{Owner: "built-in", IsAdmin: true}, false, "built-in") {
		t.Fatalf("organization admin should manage own organization")
	}
	if isWecomOrganizationSyncAdmin(&object.User{Owner: "engineering", IsAdmin: true}, false, "built-in") {
		t.Fatalf("organization admin must not manage another organization")
	}
	if isWecomOrganizationSyncAdmin(&object.User{Owner: "built-in", IsAdmin: false}, false, "built-in") {
		t.Fatalf("normal user must not manage organization sync APIs")
	}
}

func TestResolveOrganizationManagementScopeTargetDefaultsToCurrentUserOwner(t *testing.T) {
	organization, isAdminScope, err := resolveOrganizationManagementScopeTarget("", &object.User{
		Owner: "engineering",
		Name:  "user",
	}, false)
	if err != nil {
		t.Fatalf("resolveOrganizationManagementScopeTarget() error = %v", err)
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
	if isAdminScope {
		t.Fatalf("normal user should not receive admin scope")
	}
}

func TestResolveOrganizationManagementScopeTargetRejectsUnauthorizedExplicitOrganization(t *testing.T) {
	_, _, err := resolveOrganizationManagementScopeTarget("finance", &object.User{
		Owner: "engineering",
		Name:  "user",
	}, false)
	if err == nil || !strings.Contains(err.Error(), "organization") {
		t.Fatalf("resolveOrganizationManagementScopeTarget() error = %v, want organization error", err)
	}
}

func TestResolveOrganizationManagementScopeTargetAllowsGlobalAdminSelection(t *testing.T) {
	organization, isAdminScope, err := resolveOrganizationManagementScopeTarget("finance", &object.User{
		Owner:   "built-in",
		Name:    "admin",
		IsAdmin: true,
	}, true)
	if err != nil {
		t.Fatalf("resolveOrganizationManagementScopeTarget() error = %v", err)
	}
	if organization != "finance" {
		t.Fatalf("organization = %q, want finance", organization)
	}
	if !isAdminScope {
		t.Fatalf("global admin should receive admin scope")
	}
}

func TestValidateOrganizationManagementScopeCurrentRequestRejectsUserOverride(t *testing.T) {
	err := validateOrganizationManagementScopeCurrentRequest("built-in/admin")
	if err == nil || !strings.Contains(err.Error(), "current user") {
		t.Fatalf("validateOrganizationManagementScopeCurrentRequest() error = %v, want current user error", err)
	}
}
