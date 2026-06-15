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
)

func TestOrganizationDirectoryRemediationPlanAggregatesActionsAndSanitizesSamples(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationPlanService{
		QualityService: OrganizationDirectoryQualityService{
			Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
			Now:   organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId: "org-a",
		Limit:          100,
		TopN:           20,
	})
	if err != nil {
		t.Fatalf("GetPlan() error = %v", err)
	}

	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalPlanCount != len(result.Plans) || result.TotalPlanCount < 6 {
		t.Fatalf("plan count = %d / %d, want all remediation groups", result.TotalPlanCount, len(result.Plans))
	}
	if result.Boundary == "" || !strings.Contains(result.Boundary, "只读") {
		t.Fatalf("boundary = %q, want read-only boundary", result.Boundary)
	}

	blockedByCredentials := findOrganizationDirectoryRemediationPlan(t, result.Plans, OrganizationDirectoryRemediationActionBlockedByCredentials)
	if blockedByCredentials.Priority != OrganizationDirectoryRemediationPriorityP0 ||
		blockedByCredentials.AffectedCounts.Total == 0 ||
		!organizationDirectoryQualityContains(blockedByCredentials.ReasonCodes, OrganizationMasterDataQualityReasonSourceConnectionDisabled) ||
		blockedByCredentials.BlockedReason == "" {
		t.Fatalf("blockedByCredentials = %+v, want P0 source blocker", blockedByCredentials)
	}

	identityConflict := findOrganizationDirectoryRemediationPlan(t, result.Plans, OrganizationDirectoryRemediationActionIdentityConflictReview)
	if identityConflict.Priority != OrganizationDirectoryRemediationPriorityP0 ||
		!organizationDirectoryQualityContains(identityConflict.ReasonCodes, OrganizationMasterDataQualityReasonDuplicateAdminSubject) {
		t.Fatalf("identityConflict = %+v, want P0 duplicate admin subject", identityConflict)
	}

	mapping := findOrganizationDirectoryRemediationPlan(t, result.Plans, OrganizationDirectoryRemediationActionMappingReview)
	if mapping.Priority != OrganizationDirectoryRemediationPriorityP1 || mapping.AffectedCounts.User == 0 {
		t.Fatalf("mapping = %+v, want P1 user mapping review", mapping)
	}

	membership := findOrganizationDirectoryRemediationPlan(t, result.Plans, OrganizationDirectoryRemediationActionMembershipRepair)
	if membership.Priority != OrganizationDirectoryRemediationPriorityP1 || membership.AffectedCounts.Total == 0 {
		t.Fatalf("membership = %+v, want P1 membership repair", membership)
	}

	lifecycle := findOrganizationDirectoryRemediationPlan(t, result.Plans, OrganizationDirectoryRemediationActionLifecycleCleanup)
	if lifecycle.Priority != OrganizationDirectoryRemediationPriorityP2 || lifecycle.AffectedCounts.User == 0 {
		t.Fatalf("lifecycle = %+v, want P2 lifecycle cleanup", lifecycle)
	}

	sourceRefresh := findOrganizationDirectoryRemediationPlan(t, result.Plans, OrganizationDirectoryRemediationActionSourceRefresh)
	if sourceRefresh.Priority != OrganizationDirectoryRemediationPriorityP1 ||
		!organizationDirectoryQualityContains(sourceRefresh.ReasonCodes, OrganizationMasterDataQualityReasonLineageFreshnessUnavailable) {
		t.Fatalf("sourceRefresh = %+v, want P1 lineage/source refresh", sourceRefresh)
	}

	for _, plan := range result.Plans {
		if plan.SafeSummary == "" || len(plan.OperatorActions) == 0 {
			t.Fatalf("plan = %+v, want operator summary and actions", plan)
		}
		for _, sample := range plan.SampleEntityIds {
			if strings.Contains(sample, "external-subject") || strings.Contains(sample, "alice@example") {
				t.Fatalf("sampleEntityIds leaked raw source data: %+v", plan.SampleEntityIds)
			}
			if !strings.Contains(sample, "sha256:") {
				t.Fatalf("sampleEntityIds = %+v, want hashed samples", plan.SampleEntityIds)
			}
		}
		for _, sampleHash := range plan.SampleEntityHashes {
			if !strings.HasPrefix(sampleHash, "sha256:") {
				t.Fatalf("sampleEntityHashes = %+v, want sha256 hashes", plan.SampleEntityHashes)
			}
		}
	}
	if len(result.ExportSummary.Plans) != len(result.Plans) {
		t.Fatalf("export plans = %d, want %d", len(result.ExportSummary.Plans), len(result.Plans))
	}
}

func TestOrganizationDirectoryRemediationPlanDefaultsToBlockedAndWarnings(t *testing.T) {
	blankResult, err := GetOrganizationDirectoryRemediationPlan(OrganizationDirectoryRemediationPlanQuery{})
	if err != nil {
		t.Fatalf("GetOrganizationDirectoryRemediationPlan(blank) error = %v", err)
	}
	if blankResult.TotalPlanCount != 0 || blankResult.Boundary == "" {
		t.Fatalf("blankResult = %+v, want empty read-only plan", blankResult)
	}

	service := OrganizationDirectoryRemediationPlanService{
		QualityService: OrganizationDirectoryQualityService{
			Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryQualityTestSnapshot()},
			Now:   organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}

	defaultResult, err := service.GetPlan(OrganizationDirectoryRemediationPlanQuery{OrganizationId: "org-a"})
	if err != nil {
		t.Fatalf("GetPlan(default) error = %v", err)
	}
	if defaultResult.TotalPlanCount == 0 {
		t.Fatalf("default result = %+v, want blocked/warning plan groups", defaultResult)
	}

	readyResult, err := service.GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId:  "org-a",
		QualityStatus:   OrganizationMasterDataQualityStatusReady,
		EntityType:      OrganizationDirectoryQualityEntityUser,
		ReasonCode:      OrganizationMasterDataQualityReasonMappingMissing,
		SourceType:      SourceTypeWecom,
		LifecycleStatus: PlatformLifecycleStatusActive,
	})
	if err != nil {
		t.Fatalf("GetPlan(ready) error = %v", err)
	}
	if readyResult.TotalPlanCount != 0 || len(readyResult.Plans) != 0 {
		t.Fatalf("ready result = %+v, want empty plan", readyResult)
	}
}

func TestOrganizationDirectoryRemediationPlanAppliesFiltersAndLimits(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationPlanService{
		QualityService: OrganizationDirectoryQualityService{
			Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
			Now:   organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId: "org-a",
		EntityType:     OrganizationDirectoryQualityEntityUser,
		QualityStatus:  OrganizationMasterDataQualityStatusBlocked,
		ReasonCode:     OrganizationMasterDataQualityReasonMappingMissing,
		Keyword:        "Alice",
		Limit:          5,
		TopN:           1,
	})
	if err != nil {
		t.Fatalf("GetPlan(filtered) error = %v", err)
	}
	if result.TotalPlanCount != 1 || len(result.Plans) != 1 {
		t.Fatalf("filtered result = %+v, want one plan", result)
	}
	plan := result.Plans[0]
	if plan.ActionAlias != OrganizationDirectoryRemediationActionMappingReview || plan.AffectedCounts.User != 1 {
		t.Fatalf("plan = %+v, want user mapping review", plan)
	}
}

func TestOrganizationDirectoryRemediationPlanRejectsInvalidQueryAndPropagatesStoreError(t *testing.T) {
	_, err := (OrganizationDirectoryRemediationPlanService{}).GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId: "org-a",
		EntityType:     "group",
	})
	if err == nil || !strings.Contains(err.Error(), "unsupported entityType") {
		t.Fatalf("GetPlan(invalid entity) error = %v, want unsupported entityType", err)
	}

	_, err = (OrganizationDirectoryRemediationPlanService{}).GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId: "org-a",
		Limit:          101,
	})
	if err == nil || !strings.Contains(err.Error(), "limit") {
		t.Fatalf("GetPlan(invalid limit) error = %v, want limit error", err)
	}

	_, err = (OrganizationDirectoryRemediationPlanService{}).GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId: "org-a",
		QualityStatus:  "clean",
	})
	if err == nil || !strings.Contains(err.Error(), "unsupported qualityStatus") {
		t.Fatalf("GetPlan(invalid status) error = %v, want unsupported qualityStatus", err)
	}

	_, err = (OrganizationDirectoryRemediationPlanService{}).GetPlan(OrganizationDirectoryRemediationPlanQuery{
		OrganizationId: "org-a",
		TopN:           101,
	})
	if err == nil || !strings.Contains(err.Error(), "topN") {
		t.Fatalf("GetPlan(invalid topN) error = %v, want topN error", err)
	}

	empty, err := (OrganizationDirectoryRemediationPlanService{
		QualityService: OrganizationDirectoryQualityService{Store: organizationDirectoryQualityTestStore{err: errors.New("store should not be called")}},
	}).GetPlan(OrganizationDirectoryRemediationPlanQuery{})
	if err != nil {
		t.Fatalf("GetPlan(blank organization) error = %v", err)
	}
	if empty.TotalPlanCount != 0 || empty.OrganizationId != "" {
		t.Fatalf("empty = %+v, want blank-scoped empty plan", empty)
	}

	_, err = (OrganizationDirectoryRemediationPlanService{
		QualityService: OrganizationDirectoryQualityService{Store: organizationDirectoryQualityTestStore{err: errors.New("store unavailable")}},
	}).GetPlan(OrganizationDirectoryRemediationPlanQuery{OrganizationId: "org-a"})
	if err == nil || !strings.Contains(err.Error(), "store unavailable") {
		t.Fatalf("GetPlan(store error) error = %v, want store unavailable", err)
	}
}

func organizationDirectoryRemediationPlanTestSnapshot() *GatewayProjectionSnapshot {
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
		DisplayName:          "Stale Department",
		LifecycleStatus:      PlatformLifecycleStatusActive,
		SourceConnectionId:   "src-stale",
		ExternalDepartmentId: "external-dept-stale",
		OrgVersion:           "orgv-stale",
	})
	snapshot.Users = append(snapshot.Users,
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/duplicate", DisplayName: "Duplicate One", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/duplicate", DisplayName: "Duplicate Two", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/disabled", DisplayName: "Disabled User", LifecycleStatus: PlatformLifecycleStatusDisabled, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		PlatformUser{OrganizationId: "org-a", AdminSubject: "org-a/lineage", DisplayName: "Lineage Missing", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed},
	)
	snapshot.ApiUserMappings = append(snapshot.ApiUserMappings,
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/duplicate", ApiUserId: "api-duplicate", MappingStatus: PlatformMappingStatusConfirmed},
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/disabled", ApiUserId: "api-disabled", MappingStatus: PlatformMappingStatusConfirmed},
		PlatformApiUserMapping{OrganizationId: "org-a", AdminSubject: "org-a/lineage", ApiUserId: "api-lineage", MappingStatus: PlatformMappingStatusConfirmed},
	)
	return snapshot
}

func findOrganizationDirectoryRemediationPlan(t *testing.T, plans []OrganizationDirectoryRemediationPlan, actionAlias string) OrganizationDirectoryRemediationPlan {
	t.Helper()
	for _, plan := range plans {
		if plan.ActionAlias == actionAlias {
			return plan
		}
	}
	t.Fatalf("missing plan actionAlias %q in %+v", actionAlias, plans)
	return OrganizationDirectoryRemediationPlan{}
}
