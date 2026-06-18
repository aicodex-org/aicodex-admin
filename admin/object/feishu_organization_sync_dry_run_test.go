// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestFeishuOrganizationSyncDryRunPreviewClassifiesDiffAndDoesNotWrite(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 18, 0, 0, 0, time.UTC)
	seedFeishuDryRunExistingState(t)
	before := countFeishuDryRunPersistedRows(t)
	service := &FeishuOrganizationSyncDryRunPreviewService{
		Now: func() time.Time { return now },
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return &fakeFeishuSnapshotClient{
				token: &FeishuAccessToken{TenantAccessToken: "token"},
				departments: []FeishuDepartmentSnapshot{
					{Id: "od-existing", ParentId: "0", Name: "研发中心"},
					{Id: "od-new", ParentId: "od-existing", Name: "平台组"},
					{Id: "od-dup", ParentId: "0", Name: "重复一"},
					{Id: "od-dup", ParentId: "0", Name: "重复二"},
					{Id: "od-orphan", ParentId: "od-missing", Name: "孤儿部门"},
					{Name: "缺少 ID 部门"},
				},
				users: []FeishuUserSnapshot{
					{UserId: "ou-existing", OpenId: "open-existing", UnionId: "union-existing", TenantKey: "tenant-a", Name: "Alice Updated", Departments: []string{"od-existing"}, MainDepartmentId: "od-existing"},
					{UserId: "ou-new", Name: "Bob", Departments: []string{"od-new", "od-missing"}, MainDepartmentId: "od-new"},
					{UserId: "ou-dup", Name: "重复一"},
					{UserId: "ou-dup", Name: "重复二"},
					{Name: "缺少 ID 用户"},
				},
			}
		},
	}

	preview, err := service.Preview(context.Background(), &FeishuOrganizationSyncConfig{
		Organization:           "engineering",
		AppId:                  "cli-a",
		AppSecret:              "fixture-secret",
		EndpointMode:           FeishuEndpointModeDomestic,
		TenantKey:              "tenant-a",
		IsEnabled:              true,
		SoftDisableMissingData: true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusSucceeded {
		t.Fatalf("preview status = %q diagnostics=%+v", preview.Status, preview.Diagnostics)
	}
	if preview.Source.AppAlias == "" || strings.Contains(preview.Source.AppAlias, "cli-a") {
		t.Fatalf("source app alias = %q, want non-empty masked alias", preview.Source.AppAlias)
	}
	assertFeishuDryRunCounts(t, "departments", preview.Diff.Departments, FeishuOrganizationSyncDryRunDiffCounts{
		ToCreate:      1,
		ToUpdate:      1,
		ToSoftDisable: 1,
		Conflict:      1,
		Invalid:       2,
	})
	assertFeishuDryRunCounts(t, "users", preview.Diff.Users, FeishuOrganizationSyncDryRunDiffCounts{
		ToCreate:      1,
		ToUpdate:      1,
		ToSoftDisable: 1,
		Conflict:      1,
		Invalid:       1,
	})
	assertFeishuDryRunCounts(t, "memberships", preview.Diff.Memberships, FeishuOrganizationSyncDryRunDiffCounts{
		ToCreate:      1,
		Unchanged:     1,
		ToSoftDisable: 1,
		Invalid:       1,
	})
	for _, reason := range []string{
		"duplicate_external_identifier",
		"missing_department_identifier",
		"missing_parent_department",
		"missing_user_identifier",
		"unmapped_department",
		"would_soft_disable",
	} {
		if preview.ReasonCounts[reason] == 0 {
			t.Fatalf("reasonCounts[%s] = 0, want non-zero; all=%+v", reason, preview.ReasonCounts)
		}
	}
	after := countFeishuDryRunPersistedRows(t)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("dry-run changed persisted row counts: before=%+v after=%+v", before, after)
	}
}

func TestFeishuOrganizationSyncDryRunPreviewFailsClosedWithoutSecret(t *testing.T) {
	service := &FeishuOrganizationSyncDryRunPreviewService{
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			t.Fatalf("Preview() must not create Contact client when secret is missing")
			return nil
		},
	}

	preview, err := service.Preview(context.Background(), &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli-a",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusFailed || preview.Diagnostics == nil {
		t.Fatalf("preview = %+v, want failed diagnostics", preview)
	}
	if preview.Diagnostics.ReasonCode != FeishuOrganizationSyncDryRunReasonCredentialMissing {
		t.Fatalf("reason = %q, want credential_missing", preview.Diagnostics.ReasonCode)
	}
}

func TestFeishuOrganizationSyncDryRunPreviewRedactsContactPermissionFailure(t *testing.T) {
	service := &FeishuOrganizationSyncDryRunPreviewService{
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return &fakeFeishuSnapshotClient{
				token:       &FeishuAccessToken{TenantAccessToken: "tenant-token-secret"},
				departments: []FeishuDepartmentSnapshot{{Id: "od-root"}},
				userErr:     errors.New("permission denied token=tenant-token-secret secret=fixture-secret user_id=ou_1 alice@example.test 13800138000"),
			}
		},
	}

	preview, err := service.Preview(context.Background(), &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli-a",
		AppSecret:    "fixture-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusFailed || preview.Diagnostics == nil {
		t.Fatalf("preview = %+v, want failed diagnostics", preview)
	}
	if preview.Diagnostics.ReasonCode != FeishuOrganizationSyncDryRunReasonContactPermissionMissing {
		t.Fatalf("reason = %q, want contact_permission_missing", preview.Diagnostics.ReasonCode)
	}
	for _, leaked := range []string{"tenant-token-secret", "fixture-secret", "ou_1", "alice@example.test", "13800138000"} {
		if strings.Contains(preview.Diagnostics.SafeSummary, leaked) {
			t.Fatalf("safe summary leaked %q: %q", leaked, preview.Diagnostics.SafeSummary)
		}
	}
}

func TestFeishuOrganizationSyncDryRunPreviewClassifiesMembershipEdges(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	seedFeishuDryRunExistingState(t)
	service := &FeishuOrganizationSyncDryRunPreviewService{}
	preview, err := service.buildPreview(&FeishuOrganizationSyncConfig{
		Organization:           "engineering",
		AppId:                  "cli-a",
		AppSecret:              "fixture-secret",
		EndpointMode:           FeishuEndpointModeDomestic,
		TenantKey:              "tenant-a",
		IsEnabled:              true,
		SoftDisableMissingData: true,
	}, &FeishuOrganizationFullSnapshot{
		Departments: []FeishuDepartmentSnapshot{
			{Id: "od-existing", ParentId: "0", Name: "研发旧名"},
			{Id: "od-new", ParentId: "0", Name: "平台组"},
		},
		Users: []FeishuUserSnapshot{
			{UserId: "ou-existing", OpenId: "open-existing", UnionId: "union-existing", TenantKey: "tenant-a", Name: "Alice Old", Departments: []string{"od-existing"}, MainDepartmentId: "od-existing"},
			{UserId: "ou-new", Name: "Bob", Departments: []string{"od-existing"}, MainDepartmentId: "od-existing"},
		},
		UserDepartments: []FeishuUserDepartmentSnapshot{
			{FeishuUserId: "ou-existing", DepartmentId: "od-existing", IsMain: false},
			{FeishuUserId: "ou-new", DepartmentId: "od-existing", IsMain: true},
			{FeishuUserId: "ou-existing", DepartmentId: "", IsMain: false},
			{FeishuUserId: "ou-ghost", DepartmentId: "od-existing", IsMain: false},
			{FeishuUserId: "ou-existing", DepartmentId: "od-new", IsMain: false},
			{FeishuUserId: "ou-existing", DepartmentId: "od-new", IsMain: true},
		},
	}, "tenant-a")
	if err != nil {
		t.Fatalf("buildPreview() error = %v", err)
	}
	assertFeishuDryRunCounts(t, "memberships", preview.Diff.Memberships, FeishuOrganizationSyncDryRunDiffCounts{
		ToCreate:      1,
		ToUpdate:      1,
		ToSoftDisable: 1,
		Conflict:      1,
		Invalid:       2,
	})
	for _, reason := range []string{
		feishuDryRunReasonDuplicateExternalIdentifier,
		feishuDryRunReasonMissingDepartmentIdentifier,
		feishuDryRunReasonUnmappedUser,
		feishuDryRunReasonWouldSoftDisable,
	} {
		if preview.ReasonCounts[reason] == 0 {
			t.Fatalf("reasonCounts[%s] = 0, want non-zero; all=%+v", reason, preview.ReasonCounts)
		}
	}
}

func TestFeishuOrganizationSyncDryRunPreviewTreatsRootDepartmentMembershipAsValid(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	service := &FeishuOrganizationSyncDryRunPreviewService{}
	preview, err := service.buildPreview(&FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli-a",
		AppSecret:    "fixture-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		TenantKey:    "tenant-a",
		IsEnabled:    true,
	}, &FeishuOrganizationFullSnapshot{
		Departments: []FeishuDepartmentSnapshot{},
		Users: []FeishuUserSnapshot{
			{UserId: "ou-root", Name: "Root User", Departments: []string{"0"}, MainDepartmentId: "0"},
		},
		UserDepartments: []FeishuUserDepartmentSnapshot{
			{FeishuUserId: "ou-root", DepartmentId: "0", IsMain: true},
		},
	}, "tenant-a")
	if err != nil {
		t.Fatalf("buildPreview() error = %v", err)
	}
	assertFeishuDryRunCounts(t, "departments", preview.Diff.Departments, FeishuOrganizationSyncDryRunDiffCounts{
		ToCreate: 1,
	})
	assertFeishuDryRunCounts(t, "memberships", preview.Diff.Memberships, FeishuOrganizationSyncDryRunDiffCounts{
		ToCreate: 1,
	})
	if preview.ReasonCounts[feishuDryRunReasonUnmappedDepartment] != 0 {
		t.Fatalf("unmapped root department count = %d, want 0; all=%+v", preview.ReasonCounts[feishuDryRunReasonUnmappedDepartment], preview.ReasonCounts)
	}
	if preview.SnapshotStats.DepartmentCount != 1 || preview.SnapshotStats.MembershipCount != 1 {
		t.Fatalf("snapshot stats = %+v, want root department and one membership", preview.SnapshotStats)
	}
}

func TestFeishuOrganizationSyncDryRunPreviewValidationAndDiagnostics(t *testing.T) {
	tests := []struct {
		name          string
		config        *FeishuOrganizationSyncConfig
		wantReason    string
		wantCategory  string
		wantAction    string
		errorContains string
	}{
		{name: "nil config", wantReason: FeishuOrganizationSyncDryRunReasonCredentialMissing, wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration, wantAction: FeishuOrganizationSyncOperatorFixCredentials, errorContains: "config is required"},
		{name: "missing organization", config: &FeishuOrganizationSyncConfig{AppId: "cli-a", AppSecret: "fixture-secret", IsEnabled: true}, wantReason: FeishuOrganizationSyncDryRunReasonCredentialMissing, wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration, wantAction: FeishuOrganizationSyncOperatorFixCredentials, errorContains: "organization is required"},
		{name: "missing app", config: &FeishuOrganizationSyncConfig{Organization: "engineering", AppSecret: "fixture-secret", IsEnabled: true}, wantReason: FeishuOrganizationSyncDryRunReasonCredentialMissing, wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration, wantAction: FeishuOrganizationSyncOperatorFixCredentials, errorContains: "app_id is required"},
		{name: "masked secret", config: &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", AppSecret: FeishuOrganizationSyncMaskedSecret, IsEnabled: true}, wantReason: FeishuOrganizationSyncDryRunReasonCredentialMissing, wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration, wantAction: FeishuOrganizationSyncOperatorFixCredentials, errorContains: "app_secret is required"},
		{name: "invalid endpoint", config: &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", AppSecret: "fixture-secret", EndpointMode: "mars", IsEnabled: true}, wantReason: FeishuOrganizationSyncDryRunReasonCredentialMissing, wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration, wantAction: FeishuOrganizationSyncOperatorFixCredentials, errorContains: "endpoint_mode is invalid"},
		{name: "disabled", config: &FeishuOrganizationSyncConfig{Organization: "engineering", AppId: "cli-a", AppSecret: "fixture-secret"}, wantReason: FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired, wantCategory: FeishuOrganizationSyncFailureCategoryProvider, wantAction: FeishuOrganizationSyncOperatorManualReview, errorContains: "config is disabled"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &FeishuOrganizationSyncDryRunPreviewService{
				NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
					t.Fatalf("Preview() must not create Contact client for invalid config")
					return nil
				},
			}
			preview, err := service.Preview(context.Background(), tt.config)
			if err != nil {
				t.Fatalf("Preview() error = %v", err)
			}
			if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusFailed || preview.Diagnostics == nil {
				t.Fatalf("preview = %+v, want failed diagnostics", preview)
			}
			if preview.Diagnostics.ReasonCode != tt.wantReason || preview.Diagnostics.FailureCategory != tt.wantCategory || preview.Diagnostics.OperatorAction != tt.wantAction {
				t.Fatalf("diagnostics = %+v, want reason=%s category=%s action=%s", preview.Diagnostics, tt.wantReason, tt.wantCategory, tt.wantAction)
			}
			if !strings.Contains(preview.Diagnostics.SafeSummary, tt.errorContains) {
				t.Fatalf("safe summary = %q, want contains %q", preview.Diagnostics.SafeSummary, tt.errorContains)
			}
		})
	}
}

func TestFeishuOrganizationSyncDryRunFailureReasonMappings(t *testing.T) {
	tests := []struct {
		text string
		want string
	}{
		{text: "invalid app credentials", want: FeishuOrganizationSyncDryRunReasonInvalidAppCredentials},
		{text: "Contact scope missing", want: FeishuOrganizationSyncDryRunReasonContactPermissionMissing},
		{text: "unexpected Contact payload shape", want: FeishuOrganizationSyncDryRunReasonContractMismatch},
		{text: "tenant authorization unavailable", want: FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired},
	}
	for _, tt := range tests {
		if got := classifyFeishuDryRunFailureReason(errors.New(tt.text)); got != tt.want {
			t.Fatalf("classifyFeishuDryRunFailureReason(%q) = %q, want %q", tt.text, got, tt.want)
		}
		diagnostics := buildFeishuDryRunDiagnostics(FeishuOrganizationSyncDiagnosticStageUserFetch, tt.want, "secret=fixture-secret token=tenant-token-secret")
		if strings.Contains(diagnostics.SafeSummary, "fixture-secret") || strings.Contains(diagnostics.SafeSummary, "tenant-token-secret") {
			t.Fatalf("diagnostics leaked sensitive values: %+v", diagnostics)
		}
	}
}

func TestIncrementFeishuDryRunReasonHandlesEmptyInputs(t *testing.T) {
	incrementFeishuDryRunReason(nil, feishuDryRunReasonWouldSoftDisable)
	preview := &FeishuOrganizationSyncDryRunPreview{}
	incrementFeishuDryRunReason(preview, "")
	if len(preview.ReasonCounts) != 0 {
		t.Fatalf("empty reason initialized counts: %+v", preview.ReasonCounts)
	}
	incrementFeishuDryRunReason(preview, feishuDryRunReasonWouldSoftDisable)
	if preview.ReasonCounts[feishuDryRunReasonWouldSoftDisable] != 1 {
		t.Fatalf("reasonCounts = %+v, want would_soft_disable=1", preview.ReasonCounts)
	}
}

func seedFeishuDryRunExistingState(t *testing.T) {
	t.Helper()
	if err := saveFeishuDepartmentMapping(&FeishuDepartmentMapping{
		Owner:        "engineering",
		Name:         "dept-existing",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		DepartmentId: "od-existing",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "od-existing"),
		DisplayName:  "研发旧名",
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("seed existing department mapping error = %v", err)
	}
	if err := saveFeishuDepartmentMapping(&FeishuDepartmentMapping{
		Owner:        "engineering",
		Name:         "dept-stale",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		DepartmentId: "od-stale",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "od-stale"),
		DisplayName:  "将被禁用部门",
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("seed stale department mapping error = %v", err)
	}
	user := &User{Owner: "engineering", Name: "existing-feishu-user", Type: "normal-user", Lark: "ou-existing", DisplayName: "Alice Old", Groups: []string{GetFeishuDepartmentGroupName("tenant-a", "od-existing")}}
	if err := saveFeishuUser(user); err != nil {
		t.Fatalf("seed user error = %v", err)
	}
	if err := saveFeishuUserMapping(&FeishuUserMapping{
		Owner:        "engineering",
		Name:         "user-existing",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		FeishuUserId: "ou-existing",
		OpenId:       "open-existing",
		UnionId:      "union-existing",
		UserOwner:    user.Owner,
		UserName:     user.Name,
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("seed existing user mapping error = %v", err)
	}
	if err := saveFeishuUserMapping(&FeishuUserMapping{
		Owner:        "engineering",
		Name:         "user-stale",
		Organization: "engineering",
		AppId:        "cli-a",
		TenantKey:    "tenant-a",
		FeishuUserId: "ou-stale",
		UserOwner:    "engineering",
		UserName:     "stale-feishu-user",
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("seed stale user mapping error = %v", err)
	}
	if err := saveFeishuUserDepartment(&FeishuUserDepartment{
		Owner:        "engineering",
		Name:         "membership-existing",
		Organization: "engineering",
		AppId:        "cli-a",
		FeishuUserId: "ou-existing",
		DepartmentId: "od-existing",
		UserOwner:    user.Owner,
		UserName:     user.Name,
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "od-existing"),
		IsMain:       true,
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("seed existing membership error = %v", err)
	}
	if err := saveFeishuUserDepartment(&FeishuUserDepartment{
		Owner:        "engineering",
		Name:         "membership-stale",
		Organization: "engineering",
		AppId:        "cli-a",
		FeishuUserId: "ou-stale",
		DepartmentId: "od-stale",
		UserOwner:    "engineering",
		UserName:     "stale-feishu-user",
		GroupOwner:   "engineering",
		GroupName:    GetFeishuDepartmentGroupName("tenant-a", "od-stale"),
		IsEnabled:    true,
	}); err != nil {
		t.Fatalf("seed stale membership error = %v", err)
	}
}

func countFeishuDryRunPersistedRows(t *testing.T) map[string]int64 {
	t.Helper()
	counts := map[string]int64{}
	models := map[string]interface{}{
		"groups":               new(Group),
		"users":                new(User),
		"departmentMappings":   new(FeishuDepartmentMapping),
		"userMappings":         new(FeishuUserMapping),
		"userDepartments":      new(FeishuUserDepartment),
		"sourceConnections":    new(SourceConnection),
		"platformDepartments":  new(PlatformDepartment),
		"platformUsers":        new(PlatformUser),
		"platformMemberships":  new(PlatformMembership),
		"externalIdentities":   new(ExternalIdentity),
		"organizationBatches":  new(OrgSyncBatch),
		"organizationSyncRuns": new(FeishuOrganizationSyncRun),
	}
	for name, model := range models {
		count, err := ormer.Engine.Count(model)
		if err != nil {
			t.Fatalf("count %s error = %v", name, err)
		}
		counts[name] = count
	}
	return counts
}

func assertFeishuDryRunCounts(t *testing.T, name string, got FeishuOrganizationSyncDryRunDiffCounts, want FeishuOrganizationSyncDryRunDiffCounts) {
	t.Helper()
	if got.ToCreate != want.ToCreate || got.ToUpdate != want.ToUpdate || got.ToSoftDisable != want.ToSoftDisable || got.Unchanged != want.Unchanged || got.Conflict != want.Conflict || got.Invalid != want.Invalid {
		t.Fatalf("%s counts = %+v, want %+v", name, got, want)
	}
}
