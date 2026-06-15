// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestGetFeishuOrganizationSyncUserBindingConflictFilterParsesQuery(t *testing.T) {
	controller := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/user-binding-conflicts?limit=7&includeOk=true")

	filter := controller.getFeishuOrganizationSyncUserBindingConflictFilter("engineering")
	if filter.Organization != "engineering" || filter.Limit != 7 || !filter.IncludeOk {
		t.Fatalf("filter = %+v, want organization/limit/includeOk", filter)
	}
}

func TestGetFeishuOrganizationSyncUserBindingConflictsReturnsSafeDiagnostics(t *testing.T) {
	oldGetter := getFeishuOrganizationSyncUserBindingConflictDiagnostics
	defer func() {
		getFeishuOrganizationSyncUserBindingConflictDiagnostics = oldGetter
	}()

	var gotFilter object.FeishuUserBindingConflictDiagnosticsFilter
	getFeishuOrganizationSyncUserBindingConflictDiagnostics = func(filter object.FeishuUserBindingConflictDiagnosticsFilter) (*object.FeishuUserBindingConflictDiagnostics, error) {
		gotFilter = filter
		return &object.FeishuUserBindingConflictDiagnostics{
			Organization: "engineering",
			Status:       object.FeishuUserBindingDiagnosticsStatusBlocked,
			RiskLevel:    object.FeishuUserBindingRiskCritical,
			Counts: object.FeishuUserBindingConflictCounts{
				Total:                  1,
				DuplicateUserIDBinding: 1,
			},
			Issues: []*object.FeishuUserBindingConflictIssue{{
				Id:                "binding-safe",
				Type:              object.FeishuUserBindingConflictDuplicateUserIDBinding,
				RiskLevel:         object.FeishuUserBindingRiskCritical,
				SafeSummary:       "user_id=*** open_id=***",
				RecommendedAction: object.FeishuUserBindingActionConfirmPrimaryUser,
				StableHashes:      map[string]string{"issue": "issue-safe"},
				SampleAliases:     []string{"sample-safe"},
			}},
			Redaction: object.FeishuUserBindingConflictRedaction{
				Applied: true,
				Version: object.FeishuUserBindingConflictRedactionV1,
			},
			GeneratedAt: "2026-06-15T12:00:00Z",
			SafeSummary: "binding-safe-summary",
		}, nil
	}

	controller := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/user-binding-conflicts?organization=engineering&limit=9&includeOk=1")
	controller.Ctx.Input.SetData("currentUserId", "app/app-feishu-binding-test")

	controller.GetFeishuOrganizationSyncUserBindingConflicts()

	if gotFilter.Organization != "engineering" || gotFilter.Limit != 9 || !gotFilter.IncludeOk {
		t.Fatalf("filter = %+v, want query fields", gotFilter)
	}
	body := controller.Ctx.ResponseWriter.ResponseWriter.(*httptest.ResponseRecorder).Body.String()
	if !strings.Contains(body, "binding-safe-summary") || !strings.Contains(body, "sample-safe") {
		t.Fatalf("response missing safe diagnostics: %s", body)
	}
	for _, forbidden := range []string{"open-shared", "union-shared", "ou-shared", "alice@example.test", "13800138000"} {
		if strings.Contains(body, forbidden) {
			t.Fatalf("response leaked forbidden value %q: %s", forbidden, body)
		}
	}
}

func TestGetFeishuOrganizationSyncUserBindingConflictsHandlesErrors(t *testing.T) {
	oldGetter := getFeishuOrganizationSyncUserBindingConflictDiagnostics
	defer func() {
		getFeishuOrganizationSyncUserBindingConflictDiagnostics = oldGetter
	}()
	called := false
	getFeishuOrganizationSyncUserBindingConflictDiagnostics = func(filter object.FeishuUserBindingConflictDiagnosticsFilter) (*object.FeishuUserBindingConflictDiagnostics, error) {
		called = true
		return nil, errors.New("safe diagnostic error")
	}

	missingOrganization := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/user-binding-conflicts")
	missingOrganization.Ctx.Input.SetData("currentUserId", "app/app-feishu-binding-test")
	missingOrganization.GetFeishuOrganizationSyncUserBindingConflicts()
	if called {
		t.Fatalf("service should not be called when organization is missing")
	}

	failing := newFeishuOrganizationSyncDryRunHistoryTestController("/api/feishu-org-sync/user-binding-conflicts?organization=engineering")
	failing.Ctx.Input.SetData("currentUserId", "app/app-feishu-binding-test")
	failing.GetFeishuOrganizationSyncUserBindingConflicts()
	if !called {
		t.Fatalf("service should be called for authorized request")
	}
	body := failing.Ctx.ResponseWriter.ResponseWriter.(*httptest.ResponseRecorder).Body.String()
	if !strings.Contains(body, "safe diagnostic error") {
		t.Fatalf("response should contain safe error: %s", body)
	}
}

func TestParseFeishuOrganizationSyncBoolQuery(t *testing.T) {
	for _, value := range []string{"1", "true", "TRUE", "yes", "on"} {
		if !parseFeishuOrganizationSyncBoolQuery(value) {
			t.Fatalf("parseFeishuOrganizationSyncBoolQuery(%q) = false, want true", value)
		}
	}
	for _, value := range []string{"", "0", "false", "no"} {
		if parseFeishuOrganizationSyncBoolQuery(value) {
			t.Fatalf("parseFeishuOrganizationSyncBoolQuery(%q) = true, want false", value)
		}
	}
}
