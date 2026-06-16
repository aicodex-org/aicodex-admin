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

package object

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/xorm-io/xorm"
	_ "modernc.org/sqlite"
)

func TestGatewayProjectionPublishAttemptHistoryRecordsAndFilters(t *testing.T) {
	setupGatewayProjectionPublishAttemptTestOrmer(t)
	generatedAt := time.Date(2026, 6, 15, 13, 0, 0, 0, time.UTC)
	service := GatewayProjectionPublishAttemptHistoryService{Now: func() time.Time { return generatedAt }}

	if err := service.Record(&GatewayProjectionPublishAttempt{
		OrganizationId:        "org-a",
		Source:                GatewayProjectionPublishAttemptSourceManual,
		Status:                "ok",
		TraceId:               "trace-a",
		ProjectionBatchId:     "batch-a",
		OrgVersion:            1001,
		SourceVersion:         "orgv-a",
		SubjectCount:          2,
		ActiveSubjectCount:    1,
		TombstoneSubjectCount: 1,
		SkippedByReason:       map[string]int{GatewayProjectionSkipMappingMissing: 3},
		Accepted:              true,
		DurationMs:            12,
	}); err != nil {
		t.Fatalf("Record(manual) error = %v", err)
	}
	if err := service.Record(&GatewayProjectionPublishAttempt{
		OrganizationId:  "org-a",
		Source:          GatewayProjectionPublishAttemptSourceScheduled,
		Status:          "error",
		TraceId:         "trace-b",
		ErrorCode:       GatewayProjectionPublishErrorProviderUnavailable,
		FailureCategory: GatewayProjectionFailureGatewayUnavailable,
		Retryable:       true,
		DurationMs:      34,
		CreatedAt:       generatedAt.Add(time.Minute),
	}); err != nil {
		t.Fatalf("Record(scheduled) error = %v", err)
	}

	list, err := service.List(GatewayProjectionPublishAttemptQuery{
		OrganizationId: "org-a",
		Source:         GatewayProjectionPublishAttemptSourceManual,
		Status:         "ok",
		Limit:          10,
	})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if list.Total != 1 || list.Attempts[0].TraceId != "trace-a" || list.Attempts[0].SkippedByReason[GatewayProjectionSkipMappingMissing] != 3 {
		t.Fatalf("List() = %#v, want one manual ok attempt with skipped summary", list)
	}
	if !list.Attempts[0].ReceiptQueryHint.Available || list.Attempts[0].ReceiptQueryHint.ProjectionBatchId != "batch-a" {
		t.Fatalf("receipt hint = %#v, want available hint from projection identifiers", list.Attempts[0].ReceiptQueryHint)
	}
	if list.Attempts[0].Retention.WindowSeconds == 0 || list.Attempts[0].Retention.CleanupReason == "" {
		t.Fatalf("retention = %#v, want populated read-only retention metadata", list.Attempts[0].Retention)
	}

	detail, err := service.Detail(GatewayProjectionPublishAttemptQuery{AttemptId: list.Attempts[0].AttemptId, OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("Detail() error = %v", err)
	}
	if detail == nil || detail.ProjectionBatchId != "batch-a" || detail.SkippedByReason[GatewayProjectionSkipMappingMissing] != 3 {
		t.Fatalf("Detail() = %#v, want sanitized manual attempt", detail)
	}
	raw, err := json.Marshal(detail)
	if err != nil {
		t.Fatalf("marshal detail: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid")
}

func TestGatewayProjectionPublishAttemptRetentionReadinessSummarizesCleanupCandidates(t *testing.T) {
	now := time.Date(2026, 6, 15, 13, 20, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{
			{
				AttemptId:         "attempt-old",
				OrganizationId:    "org-a",
				Source:            GatewayProjectionPublishAttemptSourceManual,
				Status:            "ok",
				ProjectionBatchId: "batch-old",
				OrgVersion:        1001,
				SourceVersion:     "orgv-old",
				CreatedAt:         now.Add(-31 * 24 * time.Hour),
			},
			{
				AttemptId:      "attempt-new",
				OrganizationId: "org-a",
				Source:         GatewayProjectionPublishAttemptSourceScheduled,
				Status:         "error",
				CreatedAt:      now.Add(-time.Hour),
			},
			{
				AttemptId:      "attempt-expired-missing-summary",
				OrganizationId: "org-a",
				Source:         GatewayProjectionPublishAttemptSourceScheduled,
				Status:         "ok",
				CreatedAt:      now.Add(-32 * 24 * time.Hour),
			},
			{
				AttemptId:      "attempt-other-org",
				OrganizationId: "org-b",
				Source:         GatewayProjectionPublishAttemptSourceManual,
				Status:         "ok",
				CreatedAt:      now.Add(-31 * 24 * time.Hour),
			},
		},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	readiness, err := service.RetentionReadiness(GatewayProjectionPublishAttemptQuery{OrganizationId: "org-a", Limit: 20})
	if err != nil {
		t.Fatalf("RetentionReadiness() error = %v", err)
	}
	if readiness.Total != 3 || readiness.CleanupEligibleCount != 1 || readiness.BlockedCount != 2 {
		t.Fatalf("readiness counts = %#v, want total=3 eligible=1 blocked=2", readiness)
	}
	if readiness.ReasonCounts["retention_expired_with_diagnostic_summary"] != 1 ||
		readiness.ReasonCounts["within_retention_window"] != 1 ||
		readiness.ReasonCounts["retention_expired_missing_diagnostic_summary"] != 1 {
		t.Fatalf("reason counts = %#v, want expired eligible, expired blocked and within window", readiness.ReasonCounts)
	}
	if len(readiness.Samples) != 3 || readiness.Samples[0].AttemptId == "" {
		t.Fatalf("samples = %#v, want sanitized samples", readiness.Samples)
	}
	raw, err := json.Marshal(readiness)
	if err != nil {
		t.Fatalf("marshal readiness: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid")
}

func TestGatewayProjectionPublishAttemptReceiptHintHandlesMissingLineage(t *testing.T) {
	hint := buildGatewayProjectionReceiptQueryHint(GatewayProjectionPublishAttempt{OrganizationId: "org-a"}, "")
	if hint.Available || !hint.Latest || hint.UnavailableReason != "projection_lineage_missing" {
		t.Fatalf("hint = %#v, want unavailable latest fallback", hint)
	}
	retention := buildGatewayProjectionPublishAttemptRetention(GatewayProjectionPublishAttempt{}, time.Now().UTC())
	if retention.CleanupEligible || retention.CleanupReason != "created_at_missing" {
		t.Fatalf("retention = %#v, want missing created_at blocked", retention)
	}
}

func TestGatewayProjectionPublishAttemptCleanupDryRunBuildsSafePlan(t *testing.T) {
	now := time.Date(2026, 6, 15, 14, 0, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{
			{
				AttemptId:         "attempt-candidate",
				OrganizationId:    "org-a",
				Source:            GatewayProjectionPublishAttemptSourceManual,
				Status:            "error",
				ProjectionBatchId: "batch-candidate",
				OrgVersion:        2001,
				SourceVersion:     "orgv-candidate",
				FailureCategory:   "gateway_unavailable",
				SkippedByReason:   map[string]int{GatewayProjectionSkipMappingMissing: 2},
				CreatedAt:         now.Add(-35 * 24 * time.Hour),
			},
			{
				AttemptId:      "attempt-blocked-missing-summary",
				OrganizationId: "org-a",
				Source:         GatewayProjectionPublishAttemptSourceScheduled,
				Status:         "ok",
				CreatedAt:      now.Add(-36 * 24 * time.Hour),
			},
			{
				AttemptId:         "attempt-within-window",
				OrganizationId:    "org-a",
				Source:            GatewayProjectionPublishAttemptSourceManual,
				Status:            "error",
				ProjectionBatchId: "batch-new",
				FailureCategory:   "gateway_unavailable",
				CreatedAt:         now.Add(-time.Hour),
			},
			{
				AttemptId:         "attempt-other-org",
				OrganizationId:    "org-b",
				Source:            GatewayProjectionPublishAttemptSourceManual,
				Status:            "error",
				ProjectionBatchId: "batch-other",
				FailureCategory:   "gateway_unavailable",
				CreatedAt:         now.Add(-40 * 24 * time.Hour),
			},
		},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	plan, err := service.CleanupDryRun(GatewayProjectionPublishAttemptCleanupDryRunQuery{
		OrganizationId:   "org-a",
		Status:           "error",
		FailureCategory:  "gateway_unavailable",
		OlderThan:        now.Add(-30 * 24 * time.Hour),
		Limit:            20,
		RequiredReason:   "operator-dry-run",
		ConfirmationText: "",
	})
	if err != nil {
		t.Fatalf("CleanupDryRun() error = %v", err)
	}
	if plan.Total != 1 || plan.CandidateCount != 1 || plan.BlockedCount != 0 {
		t.Fatalf("plan counts = %#v, want one eligible candidate only", plan)
	}
	if plan.ReceiptHintCoverage.AvailableCount != 1 || plan.DiagnosticCompleteness.CompleteCount != 1 {
		t.Fatalf("coverage = %#v completeness = %#v, want one complete receipt-covered candidate", plan.ReceiptHintCoverage, plan.DiagnosticCompleteness)
	}
	if plan.ExecuteGuardrail.Enabled || !plan.ExecuteGuardrail.DryRunOnly || plan.ExecuteGuardrail.Irreversible {
		t.Fatalf("execute guardrail = %#v, want disabled dry-run-only reversible guardrail", plan.ExecuteGuardrail)
	}
	if len(plan.SafetyChecklist) == 0 || plan.OperatorActionSummary == "" {
		t.Fatalf("operator guidance missing: %#v", plan)
	}
	raw, err := json.Marshal(plan)
	if err != nil {
		t.Fatalf("marshal plan: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid")
}

func TestGatewayProjectionPublishAttemptCleanupExecuteIsDisabledAndReadOnly(t *testing.T) {
	now := time.Date(2026, 6, 15, 14, 10, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-candidate",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-candidate",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	result, err := service.CleanupExecuteGuardrail(GatewayProjectionPublishAttemptCleanupDryRunQuery{
		OrganizationId: "org-a",
		OlderThan:      now.Add(-30 * 24 * time.Hour),
		Limit:          20,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteGuardrail() error = %v", err)
	}
	if result.ExecuteGuardrail.Enabled || !result.ExecuteGuardrail.DryRunOnly || result.CandidateCount != 1 {
		t.Fatalf("execute result = %#v, want disabled dry-run guardrail with candidate summary", result)
	}
	if len(attemptStore.records) != 1 || attemptStore.records[0].AttemptId != "attempt-candidate" {
		t.Fatalf("execute guardrail mutated records: %#v", attemptStore.records)
	}
}

func TestGatewayProjectionPublishAttemptCleanupDryRunDefensiveBranches(t *testing.T) {
	now := time.Date(2026, 6, 15, 14, 30, 0, 0, time.UTC)
	service := GatewayProjectionPublishAttemptHistoryService{
		Store: &memoryGatewayProjectionPublishAttemptStore{records: []*GatewayProjectionPublishAttempt{{
			AttemptId:      "attempt-missing-diagnostic",
			OrganizationId: "org-a",
			Status:         "ok",
			CreatedAt:      now.Add(-31 * 24 * time.Hour),
		}}},
		Now: func() time.Time { return now },
	}
	if _, err := service.CleanupDryRun(GatewayProjectionPublishAttemptCleanupDryRunQuery{}); err == nil {
		t.Fatalf("CleanupDryRun(empty organization) error = nil, want fail-closed organization requirement")
	}
	if _, err := service.CleanupDryRun(GatewayProjectionPublishAttemptCleanupDryRunQuery{
		OrganizationId: "org-a",
		OlderThan:      now.Add(time.Hour),
	}); err == nil {
		t.Fatalf("CleanupDryRun(future olderThan) error = nil, want fail-closed cutoff")
	}
	plan, err := service.CleanupDryRun(GatewayProjectionPublishAttemptCleanupDryRunQuery{
		OrganizationId: " org-a ",
		Limit:          500,
	})
	if err != nil {
		t.Fatalf("CleanupDryRun(defaults) error = %v", err)
	}
	if plan.Filters.Limit != maxGatewayProjectionPublishAttemptLimit || plan.Filters.OlderThan == "" {
		t.Fatalf("filters = %#v, want capped limit and default olderThan", plan.Filters)
	}
	if plan.CandidateCount != 0 || plan.BlockedCount != 1 || plan.DiagnosticCompleteness.MissingCount != 1 || plan.ReceiptHintCoverage.UnavailableCount != 1 {
		t.Fatalf("plan = %#v, want blocked missing-diagnostic attempt", plan)
	}
	if sample := buildGatewayProjectionPublishAttemptRetentionSample(nil); sample.AttemptId != "" {
		t.Fatalf("nil sample = %#v, want empty sample", sample)
	}
	if gatewayProjectionAttemptDiagnosticComplete(nil) {
		t.Fatalf("nil diagnostic complete = true, want false")
	}
	for _, tc := range []struct {
		candidate int
		blocked   int
		want      string
	}{
		{0, 0, "no_attempts_match_filters"},
		{0, 2, "cleanup_blocked_review_reasons"},
		{1, 1, "cleanup_candidates_require_operator_review"},
		{1, 0, "cleanup_candidates_ready_for_future_execute_gate"},
	} {
		if got := gatewayProjectionAttemptCleanupOperatorActionSummary(tc.candidate, tc.blocked); got != tc.want {
			t.Fatalf("summary(%d,%d) = %q, want %q", tc.candidate, tc.blocked, got, tc.want)
		}
	}
}

func TestGatewayProjectionPublishAttemptCleanupExecuteReadinessRequiresApproval(t *testing.T) {
	now := time.Date(2026, 6, 15, 15, 0, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-execute-candidate",
			OrganizationId:    "org-a",
			Source:            GatewayProjectionPublishAttemptSourceManual,
			Status:            "error",
			ProjectionBatchId: "batch-execute",
			OrgVersion:        202606151500,
			SourceVersion:     "orgv-execute",
			FailureCategory:   "gateway_unavailable",
			SkippedByReason:   map[string]int{GatewayProjectionSkipMappingMissing: 1},
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	readiness, err := service.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId: "org-a",
		OlderThan:      now.Add(-30 * 24 * time.Hour),
		Limit:          20,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteReadiness() error = %v", err)
	}
	if readiness.Readiness != "approval_required" || readiness.SafeNextAction != "collect_approval_package" {
		t.Fatalf("readiness = %#v, want approval-required next action", readiness)
	}
	if readiness.CandidateCount != 1 || readiness.BlockedCount != 0 || readiness.MissingDiagnosticSummaryCount != 0 || readiness.ReceiptHintMissingCount != 0 {
		t.Fatalf("counts = %#v, want one fully diagnosable candidate", readiness)
	}
	if !readiness.OperatorApproval.Required || readiness.OperatorApproval.Status != "missing" || len(readiness.OperatorApproval.MissingEvidenceAliases) == 0 {
		t.Fatalf("approval = %#v, want missing required approval evidence", readiness.OperatorApproval)
	}
	if readiness.ExecuteGuardrail.Enabled || !readiness.ExecuteGuardrail.DryRunOnly || readiness.ExecuteGuardrail.Irreversible {
		t.Fatalf("execute guardrail = %#v, want disabled dry-run-only guardrail", readiness.ExecuteGuardrail)
	}
	if readiness.DryRunId == "" || readiness.DryRunHash == "" || readiness.RetentionPolicyVersion != "gateway_projection_publish_attempt_retention.v1" {
		t.Fatalf("identity = %#v, want dry-run id/hash and policy version", readiness)
	}
	raw, err := json.Marshal(readiness)
	if err != nil {
		t.Fatalf("marshal readiness: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid", "rawGatewayResponse")
}

func TestGatewayProjectionPublishAttemptCleanupExecuteReadinessBlocksUnsafeDryRun(t *testing.T) {
	now := time.Date(2026, 6, 15, 15, 10, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:       "attempt-receipt-missing",
			OrganizationId:  "org-a",
			Source:          GatewayProjectionPublishAttemptSourceScheduled,
			Status:          "error",
			FailureCategory: "gateway_unavailable",
			CreatedAt:       now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	readiness, err := service.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		DryRunGeneratedAt:       now.Add(-time.Hour),
		MaxDryRunAgeSeconds:     60,
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteReadiness(unsafe) error = %v", err)
	}
	if readiness.Readiness != "blocked" || readiness.SafeNextAction != "rerun_cleanup_dry_run" {
		t.Fatalf("readiness = %#v, want blocked stale dry-run", readiness)
	}
	for _, reason := range []string{"cleanup_dry_run_stale", "diagnostic_summary_missing", "receipt_hint_missing", "cleanup_execution_not_enabled"} {
		if !containsString(readiness.DisabledReasons, reason) {
			t.Fatalf("disabled reasons = %#v, want %q", readiness.DisabledReasons, reason)
		}
	}
	if readiness.LastDryRunFreshness.Status != "stale" || readiness.MissingDiagnosticSummaryCount != 1 || readiness.ReceiptHintMissingCount != 1 {
		t.Fatalf("freshness/counts = %#v missing=%d receiptMissing=%d", readiness.LastDryRunFreshness, readiness.MissingDiagnosticSummaryCount, readiness.ReceiptHintMissingCount)
	}

	noCandidate, err := service.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          "org-missing",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		DryRunGeneratedAt:       now.Add(time.Minute),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteReadiness(no candidate) error = %v", err)
	}
	for _, reason := range []string{"no_cleanup_candidates", "cleanup_dry_run_generated_at_future", "cleanup_execution_not_enabled"} {
		if !containsString(noCandidate.DisabledReasons, reason) {
			t.Fatalf("no-candidate disabled reasons = %#v, want %q", noCandidate.DisabledReasons, reason)
		}
	}
}

func TestGatewayProjectionPublishAttemptCleanupExecuteReadinessReadyForApproval(t *testing.T) {
	now := time.Date(2026, 6, 15, 15, 20, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-ready",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-ready",
			SourceVersion:     "orgv-ready",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	readiness, err := service.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		MaxDryRunAgeSeconds:     900,
		Limit:                   20,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteReadiness(ready) error = %v", err)
	}
	if readiness.Readiness != "ready_for_approval" || readiness.SafeNextAction != "wait_for_cleanup_execute_gate" {
		t.Fatalf("readiness = %#v, want ready for approval without execution", readiness)
	}
	if readiness.OperatorApproval.Status != "ready" || len(readiness.OperatorApproval.MissingEvidenceAliases) != 0 {
		t.Fatalf("approval = %#v, want ready approval evidence", readiness.OperatorApproval)
	}
	if readiness.Export.Readiness != readiness.Readiness || readiness.Export.DryRunHash != readiness.DryRunHash || len(readiness.Export.Samples) != 0 {
		t.Fatalf("export = %#v, want sanitized summary without samples", readiness.Export)
	}
}

func TestGatewayProjectionCleanupApprovalAuditTrailRecordsSafeActions(t *testing.T) {
	now := time.Date(2026, 6, 15, 15, 30, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-ready",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-ready",
			SourceVersion:     "orgv-ready",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	readiness, err := service.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteReadiness() error = %v", err)
	}
	for _, action := range []string{"approve", "reject", "copy", "export", "refresh"} {
		record, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
			OrganizationId: "org-a",
			Action:         action,
			Readiness:      readiness,
			DisabledReasons: []string{
				"cleanup_execution_not_enabled",
				"https://gateway.example.invalid/rawGatewayResponse?token=projection-secret",
			},
		})
		if err != nil {
			t.Fatalf("RecordCleanupApprovalAuditTrail(%s) error = %v", action, err)
		}
		if record.StorageScope != GatewayProjectionCleanupApprovalAuditTrailStorageScope || record.ExecuteEnabled || !record.DryRunOnly {
			t.Fatalf("record guardrail = %#v, want fixed storage scope and disabled dry-run-only guardrail", record)
		}
	}

	trail, err := service.ListCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailQuery{
		OrganizationId: "org-a",
		ReadinessHash:  readiness.DryRunHash,
		Limit:          20,
	})
	if err != nil {
		t.Fatalf("ListCleanupApprovalAuditTrail() error = %v", err)
	}
	if trail.StorageScope != GatewayProjectionCleanupApprovalAuditTrailStorageScope || trail.Total != 5 {
		t.Fatalf("trail = %#v, want five records with storage scope", trail)
	}
	if trail.Summary.ActionCounts["approve"] != 1 || trail.Summary.ActionCounts["reject"] != 1 || trail.Summary.ActionCounts["copy"] != 1 || trail.Summary.ActionCounts["export"] != 1 || trail.Summary.ActionCounts["refresh"] != 1 {
		t.Fatalf("action counts = %#v, want all safe actions counted", trail.Summary.ActionCounts)
	}
	if trail.ExecuteGuardrail.Enabled || !trail.ExecuteGuardrail.DryRunOnly {
		t.Fatalf("trail guardrail = %#v, want disabled dry-run-only guardrail", trail.ExecuteGuardrail)
	}
	if len(attemptStore.records) != 1 || attemptStore.records[0].AttemptId != "attempt-ready" {
		t.Fatalf("approval audit mutated publish attempts: %#v", attemptStore.records)
	}
	raw, err := json.Marshal(trail)
	if err != nil {
		t.Fatalf("marshal trail: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid", "rawGatewayResponse")
}

func TestGatewayProjectionCleanupApprovalPolicyReadinessDerivesManualReviewState(t *testing.T) {
	now := time.Date(2026, 6, 16, 10, 0, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-policy-ready",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-policy-ready",
			SourceVersion:     "orgv-policy-ready",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	query := GatewayProjectionCleanupApprovalPolicyReadinessQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	}

	pending, err := service.CleanupApprovalPolicyReadiness(query)
	if err != nil {
		t.Fatalf("CleanupApprovalPolicyReadiness(empty audit) error = %v", err)
	}
	if pending.PolicyStatus != "cannot_infer" || !pending.CannotInfer.Value || !containsString(pending.CannotInfer.ReasonAliases, "approval_audit_trail_empty") {
		t.Fatalf("pending policy = %#v, want cannot infer from empty audit trail", pending)
	}
	if pending.StorageScope != "derived_policy_readiness_not_persisted" || pending.PolicyVersion != "gateway_projection_cleanup_approval_policy.v1" {
		t.Fatalf("scope/version = %#v/%#v, want derived policy readiness v1", pending.StorageScope, pending.PolicyVersion)
	}

	for _, action := range []string{"approve", "copy", "export"} {
		if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
			OrganizationId: "org-a",
			Action:         action,
			ReadinessHash:  pending.ReadinessHash,
			DryRunId:       pending.DryRunId,
			CandidateCount: pending.CandidateCount,
			BlockedCount:   pending.BlockedCount,
			SafeNextAction: pending.SafeNextAction,
		}); err != nil {
			t.Fatalf("RecordCleanupApprovalAuditTrail(%s) error = %v", action, err)
		}
	}

	ready, err := service.CleanupApprovalPolicyReadiness(query)
	if err != nil {
		t.Fatalf("CleanupApprovalPolicyReadiness(ready) error = %v", err)
	}
	if ready.PolicyStatus != "manual_review_ready" || ready.SafeNextAction != "wait_for_cleanup_execute_gate" || ready.ManualReview.Status != "ready" {
		t.Fatalf("ready policy = %#v, want manual-review-ready without execution", ready)
	}
	if ready.AuditSummary.ActionCounts["approve"] != 1 || ready.AuditSummary.ActionCounts["copy"] != 1 || ready.AuditSummary.ActionCounts["export"] != 1 {
		t.Fatalf("action counts = %#v, want approve/copy/export evidence", ready.AuditSummary.ActionCounts)
	}
	if ready.ExecuteGuardrail.Enabled || !ready.ExecuteGuardrail.DryRunOnly {
		t.Fatalf("execute guardrail = %#v, want disabled dry-run-only policy", ready.ExecuteGuardrail)
	}
	raw, err := json.Marshal(ready)
	if err != nil {
		t.Fatalf("marshal ready policy: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid", "rawGatewayResponse")
	if len(attemptStore.records) != 1 || attemptStore.records[0].AttemptId != "attempt-policy-ready" {
		t.Fatalf("policy readiness mutated publish attempts: %#v", attemptStore.records)
	}
}

func TestGatewayProjectionCleanupApprovalPolicyReadinessFailsClosed(t *testing.T) {
	now := time.Date(2026, 6, 16, 10, 30, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-policy-blocked",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-policy-blocked",
			SourceVersion:     "orgv-policy-blocked",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	query := GatewayProjectionCleanupApprovalPolicyReadinessQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	}
	readiness, err := service.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          query.OrganizationId,
		OlderThan:               query.OlderThan,
		ApprovalEvidenceAliases: query.ApprovalEvidenceAliases,
		Limit:                   query.Limit,
	})
	if err != nil {
		t.Fatalf("CleanupExecuteReadiness() error = %v", err)
	}
	if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
		OrganizationId: "org-a",
		Action:         "reject",
		Readiness:      readiness,
	}); err != nil {
		t.Fatalf("RecordCleanupApprovalAuditTrail(reject) error = %v", err)
	}

	rejected, err := service.CleanupApprovalPolicyReadiness(query)
	if err != nil {
		t.Fatalf("CleanupApprovalPolicyReadiness(rejected) error = %v", err)
	}
	if rejected.PolicyStatus != "blocked" || !containsString(rejected.CannotInfer.ReasonAliases, "approval_rejected") {
		t.Fatalf("rejected policy = %#v, want blocked approval_rejected", rejected)
	}

	mismatch, err := service.CleanupApprovalPolicyReadiness(GatewayProjectionCleanupApprovalPolicyReadinessQuery{
		OrganizationId: "org-a",
		ReadinessHash:  "dryrun-hash-other",
		OlderThan:      now.Add(-30 * 24 * time.Hour),
		Limit:          20,
	})
	if err != nil {
		t.Fatalf("CleanupApprovalPolicyReadiness(mismatch) error = %v", err)
	}
	if mismatch.PolicyStatus != "cannot_infer" || !containsString(mismatch.CannotInfer.ReasonAliases, "approval_audit_hash_mismatch") {
		t.Fatalf("mismatch policy = %#v, want cannot infer hash mismatch", mismatch)
	}
	if _, err := service.CleanupApprovalPolicyReadiness(GatewayProjectionCleanupApprovalPolicyReadinessQuery{}); err == nil {
		t.Fatalf("CleanupApprovalPolicyReadiness(empty org) error = nil, want organization required")
	}
}

func TestGatewayProjectionCleanupApprovalDecisionDraftReadinessDerivesCopySafeDraft(t *testing.T) {
	now := time.Date(2026, 6, 16, 11, 0, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-decision-ready",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-decision-ready",
			SourceVersion:     "orgv-decision-ready",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	query := GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	}
	policy, err := service.CleanupApprovalPolicyReadiness(GatewayProjectionCleanupApprovalPolicyReadinessQuery{
		OrganizationId:          query.OrganizationId,
		OlderThan:               query.OlderThan,
		ApprovalEvidenceAliases: query.ApprovalEvidenceAliases,
		Limit:                   query.Limit,
	})
	if err != nil {
		t.Fatalf("CleanupApprovalPolicyReadiness() error = %v", err)
	}
	for _, action := range []string{"approve", "copy", "export"} {
		if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
			OrganizationId: "org-a",
			Action:         action,
			ReadinessHash:  policy.ReadinessHash,
			DryRunId:       policy.DryRunId,
			CandidateCount: policy.CandidateCount,
			BlockedCount:   policy.BlockedCount,
			SafeNextAction: policy.SafeNextAction,
		}); err != nil {
			t.Fatalf("RecordCleanupApprovalAuditTrail(%s) error = %v", action, err)
		}
	}

	draft, err := service.CleanupApprovalDecisionDraftReadiness(query)
	if err != nil {
		t.Fatalf("CleanupApprovalDecisionDraftReadiness() error = %v", err)
	}
	if draft.DecisionReadiness != "draft_ready" || draft.DecisionState != "manual_review_ready_no_execution" {
		t.Fatalf("decision draft = %#v, want draft_ready manual_review_ready_no_execution", draft)
	}
	if draft.ExecutionMode != "manual_review_only" || draft.CleanupExecutionAllowed || draft.ExecuteGuardrail.Enabled || !draft.ExecuteGuardrail.DryRunOnly {
		t.Fatalf("execution boundary = mode %q allowed=%v guardrail=%#v, want read-only disabled", draft.ExecutionMode, draft.CleanupExecutionAllowed, draft.ExecuteGuardrail)
	}
	if draft.PolicyStatus != "manual_review_ready" || draft.ManualReviewChecklist.Status != "ready" || draft.CannotInfer.Value {
		t.Fatalf("policy/manual/cannotInfer = %s/%#v/%#v, want ready without cannot infer", draft.PolicyStatus, draft.ManualReviewChecklist, draft.CannotInfer)
	}
	if draft.DecisionDraftId == "" || draft.DecisionDraftHash == "" || len(draft.CopySafeLabels) == 0 || draft.RedactionSummary.Status != "redacted" {
		t.Fatalf("draft identifiers/redaction = %#v, want copy-safe redacted draft", draft)
	}
	draftStoreRecords := attemptStore.records
	if len(draftStoreRecords) != 1 || draftStoreRecords[0].AttemptId != "attempt-decision-ready" {
		t.Fatalf("decision draft mutated publish attempts: %#v", attemptStore.records)
	}
	raw, err := json.Marshal(draft)
	if err != nil {
		t.Fatalf("marshal draft: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid", "rawGatewayResponse")
}

func TestGatewayProjectionCleanupApprovalDecisionDraftReadinessFailsClosed(t *testing.T) {
	now := time.Date(2026, 6, 16, 11, 30, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-decision-blocked",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-decision-blocked",
			SourceVersion:     "orgv-decision-blocked",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	query := GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery{
		OrganizationId: "org-a",
		OlderThan:      now.Add(-30 * 24 * time.Hour),
		ReadinessHash:  "dryrun-hash-other",
		Limit:          20,
	}
	draft, err := service.CleanupApprovalDecisionDraftReadiness(query)
	if err != nil {
		t.Fatalf("CleanupApprovalDecisionDraftReadiness(mismatch) error = %v", err)
	}
	if draft.DecisionReadiness != "cannot_infer" || !draft.CannotInfer.Value || !containsString(draft.CannotInfer.ReasonAliases, "approval_audit_hash_mismatch") {
		t.Fatalf("mismatch draft = %#v, want cannot_infer hash mismatch", draft)
	}
	if draft.CleanupExecutionAllowed || draft.OperatorNextAction == "" || len(draft.BlockingReasons) == 0 {
		t.Fatalf("blocked fields = allowed %v next %q reasons %#v, want fail-closed guidance", draft.CleanupExecutionAllowed, draft.OperatorNextAction, draft.BlockingReasons)
	}
	if _, err := service.CleanupApprovalDecisionDraftReadiness(GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery{}); err == nil {
		t.Fatalf("CleanupApprovalDecisionDraftReadiness(empty org) error = nil, want organization required")
	}
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightDerivesNoFallbackEnvelope(t *testing.T) {
	now := time.Date(2026, 6, 16, 12, 0, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-gate-ready",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-gate-ready",
			SourceVersion:     "orgv-gate-ready",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	query := GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightQuery{
		OrganizationId:          "org-a",
		OlderThan:               now.Add(-30 * 24 * time.Hour),
		ApprovalEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
		Limit:                   20,
	}
	draft, err := service.CleanupApprovalDecisionDraftReadiness(GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery{
		OrganizationId:          query.OrganizationId,
		OlderThan:               query.OlderThan,
		ApprovalEvidenceAliases: query.ApprovalEvidenceAliases,
		Limit:                   query.Limit,
	})
	if err != nil {
		t.Fatalf("CleanupApprovalDecisionDraftReadiness() error = %v", err)
	}
	for _, action := range []string{"approve", "copy", "export"} {
		if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
			OrganizationId: "org-a",
			Action:         action,
			ReadinessHash:  draft.ReadinessHash,
			DryRunId:       draft.DryRunId,
			CandidateCount: draft.CandidateCount,
			BlockedCount:   draft.BlockedCount,
			SafeNextAction: draft.OperatorNextAction,
		}); err != nil {
			t.Fatalf("RecordCleanupApprovalAuditTrail(%s) error = %v", action, err)
		}
	}

	preflight, err := service.CleanupExecutionGateOwnerBoundaryPreflight(query)
	if err != nil {
		t.Fatalf("CleanupExecutionGateOwnerBoundaryPreflight() error = %v", err)
	}
	if preflight.GateReadiness != "owner_boundary_ready" || preflight.GateState != "owner_boundary_ready_no_execution" {
		t.Fatalf("gate preflight = %#v, want owner boundary ready without execution", preflight)
	}
	if preflight.ExecutionMode != "manual_review_only" || preflight.CleanupExecutionAllowed || preflight.ExecuteGuardrail.Enabled {
		t.Fatalf("execution boundary = mode %q allowed=%v guardrail=%#v, want read-only disabled", preflight.ExecutionMode, preflight.CleanupExecutionAllowed, preflight.ExecuteGuardrail)
	}
	if !preflight.OwnerBoundary.AdminAuthorityOnly || !preflight.NoFallback.Enforced || len(preflight.NoFallback.ForbiddenFallbackAliases) == 0 {
		t.Fatalf("owner/noFallback = %#v/%#v, want enforced Admin owner boundary", preflight.OwnerBoundary, preflight.NoFallback)
	}
	if preflight.GatePreflightId == "" || preflight.GatePreflightHash == "" || len(preflight.CopySafeLabels) == 0 || preflight.RedactionSummary.Status != "redacted" {
		t.Fatalf("preflight identifiers/redaction = %#v, want copy-safe redacted preflight", preflight)
	}
	if len(attemptStore.records) != 1 || attemptStore.records[0].AttemptId != "attempt-gate-ready" {
		t.Fatalf("execution gate preflight mutated publish attempts: %#v", attemptStore.records)
	}
	raw, err := json.Marshal(preflight)
	if err != nil {
		t.Fatalf("marshal preflight: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid", "rawGatewayResponse")
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightFailsClosed(t *testing.T) {
	now := time.Date(2026, 6, 16, 12, 30, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{
		records: []*GatewayProjectionPublishAttempt{{
			AttemptId:         "attempt-gate-blocked",
			OrganizationId:    "org-a",
			Status:            "error",
			ProjectionBatchId: "batch-gate-blocked",
			SourceVersion:     "orgv-gate-blocked",
			FailureCategory:   "gateway_unavailable",
			CreatedAt:         now.Add(-35 * 24 * time.Hour),
		}},
	}
	service := GatewayProjectionPublishAttemptHistoryService{Store: attemptStore, Now: func() time.Time { return now }}
	preflight, err := service.CleanupExecutionGateOwnerBoundaryPreflight(GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightQuery{
		OrganizationId: "org-a",
		OlderThan:      now.Add(-30 * 24 * time.Hour),
		ReadinessHash:  "dryrun-hash-other",
		Limit:          20,
	})
	if err != nil {
		t.Fatalf("CleanupExecutionGateOwnerBoundaryPreflight(mismatch) error = %v", err)
	}
	if preflight.GateReadiness != "cannot_infer" || !preflight.CannotInfer.Value || !containsString(preflight.CannotInfer.ReasonAliases, "approval_audit_hash_mismatch") {
		t.Fatalf("mismatch preflight = %#v, want cannot_infer hash mismatch", preflight)
	}
	if preflight.CleanupExecutionAllowed || !preflight.NoFallback.Enforced || len(preflight.ManualReviewBlockers) == 0 {
		t.Fatalf("blocked fields = allowed %v noFallback %#v blockers %#v, want fail-closed guidance", preflight.CleanupExecutionAllowed, preflight.NoFallback, preflight.ManualReviewBlockers)
	}
	if _, err := service.CleanupExecutionGateOwnerBoundaryPreflight(GatewayProjectionCleanupExecutionGateOwnerBoundaryPreflightQuery{}); err == nil {
		t.Fatalf("CleanupExecutionGateOwnerBoundaryPreflight(empty org) error = nil, want organization required")
	}
}

func TestGatewayProjectionCleanupExecutionGateOwnerBoundaryHelperBranches(t *testing.T) {
	readiness, state, action := gatewayProjectionCleanupExecutionGatePreflightState(nil)
	if readiness != "cannot_infer" || state != "decision_draft_unavailable" || action != "rerun_cleanup_approval_decision_draft_readiness" {
		t.Fatalf("nil preflight state = %s/%s/%s, want cannot infer rerun", readiness, state, action)
	}

	cases := []struct {
		decisionReadiness string
		readiness         string
		state             string
		action            string
		summary           string
	}{
		{"draft_ready", "owner_boundary_ready", "owner_boundary_ready_no_execution", "request_master_control_owner_boundary_review", "execution_gate_preflight_ready_for_owner_boundary_review_without_cleanup_execution"},
		{"manual_review_required", "manual_review_required", "manual_review_checklist_incomplete", "complete_manual_review_checklist", "execution_gate_preflight_waiting_for_manual_review_actions"},
		{"blocked", "blocked", "decision_draft_blocked", "review_owner_boundary_blockers", "execution_gate_preflight_blocked_by_decision_draft_or_policy"},
		{"cannot_infer", "cannot_infer", "decision_draft_cannot_infer", "refresh_cleanup_approval_decision_draft_readiness", "execution_gate_preflight_cannot_infer_required_evidence"},
		{"unexpected", "cannot_infer", "decision_draft_unknown", "refresh_cleanup_approval_decision_draft_readiness", "execution_gate_preflight_cannot_infer_required_evidence"},
	}
	for _, tc := range cases {
		gotReadiness, gotState, gotAction := gatewayProjectionCleanupExecutionGatePreflightState(&GatewayProjectionCleanupApprovalDecisionDraftReadiness{DecisionReadiness: tc.decisionReadiness})
		if gotReadiness != tc.readiness || gotState != tc.state || gotAction != tc.action {
			t.Fatalf("state(%s) = %s/%s/%s, want %s/%s/%s", tc.decisionReadiness, gotReadiness, gotState, gotAction, tc.readiness, tc.state, tc.action)
		}
		if got := gatewayProjectionCleanupExecutionGateSummary(tc.readiness); got != tc.summary {
			t.Fatalf("summary(%s) = %q, want %q", tc.readiness, got, tc.summary)
		}
	}
	blockers := gatewayProjectionCleanupExecutionGateManualReviewBlockers(&GatewayProjectionCleanupApprovalDecisionDraftReadiness{
		DecisionReadiness: "manual_review_required",
		ManualReviewChecklist: GatewayProjectionCleanupDecisionManualReviewChecklist{
			MissingActionAliases:   []string{"approve"},
			MissingEvidenceAliases: []string{"dry_run_export_reviewed"},
		},
	})
	if !containsString(blockers, "approve") || !containsString(blockers, "dry_run_export_reviewed") {
		t.Fatalf("manual blockers = %#v, want action and evidence blockers", blockers)
	}
	if boundary := buildGatewayProjectionCleanupExecutionGateOwnerBoundary(); !boundary.AdminAuthorityOnly || len(boundary.ForbiddenActionAliases) == 0 {
		t.Fatalf("owner boundary = %#v, want enforced forbidden actions", boundary)
	}
	if noFallback := buildGatewayProjectionCleanupExecutionGateNoFallback(); !noFallback.Enforced || len(noFallback.ForbiddenFallbackAliases) == 0 {
		t.Fatalf("noFallback = %#v, want enforced fallback list", noFallback)
	}
}

func TestGatewayProjectionCleanupApprovalDecisionDraftHelperBranches(t *testing.T) {
	readiness, state, action := gatewayProjectionCleanupApprovalDecisionDraftState(nil)
	if readiness != "cannot_infer" || state != "policy_readiness_unavailable" || action != "rerun_cleanup_approval_policy_readiness" {
		t.Fatalf("nil policy state = %s/%s/%s, want cannot infer rerun", readiness, state, action)
	}

	cases := []struct {
		policyStatus string
		readiness    string
		state        string
		action       string
		summary      string
	}{
		{"manual_review_ready", "draft_ready", "manual_review_ready_no_execution", "review_decision_draft_with_master_control", "decision_draft_ready_for_manual_review_without_cleanup_execution"},
		{"manual_review_required", "manual_review_required", "manual_review_checklist_incomplete", "complete_manual_review_checklist", "decision_draft_waiting_for_manual_review_actions"},
		{"blocked", "blocked", "approval_policy_blocked", "review_blocking_reasons", "decision_draft_blocked_by_policy_or_reject_action"},
		{"cannot_infer", "cannot_infer", "approval_policy_cannot_infer", "refresh_cleanup_approval_policy_readiness", "decision_draft_cannot_infer_required_evidence"},
		{"unexpected", "cannot_infer", "approval_policy_unknown", "refresh_cleanup_approval_policy_readiness", "decision_draft_cannot_infer_required_evidence"},
	}
	for _, tc := range cases {
		gotReadiness, gotState, gotAction := gatewayProjectionCleanupApprovalDecisionDraftState(&GatewayProjectionCleanupApprovalPolicyReadiness{PolicyStatus: tc.policyStatus})
		if gotReadiness != tc.readiness || gotState != tc.state || gotAction != tc.action {
			t.Fatalf("state(%s) = %s/%s/%s, want %s/%s/%s", tc.policyStatus, gotReadiness, gotState, gotAction, tc.readiness, tc.state, tc.action)
		}
		if got := gatewayProjectionCleanupApprovalDecisionSummary(tc.readiness); got != tc.summary {
			t.Fatalf("summary(%s) = %q, want %q", tc.readiness, got, tc.summary)
		}
	}

	reasons := gatewayProjectionCleanupApprovalDecisionBlockingReasons(nil)
	if !containsString(reasons, "cleanup_approval_policy_unavailable") {
		t.Fatalf("nil blocking reasons = %#v, want policy unavailable", reasons)
	}
	reasons = gatewayProjectionCleanupApprovalDecisionBlockingReasons(&GatewayProjectionCleanupApprovalPolicyReadiness{
		PolicyStatus: "manual_review_required",
		ManualReview: GatewayProjectionCleanupApprovalManualReview{
			Status:               "missing",
			MissingActionAliases: []string{"approve"},
		},
	})
	if !containsString(reasons, "manual_review_action_missing") {
		t.Fatalf("manual blocking reasons = %#v, want manual_review_action_missing", reasons)
	}
	reasons = gatewayProjectionCleanupApprovalDecisionBlockingReasons(&GatewayProjectionCleanupApprovalPolicyReadiness{PolicyStatus: "blocked"})
	if !containsString(reasons, "approval_policy_blocked") {
		t.Fatalf("blocked reasons = %#v, want approval_policy_blocked", reasons)
	}
}

func TestGatewayProjectionCleanupApprovalPolicyStatusBranches(t *testing.T) {
	manualReady := GatewayProjectionCleanupApprovalManualReview{Status: "ready"}
	manualMissing := GatewayProjectionCleanupApprovalManualReview{Status: "missing"}

	status, action := gatewayProjectionCleanupApprovalPolicyStatus(nil, manualReady, nil)
	if status != "cannot_infer" || action != "rerun_cleanup_execute_readiness" {
		t.Fatalf("nil execute policy = %s/%s, want cannot_infer/rerun_cleanup_execute_readiness", status, action)
	}
	status, action = gatewayProjectionCleanupApprovalPolicyStatus(&GatewayProjectionPublishAttemptCleanupExecuteReadiness{Readiness: "approval_required"}, manualMissing, []string{"approval_evidence_missing"})
	if status != "manual_review_required" || action != "collect_approval_package" {
		t.Fatalf("manual required policy = %s/%s, want manual_review_required/collect_approval_package", status, action)
	}
	status, action = gatewayProjectionCleanupApprovalPolicyStatus(&GatewayProjectionPublishAttemptCleanupExecuteReadiness{Readiness: "ready_for_approval"}, manualReady, nil)
	if status != "manual_review_ready" || action != "wait_for_cleanup_execute_gate" {
		t.Fatalf("ready policy = %s/%s, want manual_review_ready/wait_for_cleanup_execute_gate", status, action)
	}
	status, action = gatewayProjectionCleanupApprovalPolicyStatus(&GatewayProjectionPublishAttemptCleanupExecuteReadiness{Readiness: "unknown"}, manualReady, nil)
	if status != "cannot_infer" || action != "rerun_cleanup_execute_readiness" {
		t.Fatalf("fallback policy = %s/%s, want cannot_infer/rerun_cleanup_execute_readiness", status, action)
	}

	reasons := gatewayProjectionCleanupApprovalPolicyCannotInferReasons(
		&GatewayProjectionPublishAttemptCleanupExecuteReadiness{Readiness: "ready_for_approval"},
		&GatewayProjectionCleanupApprovalAuditTrail{Total: 1, Summary: GatewayProjectionCleanupApprovalAuditTrailSummary{ActionCounts: map[string]int{"approve": 1, "copy": 1, "export": 1}}},
		manualReady,
		"",
		"",
	)
	if !containsString(reasons, "readiness_hash_missing") {
		t.Fatalf("cannot infer reasons = %#v, want readiness_hash_missing", reasons)
	}
}

func TestGatewayProjectionCleanupApprovalAuditTrailFiltersAndDefensiveBranches(t *testing.T) {
	setupGatewayProjectionPublishAttemptTestOrmer(t)
	now := time.Date(2026, 6, 15, 15, 40, 0, 0, time.UTC)
	service := GatewayProjectionPublishAttemptHistoryService{Now: func() time.Time { return now }}
	if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{}); err == nil {
		t.Fatalf("RecordCleanupApprovalAuditTrail(empty org) error = nil, want fail-closed organization requirement")
	}
	if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{OrganizationId: "org-a", Action: "delete"}); err == nil {
		t.Fatalf("RecordCleanupApprovalAuditTrail(delete) error = nil, want invalid action")
	}
	if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
		OrganizationId: "org-a",
		Action:         "approve",
		ApprovalState:  "approved preview",
		ReadinessHash:  "dryrun-hash-a",
		CandidateCount: 3,
		BlockedCount:   1,
		DisabledReasons: []string{
			"approval_evidence_missing",
			"Cookie: secret",
			"approval_evidence_missing",
		},
		SafeNextAction: "collect approval package",
	}); err != nil {
		t.Fatalf("RecordCleanupApprovalAuditTrail(approve) error = %v", err)
	}
	if _, err := service.RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{
		OrganizationId: "org-a",
		Action:         "reject",
		ReadinessHash:  "dryrun-hash-b",
		CandidateCount: 2,
	}); err != nil {
		t.Fatalf("RecordCleanupApprovalAuditTrail(reject) error = %v", err)
	}

	filtered, err := service.ListCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailQuery{
		OrganizationId: "org-a",
		Action:         "approve",
		ApprovalState:  "approved_preview",
		ReadinessHash:  "dryrun-hash-a",
		Limit:          500,
	})
	if err != nil {
		t.Fatalf("ListCleanupApprovalAuditTrail(filtered) error = %v", err)
	}
	if filtered.Total != 1 || filtered.Filters.Limit != maxGatewayProjectionPublishAttemptLimit || filtered.Records[0].ApprovalState != "approved_preview" {
		t.Fatalf("filtered = %#v, want capped one approved preview record", filtered)
	}
	if filtered.Summary.CandidateCount != 3 || filtered.Summary.BlockedCount != 1 || filtered.Summary.DisabledReasonCount != 2 {
		t.Fatalf("summary = %#v, want candidate/block/unique disabled reason counts", filtered.Summary)
	}
	raw, err := json.Marshal(filtered.Export)
	if err != nil {
		t.Fatalf("marshal filtered export: %v", err)
	}
	assertDoesNotContainAny(t, string(raw), "projection-secret", "Authorization", "Cookie", "gateway.example.invalid", "rawGatewayResponse")

	if _, err := service.ListCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailQuery{}); err == nil {
		t.Fatalf("ListCleanupApprovalAuditTrail(empty org) error = nil, want organization required")
	}
	if _, err := service.ListCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailQuery{OrganizationId: "org-a", Action: "delete"}); err == nil {
		t.Fatalf("ListCleanupApprovalAuditTrail(invalid action) error = nil, want invalid action")
	}
	if _, err := (GatewayProjectionPublishAttemptHistoryService{Store: failingGatewayProjectionPublishAttemptStore{}}).ListCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailQuery{OrganizationId: "org-a"}); err == nil {
		t.Fatalf("ListCleanupApprovalAuditTrail(failing store) error = nil, want store error")
	}
	if _, err := (GatewayProjectionPublishAttemptHistoryService{Store: failingGatewayProjectionPublishAttemptStore{}}).RecordCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailRequest{OrganizationId: "org-a", Action: "approve"}); err == nil {
		t.Fatalf("RecordCleanupApprovalAuditTrail(failing store) error = nil, want store error")
	}
	if err := (defaultGatewayProjectionPublishAttemptStore{}).RecordGatewayProjectionCleanupApprovalAuditRecord(nil); err != nil {
		t.Fatalf("default record nil error = %v, want nil", err)
	}
	if got := cloneGatewayProjectionCleanupApprovalAuditRecord(nil); got != nil {
		t.Fatalf("clone nil approval audit = %#v, want nil", got)
	}
	nilRecord := (*GatewayProjectionCleanupApprovalAuditRecord)(nil)
	decodeGatewayProjectionCleanupApprovalAuditRecord(nilRecord)
	decoded := &GatewayProjectionCleanupApprovalAuditRecord{DisabledReasonsJSON: `["cleanup_execution_not_enabled"]`}
	decodeGatewayProjectionCleanupApprovalAuditRecord(decoded)
	if decoded.StorageScope != GatewayProjectionCleanupApprovalAuditTrailStorageScope || !decoded.DryRunOnly || decoded.DisabledReasons[0] != "cleanup_execution_not_enabled" {
		t.Fatalf("decoded = %#v, want defaults and decoded disabled reason", decoded)
	}
	if got := normalizeGatewayProjectionCleanupAuditAlias("   "); got != "" {
		t.Fatalf("empty alias = %q, want empty", got)
	}
	if got := sanitizeGatewayProjectionCleanupAuditIdentifier("", "readiness-hash"); got != "" {
		t.Fatalf("empty identifier = %q, want empty", got)
	}
	longID := strings.Repeat("a", 130)
	if got := sanitizeGatewayProjectionCleanupAuditIdentifier(longID, "readiness-hash"); !strings.HasPrefix(got, "readiness-hash-") {
		t.Fatalf("long identifier = %q, want hashed readiness-hash prefix", got)
	}
	if got := firstNonEmptyStringSlice(nil, []string{"fallback"}); len(got) != 1 || got[0] != "fallback" {
		t.Fatalf("first non-empty slice = %#v, want fallback", got)
	}
	if got := firstNonEmptyStringSlice(nil, nil); got != nil {
		t.Fatalf("empty slices = %#v, want nil", got)
	}
}

func TestGatewayProjectionPublishAttemptHistoryHandlesLimitsMissingAndRecordFailure(t *testing.T) {
	setupGatewayProjectionPublishAttemptTestOrmer(t)
	generatedAt := time.Date(2026, 6, 15, 13, 30, 0, 0, time.UTC)
	service := GatewayProjectionPublishAttemptHistoryService{Now: func() time.Time { return generatedAt }}
	if err := service.Record(nil); err != nil {
		t.Fatalf("Record(nil) error = %v", err)
	}
	if err := service.Record(&GatewayProjectionPublishAttempt{Source: GatewayProjectionPublishAttemptSourceManual}); err != nil {
		t.Fatalf("Record(empty organization) error = %v", err)
	}
	if err := service.Record(&GatewayProjectionPublishAttempt{
		OrganizationId: "org-a",
		Source:         GatewayProjectionPublishAttemptSourceManual,
		Status:         "ok",
		TraceId:        "trace-limit",
		CreatedAt:      generatedAt,
	}); err != nil {
		t.Fatalf("Record(limit) error = %v", err)
	}

	list, err := service.List(GatewayProjectionPublishAttemptQuery{
		OrganizationId: "org-a",
		From:           time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC),
		To:             time.Date(2100, 1, 1, 0, 0, 0, 0, time.UTC),
		Limit:          500,
	})
	if err != nil {
		t.Fatalf("List(limit) error = %v", err)
	}
	if list.Total != 1 || list.Filters.Limit != maxGatewayProjectionPublishAttemptLimit {
		t.Fatalf("List(limit) = %#v, want capped limit and one record", list)
	}
	missing, err := service.Detail(GatewayProjectionPublishAttemptQuery{AttemptId: "missing", OrganizationId: "org-a"})
	if err != nil || missing != nil {
		t.Fatalf("Detail(missing) = %#v err=%v, want nil nil", missing, err)
	}
	empty, err := service.Detail(GatewayProjectionPublishAttemptQuery{})
	if err != nil || empty != nil {
		t.Fatalf("Detail(empty) = %#v err=%v, want nil nil", empty, err)
	}
	if got := recordGatewayProjectionPublishAttemptSafely(service, nil); got != "" {
		t.Fatalf("record nil = %q, want empty attempt id", got)
	}
	if got := recordGatewayProjectionPublishAttemptSafely(GatewayProjectionPublishAttemptHistoryService{Store: failingGatewayProjectionPublishAttemptStore{}}, &GatewayProjectionPublishAttempt{OrganizationId: "org-a"}); got != "" {
		t.Fatalf("record failing store = %q, want empty attempt id", got)
	}
}

func TestGatewayProjectionPublishAttemptHelpersCoverDefensiveBranches(t *testing.T) {
	if got := normalizeGatewayProjectionAttemptStatus("", true); got != "ok" {
		t.Fatalf("normalize status success = %q, want ok", got)
	}
	if got := gatewayProjectionAttemptMapJSON(nil); got != "" {
		t.Fatalf("empty skipped reason json = %q, want empty", got)
	}
	if got := gatewayProjectionAttemptMetadataJSON(nil); got != "" {
		t.Fatalf("empty metadata json = %q, want empty", got)
	}
	if got := cloneGatewayProjectionPublishAttempt(nil); got != nil {
		t.Fatalf("clone nil = %#v, want nil", got)
	}
	if got := enrichGatewayProjectionPublishAttempt(nil, "org-a", time.Now()); got != nil {
		t.Fatalf("enrich nil = %#v, want nil", got)
	}
	cloned := cloneGatewayProjectionPublishAttempt(&GatewayProjectionPublishAttempt{
		SkippedByReasonJSON: `{"mapping_missing":2}`,
		MetadataJSON:        `{"readinessPublishable":"1"}`,
	})
	if cloned.SkippedByReason[GatewayProjectionSkipMappingMissing] != 2 || cloned.Metadata["readinessPublishable"] != "1" {
		t.Fatalf("clone json fallback = %#v, want decoded skipped reason and metadata", cloned)
	}
	if got := parseGatewayProjectionAttemptTime("not-rfc3339"); !got.IsZero() {
		t.Fatalf("parse invalid time = %s, want zero", got)
	}
}

func TestGatewayProjectionManualPublishRecordsBlockedAttempt(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 14, 0, 0, 0, time.UTC)
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{}
	service := GatewayProjectionManualPublishService{
		Store: &memoryGatewayProjectionSnapshotStore{
			snapshot: GatewayProjectionSnapshot{
				SourceConnections: []SourceConnection{{OrganizationId: "org-a", Status: SourceConnectionStatusDisabled, Freshness: PlatformFreshnessStale}},
				SyncBatch:         &OrgSyncBatch{OrganizationId: "org-a", OrgVersion: "orgv-a", FinishedAt: generatedAt},
			},
		},
		AttemptStore: attemptStore,
		Config:       GatewayProjectionPublisherConfig{Enabled: false},
		Now:          func() time.Time { return generatedAt },
	}

	result, err := service.Publish(context.Background(), GatewayProjectionManualPublishRequest{OrganizationID: "org-a", TraceID: "trace-blocked", Reason: "operator"})
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if result.AttemptID == "" || len(attemptStore.records) != 1 {
		t.Fatalf("manual blocked should record one attempt, result=%#v records=%#v", result, attemptStore.records)
	}
	record := attemptStore.records[0]
	if record.Source != GatewayProjectionPublishAttemptSourceManual || record.Status != "error" || record.FailureCategory != gatewayProjectionManualFailurePublisherDisabled {
		t.Fatalf("blocked attempt = %#v, want manual publisher_disabled", record)
	}
}

func TestGatewayProjectionManualPublishDefaultPublisherDoesNotDuplicateHistory(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 15, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(time.Hour))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-manual"
	input.Users[0].LastSeenBatchId = "batch-manual"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"success":true,"data":{"accepted":true}}`))
	}))
	defer server.Close()
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{}

	result, err := (GatewayProjectionManualPublishService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: GatewayProjectionSnapshot{
			SourceConnections: input.SourceConnections,
			Users:             input.Users,
			ApiUserMappings:   input.ApiUserMappings,
			Departments:       input.Departments,
			Memberships:       input.Memberships,
			SyncBatch:         input.SyncBatch,
		}},
		AttemptStore: attemptStore,
		Config: GatewayProjectionPublisherConfig{
			Enabled:      true,
			Endpoint:     server.URL,
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
			Timeout:      time.Second,
		},
		Now: func() time.Time { return generatedAt },
	}).Publish(context.Background(), GatewayProjectionManualPublishRequest{OrganizationID: "org-a", TraceID: "trace-manual-history"})
	if err != nil {
		t.Fatalf("Publish() error = %v", err)
	}
	if result.AttemptID == "" || len(attemptStore.records) != 1 {
		t.Fatalf("manual publish should record exactly one attempt, result=%#v records=%#v", result, attemptStore.records)
	}
	if attemptStore.records[0].Source != GatewayProjectionPublishAttemptSourceManual || attemptStore.records[0].Status != "ok" {
		t.Fatalf("manual attempt = %#v, want source manual ok", attemptStore.records[0])
	}
}

func TestGatewayProjectionServiceRecordsScheduledAttempt(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 16, 0, 0, 0, time.UTC)
	input := gatewayProjectionTestInput(generatedAt, generatedAt.Add(time.Hour))
	input.SourceConnections[0].Freshness = PlatformFreshnessFresh
	input.Users[0].OrgVersion = "orgv-scheduled"
	input.Users[0].LastSeenBatchId = "batch-scheduled"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"success":true,"data":{"idempotent":true}}`))
	}))
	defer server.Close()
	attemptStore := &memoryGatewayProjectionPublishAttemptStore{}

	result, err := (&GatewayProjectionService{
		Store: &memoryGatewayProjectionSnapshotStore{snapshot: GatewayProjectionSnapshot{
			SourceConnections: input.SourceConnections,
			Users:             input.Users,
			ApiUserMappings:   input.ApiUserMappings,
			Departments:       input.Departments,
			Memberships:       input.Memberships,
			SyncBatch:         input.SyncBatch,
		}},
		AttemptStore: attemptStore,
		Config: GatewayProjectionPublisherConfig{
			Endpoint:     server.URL,
			Token:        "projection-secret",
			Caller:       GatewayProjectionDefaultCaller,
			FreshnessTTL: time.Hour,
			Timeout:      time.Second,
		},
		Now: func() time.Time { return generatedAt },
	}).BuildAndPublishOrganization(context.Background(), "org-a", "trace-scheduled-history")
	if err != nil {
		t.Fatalf("BuildAndPublishOrganization() error = %v", err)
	}
	if !result.Publish.Success || len(attemptStore.records) != 1 {
		t.Fatalf("scheduled publish should succeed and record one attempt, result=%#v records=%#v", result, attemptStore.records)
	}
	record := attemptStore.records[0]
	if record.Source != GatewayProjectionPublishAttemptSourceScheduled || record.Status != "ok" || !record.Idempotent {
		t.Fatalf("scheduled attempt = %#v, want source scheduled idempotent ok", record)
	}
}

func setupGatewayProjectionPublishAttemptTestOrmer(t *testing.T) {
	t.Helper()

	engine, err := xorm.NewEngine("sqlite", filepath.Join(t.TempDir(), "gateway-projection-attempt.db"))
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(new(GatewayProjectionPublishAttempt)); err != nil {
		t.Fatalf("sync attempt table error = %v", err)
	}
	if err := engine.Sync2(new(GatewayProjectionCleanupApprovalAuditRecord)); err != nil {
		t.Fatalf("sync cleanup approval audit table error = %v", err)
	}

	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}

type memoryGatewayProjectionPublishAttemptStore struct {
	records         []*GatewayProjectionPublishAttempt
	approvalRecords []*GatewayProjectionCleanupApprovalAuditRecord
}

type failingGatewayProjectionPublishAttemptStore struct{}

func (f failingGatewayProjectionPublishAttemptStore) RecordGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) error {
	return errors.New("assert history store failure")
}

func (f failingGatewayProjectionPublishAttemptStore) ListGatewayProjectionPublishAttempts(query GatewayProjectionPublishAttemptQuery) ([]*GatewayProjectionPublishAttempt, error) {
	return nil, errors.New("assert history store failure")
}

func (f failingGatewayProjectionPublishAttemptStore) GetGatewayProjectionPublishAttempt(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error) {
	return nil, errors.New("assert history store failure")
}

func (f failingGatewayProjectionPublishAttemptStore) RecordGatewayProjectionCleanupApprovalAuditRecord(record *GatewayProjectionCleanupApprovalAuditRecord) error {
	return errors.New("assert history store failure")
}

func (f failingGatewayProjectionPublishAttemptStore) ListGatewayProjectionCleanupApprovalAuditRecords(query GatewayProjectionCleanupApprovalAuditTrailQuery) ([]*GatewayProjectionCleanupApprovalAuditRecord, error) {
	return nil, errors.New("assert history store failure")
}

func (s *memoryGatewayProjectionPublishAttemptStore) RecordGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) error {
	s.records = append(s.records, cloneGatewayProjectionPublishAttempt(attempt))
	return nil
}

func (s *memoryGatewayProjectionPublishAttemptStore) ListGatewayProjectionPublishAttempts(query GatewayProjectionPublishAttemptQuery) ([]*GatewayProjectionPublishAttempt, error) {
	result := []*GatewayProjectionPublishAttempt{}
	for _, record := range s.records {
		if query.OrganizationId != "" && record.OrganizationId != query.OrganizationId {
			continue
		}
		if query.Source != "" && record.Source != query.Source {
			continue
		}
		if query.Status != "" && record.Status != query.Status {
			continue
		}
		if query.FailureCategory != "" && record.FailureCategory != query.FailureCategory {
			continue
		}
		if !query.From.IsZero() && record.CreatedAt.Before(query.From) {
			continue
		}
		if !query.To.IsZero() && record.CreatedAt.After(query.To) {
			continue
		}
		result = append(result, cloneGatewayProjectionPublishAttempt(record))
		if query.Limit > 0 && len(result) >= query.Limit {
			break
		}
	}
	return result, nil
}

func (s *memoryGatewayProjectionPublishAttemptStore) GetGatewayProjectionPublishAttempt(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error) {
	for _, record := range s.records {
		if record.AttemptId == query.AttemptId {
			return cloneGatewayProjectionPublishAttempt(record), nil
		}
	}
	return nil, nil
}

func (s *memoryGatewayProjectionPublishAttemptStore) RecordGatewayProjectionCleanupApprovalAuditRecord(record *GatewayProjectionCleanupApprovalAuditRecord) error {
	s.approvalRecords = append(s.approvalRecords, cloneGatewayProjectionCleanupApprovalAuditRecord(record))
	return nil
}

func (s *memoryGatewayProjectionPublishAttemptStore) ListGatewayProjectionCleanupApprovalAuditRecords(query GatewayProjectionCleanupApprovalAuditTrailQuery) ([]*GatewayProjectionCleanupApprovalAuditRecord, error) {
	result := []*GatewayProjectionCleanupApprovalAuditRecord{}
	for i := len(s.approvalRecords) - 1; i >= 0; i-- {
		record := s.approvalRecords[i]
		if query.OrganizationId != "" && record.OrganizationId != query.OrganizationId {
			continue
		}
		if query.Action != "" && record.Action != query.Action {
			continue
		}
		if query.ApprovalState != "" && record.ApprovalState != query.ApprovalState {
			continue
		}
		if query.ReadinessHash != "" && record.ReadinessHash != query.ReadinessHash {
			continue
		}
		result = append(result, cloneGatewayProjectionCleanupApprovalAuditRecord(record))
		if query.Limit > 0 && len(result) >= query.Limit {
			break
		}
	}
	return result, nil
}

func assertDoesNotContainAny(t *testing.T, value string, forbidden ...string) {
	t.Helper()
	for _, item := range forbidden {
		if item != "" && strings.Contains(value, item) {
			t.Fatalf("value leaked forbidden substring %q: %s", item, value)
		}
	}
}
