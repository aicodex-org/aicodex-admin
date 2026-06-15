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
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestOrganizationMasterDataQualityReadinessReady(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	snapshot := organizationMasterDataQualityReadySnapshot(generatedAt)

	result, err := (OrganizationMasterDataQualityService{
		Store: gatewayProjectionStaticSnapshotStore{snapshot: snapshot},
		Now:   func() time.Time { return generatedAt },
	}).GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness returned error: %v", err)
	}
	if result.Status != OrganizationMasterDataQualityStatusReady {
		t.Fatalf("status = %q, want ready: %#v", result.Status, result)
	}
	if result.Counts.PublishableSubjectCount != 1 || result.Counts.ActiveSubjectCount != 1 {
		t.Fatalf("publishable counts mismatch: %#v", result.Counts)
	}
	if len(result.ReasonAliases) != 0 {
		t.Fatalf("ready result should not contain reasons: %#v", result.ReasonAliases)
	}
	if !result.SyncBatch.HasUsableLineage || result.SourceConnectionSummary.Total != 1 {
		t.Fatalf("source/sync summary mismatch: %#v %#v", result.SyncBatch, result.SourceConnectionSummary)
	}
}

func TestOrganizationMasterDataQualityReadinessBlocksAndWarns(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	snapshot := organizationMasterDataQualityReadySnapshot(generatedAt)
	snapshot.SyncBatch = nil
	snapshot.SourceConnections[0].Status = SourceConnectionStatusDisabled
	snapshot.SourceConnections[0].Freshness = PlatformFreshnessStale
	snapshot.Departments = append(snapshot.Departments,
		PlatformDepartment{OrganizationId: "org-a", DepartmentId: "dept-b", ParentDepartmentId: "missing-parent", ExternalDepartmentId: "ext-a", LifecycleStatus: PlatformLifecycleStatusActive},
	)
	snapshot.Users[0].MappingStatus = PlatformMappingStatusPendingReview
	snapshot.ApiUserMappings = nil
	snapshot.Memberships = append(snapshot.Memberships,
		PlatformMembership{OrganizationId: "org-a", AdminSubject: "org-a/missing", DepartmentId: "dept-a", LifecycleStatus: PlatformLifecycleStatusActive},
		PlatformMembership{OrganizationId: "org-a", AdminSubject: "org-a/alice", DepartmentId: "missing-dept", LifecycleStatus: PlatformLifecycleStatusActive},
	)

	result, err := (OrganizationMasterDataQualityService{
		Store: gatewayProjectionStaticSnapshotStore{snapshot: snapshot},
		Now:   func() time.Time { return generatedAt },
	}).GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness returned error: %v", err)
	}
	if result.Status != OrganizationMasterDataQualityStatusBlocked {
		t.Fatalf("status = %q, want blocked: %#v", result.Status, result)
	}
	for _, alias := range []string{
		OrganizationMasterDataQualityReasonSourceConnectionDisabled,
		OrganizationMasterDataQualityReasonSourceFreshnessUntrusted,
		OrganizationMasterDataQualityReasonSyncLineageMissing,
		OrganizationMasterDataQualityReasonDuplicateDepartmentSourceKey,
		OrganizationMasterDataQualityReasonMembershipMissingUser,
		OrganizationMasterDataQualityReasonMembershipMissingDepartment,
		OrganizationMasterDataQualityReasonMappingUntrusted,
		OrganizationMasterDataQualityReasonNoPublishableSubject,
	} {
		if !containsOrganizationMasterDataQualityReason(result.ReasonAliases, alias) {
			t.Fatalf("missing reason %q in %#v", alias, result.ReasonAliases)
		}
	}
	if result.Counts.DuplicateSourceKeyCount != 1 || result.Counts.MembershipMissingUserCount != 1 || result.Counts.MembershipMissingDepartmentCount != 1 {
		t.Fatalf("quality counts mismatch: %#v", result.Counts)
	}
}

func TestOrganizationMasterDataQualityReadinessSanitizesSourceDetails(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	snapshot := organizationMasterDataQualityReadySnapshot(generatedAt)
	snapshot.SourceConnections[0].SourceTenantId = "tenant-sensitive"
	snapshot.SourceConnections[0].SecretRef = "secret-sensitive"
	snapshot.SourceConnections[0].Metadata = `{"phone":"13800000000","email":"user@example.invalid"}`
	snapshot.Users[0].DisplayName = "Alice Sensitive"

	result, err := (OrganizationMasterDataQualityService{
		Store: gatewayProjectionStaticSnapshotStore{snapshot: snapshot},
		Now:   func() time.Time { return generatedAt },
	}).GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness returned error: %v", err)
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal result: %v", err)
	}
	serialized := string(raw)
	for _, forbidden := range []string{"tenant-sensitive", "secret-sensitive", "13800000000", "user@example.invalid", "Alice Sensitive"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("readiness response leaked %q: %s", forbidden, serialized)
		}
	}
}

func TestOrganizationMasterDataQualityReadinessHandlesEmptyOrganizationAndHelpers(t *testing.T) {
	result, err := GetOrganizationMasterDataQualityReadiness(OrganizationMasterDataQualityQuery{})
	if err != nil {
		t.Fatalf("GetOrganizationMasterDataQualityReadiness returned error: %v", err)
	}
	if result.Status != OrganizationMasterDataQualityStatusBlocked || !containsOrganizationMasterDataQualityReason(result.ReasonAliases, OrganizationMasterDataQualityReasonOrganizationMissing) {
		t.Fatalf("empty organization should be blocked: %#v", result)
	}
	if got := maxOrganizationMasterDataQualityCount(3); got != 3 {
		t.Fatalf("maxOrganizationMasterDataQualityCount(3) = %d", got)
	}
	if organizationMasterDataQualityStatusRank(OrganizationMasterDataQualityStatusReady) <= organizationMasterDataQualityStatusRank(OrganizationMasterDataQualityStatusWarning) {
		t.Fatalf("ready should sort after warning")
	}
	if got := maxOrganizationMasterDataQualityCount(0); got != 1 {
		t.Fatalf("maxOrganizationMasterDataQualityCount(0) = %d", got)
	}
	checks := &OrganizationMasterDataQualityReadiness{}
	checks.addCheck("ignored", OrganizationMasterDataQualityStatusBlocked, 0, "", "")
	if len(checks.QualityChecks) != 0 {
		t.Fatalf("zero-count check should be ignored: %#v", checks.QualityChecks)
	}
}

func TestOrganizationMasterDataQualityReadinessCoversMissingStoreAndWarningBranches(t *testing.T) {
	result, err := (OrganizationMasterDataQualityService{}).GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("default store readiness returned error: %v", err)
	}
	if result.Status != OrganizationMasterDataQualityStatusBlocked ||
		!containsOrganizationMasterDataQualityReason(result.ReasonAliases, OrganizationMasterDataQualityReasonSourceConnectionMissing) ||
		!containsOrganizationMasterDataQualityReason(result.ReasonAliases, OrganizationMasterDataQualityReasonSyncLineageMissing) {
		t.Fatalf("default empty store should be blocked by source and lineage: %#v", result)
	}

	generatedAt := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	snapshot := organizationMasterDataQualityReadySnapshot(generatedAt)
	snapshot.SourceConnections = append(snapshot.SourceConnections, SourceConnection{
		OrganizationId:     "org-a",
		SourceConnectionId: "src-a",
		SourceType:         SourceTypeWecom,
		Status:             SourceConnectionStatusActive,
		Freshness:          PlatformFreshnessUnknown,
	})
	snapshot.Departments = append(snapshot.Departments,
		PlatformDepartment{OrganizationId: "org-a", DepartmentId: "dept-missing-key", LifecycleStatus: PlatformLifecycleStatusActive},
	)
	snapshot.Users = append(snapshot.Users,
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/disabled", LifecycleStatus: PlatformLifecycleStatusDisabled, MappingStatus: PlatformMappingStatusDisabled, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/unknown", LifecycleStatus: PlatformLifecycleStatusUnknown, MappingStatus: PlatformMappingStatusDisabled, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/conflicted", LifecycleStatus: PlatformLifecycleStatusConflicted, MappingStatus: PlatformMappingStatusDisabled, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/stale", LifecycleStatus: PlatformLifecycleStatusStale, MappingStatus: PlatformMappingStatusDisabled, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/lineage-missing", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed},
	)
	snapshot.ApiUserMappings = append(snapshot.ApiUserMappings,
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/disabled", ApiUserId: "api-disabled", MappingStatus: PlatformMappingStatusDisabled},
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/unknown", ApiUserId: "api-unknown", MappingStatus: PlatformMappingStatusDisabled},
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/conflicted", ApiUserId: "api-conflicted", MappingStatus: PlatformMappingStatusDisabled},
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/stale", ApiUserId: "api-stale", MappingStatus: PlatformMappingStatusDisabled},
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/lineage-missing", ApiUserId: "api-lineage", MappingStatus: PlatformMappingStatusConfirmed},
	)
	result, err = (OrganizationMasterDataQualityService{
		Store: gatewayProjectionStaticSnapshotStore{snapshot: snapshot},
		Now:   func() time.Time { return generatedAt },
	}).GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("warning readiness returned error: %v", err)
	}
	if result.Status != OrganizationMasterDataQualityStatusBlocked {
		t.Fatalf("duplicate source connection should block: %#v", result)
	}
	for _, alias := range []string{
		OrganizationMasterDataQualityReasonDuplicateSourceConnection,
		OrganizationMasterDataQualityReasonDepartmentSourceKeyMissing,
		OrganizationMasterDataQualityReasonUserSourceKeyMissing,
		OrganizationMasterDataQualityReasonSubjectNotActive,
		OrganizationMasterDataQualityReasonLineageFreshnessUnavailable,
	} {
		if !containsOrganizationMasterDataQualityReason(result.ReasonAliases, alias) {
			t.Fatalf("missing reason %q in %#v", alias, result.ReasonAliases)
		}
	}
	if result.Counts.DisabledSubjectCount == 0 || result.Counts.UnknownSubjectCount == 0 || result.Counts.ConflictedSubjectCount == 0 || result.Counts.StaleSubjectCount == 0 {
		t.Fatalf("non-active subject counts mismatch: %#v", result.Counts)
	}
}

func TestOrganizationMasterDataQualityReadinessReturnsWarningWithoutBlockers(t *testing.T) {
	generatedAt := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	snapshot := organizationMasterDataQualityReadySnapshot(generatedAt)
	snapshot.Departments[0].ExternalDepartmentId = ""

	result, err := (OrganizationMasterDataQualityService{
		Store: gatewayProjectionStaticSnapshotStore{snapshot: snapshot},
		Now:   func() time.Time { return generatedAt },
	}).GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("GetReadiness returned error: %v", err)
	}
	if result.Status != OrganizationMasterDataQualityStatusWarning ||
		!containsOrganizationMasterDataQualityReason(result.ReasonAliases, OrganizationMasterDataQualityReasonDepartmentSourceKeyMissing) {
		t.Fatalf("missing department source key should be warning-only: %#v", result)
	}
}

func TestOrganizationMasterDataQualityReadinessPropagatesStoreError(t *testing.T) {
	_, err := (OrganizationMasterDataQualityService{Store: errorOrganizationMasterDataQualityStore{err: errors.New("store unavailable")}}).
		GetReadiness(OrganizationMasterDataQualityQuery{OrganizationId: "org-a"})
	if err == nil {
		t.Fatalf("expected store error")
	}
}

func organizationMasterDataQualityReadySnapshot(generatedAt time.Time) *GatewayProjectionSnapshot {
	return &GatewayProjectionSnapshot{
		SourceConnections: []SourceConnection{{
			OrganizationId:     "org-a",
			SourceConnectionId: "src-a",
			SourceType:         SourceTypeWecom,
			Status:             SourceConnectionStatusActive,
			Freshness:          PlatformFreshnessFresh,
		}},
		Users: []PlatformUser{{
			OrganizationId:  "org-a",
			AdminSubject:    "org-a/alice",
			DisplayName:     "Alice",
			LifecycleStatus: PlatformLifecycleStatusActive,
			MappingStatus:   PlatformMappingStatusConfirmed,
			OrgVersion:      "orgv-a",
			LastSeenBatchId: "batch-a",
		}},
		ApiUserMappings: []PlatformApiUserMapping{{
			OrganizationId: "org-a",
			AdminSubject:   "org-a/alice",
			ApiUserId:      "api-user-alice",
			MappingStatus:  PlatformMappingStatusConfirmed,
		}},
		Departments: []PlatformDepartment{{
			OrganizationId:       "org-a",
			DepartmentId:         "dept-a",
			ExternalDepartmentId: "ext-a",
			LifecycleStatus:      PlatformLifecycleStatusActive,
		}},
		Memberships: []PlatformMembership{{
			OrganizationId:  "org-a",
			AdminSubject:    "org-a/alice",
			DepartmentId:    "dept-a",
			LifecycleStatus: PlatformLifecycleStatusActive,
		}},
		SyncBatch: &OrgSyncBatch{
			OrganizationId: "org-a",
			BatchId:        "batch-a",
			Status:         OrgSyncBatchStatusSucceeded,
			OrgVersion:     "orgv-a",
			FinishedAt:     generatedAt.Add(-time.Minute),
			Freshness:      PlatformFreshnessFresh,
		},
	}
}

func containsOrganizationMasterDataQualityReason(reasons []string, want string) bool {
	for _, reason := range reasons {
		if reason == want {
			return true
		}
	}
	return false
}

type errorOrganizationMasterDataQualityStore struct {
	err error
}

func (s errorOrganizationMasterDataQualityStore) GetGatewayProjectionSnapshot(organizationID string) (*GatewayProjectionSnapshot, error) {
	return nil, s.err
}
