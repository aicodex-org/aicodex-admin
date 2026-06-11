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
	"errors"
	"strings"
	"testing"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

func TestOrganizationTreeOperationsDiagnosticsSummarizesTrustedTree(t *testing.T) {
	generatedAt := time.Date(2026, 6, 11, 8, 0, 0, 0, time.UTC)
	sourceConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww123")
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "owner", IsAdmin: true},
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments: []object.OrganizationManagementScopeDepartment{
				{DepartmentId: "org-a/dev"},
				{DepartmentId: "org-a/platform"},
			},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-1"},
			{OrganizationId: "org-a", DepartmentId: "org-a/platform", ParentDepartmentId: "org-a/dev", DisplayName: "Platform", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-1"},
			{OrganizationId: "org-a", DepartmentId: "org-a/disabled", DisplayName: "Disabled", LifecycleStatus: object.PlatformLifecycleStatusDisabled, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-1"},
		},
		SourceConnections: []object.SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessFresh, LastSeenBatchId: "batch-1", ConfigRef: "wecom-organization-sync"},
		},
		SyncBatches: []object.OrgSyncBatch{
			{OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, BatchId: "batch-1", Status: object.OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-1", Freshness: object.PlatformFreshnessFresh, FinishedAt: generatedAt.Add(-time.Minute)},
		},
	}

	got := buildOrganizationTreeOperationsDiagnosticsFromInput(input, organizationTreeOperationsDiagnosticRequest{Organization: "org-a"})

	if got.Status != "ok" || got.Summary.VisibleNodeCount != 2 || got.Summary.FilteredNodeCount != 1 {
		t.Fatalf("summary = %+v status=%s, want trusted two-node tree with one filtered diagnostic", got.Summary, got.Status)
	}
	if got.Summary.OrgVersion != "orgv-1" || got.Summary.Freshness != object.PlatformFreshnessFresh || got.Summary.ReadModelSource != "platform_department" {
		t.Fatalf("version/freshness/source summary = %+v", got.Summary)
	}
	if len(got.SourceConnections) != 1 || !got.SourceConnections[0].Configured || got.SourceConnections[0].Status != object.SourceConnectionStatusActive {
		t.Fatalf("source summaries = %+v, want configured active source", got.SourceConnections)
	}
	if got.LatestSyncBatch == nil || got.LatestSyncBatch.BatchId != "batch-1" || got.Lineage.BatchId != "batch-1" {
		t.Fatalf("batch/lineage = batch:%+v lineage:%+v", got.LatestSyncBatch, got.Lineage)
	}
	if !containsOrganizationTreeDiagnosticReason(got.Diagnostics, "lifecycle_disabled") {
		t.Fatalf("diagnostics = %+v, want disabled lifecycle reason", got.Diagnostics)
	}
}

func TestOrganizationTreeOperationsDiagnosticsFailClosedForUntrustedEmptyTree(t *testing.T) {
	generatedAt := time.Date(2026, 6, 11, 8, 0, 0, 0, time.UTC)
	sourceConnectionId := object.GetSourceConnectionId("org-a", object.SourceTypeWecom, "ww-disabled")
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "owner", IsAdmin: true},
		Organization: "org-a",
		GeneratedAt:  generatedAt,
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments:  []object.OrganizationManagementScopeDepartment{{DepartmentId: "org-a/dev"}},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-1"},
		},
		SourceConnections: []object.SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusDisabled, Freshness: object.PlatformFreshnessStale},
		},
	}

	got := buildOrganizationTreeOperationsDiagnosticsFromInput(input, organizationTreeOperationsDiagnosticRequest{Organization: "org-a"})

	if got.Status != "fail_closed" || got.EmptyTreeClass != organizationTreeEmptyClassUntrusted || got.Reason != "read_model_fail_closed" {
		t.Fatalf("empty classification = status:%s class:%s reason:%s", got.Status, got.EmptyTreeClass, got.Reason)
	}
	if !containsOrganizationTreeDiagnosticReason(got.Diagnostics, "source_connection_disabled") || !containsOrganizationTreeDiagnosticReason(got.Diagnostics, InsightProviderErrorUnavailable) {
		t.Fatalf("diagnostics = %+v, want source disabled and provider unavailable reasons", got.Diagnostics)
	}
}

func TestOrganizationTreeOperationsDiagnosticsClassifiesBusinessEmptyAndDataGap(t *testing.T) {
	businessEmpty := buildOrganizationTreeOperationsDiagnosticsFromInput(insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "member"},
		Organization: "org-a",
		Scope:        &object.OrganizationManagementScope{Organization: "org-a", ScopeType: object.OrganizationManagementScopeTypeSelf},
	}, organizationTreeOperationsDiagnosticRequest{Organization: "org-a"})
	if businessEmpty.EmptyTreeClass != organizationTreeEmptyClassBusinessEmpty || businessEmpty.Reason != "scope_has_no_manageable_departments" {
		t.Fatalf("business empty classification = %s/%s", businessEmpty.EmptyTreeClass, businessEmpty.Reason)
	}

	dataGap := buildOrganizationTreeOperationsDiagnosticsFromInput(insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "owner", IsAdmin: true},
		Organization: "org-a",
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments:  []object.OrganizationManagementScopeDepartment{{DepartmentId: "org-a/dev"}},
		},
	}, organizationTreeOperationsDiagnosticRequest{Organization: "org-a"})
	if dataGap.EmptyTreeClass != organizationTreeEmptyClassTestDataGap || dataGap.Reason != "platform_departments_missing" {
		t.Fatalf("data gap classification = %s/%s", dataGap.EmptyTreeClass, dataGap.Reason)
	}
}

func TestOrganizationTreeOperationsSearchFilterUsesStableFields(t *testing.T) {
	nodes := []OrganizationTreeOperationsNode{
		{DepartmentId: "org-a/dev", DepartmentName: "Development", DepartmentPath: "Root/Development", SourceConnectionId: "src-a", SourceConnectionStatus: object.SourceConnectionStatusActive, SourceConnectionFreshness: object.PlatformFreshnessFresh, LifecycleStatus: object.PlatformLifecycleStatusActive, ReadModelSource: "platform_department"},
		{DepartmentId: "org-a/sales", DepartmentName: "Sales", DepartmentPath: "Root/Sales", SourceConnectionId: "src-b", SourceConnectionStatus: object.SourceConnectionStatusDisabled, SourceConnectionFreshness: object.PlatformFreshnessStale, LifecycleStatus: object.PlatformLifecycleStatusActive, ReadModelSource: "platform_department"},
	}
	diagnostics := []OrganizationTreeOperationsDiagnosticItem{
		{SubjectType: object.PlatformSubjectTypeDepartment, SubjectId: "org-a/disabled", DisplayName: "Disabled", Reason: "lifecycle_disabled", LifecycleStatus: object.PlatformLifecycleStatusDisabled, ReadModelSource: "platform_department"},
	}

	filteredNodes, filteredDiagnostics := filterOrganizationTreeOperationsResults(nodes, diagnostics, organizationTreeOperationsDiagnosticRequest{
		Query:                  "src-a",
		LifecycleStatus:        object.PlatformLifecycleStatusActive,
		SourceConnectionStatus: object.SourceConnectionStatusActive,
		Freshness:              object.PlatformFreshnessFresh,
		ReadModelSource:        "platform_department",
	})
	if len(filteredNodes) != 1 || filteredNodes[0].DepartmentId != "org-a/dev" || len(filteredDiagnostics) != 0 {
		t.Fatalf("filtered result = nodes:%+v diagnostics:%+v", filteredNodes, filteredDiagnostics)
	}

	_, disabledDiagnostics := filterOrganizationTreeOperationsResults(nodes, diagnostics, organizationTreeOperationsDiagnosticRequest{Query: "disabled", LifecycleStatus: object.PlatformLifecycleStatusDisabled})
	if len(disabledDiagnostics) != 1 || strings.Contains(disabledDiagnostics[0].SubjectId, "@") {
		t.Fatalf("diagnostic filter = %+v, want stable disabled item without personal join key", disabledDiagnostics)
	}

	rejectedNodes, rejectedDiagnostics := filterOrganizationTreeOperationsResults(nodes, diagnostics, organizationTreeOperationsDiagnosticRequest{
		Query:                  "not-found",
		LifecycleStatus:        object.PlatformLifecycleStatusDeleted,
		SourceConnectionStatus: object.SourceConnectionStatusError,
		Freshness:              object.PlatformFreshnessUnavailable,
		ReadModelSource:        "other_source",
	})
	if len(rejectedNodes) != 0 || len(rejectedDiagnostics) != 0 {
		t.Fatalf("rejected result = nodes:%+v diagnostics:%+v, want all filters to fail closed", rejectedNodes, rejectedDiagnostics)
	}

	if matchesOrganizationTreeOperationsNode(nodes[0], organizationTreeOperationsDiagnosticRequest{SourceConnectionStatus: object.SourceConnectionStatusDisabled}) {
		t.Fatalf("node source connection status mismatch should be filtered")
	}
	if matchesOrganizationTreeOperationsNode(nodes[0], organizationTreeOperationsDiagnosticRequest{Freshness: object.PlatformFreshnessStale}) {
		t.Fatalf("node freshness mismatch should be filtered")
	}
	if matchesOrganizationTreeOperationsNode(nodes[0], organizationTreeOperationsDiagnosticRequest{ReadModelSource: "compat_group"}) {
		t.Fatalf("node read model source mismatch should be filtered")
	}
	if matchesOrganizationTreeOperationsDiagnosticItem(diagnostics[0], organizationTreeOperationsDiagnosticRequest{SourceConnectionStatus: object.SourceConnectionStatusActive}) {
		t.Fatalf("diagnostic source connection status mismatch should be filtered")
	}
	if matchesOrganizationTreeOperationsDiagnosticItem(diagnostics[0], organizationTreeOperationsDiagnosticRequest{Freshness: object.PlatformFreshnessStale}) {
		t.Fatalf("diagnostic freshness mismatch should be filtered")
	}
	if matchesOrganizationTreeOperationsDiagnosticItem(diagnostics[0], organizationTreeOperationsDiagnosticRequest{ReadModelSource: "compat_group"}) {
		t.Fatalf("diagnostic read model source mismatch should be filtered")
	}
}

func TestOrganizationTreeOperationsDirectLeaderDoesNotExpandSubtree(t *testing.T) {
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "lead"},
		Organization: "org-a",
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeDirectLeader,
			Users:        []object.OrganizationManagementScopeUser{{UserId: "org-a/member", MainDepartmentId: "org-a/dev"}},
		},
		PlatformDepartments: []object.PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "org-a/root", DisplayName: "Root", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/dev", ParentDepartmentId: "org-a/root", DisplayName: "Dev", LifecycleStatus: object.PlatformLifecycleStatusActive},
			{OrganizationId: "org-a", DepartmentId: "org-a/platform", ParentDepartmentId: "org-a/dev", DisplayName: "Platform", LifecycleStatus: object.PlatformLifecycleStatusActive},
		},
	}

	got := buildOrganizationTreeOperationsDiagnosticsFromInput(input, organizationTreeOperationsDiagnosticRequest{Organization: "org-a"})

	if len(got.Nodes) != 1 || got.Nodes[0].DepartmentId != "org-a/dev" || got.Nodes[0].HasChildren || got.Nodes[0].VisibilitySource != "direct_leader" {
		t.Fatalf("direct leader nodes = %+v, want only direct subordinate department without subtree expansion", got.Nodes)
	}
}

func TestOrganizationTreeOperationsDepartmentReasonCoversSourceConnectionStates(t *testing.T) {
	connections := map[string]object.SourceConnection{
		"src-stale":   {SourceConnectionId: "src-stale", Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessStale},
		"src-error":   {SourceConnectionId: "src-error", Status: object.SourceConnectionStatusError, Freshness: object.PlatformFreshnessUnavailable},
		"src-current": {SourceConnectionId: "src-current", Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessFresh},
	}
	cases := []struct {
		name       string
		department object.PlatformDepartment
		reason     string
		freshness  string
	}{
		{name: "deleted lifecycle", department: object.PlatformDepartment{LifecycleStatus: object.PlatformLifecycleStatusDeleted}, reason: "lifecycle_deleted"},
		{name: "missing source", department: object.PlatformDepartment{LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: "src-missing"}, reason: "source_connection_missing", freshness: object.PlatformFreshnessUnknown},
		{name: "source error", department: object.PlatformDepartment{LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: "src-error"}, reason: "source_connection_error", freshness: object.PlatformFreshnessUnavailable},
		{name: "source stale", department: object.PlatformDepartment{LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: "src-stale"}, reason: "source_connection_freshness_stale", freshness: object.PlatformFreshnessStale},
		{name: "usable source", department: object.PlatformDepartment{LifecycleStatus: object.PlatformLifecycleStatusActive, SourceConnectionId: "src-current"}, reason: "", freshness: object.PlatformFreshnessFresh},
		{name: "compat source", department: object.PlatformDepartment{LifecycleStatus: object.PlatformLifecycleStatusActive}, reason: "", freshness: ""},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			reason, freshness := organizationTreeOperationsDepartmentReason(tt.department, connections)
			if reason != tt.reason || freshness != tt.freshness {
				t.Fatalf("reason/freshness = %q/%q, want %q/%q", reason, freshness, tt.reason, tt.freshness)
			}
		})
	}
}

func TestOrganizationTreeOperationsEmptyTreeClassifiesVisibleDepartmentMissing(t *testing.T) {
	input := insightOrganizationTreeReadModelInput{
		CurrentUser:  &object.User{Owner: "org-a", Name: "owner", IsAdmin: true},
		Organization: "org-a",
		Scope: &object.OrganizationManagementScope{
			Organization: "org-a",
			ScopeType:    object.OrganizationManagementScopeTypeAdmin,
			Departments:  []object.OrganizationManagementScopeDepartment{{DepartmentId: "org-a/dev"}},
		},
		PlatformDepartments: []object.PlatformDepartment{{OrganizationId: "org-a", DepartmentId: "org-a/dev", LifecycleStatus: object.PlatformLifecycleStatusActive}},
	}

	emptyClass, reason := classifyOrganizationTreeOperationsEmptyTree(input, InsightOrganizationTreeResponse{Organization: "org-a"}, nil)

	if emptyClass != organizationTreeEmptyClassTestDataGap || reason != "visible_departments_missing_from_read_model" {
		t.Fatalf("empty classification = %s/%s", emptyClass, reason)
	}
}

func TestOrganizationTreeOperationsSourceSummaryAndAnyBatchUseStableOrdering(t *testing.T) {
	summaries := buildOrganizationTreeOperationsSourceSummaries([]object.SourceConnection{
		{SourceConnectionId: "src-b", SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusDisabled, Freshness: object.PlatformFreshnessStale},
		{SourceConnectionId: "src-a", SourceType: object.SourceTypeWecom, Status: object.SourceConnectionStatusActive, Freshness: object.PlatformFreshnessFresh, LastSeenBatchId: "batch-a", ConfigRef: "wecom-organization-sync"},
	})
	if len(summaries) != 2 || summaries[0].SourceConnectionId != "src-a" || !summaries[0].Configured || summaries[1].Configured {
		t.Fatalf("source summaries = %+v, want sorted configured metadata", summaries)
	}

	first := time.Date(2026, 6, 11, 8, 0, 0, 0, time.UTC)
	second := first.Add(time.Minute)
	batch := latestInsightOrganizationTreeAnySyncBatch([]object.OrgSyncBatch{
		{BatchId: "batch-old", StartedAt: first, FinishedAt: first},
		{BatchId: "batch-new", StartedAt: second},
	})
	if batch == nil || batch.BatchId != "batch-new" {
		t.Fatalf("latest batch = %+v, want started-at fallback to select newest batch", batch)
	}
	if got := newOrganizationTreeOperationsSyncBatch(nil); got != nil {
		t.Fatalf("nil sync batch = %+v, want nil", got)
	}
}

func TestOrganizationTreeOperationsRefreshReadModelUsesControlledSyncPath(t *testing.T) {
	originalGetConfig := getOrganizationTreeOperationsWecomConfig
	originalStartRun := startOrganizationTreeOperationsWecomRun
	defer func() {
		getOrganizationTreeOperationsWecomConfig = originalGetConfig
		startOrganizationTreeOperationsWecomRun = originalStartRun
	}()

	user := &object.User{Owner: "org-a", Name: "admin", IsAdmin: true}
	controller := &ApiController{}
	getOrganizationTreeOperationsWecomConfig = func(organization string) (*object.WecomOrganizationSyncConfig, error) {
		if organization != "org-a" {
			t.Fatalf("organization = %q, want org-a", organization)
		}
		return &object.WecomOrganizationSyncConfig{Organization: organization, IsEnabled: true}, nil
	}
	startOrganizationTreeOperationsWecomRun = func(config *object.WecomOrganizationSyncConfig, actor string) (*object.WecomOrganizationSyncStartRunResult, error) {
		if actor != "org-a/admin" {
			t.Fatalf("actor = %q, want stable user id", actor)
		}
		return &object.WecomOrganizationSyncStartRunResult{Run: &object.WecomOrganizationSyncRun{Name: "run-1"}}, nil
	}

	accepted := controller.triggerOrganizationTreeOperationsSourceRefresh("trace-1", user, "org-a")

	if accepted.Status != "accepted" || accepted.RunId != "run-1" || accepted.TriggerType != organizationTreeOperationRefreshReadModel {
		t.Fatalf("accepted response = %+v", accepted)
	}

	startOrganizationTreeOperationsWecomRun = func(config *object.WecomOrganizationSyncConfig, actor string) (*object.WecomOrganizationSyncStartRunResult, error) {
		return nil, object.ErrWecomOrganizationSyncRunAlreadyRunning
	}
	running := controller.triggerOrganizationTreeOperationsSourceRefresh("trace-2", user, "org-a")
	if running.Status != "running" || running.Reason != "source sync run is already running" {
		t.Fatalf("running response = %+v", running)
	}
}

func TestOrganizationTreeOperationsRefreshReadModelReturnsUnavailableAndConfigErrors(t *testing.T) {
	originalGetConfig := getOrganizationTreeOperationsWecomConfig
	originalStartRun := startOrganizationTreeOperationsWecomRun
	defer func() {
		getOrganizationTreeOperationsWecomConfig = originalGetConfig
		startOrganizationTreeOperationsWecomRun = originalStartRun
	}()

	user := &object.User{Owner: "org-a", Name: "admin", IsAdmin: true}
	controller := &ApiController{}
	getOrganizationTreeOperationsWecomConfig = func(organization string) (*object.WecomOrganizationSyncConfig, error) {
		return nil, nil
	}
	startOrganizationTreeOperationsWecomRun = func(config *object.WecomOrganizationSyncConfig, actor string) (*object.WecomOrganizationSyncStartRunResult, error) {
		t.Fatalf("start run should not be called when source config is unavailable")
		return nil, nil
	}

	unavailable := controller.triggerOrganizationTreeOperationsSourceRefresh("trace-1", user, "org-a")
	if unavailable.Status != "unavailable" || unavailable.Reason != "source sync config is not enabled" {
		t.Fatalf("unavailable response = %+v", unavailable)
	}

	getOrganizationTreeOperationsWecomConfig = func(organization string) (*object.WecomOrganizationSyncConfig, error) {
		return nil, errors.New("config store unavailable")
	}
	failed := controller.triggerOrganizationTreeOperationsSourceRefresh("trace-2", user, "org-a")
	if failed.Status != "error" || failed.Reason != "config store unavailable" {
		t.Fatalf("config error response = %+v", failed)
	}
}

func TestOrganizationTreeOperationsTargetAuthorizationRules(t *testing.T) {
	cases := []struct {
		name         string
		organization string
		user         *object.User
		globalAdmin  bool
		wantOrg      string
		wantAdmin    bool
		wantErr      bool
	}{
		{name: "nil user", organization: "org-a", wantErr: true},
		{name: "global admin can target explicit org", organization: "org-b", user: &object.User{Owner: "org-a", Name: "root", IsAdmin: true}, globalAdmin: true, wantOrg: "org-b", wantAdmin: true},
		{name: "organization admin defaults to owner", user: &object.User{Owner: "org-a", Name: "admin", IsAdmin: true}, wantOrg: "org-a", wantAdmin: true},
		{name: "member stays non-admin scope", user: &object.User{Owner: "org-a", Name: "member"}, wantOrg: "org-a", wantAdmin: false},
		{name: "cross organization rejected", organization: "org-b", user: &object.User{Owner: "org-a", Name: "admin", IsAdmin: true}, wantErr: true},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			gotOrg, gotAdmin, err := resolveOrganizationManagementScopeTarget(tt.organization, tt.user, tt.globalAdmin)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got organization=%q admin=%v", gotOrg, gotAdmin)
				}
				return
			}
			if err != nil || gotOrg != tt.wantOrg || gotAdmin != tt.wantAdmin {
				t.Fatalf("target = %q/%v error=%v, want %q/%v", gotOrg, gotAdmin, err, tt.wantOrg, tt.wantAdmin)
			}
		})
	}
}

func containsOrganizationTreeDiagnosticReason(items []OrganizationTreeOperationsDiagnosticItem, reason string) bool {
	for _, item := range items {
		if item.Reason == reason {
			return true
		}
	}
	return false
}
