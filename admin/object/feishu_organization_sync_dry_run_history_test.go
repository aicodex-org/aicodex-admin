// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type fakeFeishuDryRunHistoryStore struct {
	histories []*FeishuOrganizationSyncDryRunHistory
	createErr error
	countErr  error
	listErr   error
	getErr    error
}

func (s *fakeFeishuDryRunHistoryStore) CreateFeishuOrganizationSyncDryRunHistory(history *FeishuOrganizationSyncDryRunHistory) error {
	if s.createErr != nil {
		return s.createErr
	}
	copy := *history
	copy.ReasonCounts = copyReasonCounts(history.ReasonCounts)
	if history.Diagnostics != nil {
		diagnostics := *history.Diagnostics
		copy.Diagnostics = &diagnostics
	}
	s.histories = append(s.histories, &copy)
	return nil
}

func (s *fakeFeishuDryRunHistoryStore) GetFeishuOrganizationSyncDryRunHistory(organization string, historyId string) (*FeishuOrganizationSyncDryRunHistory, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	for _, history := range s.histories {
		if history.Organization == organization && history.Name == historyId {
			return history, nil
		}
	}
	return nil, nil
}

func (s *fakeFeishuDryRunHistoryStore) GetFeishuOrganizationSyncDryRunHistories(filter FeishuOrganizationSyncDryRunHistoryFilter) ([]*FeishuOrganizationSyncDryRunHistory, error) {
	if s.listErr != nil {
		return nil, s.listErr
	}
	results := []*FeishuOrganizationSyncDryRunHistory{}
	limit := normalizeFeishuDryRunHistoryLimit(filter.Limit, filter.TopN)
	for _, history := range s.histories {
		if history.Organization != filter.Organization {
			continue
		}
		if filter.SourceConnectionIdHash != "" && history.SourceConnectionIdHash != filter.SourceConnectionIdHash {
			continue
		}
		if filter.Status != "" && history.Status != filter.Status {
			continue
		}
		if filter.DiagnosticAlias != "" && history.DiagnosticAlias != filter.DiagnosticAlias {
			continue
		}
		if !filter.CreatedFrom.IsZero() && history.CreatedAt.Before(filter.CreatedFrom) {
			continue
		}
		if !filter.CreatedTo.IsZero() && history.CreatedAt.After(filter.CreatedTo) {
			continue
		}
		results = append(results, history)
		if limit > 0 && len(results) >= limit {
			break
		}
	}
	return results, nil
}

func (s *fakeFeishuDryRunHistoryStore) GetFeishuOrganizationSyncDryRunHistoryCount(filter FeishuOrganizationSyncDryRunHistoryFilter) (int64, error) {
	if s.countErr != nil {
		return 0, s.countErr
	}
	histories, err := s.GetFeishuOrganizationSyncDryRunHistories(FeishuOrganizationSyncDryRunHistoryFilter{
		Organization:           filter.Organization,
		SourceConnectionIdHash: filter.SourceConnectionIdHash,
		Status:                 filter.Status,
		DiagnosticAlias:        filter.DiagnosticAlias,
		CreatedFrom:            filter.CreatedFrom,
		CreatedTo:              filter.CreatedTo,
		Limit:                  -1,
	})
	return int64(len(histories)), err
}

func TestFeishuOrganizationSyncDryRunPreviewRecordsSuccessfulHistorySummary(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 10, 30, 0, 0, time.UTC)
	store := &fakeFeishuDryRunHistoryStore{}
	service := &FeishuOrganizationSyncDryRunPreviewService{
		Now:           func() time.Time { return now },
		HistoryStore:  store,
		Operator:      "engineering/alice@example.test",
		RequestMarker: "req-preview-1",
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return &fakeFeishuSnapshotClient{
				token:       &FeishuAccessToken{TenantAccessToken: "token"},
				departments: []FeishuDepartmentSnapshot{{Id: "od-root", ParentId: "0", Name: "Root"}},
				users: []FeishuUserSnapshot{{
					UserId:           "ou_1",
					OpenId:           "open_1",
					UnionId:          "union_1",
					TenantKey:        "tenant-a",
					Name:             "Alice",
					Email:            "alice@example.test",
					Mobile:           "13800138000",
					Departments:      []string{"od-root"},
					MainDepartmentId: "od-root",
				}},
			}
		},
	}

	preview, err := service.Preview(context.Background(), &FeishuOrganizationSyncConfig{
		Organization:           "engineering",
		AppId:                  "cli_1",
		AppSecret:              "real-secret",
		EndpointMode:           FeishuEndpointModeDomestic,
		IsEnabled:              true,
		SoftDisableMissingData: true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusSucceeded || preview.HistoryWarning != "" {
		t.Fatalf("preview status=%q warning=%q, want succeeded without warning", preview.Status, preview.HistoryWarning)
	}
	if len(store.histories) != 1 {
		t.Fatalf("history count = %d, want 1", len(store.histories))
	}
	history := store.histories[0]
	if history.Status != FeishuOrganizationSyncDryRunPreviewStatusSucceeded || history.Organization != "engineering" {
		t.Fatalf("history = %+v, want succeeded engineering", history)
	}
	if !strings.HasPrefix(history.RequestMarker, "request-") || !strings.HasPrefix(history.OperatorHash, "operator-") {
		t.Fatalf("request/operator = %q/%q, want marker and operator hash", history.RequestMarker, history.OperatorHash)
	}
	if history.AppAlias != preview.Source.AppAlias || history.TenantAlias != preview.Source.TenantAlias || history.SourceConnectionIdHash == "" {
		t.Fatalf("source aliases not preserved: history=%+v preview=%+v", history, preview.Source)
	}
	if history.SnapshotDepartmentCount != 1 || history.SnapshotUserCount != 1 || history.SnapshotMembershipCount != 1 {
		t.Fatalf("snapshot counts = %d/%d/%d, want 1/1/1", history.SnapshotDepartmentCount, history.SnapshotUserCount, history.SnapshotMembershipCount)
	}
	if history.DepartmentToCreate != 1 || history.UserToCreate != 1 || history.MembershipToCreate != 1 {
		t.Fatalf("diff create counts = %d/%d/%d, want 1/1/1", history.DepartmentToCreate, history.UserToCreate, history.MembershipToCreate)
	}
	if !history.RedactionApplied || history.RedactionVersion == "" || history.RetentionDays <= 0 || history.RetentionExpiresAt.IsZero() {
		t.Fatalf("retention/redaction metadata missing: %+v", history)
	}
	serialized := history.ReasonCountsJson + history.DiagnosticsJson + history.SafeSummary + history.OperatorHash
	for _, forbidden := range []string{"real-secret", "token", "alice@example.test", "13800138000", "open_1", "union_1", "ou_1"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("history serialized data contains forbidden value %q: %s", forbidden, serialized)
		}
	}
}

func TestFeishuOrganizationSyncDryRunPreviewRecordsFailClosedHistory(t *testing.T) {
	now := time.Date(2026, 6, 15, 11, 0, 0, 0, time.UTC)
	store := &fakeFeishuDryRunHistoryStore{}
	service := &FeishuOrganizationSyncDryRunPreviewService{
		Now:           func() time.Time { return now },
		HistoryStore:  store,
		Operator:      "engineering/bob",
		RequestMarker: "req-preview-failed",
	}

	preview, err := service.Preview(context.Background(), &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		AppSecret:    FeishuOrganizationSyncMaskedSecret,
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusFailed || preview.Diagnostics == nil {
		t.Fatalf("preview = %+v, want failed diagnostics", preview)
	}
	if len(store.histories) != 1 {
		t.Fatalf("history count = %d, want 1", len(store.histories))
	}
	history := store.histories[0]
	if history.Status != FeishuOrganizationSyncDryRunPreviewStatusFailed || history.DiagnosticAlias != FeishuOrganizationSyncDryRunReasonCredentialMissing {
		t.Fatalf("history status/diagnostic = %q/%q, want failed credential_missing", history.Status, history.DiagnosticAlias)
	}
	if history.SafeSummary == "" || strings.Contains(history.SafeSummary, FeishuOrganizationSyncMaskedSecret) {
		t.Fatalf("safe summary = %q, want redacted non-empty", history.SafeSummary)
	}
	if history.ReasonCounts[FeishuOrganizationSyncDryRunReasonCredentialMissing] != 1 {
		t.Fatalf("reason counts = %+v, want credential_missing=1", history.ReasonCounts)
	}
}

func TestFeishuOrganizationSyncDryRunPreviewPreservesResultWhenHistoryStoreFails(t *testing.T) {
	store := &fakeFeishuDryRunHistoryStore{createErr: errors.New("database offline secret=real-secret")}
	service := &FeishuOrganizationSyncDryRunPreviewService{
		Now:          func() time.Time { return time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC) },
		HistoryStore: store,
		NewSnapshotClient: func(appId string, appSecret string, endpointMode string) FeishuOrganizationSnapshotClient {
			return &fakeFeishuSnapshotClient{token: &FeishuAccessToken{TenantAccessToken: "token"}}
		},
	}

	preview, err := service.Preview(context.Background(), &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		AppSecret:    "real-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		IsEnabled:    true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != FeishuOrganizationSyncDryRunPreviewStatusSucceeded {
		t.Fatalf("preview status = %q, want succeeded", preview.Status)
	}
	if preview.HistoryWarning == "" {
		t.Fatalf("history warning empty, want safe warning")
	}
	if strings.Contains(preview.HistoryWarning, "real-secret") || strings.Contains(preview.HistoryWarning, "database offline") {
		t.Fatalf("history warning = %q, want sanitized generic warning", preview.HistoryWarning)
	}
}

func TestFeishuOrganizationSyncDryRunHistoryServiceFiltersAndReturnsSafeDetail(t *testing.T) {
	now := time.Date(2026, 6, 15, 13, 0, 0, 0, time.UTC)
	store := &fakeFeishuDryRunHistoryStore{
		histories: []*FeishuOrganizationSyncDryRunHistory{
			{
				Owner:                  "engineering",
				Name:                   "history-1",
				CreatedAt:              now,
				Organization:           "engineering",
				Status:                 FeishuOrganizationSyncDryRunPreviewStatusSucceeded,
				SourceConnectionIdHash: "source-a",
				DiagnosticAlias:        "none",
				SafeSummary:            "ok",
			},
			{
				Owner:                  "engineering",
				Name:                   "history-2",
				CreatedAt:              now.Add(-time.Hour),
				Organization:           "engineering",
				Status:                 FeishuOrganizationSyncDryRunPreviewStatusFailed,
				SourceConnectionIdHash: "source-a",
				DiagnosticAlias:        FeishuOrganizationSyncDryRunReasonContactPermissionMissing,
				SafeSummary:            "permission denied user_id=***",
			},
			{
				Owner:        "other",
				Name:         "history-3",
				CreatedAt:    now,
				Organization: "other",
				Status:       FeishuOrganizationSyncDryRunPreviewStatusFailed,
			},
		},
	}
	service := &FeishuOrganizationSyncDryRunHistoryService{Store: store}

	histories, count, err := service.GetHistories(FeishuOrganizationSyncDryRunHistoryFilter{
		Organization:           "engineering",
		SourceConnectionIdHash: "source-a",
		Status:                 FeishuOrganizationSyncDryRunPreviewStatusFailed,
		DiagnosticAlias:        FeishuOrganizationSyncDryRunReasonContactPermissionMissing,
		CreatedFrom:            now.Add(-2 * time.Hour),
		CreatedTo:              now.Add(time.Minute),
		TopN:                   5,
	})
	if err != nil {
		t.Fatalf("GetHistories() error = %v", err)
	}
	if count != 1 || len(histories) != 1 || histories[0].Name != "history-2" {
		t.Fatalf("histories/count = %+v/%d, want history-2 only", histories, count)
	}
	detail, err := service.GetHistory("engineering", "history-2")
	if err != nil {
		t.Fatalf("GetHistory() error = %v", err)
	}
	if detail == nil || detail.Name != "history-2" {
		t.Fatalf("detail = %+v, want history-2", detail)
	}
	if strings.Contains(detail.SafeSummary, "ou_") || strings.Contains(detail.SafeSummary, "open_") || strings.Contains(detail.SafeSummary, "@") {
		t.Fatalf("detail safe summary leaked identifier: %q", detail.SafeSummary)
	}
	missing, err := service.GetHistory("engineering", "history-3")
	if err != nil {
		t.Fatalf("GetHistory(other org) error = %v", err)
	}
	if missing != nil {
		t.Fatalf("GetHistory(other org) = %+v, want nil", missing)
	}
}

func TestFeishuOrganizationSyncDryRunHistoryDefaultStorePersistsAndFilters(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 14, 0, 0, 0, time.UTC)
	store := defaultFeishuOrganizationSyncDryRunHistoryStore{}
	first := &FeishuOrganizationSyncDryRunHistory{
		Owner:                  "engineering",
		Name:                   "history-db-1",
		CreatedAt:              now,
		Organization:           "engineering",
		Status:                 FeishuOrganizationSyncDryRunPreviewStatusFailed,
		SourceConnectionIdHash: "source-db",
		DiagnosticAlias:        FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired,
		ReasonCounts:           map[string]int{FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired: 1},
		Diagnostics:            buildFeishuDryRunDiagnostics(FeishuOrganizationSyncDiagnosticStageTenantToken, FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired, "tenant_access_token=user_id=ou_1 alice@example.test"),
		SafeSummary:            "tenant_access_token=user_id=ou_1 alice@example.test",
		RetentionDays:          90,
		RetentionExpiresAt:     now.AddDate(0, 0, 90),
		RedactionApplied:       true,
		RedactionVersion:       FeishuOrganizationSyncDryRunHistoryRedactionV1,
	}
	second := &FeishuOrganizationSyncDryRunHistory{
		Owner:                  "engineering",
		Name:                   "history-db-2",
		CreatedAt:              now.Add(-time.Hour),
		Organization:           "engineering",
		Status:                 FeishuOrganizationSyncDryRunPreviewStatusSucceeded,
		SourceConnectionIdHash: "source-db",
		DiagnosticAlias:        "none",
		RetentionDays:          90,
		RetentionExpiresAt:     now.AddDate(0, 0, 90),
		RedactionApplied:       true,
		RedactionVersion:       FeishuOrganizationSyncDryRunHistoryRedactionV1,
	}
	if err := store.CreateFeishuOrganizationSyncDryRunHistory(first); err != nil {
		t.Fatalf("Create first history error = %v", err)
	}
	if err := store.CreateFeishuOrganizationSyncDryRunHistory(second); err != nil {
		t.Fatalf("Create second history error = %v", err)
	}

	service := &FeishuOrganizationSyncDryRunHistoryService{}
	histories, count, err := service.GetHistories(FeishuOrganizationSyncDryRunHistoryFilter{
		Organization:           "engineering",
		SourceConnectionIdHash: "source-db",
		Status:                 FeishuOrganizationSyncDryRunPreviewStatusFailed,
		DiagnosticAlias:        FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired,
		CreatedFrom:            time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedTo:              time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC),
		Limit:                  10,
	})
	if err != nil {
		t.Fatalf("GetHistories() error = %v", err)
	}
	if count != 1 || len(histories) != 1 || histories[0].Name != "history-db-1" {
		t.Fatalf("histories/count = %+v/%d, want failed history-db-1", histories, count)
	}
	if histories[0].ReasonCounts[FeishuOrganizationSyncDryRunReasonRuntimeAuthorizationRequired] != 1 || histories[0].Diagnostics == nil {
		t.Fatalf("hydrated history = %+v, want reason counts and diagnostics", histories[0])
	}
	detail, err := service.GetHistory("engineering", "history-db-1")
	if err != nil {
		t.Fatalf("GetHistory() error = %v", err)
	}
	if detail == nil || strings.Contains(detail.SafeSummary, "alice@example.test") || strings.Contains(detail.SafeSummary, "ou_1") {
		t.Fatalf("detail = %+v, want redacted safe summary", detail)
	}
}

func TestFeishuOrganizationSyncDryRunHistoryServiceValidatesRequiredInputs(t *testing.T) {
	service := &FeishuOrganizationSyncDryRunHistoryService{Store: &fakeFeishuDryRunHistoryStore{}}
	if _, _, err := service.GetHistories(FeishuOrganizationSyncDryRunHistoryFilter{}); err == nil {
		t.Fatalf("GetHistories(empty org) expected error")
	}
	if _, err := service.GetHistory("", "history-1"); err == nil {
		t.Fatalf("GetHistory(empty org) expected error")
	}
	if _, err := service.GetHistory("engineering", ""); err == nil {
		t.Fatalf("GetHistory(empty id) expected error")
	}

	service = &FeishuOrganizationSyncDryRunHistoryService{Store: &fakeFeishuDryRunHistoryStore{countErr: errors.New("count failed")}}
	if _, _, err := service.GetHistories(FeishuOrganizationSyncDryRunHistoryFilter{Organization: "engineering"}); err == nil {
		t.Fatalf("GetHistories(count error) expected error")
	}
	service = &FeishuOrganizationSyncDryRunHistoryService{Store: &fakeFeishuDryRunHistoryStore{listErr: errors.New("list failed")}}
	if _, _, err := service.GetHistories(FeishuOrganizationSyncDryRunHistoryFilter{Organization: "engineering"}); err == nil {
		t.Fatalf("GetHistories(list error) expected error")
	}
	service = &FeishuOrganizationSyncDryRunHistoryService{Store: &fakeFeishuDryRunHistoryStore{getErr: errors.New("get failed")}}
	if _, err := service.GetHistory("engineering", "history-1"); err == nil {
		t.Fatalf("GetHistory(get error) expected error")
	}
}

func TestFeishuDryRunHistoryHelpersHandleFallbackBranches(t *testing.T) {
	now := time.Date(2026, 6, 15, 15, 0, 0, 0, time.UTC)
	if normalizeFeishuDryRunHistoryLimit(200, 0) != 100 {
		t.Fatalf("limit clamp failed")
	}
	if normalizeFeishuDryRunHistoryLimit(50, 5) != 5 {
		t.Fatalf("topN override failed")
	}
	if normalizeFeishuDryRunHistoryLimit(-1, 0) != -1 {
		t.Fatalf("unlimited limit failed")
	}
	if buildFeishuDryRunOperatorHash("engineering", "") == "" {
		t.Fatalf("empty operator hash should fallback")
	}
	if safeFeishuDryRunRequestMarker("", "engineering", now) == "" {
		t.Fatalf("empty request marker should fallback")
	}
	if newFeishuDryRunHistoryFromPreview(nil, "", "", now) != nil {
		t.Fatalf("nil preview should not build history")
	}
	var nilHistory *FeishuOrganizationSyncDryRunHistory
	nilHistory.syncFeishuDryRunHistoryJson()
	if hydrateFeishuDryRunHistory(nil) != nil || maskFeishuDryRunHistory(nil) != nil {
		t.Fatalf("nil history helpers should return nil")
	}
	if err := (defaultFeishuOrganizationSyncDryRunHistoryStore{}).CreateFeishuOrganizationSyncDryRunHistory(nil); err != nil {
		t.Fatalf("Create nil history error = %v", err)
	}
	setupFeishuOrganizationSyncSqlite(t)
	missing, err := (defaultFeishuOrganizationSyncDryRunHistoryStore{}).GetFeishuOrganizationSyncDryRunHistory("engineering", "missing")
	if err != nil || missing != nil {
		t.Fatalf("missing default store history = %+v err=%v, want nil nil", missing, err)
	}
	service := &FeishuOrganizationSyncDryRunPreviewService{}
	if service.operator() != "" || service.requestMarker() != "" {
		t.Fatalf("empty service operator/request marker should be empty")
	}
	if (*FeishuOrganizationSyncDryRunPreviewService)(nil).operator() != "" || (*FeishuOrganizationSyncDryRunPreviewService)(nil).requestMarker() != "" {
		t.Fatalf("nil service operator/request marker should be empty")
	}
	service.Operator = "engineering/alice"
	service.RequestMarker = "req-1"
	if service.operator() != "engineering/alice" || service.requestMarker() != "req-1" {
		t.Fatalf("operator/request marker accessors returned wrong values")
	}
	service.recordHistory(nil)
	oldOrmer := ormer
	ormer = nil
	service.recordHistory(&FeishuOrganizationSyncDryRunPreview{Status: FeishuOrganizationSyncDryRunPreviewStatusSucceeded})
	ormer = oldOrmer
}
