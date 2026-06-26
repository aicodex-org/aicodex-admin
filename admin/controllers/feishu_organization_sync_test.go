// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestNewFeishuOrganizationSyncRunStartResponseAttachesDiagnostics(t *testing.T) {
	response := newFeishuOrganizationSyncRunStartResponse(&object.FeishuOrganizationSyncStartRunResult{
		Run: &object.FeishuOrganizationSyncRun{
			Name:      "run-failed",
			Status:    object.FeishuOrganizationSyncRunStatusFailed,
			Stage:     object.FeishuOrganizationSyncRunStageFetching,
			ErrorCode: "tenant_token_failed",
			ErrorText: "invalid app secret fixture-secret user_id=ou_1",
		},
	}, "fixture-secret")

	if response.RunId != "run-failed" || response.Run == nil || response.Run.Diagnostics == nil {
		t.Fatalf("response = %+v, want run diagnostics", response)
	}
	if response.Run.Diagnostics.FailedStage != object.FeishuOrganizationSyncDiagnosticStageTenantToken {
		t.Fatalf("failed stage = %q, want tenant_token", response.Run.Diagnostics.FailedStage)
	}
	if strings.Contains(response.Run.Diagnostics.SafeSummary, "fixture-secret") || strings.Contains(response.Run.Diagnostics.SafeSummary, "ou_1") {
		t.Fatalf("diagnostics leaked sensitive values: %q", response.Run.Diagnostics.SafeSummary)
	}
}

func TestNewFeishuOrganizationSyncConfigResponseAttachesSourceStatus(t *testing.T) {
	sourceStatus := &object.OrganizationSyncSourceConflictStatus{
		DefaultOrganization:       "feishu-org",
		DefaultOrganizationSource: "configured",
		ConflictingProvider:       "WeCom",
		ConflictingOrganization:   "engineering",
		ConflictingConfigured:     true,
		ConflictingEnabled:        false,
		ConflictingOrganizations:  []string{"engineering"},
	}

	emptyResponse := newFeishuOrganizationSyncConfigResponse("engineering", nil, sourceStatus)
	if emptyResponse.IsConfigured || emptyResponse.Config == nil || emptyResponse.Config.Organization != "engineering" {
		t.Fatalf("empty config response = %#v, want default config for engineering", emptyResponse)
	}
	if emptyResponse.DefaultOrganization != "feishu-org" || emptyResponse.ConflictingProvider != "WeCom" || !emptyResponse.ConflictingConfigured {
		t.Fatalf("source status = %#v, want default organization and WeCom conflict", emptyResponse)
	}
	if len(emptyResponse.ConflictingOrganizations) != 1 || emptyResponse.ConflictingOrganizations[0] != "engineering" {
		t.Fatalf("conflicting organizations = %#v, want engineering", emptyResponse.ConflictingOrganizations)
	}

	configuredResponse := newFeishuOrganizationSyncConfigResponse("engineering", &object.FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_a",
		EndpointMode: object.FeishuEndpointModeDomestic,
	}, sourceStatus)
	if !configuredResponse.IsConfigured || configuredResponse.Config == nil || configuredResponse.Config.AppId != "cli_a" {
		t.Fatalf("configured response = %#v, want persisted Feishu config", configuredResponse)
	}
}

func TestResolveFeishuOrganizationSyncConfigTargetUsesDefaultForGlobalAdmin(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetFeishuOrganizationSyncConfig")
	service := &object.FeishuOrganizationSyncConfigService{
		Store: &controllerFeishuSyncConfigStore{configs: []*object.FeishuOrganizationSyncConfig{
			{Organization: "feishu-org", AppId: "cli_a"},
		}},
		WecomConfigStore: &controllerWecomSyncConfigStore{configs: []*object.WecomOrganizationSyncConfig{
			{Organization: "feishu-org", CorpId: "ww123", IsEnabled: true},
		}},
	}

	organization, sourceStatus, ok := controller.resolveFeishuOrganizationSyncConfigTarget("", service)
	if !ok || organization != "feishu-org" {
		t.Fatalf("resolveFeishuOrganizationSyncConfigTarget() = organization:%q ok:%v, want feishu-org true", organization, ok)
	}
	if sourceStatus == nil || sourceStatus.DefaultOrganization != "feishu-org" || sourceStatus.ConflictingProvider != "WeCom" {
		t.Fatalf("sourceStatus = %#v, want default feishu-org and WeCom conflict", sourceStatus)
	}
}

func TestResolveFeishuOrganizationSyncConfigTargetUsesExplicitOrganization(t *testing.T) {
	controller := newOrganizationSyncConfigTargetTestController("GetFeishuOrganizationSyncConfig")
	service := &object.FeishuOrganizationSyncConfigService{
		Store: &controllerFeishuSyncConfigStore{configs: []*object.FeishuOrganizationSyncConfig{
			{Organization: "feishu-org", AppId: "cli_a"},
		}},
		WecomConfigStore: &controllerWecomSyncConfigStore{configs: []*object.WecomOrganizationSyncConfig{
			{Organization: "finance", CorpId: "ww456", IsEnabled: false},
		}},
	}

	organization, sourceStatus, ok := controller.resolveFeishuOrganizationSyncConfigTarget("finance", service)
	if !ok || organization != "finance" {
		t.Fatalf("resolveFeishuOrganizationSyncConfigTarget() = organization:%q ok:%v, want finance true", organization, ok)
	}
	if sourceStatus == nil || sourceStatus.ConflictingOrganization != "finance" || sourceStatus.ConflictingEnabled {
		t.Fatalf("sourceStatus = %#v, want disabled WeCom conflict for finance", sourceStatus)
	}
}

func TestFeishuOrganizationSyncTargetAuthorizationRules(t *testing.T) {
	tests := []struct {
		name         string
		organization string
		user         *object.User
		globalAdmin  bool
		wantOrg      string
		wantAdmin    bool
		wantErr      bool
	}{
		{name: "global admin can target explicit org", organization: "org-b", user: &object.User{Owner: "org-a", Name: "root", IsAdmin: true}, globalAdmin: true, wantOrg: "org-b", wantAdmin: true},
		{name: "organization admin defaults to owner", user: &object.User{Owner: "org-a", Name: "admin", IsAdmin: true}, wantOrg: "org-a", wantAdmin: true},
		{name: "organization admin cannot manage another org", organization: "org-b", user: &object.User{Owner: "org-a", Name: "admin", IsAdmin: true}, wantOrg: "org-b", wantAdmin: false},
		{name: "member is not sync admin", organization: "org-a", user: &object.User{Owner: "org-a", Name: "member"}, wantOrg: "org-a", wantAdmin: false},
		{name: "missing organization fails", user: &object.User{Owner: "", Name: "admin", IsAdmin: true}, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotOrg, err := resolveFeishuOrganizationSyncTarget(tt.organization, tt.user, tt.globalAdmin)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got organization=%q", gotOrg)
				}
				return
			}
			if err != nil || gotOrg != tt.wantOrg {
				t.Fatalf("target organization = %q err=%v, want %q", gotOrg, err, tt.wantOrg)
			}
			if gotAdmin := isFeishuOrganizationSyncAdmin(tt.user, tt.globalAdmin, gotOrg); gotAdmin != tt.wantAdmin {
				t.Fatalf("admin = %v, want %v", gotAdmin, tt.wantAdmin)
			}
		})
	}
}
