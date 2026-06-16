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

func TestFeishuOrganizationSyncHandoffEvidenceReadyFromDryRunHistory(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 20, 0, 0, 0, time.UTC)
	insertFeishuBindingConfig(t, "engineering", "cli-real", "tenant-real", FeishuEndpointModeDomestic, true)
	insertFeishuHandoffDryRunHistory(t, now, FeishuOrganizationSyncDryRunPreviewStatusSucceeded, 0, 0)

	evidence, err := (&FeishuOrganizationSyncHandoffEvidenceService{Now: func() time.Time { return now }}).GetEvidence(FeishuOrganizationSyncHandoffEvidenceFilter{
		Organization: "engineering",
		SourceType:   FeishuHandoffEvidenceSourceLatest,
	})
	if err != nil {
		t.Fatalf("GetEvidence() error = %v", err)
	}
	if evidence.Readiness != FeishuHandoffEvidenceReadinessReady || evidence.SourceType != FeishuHandoffEvidenceSourceDryRunHistory {
		t.Fatalf("evidence readiness/source = %q/%q, want ready/dry_run_history", evidence.Readiness, evidence.SourceType)
	}
	if evidence.SourceConnectionIdHash == "" || evidence.SourceIdHash == "" || !evidence.Redaction.Applied {
		t.Fatalf("evidence missing safe metadata: %+v", evidence)
	}
	if evidence.Counts.Departments.ToCreate != 1 || evidence.Counts.Users.ToUpdate != 2 || evidence.Counts.Memberships.ToSoftDisable != 1 {
		t.Fatalf("counts = %+v, want dry-run diff counts", evidence.Counts)
	}
	if evidence.SoftDisableSummary.TotalToSoftDisable != 1 {
		t.Fatalf("soft disable summary = %+v, want one pending soft-disable", evidence.SoftDisableSummary)
	}
	if len(evidence.CannotInfer) == 0 || len(evidence.OperatorNextActions) == 0 {
		t.Fatalf("evidence missing cannotInfer/actions: %+v", evidence)
	}
	assertFeishuHandoffEvidenceRedacted(t, evidence)
}

func TestFeishuOrganizationSyncHandoffEvidenceBlockedByRunAndBinding(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 20, 30, 0, 0, time.UTC)
	insertFeishuBindingConfig(t, "engineering", "cli-real", "tenant-real", FeishuEndpointModeDomestic, true)
	insertFeishuHandoffRun(t, "run-failed", now, FeishuOrganizationSyncRunStatusFailed)
	insertFeishuBindingUser(t, "primary-user", "ou-shared", map[string]string{
		FeishuUserPropertyUserId:    "ou-shared",
		FeishuUserPropertyTenantKey: "tenant-real",
	})
	insertFeishuBindingUser(t, "duplicate-user", "ou-shared", map[string]string{
		FeishuUserPropertyUserId:    "ou-shared",
		FeishuUserPropertyTenantKey: "tenant-real",
	})

	evidence, err := (&FeishuOrganizationSyncHandoffEvidenceService{Now: func() time.Time { return now }}).GetEvidence(FeishuOrganizationSyncHandoffEvidenceFilter{
		Organization: "engineering",
		SourceType:   FeishuHandoffEvidenceSourceRun,
		SourceId:     "run-failed",
	})
	if err != nil {
		t.Fatalf("GetEvidence(run) error = %v", err)
	}
	if evidence.Readiness != FeishuHandoffEvidenceReadinessBlocked {
		t.Fatalf("readiness = %q, want blocked", evidence.Readiness)
	}
	if !evidence.BindingConflicts.Blocked || evidence.BindingConflicts.Total == 0 {
		t.Fatalf("binding conflict summary = %+v, want blocked conflicts", evidence.BindingConflicts)
	}
	if !containsString(evidence.BlockedReasons, "sync_run_failed") || !containsString(evidence.BlockedReasons, "binding_conflict_blocked") {
		t.Fatalf("blocked reasons = %+v, want run and binding reasons", evidence.BlockedReasons)
	}
	assertFeishuHandoffEvidenceRedacted(t, evidence)
}

func TestFeishuOrganizationSyncHandoffEvidenceUnsupportedNoRunAndRequiredInputs(t *testing.T) {
	setupFeishuOrganizationSyncSqlite(t)
	now := time.Date(2026, 6, 15, 21, 0, 0, 0, time.UTC)
	service := &FeishuOrganizationSyncHandoffEvidenceService{Now: func() time.Time { return now }}
	if _, err := service.GetEvidence(FeishuOrganizationSyncHandoffEvidenceFilter{}); err == nil {
		t.Fatalf("GetEvidence(empty organization) expected error")
	}

	unsupported, err := service.GetEvidence(FeishuOrganizationSyncHandoffEvidenceFilter{Organization: "engineering"})
	if err != nil {
		t.Fatalf("GetEvidence(unconfigured) error = %v", err)
	}
	if unsupported.Readiness != FeishuHandoffEvidenceReadinessUnsupported {
		t.Fatalf("unsupported readiness = %q", unsupported.Readiness)
	}

	insertFeishuBindingConfig(t, "engineering", "cli-real", "tenant-real", FeishuEndpointModeDomestic, true)
	noRun, err := service.GetEvidence(FeishuOrganizationSyncHandoffEvidenceFilter{Organization: "engineering", SourceType: FeishuHandoffEvidenceSourceLatest})
	if err != nil {
		t.Fatalf("GetEvidence(no run) error = %v", err)
	}
	if noRun.Readiness != FeishuHandoffEvidenceReadinessNoRun {
		t.Fatalf("no run readiness = %q", noRun.Readiness)
	}

	unknownSource, err := service.GetEvidence(FeishuOrganizationSyncHandoffEvidenceFilter{Organization: "engineering", SourceType: "unknown"})
	if err != nil {
		t.Fatalf("GetEvidence(unknown source) error = %v", err)
	}
	if unknownSource.Readiness != FeishuHandoffEvidenceReadinessUnsupported {
		t.Fatalf("unknown source readiness = %q", unknownSource.Readiness)
	}
}

func insertFeishuHandoffDryRunHistory(t *testing.T, now time.Time, status string, conflict int, invalid int) {
	t.Helper()
	err := (defaultFeishuOrganizationSyncDryRunHistoryStore{}).CreateFeishuOrganizationSyncDryRunHistory(&FeishuOrganizationSyncDryRunHistory{
		Owner:                   "engineering",
		Name:                    "history-sensitive-id",
		CreatedAt:               now,
		Organization:            "engineering",
		Status:                  status,
		EndpointMode:            FeishuEndpointModeDomestic,
		AppAlias:                "app-safe",
		TenantAlias:             "tenant-safe",
		SourceConnectionIdHash:  "source-safe",
		SnapshotDepartmentCount: 3,
		SnapshotUserCount:       4,
		SnapshotMembershipCount: 5,
		DepartmentToCreate:      1,
		UserToUpdate:            2,
		MembershipToSoftDisable: 1,
		DepartmentConflict:      conflict,
		UserInvalid:             invalid,
		ReasonCounts:            map[string]int{"would_soft_disable": 1},
		SafeSummary:             "dry-run user_id=*** open_id=***",
		RetentionDays:           90,
		RetentionExpiresAt:      now.AddDate(0, 0, 90),
		RedactionApplied:        true,
		RedactionVersion:        FeishuOrganizationSyncDryRunHistoryRedactionV1,
	})
	if err != nil {
		t.Fatalf("insert dry-run history error = %v", err)
	}
}

func insertFeishuHandoffRun(t *testing.T, name string, now time.Time, status FeishuOrganizationSyncRunStatus) {
	t.Helper()
	if _, err := ormer.Engine.Insert(&FeishuOrganizationSyncRun{
		Owner:                   "engineering",
		Name:                    name,
		CreatedAt:               now,
		Organization:            "engineering",
		AppId:                   "cli-real",
		TenantKey:               "tenant-real",
		EndpointMode:            FeishuEndpointModeDomestic,
		TriggerType:             FeishuOrganizationSyncTriggerManual,
		Actor:                   "operator-sensitive",
		Status:                  status,
		Stage:                   FeishuOrganizationSyncRunStageFetching,
		StartedAt:               now,
		FinishedAt:              now.Add(time.Minute),
		DepartmentFetchedCount:  3,
		DepartmentCreatedCount:  1,
		DepartmentUpdatedCount:  1,
		DepartmentDisabledCount: 1,
		UserFetchedCount:        4,
		UserCreatedCount:        1,
		UserUpdatedCount:        2,
		UserDisabledCount:       1,
		MembershipUpdatedCount:  5,
		ErrorCode:               "contact_permission_missing",
		ErrorText:               "real-secret user_id=ou-shared alice@example.test 13800138000",
	}); err != nil {
		t.Fatalf("insert run error = %v", err)
	}
}

func assertFeishuHandoffEvidenceRedacted(t *testing.T, evidence *FeishuOrganizationSyncHandoffEvidence) {
	t.Helper()
	payload, err := json.Marshal(evidence)
	if err != nil {
		t.Fatalf("marshal evidence error = %v", err)
	}
	for _, forbidden := range []string{
		"cli-real", "tenant-real", "history-sensitive-id", "run-failed", "operator-sensitive",
		"ou-shared", "open-shared", "union-shared", "primary-user", "alice@example.test", "13800138000", "real-secret",
	} {
		if strings.Contains(string(payload), forbidden) {
			t.Fatalf("evidence leaked forbidden value %q: %s", forbidden, string(payload))
		}
	}
}
