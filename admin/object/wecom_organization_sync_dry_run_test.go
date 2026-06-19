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

	"github.com/xorm-io/xorm"
)

type fakeWecomDryRunHistoryStore struct {
	histories []*WecomOrganizationSyncDryRunHistory
	createErr error
	countErr  error
	listErr   error
	getErr    error
}

type failingWecomDryRunExistingStateStore struct {
	*memoryWecomOrganizationObjectStore
}

func (s failingWecomDryRunExistingStateStore) GetWecomOrganizationSyncExistingState(organization string, corpId string) (*WecomOrganizationSyncExistingState, error) {
	return nil, errors.New("existing state unavailable")
}

func (s *fakeWecomDryRunHistoryStore) CreateWecomOrganizationSyncDryRunHistory(history *WecomOrganizationSyncDryRunHistory) error {
	if s.createErr != nil {
		return s.createErr
	}
	copied := *history
	copied.ReasonCounts = copyReasonCounts(history.ReasonCounts)
	if history.Diagnostics != nil {
		diagnostics := *history.Diagnostics
		copied.Diagnostics = &diagnostics
	}
	s.histories = append(s.histories, &copied)
	return nil
}

func (s *fakeWecomDryRunHistoryStore) GetWecomOrganizationSyncDryRunHistory(organization string, historyId string) (*WecomOrganizationSyncDryRunHistory, error) {
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

func (s *fakeWecomDryRunHistoryStore) GetWecomOrganizationSyncDryRunHistories(filter WecomOrganizationSyncDryRunHistoryFilter) ([]*WecomOrganizationSyncDryRunHistory, error) {
	if s.listErr != nil {
		return nil, s.listErr
	}
	results := []*WecomOrganizationSyncDryRunHistory{}
	limit := normalizeWecomDryRunHistoryLimit(filter.Limit, filter.TopN)
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

func (s *fakeWecomDryRunHistoryStore) GetWecomOrganizationSyncDryRunHistoryCount(filter WecomOrganizationSyncDryRunHistoryFilter) (int64, error) {
	if s.countErr != nil {
		return 0, s.countErr
	}
	histories, err := s.GetWecomOrganizationSyncDryRunHistories(WecomOrganizationSyncDryRunHistoryFilter{
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

func TestWecomOrganizationSyncDryRunPreviewSummarizesDiffAndDoesNotWrite(t *testing.T) {
	now := time.Date(2026, 6, 18, 10, 0, 0, 0, time.UTC)
	objectStore := newMemoryWecomOrganizationObjectStore()
	seedWecomDryRunExistingState(objectStore)
	historyStore := &fakeWecomDryRunHistoryStore{}
	service := &WecomOrganizationSyncDryRunPreviewService{
		Now:          func() time.Time { return now },
		ObjectStore:  objectStore,
		HistoryStore: historyStore,
		Operator:     "engineering/alice@example.test",
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return &fakeWecomOrganizationSnapshotClient{
				token: &WecomAccessToken{AccessToken: "fake-access-token"},
				departments: []WecomDepartmentSnapshot{
					{Id: "1", ParentId: "0", Name: "总部", DepartmentLeader: []string{"alice"}, HasDepartmentLeaderField: true},
					{Id: "2", ParentId: "1", Name: "研发部", DepartmentLeader: []string{"bob"}, HasDepartmentLeaderField: true},
				},
				users: []WecomUserSnapshot{
					{UserId: "alice", Name: "Alice Updated", Departments: []string{"1", "2"}, MainDepartmentId: "1", IsLeaderInDepartment: []bool{true, false}, DirectLeaders: []string{"bob"}, HasDirectLeaderField: true, HasIsLeaderInDepartmentField: true},
					{UserId: "charlie", Name: "Charlie", Departments: []string{"2"}, MainDepartmentId: "2", HasDirectLeaderField: true, HasIsLeaderInDepartmentField: true},
				},
			}
		},
	}

	preview, err := service.Preview(context.Background(), &WecomOrganizationSyncConfig{
		Organization:           "engineering",
		CorpId:                 "ww123",
		AddressBookSecret:      "fake-secret",
		IsEnabled:              true,
		SoftDisableMissingData: true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != WecomOrganizationSyncDryRunPreviewStatusSucceeded {
		t.Fatalf("preview status = %q diagnostics=%+v", preview.Status, preview.Diagnostics)
	}
	if preview.Source.CorpAlias == "" || strings.Contains(preview.Source.CorpAlias, "ww123") {
		t.Fatalf("corp alias = %q, want non-empty masked alias", preview.Source.CorpAlias)
	}
	if preview.SnapshotStats.DepartmentCount != 2 || preview.SnapshotStats.UserCount != 2 || preview.SnapshotStats.RelationshipCount != 6 {
		t.Fatalf("snapshot stats = %+v, want 2 departments, 2 users, 6 relationships", preview.SnapshotStats)
	}
	assertWecomDryRunCounts(t, "departments", preview.Diff.Departments, WecomOrganizationSyncDryRunDiffCounts{ToCreate: 1, ToUpdate: 1, ToSoftDisable: 1})
	assertWecomDryRunCounts(t, "users", preview.Diff.Users, WecomOrganizationSyncDryRunDiffCounts{ToCreate: 1, ToUpdate: 1, ToSoftDisable: 1})
	assertWecomDryRunCounts(t, "relationships", preview.Diff.Relationships, WecomOrganizationSyncDryRunDiffCounts{ToCreate: 5, ToUpdate: 1, ToSoftDisable: 1})
	if preview.ReasonCounts[wecomDryRunReasonWouldSoftDisable] == 0 {
		t.Fatalf("reasonCounts = %+v, want would_soft_disable", preview.ReasonCounts)
	}
	if len(objectStore.savedGroupNames) != 0 || len(objectStore.savedUserNames) != 0 || len(objectStore.sourceConnections) != 0 || len(objectStore.platformUsers) != 0 {
		t.Fatalf("dry-run wrote local objects: groups=%v users=%v sources=%v platformUsers=%v", objectStore.savedGroupNames, objectStore.savedUserNames, objectStore.sourceConnections, objectStore.platformUsers)
	}
	if len(historyStore.histories) != 1 {
		t.Fatalf("history count = %d, want 1", len(historyStore.histories))
	}
	history := historyStore.histories[0]
	if history.Status != WecomOrganizationSyncDryRunPreviewStatusSucceeded || history.DepartmentToCreate != 1 || history.UserToCreate != 1 || history.RelationshipToCreate != 5 {
		t.Fatalf("history summary = %+v, want successful diff counts", history)
	}
	serialized := history.CorpAlias + history.OperatorHash + history.RequestMarker + history.SafeSummary + history.ReasonCountsJson + history.DiagnosticsJson
	for _, forbidden := range []string{"ww123", "fake-secret", "fake-access-token", "alice@example.test"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("history serialized data leaked %q: %s", forbidden, serialized)
		}
	}
}

func TestWecomOrganizationSyncDryRunPreviewFailsClosedWithoutSecret(t *testing.T) {
	historyStore := &fakeWecomDryRunHistoryStore{}
	service := &WecomOrganizationSyncDryRunPreviewService{
		HistoryStore: historyStore,
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			t.Fatalf("Preview() must not create WeCom client when secret is missing")
			return nil
		},
	}

	preview, err := service.Preview(context.Background(), &WecomOrganizationSyncConfig{
		Organization: "engineering",
		CorpId:       "ww123",
		IsEnabled:    true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != WecomOrganizationSyncDryRunPreviewStatusFailed || preview.Diagnostics == nil {
		t.Fatalf("preview = %+v, want failed diagnostics", preview)
	}
	if preview.Diagnostics.ReasonCode != WecomOrganizationSyncDryRunReasonCredentialMissing {
		t.Fatalf("reason = %q, want credential_missing", preview.Diagnostics.ReasonCode)
	}
	if len(historyStore.histories) != 1 || historyStore.histories[0].DiagnosticAlias != WecomOrganizationSyncDryRunReasonCredentialMissing {
		t.Fatalf("history = %+v, want fail-closed credential history", historyStore.histories)
	}
}

func TestWecomOrganizationSyncDryRunPreviewRedactsProviderFailure(t *testing.T) {
	service := &WecomOrganizationSyncDryRunPreviewService{
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return &fakeWecomOrganizationSnapshotClient{
				token: &WecomAccessToken{AccessToken: "fake-access-token"},
				users: []WecomUserSnapshot{},
			}
		},
	}
	preview, err := service.Preview(context.Background(), &WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "fake-secret",
		IsEnabled:         true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != WecomOrganizationSyncDryRunPreviewStatusFailed || preview.Diagnostics == nil {
		t.Fatalf("preview = %+v, want failed diagnostics", preview)
	}
	if preview.Diagnostics.ReasonCode != WecomOrganizationSyncDryRunReasonContractMismatch {
		t.Fatalf("reason = %q, want contract_mismatch for missing required fields", preview.Diagnostics.ReasonCode)
	}
	for _, leaked := range []string{"fake-access-token", "fake-secret", "ww123"} {
		if strings.Contains(preview.Diagnostics.SafeSummary, leaked) {
			t.Fatalf("safe summary leaked %q: %q", leaked, preview.Diagnostics.SafeSummary)
		}
	}
}

func TestWecomOrganizationSyncDryRunPreviewPreservesResultWhenHistoryStoreFails(t *testing.T) {
	service := &WecomOrganizationSyncDryRunPreviewService{
		HistoryStore: &fakeWecomDryRunHistoryStore{createErr: errors.New("database offline secret=fake-secret")},
		ObjectStore:  newMemoryWecomOrganizationObjectStore(),
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return &fakeWecomOrganizationSnapshotClient{
				token:       &WecomAccessToken{AccessToken: "fake-access-token"},
				departments: []WecomDepartmentSnapshot{{Id: "1", ParentId: "0", Name: "总部", HasDepartmentLeaderField: true}},
				users:       []WecomUserSnapshot{{UserId: "alice", Departments: []string{"1"}, MainDepartmentId: "1", HasDirectLeaderField: true, HasIsLeaderInDepartmentField: true}},
			}
		},
	}
	preview, err := service.Preview(context.Background(), &WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "fake-secret",
		IsEnabled:         true,
	})
	if err != nil {
		t.Fatalf("Preview() error = %v", err)
	}
	if preview.Status != WecomOrganizationSyncDryRunPreviewStatusSucceeded {
		t.Fatalf("preview status = %q, want succeeded", preview.Status)
	}
	if preview.HistoryWarning == "" {
		t.Fatalf("history warning empty, want safe warning")
	}
	if strings.Contains(preview.HistoryWarning, "fake-secret") || strings.Contains(preview.HistoryWarning, "database offline") {
		t.Fatalf("history warning = %q, want generic sanitized warning", preview.HistoryWarning)
	}
}

func TestWecomOrganizationSyncDryRunPreviewReturnsPlanningErrors(t *testing.T) {
	service := &WecomOrganizationSyncDryRunPreviewService{
		ObjectStore: failingWecomDryRunExistingStateStore{memoryWecomOrganizationObjectStore: newMemoryWecomOrganizationObjectStore()},
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return &fakeWecomOrganizationSnapshotClient{
				token:       &WecomAccessToken{AccessToken: "fake-access-token"},
				departments: []WecomDepartmentSnapshot{{Id: "1", ParentId: "0", Name: "总部", HasDepartmentLeaderField: true}},
				users:       []WecomUserSnapshot{{UserId: "alice", Departments: []string{"1"}, MainDepartmentId: "1", HasDirectLeaderField: true, HasIsLeaderInDepartmentField: true}},
			}
		},
	}
	preview, err := service.Preview(context.Background(), &WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "fake-secret",
		IsEnabled:         true,
	})
	if err == nil {
		t.Fatalf("Preview() expected planning error")
	}
	if preview != nil {
		t.Fatalf("preview = %+v, want nil when local existing state read fails", preview)
	}
}

func TestWecomOrganizationSyncDryRunHistoryServiceFiltersAndReturnsSafeDetail(t *testing.T) {
	now := time.Date(2026, 6, 18, 11, 0, 0, 0, time.UTC)
	store := &fakeWecomDryRunHistoryStore{
		histories: []*WecomOrganizationSyncDryRunHistory{
			{
				Owner:                  "engineering",
				Name:                   "history-1",
				CreatedAt:              now,
				Organization:           "engineering",
				Status:                 WecomOrganizationSyncDryRunPreviewStatusSucceeded,
				SourceConnectionIdHash: "source-a",
				DiagnosticAlias:        "none",
				SafeSummary:            "ok",
			},
			{
				Owner:                  "engineering",
				Name:                   "history-2",
				CreatedAt:              now.Add(-time.Hour),
				Organization:           "engineering",
				Status:                 WecomOrganizationSyncDryRunPreviewStatusFailed,
				SourceConnectionIdHash: "source-a",
				DiagnosticAlias:        WecomOrganizationSyncDryRunReasonPermissionMissing,
				SafeSummary:            "permission denied userid=alice email=alice@example.test phone=13800138000 token=fake-access-token",
			},
			{
				Owner:        "other",
				Name:         "history-3",
				CreatedAt:    now,
				Organization: "other",
				Status:       WecomOrganizationSyncDryRunPreviewStatusFailed,
			},
		},
	}
	service := &WecomOrganizationSyncDryRunHistoryService{Store: store}

	histories, count, err := service.GetHistories(WecomOrganizationSyncDryRunHistoryFilter{
		Organization:           "engineering",
		SourceConnectionIdHash: "source-a",
		Status:                 WecomOrganizationSyncDryRunPreviewStatusFailed,
		DiagnosticAlias:        WecomOrganizationSyncDryRunReasonPermissionMissing,
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
	for _, leaked := range []string{"alice@example.test", "13800138000", "fake-access-token"} {
		if strings.Contains(detail.SafeSummary, leaked) {
			t.Fatalf("detail safe summary leaked %q: %q", leaked, detail.SafeSummary)
		}
	}
	missing, err := service.GetHistory("engineering", "history-3")
	if err != nil {
		t.Fatalf("GetHistory(other org) error = %v", err)
	}
	if missing != nil {
		t.Fatalf("GetHistory(other org) = %+v, want nil", missing)
	}
}

func TestWecomOrganizationSyncDryRunHistoryServiceValidatesRequiredInputs(t *testing.T) {
	service := &WecomOrganizationSyncDryRunHistoryService{Store: &fakeWecomDryRunHistoryStore{}}
	if _, _, err := service.GetHistories(WecomOrganizationSyncDryRunHistoryFilter{}); err == nil {
		t.Fatalf("GetHistories(empty org) expected error")
	}
	if _, err := service.GetHistory("", "history-1"); err == nil {
		t.Fatalf("GetHistory(empty org) expected error")
	}
	if _, err := service.GetHistory("engineering", ""); err == nil {
		t.Fatalf("GetHistory(empty id) expected error")
	}
	service = &WecomOrganizationSyncDryRunHistoryService{Store: &fakeWecomDryRunHistoryStore{countErr: errors.New("count failed")}}
	if _, _, err := service.GetHistories(WecomOrganizationSyncDryRunHistoryFilter{Organization: "engineering"}); err == nil {
		t.Fatalf("GetHistories(count error) expected error")
	}
	service = &WecomOrganizationSyncDryRunHistoryService{Store: &fakeWecomDryRunHistoryStore{listErr: errors.New("list failed")}}
	if _, _, err := service.GetHistories(WecomOrganizationSyncDryRunHistoryFilter{Organization: "engineering"}); err == nil {
		t.Fatalf("GetHistories(list error) expected error")
	}
	service = &WecomOrganizationSyncDryRunHistoryService{Store: &fakeWecomDryRunHistoryStore{getErr: errors.New("get failed")}}
	if _, err := service.GetHistory("engineering", "history-1"); err == nil {
		t.Fatalf("GetHistory(get error) expected error")
	}
}

func TestWecomOrganizationSyncDryRunClassifiesAndRedactsEdgeCases(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{errors.New("organization is required"), WecomOrganizationSyncDryRunReasonCredentialMissing},
		{errors.New("permission scope 48009 denied"), WecomOrganizationSyncDryRunReasonPermissionMissing},
		{errors.New("unexpected decode contract"), WecomOrganizationSyncDryRunReasonContractMismatch},
		{errors.New("snapshot client unavailable"), WecomOrganizationSyncDryRunReasonSnapshotClientUnavailable},
		{errors.New("temporary provider timeout"), WecomOrganizationSyncDryRunReasonRuntimeAuthorization},
	}
	for _, tc := range cases {
		if got := classifyWecomDryRunFailureReason(tc.err); got != tc.want {
			t.Fatalf("classifyWecomDryRunFailureReason(%q) = %q, want %q", tc.err, got, tc.want)
		}
	}

	summary := safeWecomDryRunSummary("token=abc secret=def userid=alice corp_id=ww123 email=a@example.test phone=13800138000", "def")
	for _, leaked := range []string{"abc", "def", "alice", "ww123", "a@example.test", "13800138000"} {
		if strings.Contains(summary, leaked) {
			t.Fatalf("safe summary leaked %q: %q", leaked, summary)
		}
	}

	for _, reason := range []string{
		WecomOrganizationSyncDryRunReasonCredentialMissing,
		WecomOrganizationSyncDryRunReasonPermissionMissing,
		WecomOrganizationSyncDryRunReasonContractMismatch,
		WecomOrganizationSyncDryRunReasonRuntimeAuthorization,
	} {
		diagnostics := buildWecomDryRunDiagnostics("fetch", reason, "permission denied token=abc")
		if diagnostics.FailureCategory == "" || diagnostics.OperatorAction == "" || strings.Contains(diagnostics.SafeSummary, "abc") {
			t.Fatalf("diagnostics for %q = %+v, want category/action and sanitized summary", reason, diagnostics)
		}
	}
}

func TestWecomOrganizationSyncDryRunCountsInvalidIdentifiersAndNilBranches(t *testing.T) {
	preview := &WecomOrganizationSyncDryRunPreview{}
	incrementWecomDryRunInvalidReasons(preview, &WecomOrganizationFullSnapshot{
		Departments:     []WecomDepartmentSnapshot{{Id: ""}},
		Users:           []WecomUserSnapshot{{UserId: " "}},
		UserDepartments: []WecomSnapshotUserDepartment{{WecomUserId: "", DepartmentId: ""}},
	})
	if preview.Diff.Departments.Invalid != 1 || preview.Diff.Users.Invalid != 1 || preview.Diff.Relationships.Invalid != 2 {
		t.Fatalf("invalid counts = %+v, want department/user/relationship invalid counts", preview.Diff)
	}
	if preview.ReasonCounts[wecomDryRunReasonMissingDepartmentIdentifier] != 2 || preview.ReasonCounts[wecomDryRunReasonMissingUserIdentifier] != 2 {
		t.Fatalf("reason counts = %+v, want missing identifiers counted", preview.ReasonCounts)
	}

	attachWecomDryRunSnapshotStats(nil, &WecomOrganizationFullSnapshot{})
	attachWecomDryRunSnapshotStats(preview, nil)
	incrementWecomDryRunInvalidReasons(nil, &WecomOrganizationFullSnapshot{})
	incrementWecomDryRunReason(nil, "ignored")
	incrementWecomDryRunReason(preview, "")
	if got := wecomDryRunSensitiveValues(nil); got != nil {
		t.Fatalf("wecomDryRunSensitiveValues(nil) = %+v, want nil", got)
	}
	values := wecomDryRunSensitiveValues(&WecomOrganizationSyncConfig{CorpId: "ww123", AddressBookSecret: WecomOrganizationSyncMaskedSecret})
	if len(values) != 1 || values[0] != "ww123" {
		t.Fatalf("sensitive values = %+v, want only real corp id", values)
	}
}

func TestWecomOrganizationSyncDryRunRelationshipDiffCoversExistingRelationTypes(t *testing.T) {
	if counts := buildWecomDryRunRelationshipDiff(nil, nil); counts != (WecomOrganizationSyncDryRunDiffCounts{}) {
		t.Fatalf("nil plan counts = %+v, want zero", counts)
	}

	plan := &WecomOrganizationSyncPlan{
		UserDepartmentUpserts: []WecomSnapshotUserDepartment{
			{WecomUserId: "alice", DepartmentId: "1"},
			{WecomUserId: "bob", DepartmentId: "2"},
		},
		DepartmentLeaderUpserts: []WecomSnapshotDepartmentLeader{
			{DepartmentId: "1", LeaderWecomUserId: "alice"},
			{DepartmentId: "2", LeaderWecomUserId: "charlie"},
		},
		DirectLeaderUpserts: []WecomSnapshotDirectLeader{
			{WecomUserId: "alice", LeaderWecomUserId: "manager"},
			{WecomUserId: "bob", LeaderWecomUserId: "manager"},
		},
		UserDepartmentDisables:   []WecomUserDepartment{{WecomUserId: "stale", DepartmentId: "1"}},
		DepartmentLeaderDisables: []WecomDepartmentLeader{{DepartmentId: "stale", LeaderWecomUserId: "alice"}},
		DirectLeaderDisables:     []WecomUserDirectLeader{{WecomUserId: "stale", LeaderWecomUserId: "manager"}},
	}
	existing := &WecomOrganizationSyncExistingState{
		UserDepartments:   []WecomUserDepartment{{WecomUserId: "alice", DepartmentId: "1"}},
		DepartmentLeaders: []WecomDepartmentLeader{{DepartmentId: "1", LeaderWecomUserId: "alice"}},
		DirectLeaders:     []WecomUserDirectLeader{{WecomUserId: "alice", LeaderWecomUserId: "manager"}},
	}
	counts := buildWecomDryRunRelationshipDiff(plan, existing)
	assertWecomDryRunCounts(t, "relationships with existing relations", counts, WecomOrganizationSyncDryRunDiffCounts{
		ToCreate:      3,
		ToUpdate:      3,
		ToSoftDisable: 3,
	})

	counts = buildWecomDryRunRelationshipDiff(plan, nil)
	assertWecomDryRunCounts(t, "relationships without existing state", counts, WecomOrganizationSyncDryRunDiffCounts{
		ToCreate:      6,
		ToSoftDisable: 3,
	})
}

func TestWecomOrganizationSyncDryRunHelperDefaults(t *testing.T) {
	var nilService *WecomOrganizationSyncDryRunPreviewService
	if nilService.operator() != "" || nilService.requestMarker() != "" {
		t.Fatalf("nil service operator/request marker must be empty")
	}
	if _, ok := nilService.historyStore().(defaultWecomOrganizationSyncDryRunHistoryStore); !ok {
		t.Fatalf("nil service history store should use default store")
	}
	if _, ok := (&WecomOrganizationSyncDryRunHistoryService{}).historyStore().(defaultWecomOrganizationSyncDryRunHistoryStore); !ok {
		t.Fatalf("nil history service store should use default store")
	}
	if client := (&WecomOrganizationSyncDryRunPreviewService{}).snapshotClientFactory()("ww123", "secret"); client == nil {
		t.Fatalf("default snapshot client must not be nil")
	}

	oldOrmer := ormer
	ormer = nil
	t.Cleanup(func() {
		ormer = oldOrmer
	})
	(&WecomOrganizationSyncDryRunPreviewService{}).recordHistory(nil)
	(&WecomOrganizationSyncDryRunPreviewService{}).recordHistory(&WecomOrganizationSyncDryRunPreview{
		Status: WecomOrganizationSyncDryRunPreviewStatusSucceeded,
		Source: WecomOrganizationSyncDryRunSource{Organization: "engineering", CorpAlias: "corp-safe"},
	})

	if _, err := prepareWecomOrganizationSyncDryRunConfig(nil); err == nil {
		t.Fatalf("prepare config nil expected error")
	}
	if _, err := prepareWecomOrganizationSyncDryRunConfig(&WecomOrganizationSyncConfig{
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
		IsEnabled:         false,
	}); err == nil {
		t.Fatalf("prepare disabled config expected error")
	}
}

func TestWecomOrganizationSyncDryRunHistoryMaskingDefaultsAndLimits(t *testing.T) {
	now := time.Date(2026, 6, 18, 12, 0, 0, 0, time.UTC)
	if got := newWecomDryRunHistoryFromPreview(nil, "", "", now); got != nil {
		t.Fatalf("nil preview history = %+v, want nil", got)
	}
	failedWithoutDiagnostics := newWecomDryRunHistoryFromPreview(&WecomOrganizationSyncDryRunPreview{
		Status: WecomOrganizationSyncDryRunPreviewStatusFailed,
		Source: WecomOrganizationSyncDryRunSource{Organization: "engineering", CorpAlias: "corp-safe"},
	}, "", "", now)
	if failedWithoutDiagnostics == nil || failedWithoutDiagnostics.DiagnosticAlias != "unknown" {
		t.Fatalf("failed history diagnostic alias = %+v, want unknown", failedWithoutDiagnostics)
	}

	preview := &WecomOrganizationSyncDryRunPreview{
		Status: WecomOrganizationSyncDryRunPreviewStatusFailed,
		Source: WecomOrganizationSyncDryRunSource{
			Organization: "engineering",
			CorpAlias:    "corp-safe",
		},
		Diagnostics: &WecomOrganizationSyncDryRunDiagnostics{
			ReasonCode:  WecomOrganizationSyncDryRunReasonPermissionMissing,
			SafeSummary: "userid=alice email=alice@example.test token=abc",
		},
		ReasonCounts: map[string]int{WecomOrganizationSyncDryRunReasonPermissionMissing: 1},
	}
	history := newWecomDryRunHistoryFromPreview(preview, "", "", now)
	if history == nil || history.OperatorHash == "" || history.RequestMarker == "" || history.RetentionDays != WecomOrganizationSyncDryRunHistoryRetentionDays {
		t.Fatalf("history defaults = %+v, want hashes and retention", history)
	}
	history.ReasonCounts = nil
	history.Diagnostics = nil
	history.syncWecomDryRunHistoryJson()
	if history.ReasonCountsJson != "{}" || history.DiagnosticsJson != "null" {
		t.Fatalf("history json = %q/%q, want empty reason map and null diagnostics", history.ReasonCountsJson, history.DiagnosticsJson)
	}

	hydrated := hydrateWecomDryRunHistory(&WecomOrganizationSyncDryRunHistory{
		ReasonCountsJson: `{"x":2}`,
		DiagnosticsJson:  `{"safeSummary":"phone=13800138000"}`,
		SafeSummary:      "secret=abc",
	})
	if hydrated.ReasonCounts["x"] != 2 || hydrated.Diagnostics == nil {
		t.Fatalf("hydrated history = %+v, want reason counts and diagnostics", hydrated)
	}
	masked := maskWecomDryRunHistory(hydrated)
	if strings.Contains(masked.SafeSummary, "abc") || strings.Contains(masked.Diagnostics.SafeSummary, "13800138000") {
		t.Fatalf("masked history leaked sensitive summary: %+v", masked)
	}
	if maskWecomDryRunHistory(nil) != nil {
		t.Fatalf("maskWecomDryRunHistory(nil) must be nil")
	}

	if got := normalizeWecomDryRunHistoryLimit(0, 0); got != 20 {
		t.Fatalf("default limit = %d, want 20", got)
	}
	if got := normalizeWecomDryRunHistoryLimit(200, 0); got != 100 {
		t.Fatalf("max limit = %d, want 100", got)
	}
	if got := normalizeWecomDryRunHistoryLimit(50, 5); got != 5 {
		t.Fatalf("topN limit = %d, want 5", got)
	}
	if got := normalizeWecomDryRunHistoryLimit(-1, 0); got != -1 {
		t.Fatalf("negative limit = %d, want -1", got)
	}
}

func TestWecomOrganizationSyncDryRunHistoryDefaultStoreUsesRedactedSqliteRows(t *testing.T) {
	setupWecomOrganizationSyncDryRunSqlite(t)
	store := defaultWecomOrganizationSyncDryRunHistoryStore{}
	now := time.Now().UTC()
	if err := store.CreateWecomOrganizationSyncDryRunHistory(nil); err != nil {
		t.Fatalf("CreateWecomOrganizationSyncDryRunHistory(nil) error = %v", err)
	}
	histories := []*WecomOrganizationSyncDryRunHistory{
		{
			Owner:                     "engineering",
			Name:                      "history-new",
			Organization:              "engineering",
			Status:                    WecomOrganizationSyncDryRunPreviewStatusSucceeded,
			CorpAlias:                 "corp-new",
			SourceConnectionIdHash:    "source-a",
			DiagnosticAlias:           "none",
			SnapshotDepartmentCount:   2,
			SnapshotUserCount:         3,
			SnapshotRelationshipCount: 4,
			ReasonCounts:              map[string]int{"ok": 1},
			CreatedAt:                 now,
		},
		{
			Owner:                  "engineering",
			Name:                   "history-old",
			Organization:           "engineering",
			Status:                 WecomOrganizationSyncDryRunPreviewStatusFailed,
			CorpAlias:              "corp-old",
			SourceConnectionIdHash: "source-b",
			DiagnosticAlias:        WecomOrganizationSyncDryRunReasonPermissionMissing,
			SafeSummary:            "userid=alice secret=abc",
			ReasonCounts:           map[string]int{WecomOrganizationSyncDryRunReasonPermissionMissing: 1},
			CreatedAt:              now.Add(-time.Hour),
		},
		{
			Owner:                  "other",
			Name:                   "history-other",
			Organization:           "other",
			Status:                 WecomOrganizationSyncDryRunPreviewStatusFailed,
			SourceConnectionIdHash: "source-b",
			DiagnosticAlias:        WecomOrganizationSyncDryRunReasonPermissionMissing,
			CreatedAt:              now,
		},
	}
	for _, history := range histories {
		if err := store.CreateWecomOrganizationSyncDryRunHistory(history); err != nil {
			t.Fatalf("CreateWecomOrganizationSyncDryRunHistory(%s) error = %v", history.Name, err)
		}
	}
	_ = getWecomDryRunHistoryFilterSession(WecomOrganizationSyncDryRunHistoryFilter{
		CreatedFrom: now.Add(-2 * time.Hour),
		CreatedTo:   now.Add(2 * time.Hour),
	})

	filter := WecomOrganizationSyncDryRunHistoryFilter{
		Organization:           "engineering",
		SourceConnectionIdHash: "source-b",
		Status:                 WecomOrganizationSyncDryRunPreviewStatusFailed,
		DiagnosticAlias:        WecomOrganizationSyncDryRunReasonPermissionMissing,
		TopN:                   10,
		SortOrder:              "ascend",
	}
	count, err := store.GetWecomOrganizationSyncDryRunHistoryCount(filter)
	if err != nil {
		t.Fatalf("GetWecomOrganizationSyncDryRunHistoryCount() error = %v", err)
	}
	if count != 1 {
		t.Fatalf("history count = %d, want 1", count)
	}
	got, err := store.GetWecomOrganizationSyncDryRunHistories(filter)
	if err != nil {
		t.Fatalf("GetWecomOrganizationSyncDryRunHistories() error = %v", err)
	}
	if len(got) != 1 || got[0].Name != "history-old" || got[0].ReasonCounts[WecomOrganizationSyncDryRunReasonPermissionMissing] != 1 {
		t.Fatalf("histories = %+v, want hydrated filtered history-old", got)
	}

	detail, err := store.GetWecomOrganizationSyncDryRunHistory("engineering", "history-old")
	if err != nil {
		t.Fatalf("GetWecomOrganizationSyncDryRunHistory() error = %v", err)
	}
	if detail == nil || detail.Name != "history-old" || detail.ReasonCounts[WecomOrganizationSyncDryRunReasonPermissionMissing] != 1 {
		t.Fatalf("detail = %+v, want hydrated history-old", detail)
	}
	missing, err := store.GetWecomOrganizationSyncDryRunHistory("engineering", "missing")
	if err != nil {
		t.Fatalf("GetWecomOrganizationSyncDryRunHistory(missing) error = %v", err)
	}
	if missing != nil {
		t.Fatalf("missing detail = %+v, want nil", missing)
	}
}

func setupWecomOrganizationSyncDryRunSqlite(t *testing.T) {
	t.Helper()
	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	engine.DB().SetMaxOpenConns(1)
	if err := engine.Sync2(new(WecomOrganizationSyncDryRunHistory)); err != nil {
		t.Fatalf("sync sqlite tables error = %v", err)
	}
	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		ormer = oldOrmer
		_ = engine.Close()
	})
}

func seedWecomDryRunExistingState(store *memoryWecomOrganizationObjectStore) {
	store.departmentMappings["engineering|ww123|1"] = &WecomDepartmentMapping{Organization: "engineering", CorpId: "ww123", DepartmentId: "1", GroupOwner: "engineering", GroupName: "wecom-dept-1", IsEnabled: true}
	store.departmentMappings["engineering|ww123|stale-dept"] = &WecomDepartmentMapping{Organization: "engineering", CorpId: "ww123", DepartmentId: "stale-dept", GroupOwner: "engineering", GroupName: "wecom-dept-stale", IsEnabled: true}
	store.userMappings["engineering|ww123|alice"] = &WecomUserMapping{Organization: "engineering", CorpId: "ww123", WecomUserId: "alice", UserOwner: "engineering", UserName: "wecom-user-alice", IsEnabled: true}
	store.userMappings["engineering|ww123|stale-user"] = &WecomUserMapping{Organization: "engineering", CorpId: "ww123", WecomUserId: "stale-user", UserOwner: "engineering", UserName: "wecom-user-stale", IsEnabled: true}
	store.userDepartments["engineering|ww123|alice|1"] = &WecomUserDepartment{Organization: "engineering", CorpId: "ww123", WecomUserId: "alice", DepartmentId: "1", IsMain: true, IsEnabled: true}
	store.userDepartments["engineering|ww123|stale-user|stale-dept"] = &WecomUserDepartment{Organization: "engineering", CorpId: "ww123", WecomUserId: "stale-user", DepartmentId: "stale-dept", IsEnabled: true}
}

func assertWecomDryRunCounts(t *testing.T, name string, got WecomOrganizationSyncDryRunDiffCounts, want WecomOrganizationSyncDryRunDiffCounts) {
	t.Helper()
	if got.ToCreate != want.ToCreate || got.ToUpdate != want.ToUpdate || got.ToSoftDisable != want.ToSoftDisable || got.Unchanged != want.Unchanged || got.Conflict != want.Conflict || got.Invalid != want.Invalid {
		t.Fatalf("%s counts = %+v, want %+v", name, got, want)
	}
}
