// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestFeishuSyncStageErrorHelpers(t *testing.T) {
	cause := errors.New("provider failed")
	if newFeishuSyncStageError("tenant_token_failed", nil) != nil {
		t.Fatalf("nil cause should not create stage error")
	}
	stageErr := newFeishuSyncStageError("tenant_token_failed", cause)
	if stageErr == nil || stageErr.Error() != "provider failed" {
		t.Fatalf("stage error = %v, want provider failed", stageErr)
	}
	var typed *feishuSyncStageError
	if !errors.As(stageErr, &typed) || !errors.Is(stageErr, cause) || typed.Unwrap() != cause {
		t.Fatalf("stage error unwrap/as failed: %v", stageErr)
	}
	if wrapped := wrapFeishuSyncStageError("department_fetch_failed", stageErr); wrapped != stageErr {
		t.Fatalf("wrap existing stage error should preserve original")
	}
	if got := feishuSyncErrorCodeFromError(stageErr, "fallback"); got != "tenant_token_failed" {
		t.Fatalf("stage error code = %q, want tenant_token_failed", got)
	}
	if got := feishuSyncErrorCodeFromError(cause, "fallback"); got != "fallback" {
		t.Fatalf("fallback error code = %q, want fallback", got)
	}
	if (&feishuSyncStageError{}).Error() != "" || (&feishuSyncStageError{}).Unwrap() != nil {
		t.Fatalf("empty stage error should be inert")
	}
}

func TestFeishuOrganizationSyncRunDiagnosticsClassifiesAndRedactsProviderFailures(t *testing.T) {
	startedAt := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	finishedAt := startedAt.Add(2 * time.Minute)
	run := &FeishuOrganizationSyncRun{
		Name:                    "run-token",
		Status:                  FeishuOrganizationSyncRunStatusFailed,
		Stage:                   FeishuOrganizationSyncRunStageFetching,
		StartedAt:               startedAt,
		FinishedAt:              finishedAt,
		DepartmentFetchedCount:  2,
		UserFetchedCount:        3,
		MembershipUpdatedCount:  4,
		DepartmentDisabledCount: 1,
		UserDisabledCount:       1,
		ErrorCode:               "tenant_token_failed",
		ErrorText:               "tenant_access_token failed: invalid app secret fixture-secret open_id=open_1 user_id=ou_1 email=alice@example.test phone=13800138000",
	}

	diagnostics := BuildFeishuOrganizationSyncRunDiagnostics(run, "fixture-secret")

	if diagnostics == nil {
		t.Fatalf("diagnostics is nil")
	}
	if diagnostics.FailedStage != FeishuOrganizationSyncDiagnosticStageTenantToken {
		t.Fatalf("failed stage = %q, want %q", diagnostics.FailedStage, FeishuOrganizationSyncDiagnosticStageTenantToken)
	}
	if diagnostics.FailureCategory != FeishuOrganizationSyncFailureCategoryCredentials {
		t.Fatalf("failure category = %q, want %q", diagnostics.FailureCategory, FeishuOrganizationSyncFailureCategoryCredentials)
	}
	if diagnostics.ReasonCode != FeishuOrganizationSyncReasonInvalidAppCredentials {
		t.Fatalf("reason code = %q, want %q", diagnostics.ReasonCode, FeishuOrganizationSyncReasonInvalidAppCredentials)
	}
	if diagnostics.RetryReadiness != FeishuOrganizationSyncRetryNotReady || diagnostics.OperatorAction != FeishuOrganizationSyncOperatorFixCredentials {
		t.Fatalf("retry/action = %q/%q, want not_ready/fix_credentials", diagnostics.RetryReadiness, diagnostics.OperatorAction)
	}
	if diagnostics.DurationMs != int64((2 * time.Minute).Milliseconds()) {
		t.Fatalf("duration = %d, want 120000", diagnostics.DurationMs)
	}
	if diagnostics.Stats.DepartmentCount != 2 || diagnostics.Stats.UserCount != 3 || diagnostics.Stats.MembershipCount != 4 || diagnostics.Stats.DisabledCount != 2 {
		t.Fatalf("stats = %+v, want aggregate counts", diagnostics.Stats)
	}
	for _, leaked := range []string{"fixture-secret", "tenant_access_token", "open_1", "ou_1", "alice@example.test", "13800138000"} {
		if strings.Contains(diagnostics.SafeSummary, leaked) {
			t.Fatalf("safe summary leaked %q: %q", leaked, diagnostics.SafeSummary)
		}
	}
}

func TestFeishuOrganizationSyncRunDiagnosticsClassifiesApplyAndRunningStates(t *testing.T) {
	startedAt := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	failedRun := &FeishuOrganizationSyncRun{
		Status:     FeishuOrganizationSyncRunStatusFailed,
		Stage:      FeishuOrganizationSyncRunStageApplying,
		StartedAt:  startedAt,
		FinishedAt: startedAt.Add(30 * time.Second),
		ErrorCode:  "projection_failed",
		ErrorText:  "platform projection failed",
	}

	diagnostics := BuildFeishuOrganizationSyncRunDiagnostics(failedRun)
	if diagnostics.FailedStage != FeishuOrganizationSyncDiagnosticStageProjection {
		t.Fatalf("failed stage = %q, want projection", diagnostics.FailedStage)
	}
	if diagnostics.FailureCategory != FeishuOrganizationSyncFailureCategoryProjection || diagnostics.OperatorAction != FeishuOrganizationSyncOperatorInspectProjection {
		t.Fatalf("category/action = %q/%q, want projection/inspect_projection", diagnostics.FailureCategory, diagnostics.OperatorAction)
	}
	if diagnostics.RetryReadiness != FeishuOrganizationSyncRetryNotReady {
		t.Fatalf("retry readiness = %q, want not_ready", diagnostics.RetryReadiness)
	}

	running := BuildFeishuOrganizationSyncRunDiagnostics(&FeishuOrganizationSyncRun{
		Status:    FeishuOrganizationSyncRunStatusRunning,
		Stage:     FeishuOrganizationSyncRunStageFetching,
		StartedAt: startedAt,
	})
	if running.FailureCategory != "" || running.ReasonCode != "" || running.OperatorAction != "" {
		t.Fatalf("running diagnostics = %+v, want no failure classification", running)
	}
	if running.RetryReadiness != FeishuOrganizationSyncRetryNotReady {
		t.Fatalf("running retry readiness = %q, want not_ready", running.RetryReadiness)
	}
}

func TestFeishuOrganizationSyncRunDiagnosticsHandlesPartialAndUnknownRuns(t *testing.T) {
	if BuildFeishuOrganizationSyncRunDiagnostics(nil) != nil {
		t.Fatalf("nil run diagnostics should be nil")
	}
	if BuildFeishuOrganizationSyncScheduleDiagnostics(nil) != nil {
		t.Fatalf("nil schedule diagnostics should be nil")
	}
	succeeded := BuildFeishuOrganizationSyncRunDiagnostics(&FeishuOrganizationSyncRun{
		Status:                  FeishuOrganizationSyncRunStatusSucceeded,
		StartedAt:               time.Date(2026, 6, 15, 11, 0, 0, 0, time.UTC),
		FinishedAt:              time.Date(2026, 6, 15, 11, 0, 1, 0, time.UTC),
		DepartmentFetchedCount:  1,
		UserFetchedCount:        2,
		MembershipUpdatedCount:  3,
		DepartmentDisabledCount: 4,
	})
	if succeeded.FailureCategory != "" || succeeded.RetryReadiness != "" || succeeded.Stats.DisabledCount != 4 || succeeded.DurationMs != 1000 {
		t.Fatalf("succeeded diagnostics = %+v, want stats only", succeeded)
	}

	partial := BuildFeishuOrganizationSyncRunDiagnostics(&FeishuOrganizationSyncRun{
		Status:    FeishuOrganizationSyncRunStatusPartial,
		Stage:     FeishuOrganizationSyncRunStageApplying,
		ErrorCode: "apply_failed",
	})
	if partial.ReasonCode != FeishuOrganizationSyncReasonPartialSync {
		t.Fatalf("partial reason = %q, want partial_sync", partial.ReasonCode)
	}
	if !strings.Contains(partial.SafeSummary, "soft-disable") {
		t.Fatalf("partial safe summary = %q, want soft-disable note", partial.SafeSummary)
	}

	unknown := BuildFeishuOrganizationSyncRunDiagnostics(&FeishuOrganizationSyncRun{
		Status:    FeishuOrganizationSyncRunStatusFailed,
		Stage:     FeishuOrganizationSyncRunStageFinalizing,
		ErrorCode: "new_unmapped_error",
		ErrorText: "unexpected failure",
	})
	if unknown.FailureCategory != FeishuOrganizationSyncFailureCategoryUnknown || unknown.ReasonCode != FeishuOrganizationSyncReasonUnknown {
		t.Fatalf("unknown diagnostics = %+v, want unknown category/reason", unknown)
	}
	if unknown.RetryReadiness != FeishuOrganizationSyncRetryUnknown || unknown.OperatorAction != FeishuOrganizationSyncOperatorUnknown {
		t.Fatalf("unknown retry/action = %q/%q", unknown.RetryReadiness, unknown.OperatorAction)
	}
}

func TestFeishuOrganizationSyncRunDiagnosticsCoversStageAndReasonMappings(t *testing.T) {
	tests := []struct {
		name         string
		errorCode    string
		errorText    string
		stage        FeishuOrganizationSyncRunStage
		wantStage    string
		wantReason   string
		wantCategory string
		wantRetry    string
		wantAction   string
	}{
		{name: "config missing", errorCode: "config_validation_failed", errorText: "app_secret is required", wantStage: FeishuOrganizationSyncDiagnosticStageConfigValidation, wantReason: FeishuOrganizationSyncReasonMissingSecret, wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration, wantRetry: FeishuOrganizationSyncRetryNotReady, wantAction: FeishuOrganizationSyncOperatorFixCredentials},
		{name: "department fetch rate limit", errorCode: "department_fetch_failed", errorText: "too many requests", wantStage: FeishuOrganizationSyncDiagnosticStageDepartmentFetch, wantReason: FeishuOrganizationSyncReasonRateLimited, wantCategory: FeishuOrganizationSyncFailureCategoryProvider, wantRetry: FeishuOrganizationSyncRetryWaitLimit, wantAction: FeishuOrganizationSyncOperatorWaitRateLimit},
		{name: "user fetch contract", errorCode: "user_fetch_failed", errorText: "unexpected Contact payload shape", wantStage: FeishuOrganizationSyncDiagnosticStageUserFetch, wantReason: FeishuOrganizationSyncReasonContractMismatch, wantCategory: FeishuOrganizationSyncFailureCategoryContract, wantRetry: FeishuOrganizationSyncRetryNotReady, wantAction: FeishuOrganizationSyncOperatorManualReview},
		{name: "department upsert mapping", errorCode: "upsert_department_failed", errorText: "duplicate mapping_conflict", wantStage: FeishuOrganizationSyncDiagnosticStageUpsertDepartment, wantReason: FeishuOrganizationSyncReasonMappingConflict, wantCategory: FeishuOrganizationSyncFailureCategoryLocalApply, wantRetry: FeishuOrganizationSyncRetryNotReady, wantAction: FeishuOrganizationSyncOperatorInspectMappingConflict},
		{name: "user upsert tenant unavailable", errorCode: "upsert_user_failed", errorText: "tenant_unavailable timeout", wantStage: FeishuOrganizationSyncDiagnosticStageUpsertUser, wantReason: FeishuOrganizationSyncReasonTenantUnavailable, wantCategory: FeishuOrganizationSyncFailureCategoryProvider, wantRetry: FeishuOrganizationSyncRetrySafe, wantAction: FeishuOrganizationSyncOperatorManualReview},
		{name: "membership upsert unknown", errorCode: "upsert_membership_failed", errorText: "store failed", wantStage: FeishuOrganizationSyncDiagnosticStageUpsertMembership, wantReason: FeishuOrganizationSyncReasonUnknown, wantCategory: FeishuOrganizationSyncFailureCategoryUnknown, wantRetry: FeishuOrganizationSyncRetryUnknown, wantAction: FeishuOrganizationSyncOperatorUnknown},
		{name: "soft disable permission", errorCode: "soft_disable_failed", errorText: "permission denied", wantStage: FeishuOrganizationSyncDiagnosticStageSoftDisable, wantReason: FeishuOrganizationSyncReasonContactScopeMissing, wantCategory: FeishuOrganizationSyncFailureCategoryPermission, wantRetry: FeishuOrganizationSyncRetryNotReady, wantAction: FeishuOrganizationSyncOperatorGrantContactScope},
		{name: "scheduler invalid app", errorCode: "scheduler_dispatch_failed", errorText: "invalid app credentials", wantStage: FeishuOrganizationSyncDiagnosticStageScheduler, wantReason: FeishuOrganizationSyncReasonInvalidAppCredentials, wantCategory: FeishuOrganizationSyncFailureCategoryCredentials, wantRetry: FeishuOrganizationSyncRetryNotReady, wantAction: FeishuOrganizationSyncOperatorFixCredentials},
		{name: "stage fallback fetching", stage: FeishuOrganizationSyncRunStageFetching, errorText: "unknown", wantStage: FeishuOrganizationSyncDiagnosticStageDepartmentFetch, wantReason: FeishuOrganizationSyncReasonUnknown, wantCategory: FeishuOrganizationSyncFailureCategoryUnknown, wantRetry: FeishuOrganizationSyncRetryUnknown, wantAction: FeishuOrganizationSyncOperatorUnknown},
		{name: "stage fallback applying", stage: FeishuOrganizationSyncRunStageApplying, errorText: "unknown", wantStage: FeishuOrganizationSyncDiagnosticStageUpsertDepartment, wantReason: FeishuOrganizationSyncReasonUnknown, wantCategory: FeishuOrganizationSyncFailureCategoryUnknown, wantRetry: FeishuOrganizationSyncRetryUnknown, wantAction: FeishuOrganizationSyncOperatorUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			diagnostics := BuildFeishuOrganizationSyncRunDiagnostics(&FeishuOrganizationSyncRun{
				Status:    FeishuOrganizationSyncRunStatusFailed,
				Stage:     tt.stage,
				ErrorCode: tt.errorCode,
				ErrorText: tt.errorText,
			})
			if diagnostics.FailedStage != tt.wantStage || diagnostics.ReasonCode != tt.wantReason || diagnostics.FailureCategory != tt.wantCategory || diagnostics.RetryReadiness != tt.wantRetry || diagnostics.OperatorAction != tt.wantAction {
				t.Fatalf("diagnostics = %+v, want %s/%s/%s/%s/%s", diagnostics, tt.wantStage, tt.wantReason, tt.wantCategory, tt.wantRetry, tt.wantAction)
			}
		})
	}
}

func TestGetMaskedFeishuOrganizationSyncRunAttachesDiagnostics(t *testing.T) {
	run := &FeishuOrganizationSyncRun{
		Status:    FeishuOrganizationSyncRunStatusFailed,
		Stage:     FeishuOrganizationSyncRunStageFetching,
		ErrorCode: "contact_scope_missing",
		ErrorText: "missing contact scope secret=fixture-secret user_id=ou_1",
	}

	masked := GetMaskedFeishuOrganizationSyncRun(run, "fixture-secret")

	if masked.Diagnostics == nil {
		t.Fatalf("masked diagnostics is nil")
	}
	if masked.Diagnostics.ReasonCode != FeishuOrganizationSyncReasonContactScopeMissing {
		t.Fatalf("diagnostics reason = %q, want contact_scope_missing", masked.Diagnostics.ReasonCode)
	}
	if strings.Contains(masked.Diagnostics.SafeSummary, "fixture-secret") || strings.Contains(masked.Diagnostics.SafeSummary, "ou_1") {
		t.Fatalf("diagnostics leaked sensitive values: %q", masked.Diagnostics.SafeSummary)
	}
}

func TestFeishuOrganizationSyncScheduleDiagnosticsClassifiesDispatchFailures(t *testing.T) {
	tests := []struct {
		name         string
		fire         *OrganizationSyncScheduleFire
		wantReason   string
		wantRetry    string
		wantAction   string
		wantCategory string
		wantRunId    string
	}{
		{
			name: "missing config",
			fire: &OrganizationSyncScheduleFire{
				Status:    OrganizationSyncScheduleFireStatusFailed,
				ErrorCode: "config_missing",
				ErrorText: "feishu organization sync config is not configured",
			},
			wantReason:   FeishuOrganizationSyncReasonMissingSecret,
			wantRetry:    FeishuOrganizationSyncRetryNotReady,
			wantAction:   FeishuOrganizationSyncOperatorFixCredentials,
			wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration,
		},
		{
			name: "disabled config",
			fire: &OrganizationSyncScheduleFire{
				Status:    OrganizationSyncScheduleFireStatusSkipped,
				ErrorCode: "config_disabled",
				ErrorText: "feishu organization sync config is disabled",
			},
			wantReason:   FeishuOrganizationSyncReasonMissingSecret,
			wantRetry:    FeishuOrganizationSyncRetryNotReady,
			wantAction:   FeishuOrganizationSyncOperatorManualReview,
			wantCategory: FeishuOrganizationSyncFailureCategoryConfiguration,
		},
		{
			name: "already running",
			fire: &OrganizationSyncScheduleFire{
				Status:    OrganizationSyncScheduleFireStatusSkipped,
				RunId:     "run-active",
				ErrorCode: OrganizationSyncScheduleFireErrorAlreadyRunning,
				ErrorText: "feishu organization sync run already running",
			},
			wantReason:   FeishuOrganizationSyncReasonUnknown,
			wantRetry:    FeishuOrganizationSyncRetryNotReady,
			wantAction:   FeishuOrganizationSyncOperatorManualReview,
			wantCategory: FeishuOrganizationSyncFailureCategoryUnknown,
			wantRunId:    "run-active",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			diagnostics := BuildFeishuOrganizationSyncScheduleDiagnostics(tt.fire)
			if diagnostics == nil {
				t.Fatalf("diagnostics is nil")
			}
			if diagnostics.FailedStage != FeishuOrganizationSyncDiagnosticStageScheduler {
				t.Fatalf("failed stage = %q, want scheduler", diagnostics.FailedStage)
			}
			if diagnostics.ReasonCode != tt.wantReason || diagnostics.RetryReadiness != tt.wantRetry || diagnostics.OperatorAction != tt.wantAction || diagnostics.FailureCategory != tt.wantCategory {
				t.Fatalf("diagnostics = %+v, want reason/retry/action/category %s/%s/%s/%s", diagnostics, tt.wantReason, tt.wantRetry, tt.wantAction, tt.wantCategory)
			}
			if tt.wantRunId != "" && diagnostics.SafeSummary == "" {
				t.Fatalf("safe summary should preserve non-secret dispatch context for run %q", tt.wantRunId)
			}
		})
	}
}

func TestFeishuOrganizationSyncScheduleDiagnosticsRedactsProviderDetails(t *testing.T) {
	fire := &OrganizationSyncScheduleFire{
		Status:    OrganizationSyncScheduleFireStatusFailed,
		ErrorCode: OrganizationSyncScheduleFireErrorDispatchFailed,
		ErrorText: "secret=fixture-secret tenant_access_token=t-1 open_id=open_1 union_id=union_1 user_id=ou_1 alice@example.test 13800138000",
	}

	diagnostics := BuildFeishuOrganizationSyncScheduleDiagnostics(fire, "fixture-secret", "t-1")

	for _, leaked := range []string{"fixture-secret", "tenant_access_token", "t-1", "open_1", "union_1", "ou_1", "alice@example.test", "13800138000"} {
		if strings.Contains(diagnostics.SafeSummary, leaked) {
			t.Fatalf("schedule diagnostics leaked %q: %q", leaked, diagnostics.SafeSummary)
		}
	}
	if diagnostics.RetryReadiness != FeishuOrganizationSyncRetryUnknown || diagnostics.OperatorAction != FeishuOrganizationSyncOperatorUnknown {
		t.Fatalf("unknown dispatch diagnostics = %+v, want unknown retry/action", diagnostics)
	}
}
