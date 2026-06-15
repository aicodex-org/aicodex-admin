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
		result = append(result, cloneGatewayProjectionPublishAttempt(record))
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
