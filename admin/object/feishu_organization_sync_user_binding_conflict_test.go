// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestFeishuUserBindingConflictDiagnosticsClassifiesAndRedactsRisks(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 18, 0, 0, 0, time.UTC)
	insertFeishuBindingConfig(t, "engineering", "cli-a", "tenant-a", FeishuEndpointModeDomestic, true)
	insertFeishuBindingUser(t, "primary-user", "ou-shared", map[string]string{
		FeishuUserPropertyUserId:       "ou-shared",
		FeishuUserPropertyOpenId:       "open-shared",
		FeishuUserPropertyUnionId:      "union-shared",
		FeishuUserPropertyTenantKey:    "tenant-a",
		FeishuUserPropertyEndpointMode: FeishuEndpointModeDomestic,
	})
	insertFeishuBindingUser(t, "legacy-open-user", "open-shared", map[string]string{
		FeishuUserPropertyOpenId:       "open-shared",
		FeishuUserPropertyTenantKey:    "tenant-a",
		FeishuUserPropertyEndpointMode: FeishuEndpointModeDomestic,
	})
	insertFeishuBindingUser(t, "other-tenant-user", "ou-other", map[string]string{
		FeishuUserPropertyUserId:       "ou-other",
		FeishuUserPropertyTenantKey:    "tenant-b",
		FeishuUserPropertyEndpointMode: FeishuEndpointModeDomestic,
	})
	insertFeishuBindingUser(t, "missing-tenant-user", "ou-missing", map[string]string{
		FeishuUserPropertyUserId:       "ou-missing",
		FeishuUserPropertyEndpointMode: FeishuEndpointModeDomestic,
	})
	insertFeishuBindingUser(t, "endpoint-mismatch-user", "ou-endpoint", map[string]string{
		FeishuUserPropertyUserId:       "ou-endpoint",
		FeishuUserPropertyTenantKey:    "tenant-a",
		FeishuUserPropertyEndpointMode: FeishuEndpointModeOverseas,
	})
	insertFeishuBindingMapping(t, "map-primary", "cli-a", "tenant-a", "ou-shared", "open-shared", "union-shared", "primary-user")
	insertFeishuBindingMapping(t, "map-secondary", "cli-b", "tenant-a", "ou-shared", "", "", "legacy-open-user")
	insertFeishuBindingMapping(t, "map-multi-a", "cli-a", "tenant-a", "ou-multi-a", "", "", "primary-user")
	insertFeishuBindingMapping(t, "map-multi-b", "cli-a", "tenant-b", "ou-multi-b", "", "", "primary-user")
	insertFeishuBindingMapping(t, "map-missing-tenant", "cli-a", "", "ou-missing-map", "", "", "missing-tenant-user")
	insertFeishuBindingRunAndHistory(t, now)

	diagnostics, err := (&FeishuOrganizationSyncUserBindingConflictService{Now: func() time.Time { return now }}).GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{
		Organization: "engineering",
		Limit:        50,
	})
	if err != nil {
		t.Fatalf("GetDiagnostics() error = %v", err)
	}
	if diagnostics.Status != FeishuUserBindingDiagnosticsStatusBlocked || diagnostics.RiskLevel != FeishuUserBindingRiskCritical {
		t.Fatalf("status/risk = %q/%q, want blocked/critical", diagnostics.Status, diagnostics.RiskLevel)
	}
	if diagnostics.Counts.DuplicateUserIDBinding == 0 || diagnostics.Counts.LocalUserMultiTenant == 0 || diagnostics.Counts.LegacyIdentifierSplit == 0 || diagnostics.Counts.MissingTenantKey == 0 || diagnostics.Counts.EndpointModeMismatch == 0 {
		t.Fatalf("counts = %+v, want every risk type present", diagnostics.Counts)
	}
	if diagnostics.SourceConnectionIdHash == "" || diagnostics.LatestRun == nil || diagnostics.LatestDryRunHistory == nil || !diagnostics.Redaction.Applied {
		t.Fatalf("metadata missing: %+v", diagnostics)
	}
	payload, _ := json.Marshal(diagnostics)
	for _, forbidden := range []string{"ou-shared", "open-shared", "union-shared", "primary-user", "alice@example.test", "13800138000"} {
		if strings.Contains(string(payload), forbidden) {
			t.Fatalf("diagnostics leaked forbidden value %q: %s", forbidden, string(payload))
		}
	}
	for _, issue := range diagnostics.Issues {
		if issue.Id == "" || issue.SourceConnectionIdHash == "" || issue.RecommendedAction == "" || issue.StableHashes["issue"] == "" {
			t.Fatalf("issue missing safe fields: %+v", issue)
		}
	}
}

func TestFeishuUserBindingConflictDiagnosticsDisabledEmptyAndLimit(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 18, 30, 0, 0, time.UTC)
	service := &FeishuOrganizationSyncUserBindingConflictService{Now: func() time.Time { return now }}
	disabled, err := service.GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{Organization: "engineering"})
	if err != nil {
		t.Fatalf("GetDiagnostics(unconfigured) error = %v", err)
	}
	if disabled.Status != FeishuUserBindingDiagnosticsStatusDisabled || disabled.Enabled {
		t.Fatalf("unconfigured diagnostics = %+v, want disabled", disabled)
	}

	insertFeishuBindingConfig(t, "engineering", "cli-a", "tenant-a", FeishuEndpointModeDomestic, true)
	empty, err := service.GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{Organization: "engineering"})
	if err != nil {
		t.Fatalf("GetDiagnostics(empty) error = %v", err)
	}
	if empty.Status != FeishuUserBindingDiagnosticsStatusEmpty || empty.RiskLevel != FeishuUserBindingRiskNone || len(empty.Issues) != 0 {
		t.Fatalf("empty diagnostics = %+v, want empty none", empty)
	}

	insertFeishuBindingUser(t, "u1", "ou-1", map[string]string{FeishuUserPropertyUserId: "ou-1", FeishuUserPropertyTenantKey: "tenant-a"})
	insertFeishuBindingUser(t, "u2", "ou-1", map[string]string{FeishuUserPropertyUserId: "ou-1", FeishuUserPropertyTenantKey: "tenant-a"})
	limited, err := service.GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{Organization: "engineering", Limit: 1})
	if err != nil {
		t.Fatalf("GetDiagnostics(limited) error = %v", err)
	}
	if limited.Counts.Total == 0 || len(limited.Issues) != 1 {
		t.Fatalf("limited diagnostics counts/issues = %+v/%d, want total with one issue returned", limited.Counts, len(limited.Issues))
	}
	unlimited, err := service.GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{Organization: "engineering", Limit: -1})
	if err != nil {
		t.Fatalf("GetDiagnostics(unlimited) error = %v", err)
	}
	if unlimited.Counts.Total == 0 || len(unlimited.Issues) != unlimited.Counts.Total {
		t.Fatalf("unlimited diagnostics counts/issues = %+v/%d, want all issues returned", unlimited.Counts, len(unlimited.Issues))
	}
	if normalizeFeishuUserBindingConflictLimit(200) != maxFeishuUserBindingConflictIssueLimit || normalizeFeishuUserBindingConflictLimit(-1) != -1 {
		t.Fatalf("limit normalization failed")
	}
}

func TestFeishuUserBindingConflictDiagnosticsValidatesRequiredInputs(t *testing.T) {
	if _, err := (&FeishuOrganizationSyncUserBindingConflictService{}).GetDiagnostics(FeishuUserBindingConflictDiagnosticsFilter{}); err == nil {
		t.Fatalf("GetDiagnostics(empty organization) expected error")
	}
	if feishuUserBindingDiagnosticsStatus(FeishuUserBindingRiskMedium, 1, 1, 1) != FeishuUserBindingDiagnosticsStatusWarning {
		t.Fatalf("medium risk should be warning")
	}
	if highestFeishuUserBindingRisk(nil) != FeishuUserBindingRiskNone {
		t.Fatalf("empty risk should be none")
	}
}

func TestFeishuUserBindingConflictHelperEdges(t *testing.T) {
	if (&FeishuOrganizationSyncUserBindingConflictService{}).now().IsZero() {
		t.Fatalf("default now should not be zero")
	}
	identities := buildFeishuBindingUserIdentities([]*User{
		nil,
		{Owner: "engineering", Name: "empty"},
		{Owner: "engineering", Name: "with-lark", Lark: "ou-1"},
	})
	if len(identities) != 1 || identities[0].Lark != "ou-1" {
		t.Fatalf("identities = %+v, want only lark user", identities)
	}
	if feishuUserBindingRiskRank(FeishuUserBindingRiskLow) <= feishuUserBindingRiskRank("unknown") {
		t.Fatalf("low risk should rank above unknown")
	}
	if feishuUserBindingSafeSummary(FeishuUserBindingDiagnosticsStatusOK, FeishuUserBindingRiskNone, FeishuUserBindingConflictCounts{}) == "" ||
		feishuUserBindingSafeSummary(FeishuUserBindingDiagnosticsStatusWarning, FeishuUserBindingRiskMedium, FeishuUserBindingConflictCounts{Total: 1}) == "" ||
		feishuUserBindingSafeSummary("unexpected", FeishuUserBindingRiskNone, FeishuUserBindingConflictCounts{}) == "" {
		t.Fatalf("safe summary should cover ok, warning and default status")
	}
	if feishuUserBindingExternalKey("", "") != "" || feishuLocalUserKey("", "alice") != "" {
		t.Fatalf("empty external/local keys should stay empty")
	}
}

func insertFeishuBindingConfig(t *testing.T, organization string, appId string, tenantKey string, endpointMode string, enabled bool) {
	t.Helper()
	_, err := ormer.Engine.Insert(&FeishuOrganizationSyncConfig{
		Owner:        organization,
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: organization,
		AppId:        appId,
		AppSecret:    "secret",
		EndpointMode: endpointMode,
		TenantKey:    tenantKey,
		IsEnabled:    enabled,
	})
	if err != nil {
		t.Fatalf("insert config error = %v", err)
	}
}

func insertFeishuBindingUser(t *testing.T, name string, lark string, properties map[string]string) {
	t.Helper()
	user := &User{
		Owner:       "engineering",
		Name:        name,
		Type:        "normal-user",
		DisplayName: "Sensitive Name",
		Email:       "alice@example.test",
		Phone:       "13800138000",
		Lark:        lark,
		Properties:  properties,
	}
	if err := saveFeishuUser(user); err != nil {
		t.Fatalf("save test user %s error = %v", name, err)
	}
}

func insertFeishuBindingMapping(t *testing.T, name string, appId string, tenantKey string, userId string, openId string, unionId string, userName string) {
	t.Helper()
	if err := saveFeishuUserMapping(&FeishuUserMapping{
		Owner:        "engineering",
		Name:         name,
		Organization: "engineering",
		AppId:        appId,
		TenantKey:    tenantKey,
		FeishuUserId: userId,
		OpenId:       openId,
		UnionId:      unionId,
		UserOwner:    "engineering",
		UserName:     userName,
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("save mapping %s error = %v", name, err)
	}
}

func insertFeishuBindingRunAndHistory(t *testing.T, now time.Time) {
	t.Helper()
	if _, err := ormer.Engine.Insert(&FeishuOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-binding",
		CreatedAt:    now.Add(-time.Hour),
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		Status:       FeishuOrganizationSyncRunStatusSucceeded,
	}); err != nil {
		t.Fatalf("insert run error = %v", err)
	}
	if err := (defaultFeishuOrganizationSyncDryRunHistoryStore{}).CreateFeishuOrganizationSyncDryRunHistory(&FeishuOrganizationSyncDryRunHistory{
		Owner:              "engineering",
		Name:               "history-binding",
		CreatedAt:          now,
		Organization:       "engineering",
		Status:             FeishuOrganizationSyncDryRunPreviewStatusSucceeded,
		RetentionDays:      90,
		RetentionExpiresAt: now.AddDate(0, 0, 90),
		RedactionApplied:   true,
		RedactionVersion:   FeishuOrganizationSyncDryRunHistoryRedactionV1,
	}); err != nil {
		t.Fatalf("insert history error = %v", err)
	}
}
