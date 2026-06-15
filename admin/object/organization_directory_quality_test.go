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
	"errors"
	"strings"
	"testing"
	"time"
)

func TestOrganizationDirectoryQualityClassifiesDepartmentsAndSanitizesSourceIds(t *testing.T) {
	result, err := (OrganizationDirectoryQualityService{
		Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryQualityTestSnapshot()},
		Now:   organizationDirectoryQualityFixedNow,
	}).GetDirectory(OrganizationDirectoryQualityQuery{
		OrganizationId: "org-a",
		EntityType:     OrganizationDirectoryQualityEntityDepartment,
		QualityStatus:  OrganizationMasterDataQualityStatusBlocked,
	})
	if err != nil {
		t.Fatalf("GetDirectory() error = %v", err)
	}
	if result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("GeneratedAt = %v, want fixed now", result.GeneratedAt)
	}
	if result.Total != 1 || result.Summary.Blocked != 1 {
		t.Fatalf("result total/summary = %+v / %+v, want one blocked department", result.Total, result.Summary)
	}
	item := result.Items[0]
	if item.EntityType != OrganizationDirectoryQualityEntityDepartment || item.EntityId != "dept-missing-source" {
		t.Fatalf("item identity = %+v, want blocked department", item)
	}
	if item.QualityStatus != OrganizationMasterDataQualityStatusBlocked ||
		!organizationDirectoryQualityContains(item.ReasonCodes, OrganizationMasterDataQualityReasonSourceConnectionDisabled) ||
		!organizationDirectoryQualityContains(item.ReasonCodes, OrganizationMasterDataQualityReasonDepartmentSourceKeyMissing) {
		t.Fatalf("item quality = %+v, want source disabled and missing key blockers", item)
	}
	if item.SourceConnectionIdHash == "src-disabled" || item.ExternalIdHash != "" {
		t.Fatalf("item leaked source identifiers: %+v", item)
	}
	if !strings.HasPrefix(item.SourceConnectionIdHash, "sha256:") {
		t.Fatalf("SourceConnectionIdHash = %q, want sha256 hash", item.SourceConnectionIdHash)
	}
}

func TestOrganizationDirectoryQualityFiltersUsersByReasonAndKeyword(t *testing.T) {
	result, err := (OrganizationDirectoryQualityService{
		Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryQualityTestSnapshot()},
		Now:   organizationDirectoryQualityFixedNow,
	}).GetDirectory(OrganizationDirectoryQualityQuery{
		OrganizationId: "org-a",
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Keyword:        "Alice",
		ReasonCode:     OrganizationMasterDataQualityReasonMappingMissing,
		Page:           1,
		PageSize:       10,
	})
	if err != nil {
		t.Fatalf("GetDirectory() error = %v", err)
	}
	if result.Total != 1 || len(result.Items) != 1 {
		t.Fatalf("result = %+v, want one matching user", result)
	}
	item := result.Items[0]
	if item.EntityId != "org-a/alice" || item.DisplayName != "Alice" {
		t.Fatalf("item = %+v, want Alice", item)
	}
	if item.QualityStatus != OrganizationMasterDataQualityStatusBlocked ||
		!organizationDirectoryQualityContains(item.ReasonCodes, OrganizationMasterDataQualityReasonMappingMissing) {
		t.Fatalf("item quality = %+v, want mapping_missing blocked", item)
	}
	if item.Detail["membershipCount"] != 1 {
		t.Fatalf("membershipCount = %v, want 1", item.Detail["membershipCount"])
	}
	if _, ok := item.Detail["email"]; ok {
		t.Fatalf("detail leaked email-like field: %+v", item.Detail)
	}
}

func TestOrganizationDirectoryQualityPaginatesMemberships(t *testing.T) {
	result, err := (OrganizationDirectoryQualityService{
		Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryQualityTestSnapshot()},
		Now:   organizationDirectoryQualityFixedNow,
	}).GetDirectory(OrganizationDirectoryQualityQuery{
		OrganizationId: "org-a",
		EntityType:     OrganizationDirectoryQualityEntityMembership,
		Page:           1,
		PageSize:       1,
	})
	if err != nil {
		t.Fatalf("GetDirectory() error = %v", err)
	}
	if result.Total != 2 || len(result.Items) != 1 || result.Page != 1 || result.PageSize != 1 {
		t.Fatalf("pagination result = %+v, want first page with one item", result)
	}
	item := result.Items[0]
	if item.EntityId != "org-a/missing|dept-active" ||
		item.QualityStatus != OrganizationMasterDataQualityStatusBlocked ||
		!organizationDirectoryQualityContains(item.ReasonCodes, OrganizationMasterDataQualityReasonMembershipMissingUser) {
		t.Fatalf("item = %+v, want missing user blocker", item)
	}
}

func TestOrganizationDirectoryQualityFiltersWarningsBySourceHashAndLifecycle(t *testing.T) {
	snapshot := organizationDirectoryQualityTestSnapshot()
	snapshot.SourceConnections = append(snapshot.SourceConnections, SourceConnection{
		OrganizationId:     "org-a",
		SourceConnectionId: "src-stale",
		SourceType:         SourceTypeCustom,
		Status:             SourceConnectionStatusActive,
		Freshness:          PlatformFreshnessStale,
		LastSeenBatchId:    "batch-stale",
	})
	snapshot.Departments = append(snapshot.Departments, PlatformDepartment{
		OrganizationId:       "org-a",
		DepartmentId:         "dept-stale",
		DisplayName:          "过期部门",
		LifecycleStatus:      PlatformLifecycleStatusActive,
		SourceConnectionId:   "src-stale",
		ExternalDepartmentId: "external-dept-stale",
		OrgVersion:           "orgv-stale",
	})

	result, err := (OrganizationDirectoryQualityService{
		Store: organizationDirectoryQualityTestStore{snapshot: snapshot},
		Now:   organizationDirectoryQualityFixedNow,
	}).GetDirectory(OrganizationDirectoryQualityQuery{
		OrganizationId:         "org-a",
		EntityType:             OrganizationDirectoryQualityEntityDepartment,
		QualityStatus:          OrganizationMasterDataQualityStatusWarning,
		SourceConnectionIdHash: organizationDirectoryQualityHash("src-stale"),
		LifecycleStatus:        PlatformLifecycleStatusActive,
		Page:                   3,
		PageSize:               1,
	})
	if err != nil {
		t.Fatalf("GetDirectory() error = %v", err)
	}
	if result.Total != 1 || len(result.Items) != 0 || result.Summary.Warning != 1 {
		t.Fatalf("result = %+v, want warning total with empty third page", result)
	}
}

func TestOrganizationDirectoryQualityRejectsInvalidQuery(t *testing.T) {
	tests := []struct {
		name    string
		query   OrganizationDirectoryQualityQuery
		wantErr string
	}{
		{
			name: "unsupported entity type",
			query: OrganizationDirectoryQualityQuery{
				OrganizationId:  "org-a",
				EntityType:      "group",
				QualityStatus:   OrganizationMasterDataQualityStatusReady,
				LifecycleStatus: PlatformLifecycleStatusActive,
			},
			wantErr: "unsupported entityType",
		},
		{
			name: "unsupported quality status",
			query: OrganizationDirectoryQualityQuery{
				OrganizationId: "org-a",
				EntityType:     OrganizationDirectoryQualityEntityUser,
				QualityStatus:  "clean",
			},
			wantErr: "unsupported qualityStatus",
		},
		{
			name: "negative page",
			query: OrganizationDirectoryQualityQuery{
				OrganizationId: "org-a",
				EntityType:     OrganizationDirectoryQualityEntityUser,
				Page:           -1,
			},
			wantErr: "page must be greater",
		},
		{
			name: "negative page size",
			query: OrganizationDirectoryQualityQuery{
				OrganizationId: "org-a",
				EntityType:     OrganizationDirectoryQualityEntityUser,
				PageSize:       -1,
			},
			wantErr: "pageSize must be greater",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := (OrganizationDirectoryQualityService{
				Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryQualityTestSnapshot()},
			}).GetDirectory(tt.query)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("GetDirectory() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestOrganizationDirectoryQualityReturnsEmptyForBlankOrganization(t *testing.T) {
	result, err := (OrganizationDirectoryQualityService{
		Store: organizationDirectoryQualityTestStore{err: errors.New("store should not be called")},
	}).GetDirectory(OrganizationDirectoryQualityQuery{
		EntityType: OrganizationDirectoryQualityEntityDepartment,
	})
	if err != nil {
		t.Fatalf("GetDirectory(blank organization) error = %v", err)
	}
	if result.Total != 0 || len(result.Items) != 0 || result.OrganizationId != "" {
		t.Fatalf("result = %+v, want empty scoped result", result)
	}
}

func TestOrganizationDirectoryQualityPropagatesStoreError(t *testing.T) {
	_, err := (OrganizationDirectoryQualityService{
		Store: organizationDirectoryQualityTestStore{err: errors.New("store unavailable")},
	}).GetDirectory(OrganizationDirectoryQualityQuery{
		OrganizationId: "org-a",
		EntityType:     OrganizationDirectoryQualityEntityDepartment,
	})
	if err == nil || !strings.Contains(err.Error(), "store unavailable") {
		t.Fatalf("GetDirectory() error = %v, want store unavailable", err)
	}
}

type organizationDirectoryQualityTestStore struct {
	snapshot *GatewayProjectionSnapshot
	err      error
}

func (s organizationDirectoryQualityTestStore) GetGatewayProjectionSnapshot(_ string) (*GatewayProjectionSnapshot, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.snapshot, nil
}

func organizationDirectoryQualityTestSnapshot() *GatewayProjectionSnapshot {
	return &GatewayProjectionSnapshot{
		SourceConnections: []SourceConnection{
			{OrganizationId: "org-a", SourceConnectionId: "src-active", SourceType: SourceTypeWecom, Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh, LastSeenBatchId: "batch-a"},
			{OrganizationId: "org-a", SourceConnectionId: "src-disabled", SourceType: SourceTypeLark, Status: SourceConnectionStatusDisabled, Freshness: PlatformFreshnessFresh, LastSeenBatchId: "batch-b"},
		},
		Departments: []PlatformDepartment{
			{OrganizationId: "org-a", DepartmentId: "dept-active", DisplayName: "研发部", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-active", ExternalDepartmentId: "external-dept-active", OrgVersion: "orgv-a"},
			{OrganizationId: "org-a", DepartmentId: "dept-missing-source", ParentDepartmentId: "dept-missing-parent", DisplayName: "待修复部门", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-disabled", OrgVersion: "orgv-a"},
		},
		Users: []PlatformUser{
			{OrganizationId: "org-a", AdminSubject: "org-a/alice", DisplayName: "Alice", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
			{OrganizationId: "org-a", AdminSubject: "org-a/bob", DisplayName: "Bob", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		},
		ApiUserMappings: []PlatformApiUserMapping{
			{OrganizationId: "org-a", AdminSubject: "org-a/bob", ApiUserId: "api-bob", MappingStatus: PlatformMappingStatusConfirmed},
		},
		Memberships: []PlatformMembership{
			{OrganizationId: "org-a", AdminSubject: "org-a/alice", DepartmentId: "dept-active", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-active", OrgVersion: "orgv-a"},
			{OrganizationId: "org-a", AdminSubject: "org-a/missing", DepartmentId: "dept-active", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-active", OrgVersion: "orgv-a"},
		},
		ExternalIdentities: []ExternalIdentity{
			{OrganizationId: "org-a", SourceConnectionId: "src-active", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "external-subject-synthetic", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "org-a/alice", MappingStatus: PlatformMappingStatusConfirmed, LastSeenBatchId: "batch-a"},
		},
		SyncBatch: &OrgSyncBatch{OrganizationId: "org-a", BatchId: "batch-a", Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-a", Freshness: PlatformFreshnessFresh},
	}
}

func organizationDirectoryQualityFixedNow() time.Time {
	return time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)
}

func organizationDirectoryQualityContains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
