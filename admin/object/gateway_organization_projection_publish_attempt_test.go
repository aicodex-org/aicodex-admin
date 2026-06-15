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

	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}

type memoryGatewayProjectionPublishAttemptStore struct {
	records []*GatewayProjectionPublishAttempt
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

func assertDoesNotContainAny(t *testing.T, value string, forbidden ...string) {
	t.Helper()
	for _, item := range forbidden {
		if item != "" && strings.Contains(value, item) {
			t.Fatalf("value leaked forbidden substring %q: %s", item, value)
		}
	}
}
