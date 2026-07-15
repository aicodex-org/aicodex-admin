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
)

func TestSavePlatformApiOrganizationMappingPopulatesDefaultLineage(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	mapping := &PlatformApiOrganizationMapping{
		OrganizationId:    "org-alpha",
		ApiOrganizationId: "00000000-0000-7000-8000-000000000123",
		MappingStatus:     PlatformMappingStatusConfirmed,
		MappingSource:     PlatformApiMappingSourceManual,
		Lineage:           "{}",
	}

	if err := SavePlatformApiOrganizationMapping(mapping); err != nil {
		t.Fatalf("SavePlatformApiOrganizationMapping() error = %v", err)
	}

	stored, err := GetPlatformApiOrganizationMappingByOrganization("org-alpha")
	if err != nil {
		t.Fatalf("GetPlatformApiOrganizationMappingByOrganization() error = %v", err)
	}
	assertDefaultPlatformApiMappingLineage(t, stored.Lineage)
}

func TestSavePlatformApiUserMappingPreservesExistingLineage(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	existingLineage := `{"source":"migration","values":["api-user-1"]}`
	mapping := &PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/alice",
		ApiUserId:      "api-user-1",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceMigration,
		Lineage:        existingLineage,
	}

	if err := SavePlatformApiUserMapping(mapping); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	stored, err := GetPlatformApiUserMappingByAdminSubject("org-alpha", "org-alpha/alice")
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingByAdminSubject() error = %v", err)
	}
	if stored.Lineage != existingLineage {
		t.Fatalf("lineage = %q, want existing lineage %q", stored.Lineage, existingLineage)
	}
}

func TestSavePlatformApiUserMappingPopulatesDefaultLineage(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	mapping := &PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/bob",
		ApiUserId:      "api-user-2",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceManual,
	}

	if err := SavePlatformApiUserMapping(mapping); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	stored, err := GetPlatformApiUserMappingByAdminSubject("org-alpha", "org-alpha/bob")
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingByAdminSubject() error = %v", err)
	}
	assertDefaultPlatformApiMappingLineage(t, stored.Lineage)
}

func TestGetPaginationPlatformApiUserMappingsFiltersAndCounts(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	fixtures := []*PlatformApiUserMapping{
		{
			OrganizationId: "org-alpha",
			AdminSubject:   "org-alpha/alice",
			ApiUserId:      "api-user-alice",
			MappingStatus:  PlatformMappingStatusConfirmed,
			MappingSource:  PlatformApiMappingSourceManual,
		},
		{
			OrganizationId: "org-alpha",
			AdminSubject:   "org-alpha/bob",
			ApiUserId:      "api-user-bob",
			MappingStatus:  PlatformMappingStatusPendingReview,
			MappingSource:  PlatformApiMappingSourceMigration,
		},
		{
			OrganizationId: "org-beta",
			AdminSubject:   "org-beta/alice",
			ApiUserId:      "api-user-beta-alice",
			MappingStatus:  PlatformMappingStatusConfirmed,
			MappingSource:  PlatformApiMappingSourceManual,
		},
	}
	for _, fixture := range fixtures {
		if err := SavePlatformApiUserMapping(fixture); err != nil {
			t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
		}
	}

	count, err := GetPlatformApiUserMappingCount("org-alpha", "alice")
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingCount() error = %v", err)
	}
	if count != 1 {
		t.Fatalf("count = %d, want 1", count)
	}

	page, err := GetPaginationPlatformApiUserMappings("org-alpha", 0, 1, "")
	if err != nil {
		t.Fatalf("GetPaginationPlatformApiUserMappings() error = %v", err)
	}
	if len(page) != 1 || page[0].AdminSubject != "org-alpha/alice" {
		t.Fatalf("page = %#v, want first sorted org-alpha/alice mapping", page)
	}
}

func TestGetPlatformApiUserMappingReadinessClassifiesPublishableAndBlockedSubjects(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/active",
		DisplayName:     "Active User",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusConfirmed,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/tombstone",
		LifecycleStatus: PlatformLifecycleStatusDisabled,
		MappingStatus:   PlatformMappingStatusDisabled,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/missing",
		DisplayName:     "Legacy Candidate",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusConfirmed,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/untrusted",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusPendingReview,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/no-lineage",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusConfirmed,
	})
	for _, mapping := range []*PlatformApiUserMapping{
		{OrganizationId: "org-alpha", AdminSubject: "org-alpha/active", ApiUserId: "api-active", MappingStatus: PlatformMappingStatusConfirmed, MappingSource: PlatformApiMappingSourceManual},
		{OrganizationId: "org-alpha", AdminSubject: "org-alpha/tombstone", ApiUserId: "api-tombstone", MappingStatus: PlatformMappingStatusDisabled, MappingSource: PlatformApiMappingSourceManual},
		{OrganizationId: "org-alpha", AdminSubject: "org-alpha/untrusted", ApiUserId: "api-untrusted", MappingStatus: PlatformMappingStatusConfirmed, MappingSource: PlatformApiMappingSourceManual},
		{OrganizationId: "org-alpha", AdminSubject: "org-alpha/no-lineage", ApiUserId: "api-no-lineage", MappingStatus: PlatformMappingStatusConfirmed, MappingSource: PlatformApiMappingSourceManual},
	} {
		if err := SavePlatformApiUserMapping(mapping); err != nil {
			t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
		}
	}

	readiness, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{OrganizationId: "org-alpha"})
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	if readiness.TotalSubjectCount != 5 {
		t.Fatalf("TotalSubjectCount = %d, want 5", readiness.TotalSubjectCount)
	}
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessActivePublishable, 1)
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessTombstonePublishable, 1)
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessMappingMissing, 1)
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessMappingUntrusted, 1)
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessLineageFreshnessUnavailable, 1)
	assertReadinessCategory(t, readiness, "org-alpha/missing", PlatformApiMappingReadinessMappingMissing)
	assertReadinessCategory(t, readiness, "org-alpha/tombstone", PlatformApiMappingReadinessTombstonePublishable)
}

func TestGetPlatformApiUserMappingReadinessIncludesOperatorRemediationGuidance(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/missing",
		DisplayName:     "Display Only Candidate",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusConfirmed,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/untrusted",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusPendingReview,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})

	readiness, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{OrganizationId: "org-alpha"})
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingReadiness() error = %v", err)
	}

	guidanceByCategory := map[string]PlatformApiUserMappingReadinessGuidance{}
	for _, guidance := range readiness.RemediationGuidance {
		guidanceByCategory[guidance.Category] = guidance
	}
	for _, category := range []string{
		PlatformApiMappingReadinessActivePublishable,
		PlatformApiMappingReadinessTombstonePublishable,
		PlatformApiMappingReadinessMappingMissing,
		PlatformApiMappingReadinessMappingUntrusted,
		PlatformApiMappingReadinessLifecycleNotPublishable,
		PlatformApiMappingReadinessSourceMetadataUnavailable,
		PlatformApiMappingReadinessLineageFreshnessUnavailable,
	} {
		guidance, ok := guidanceByCategory[category]
		if !ok {
			t.Fatalf("remediation guidance missing category %s", category)
		}
		if guidance.Code == "" || guidance.Summary == "" || guidance.MinimumUnblockCondition == "" || guidance.Boundary == "" {
			t.Fatalf("guidance for %s is incomplete: %#v", category, guidance)
		}
		if len(guidance.OperatorActions) == 0 {
			t.Fatalf("guidance for %s has no operator actions", category)
		}
	}

	missing := guidanceByCategory[PlatformApiMappingReadinessMappingMissing]
	assertContainsText(t, missing.MinimumUnblockCondition, "organizationId + adminSubject")
	assertContainsText(t, missing.MinimumUnblockCondition, "PlatformApiUserMapping.ApiUserId")
	assertContainsText(t, missing.Boundary, "display")

	untrusted := guidanceByCategory[PlatformApiMappingReadinessMappingUntrusted]
	assertContainsText(t, untrusted.MinimumUnblockCondition, PlatformMappingStatusConfirmed)

	freshness := guidanceByCategory[PlatformApiMappingReadinessLineageFreshnessUnavailable]
	assertContainsText(t, freshness.OperatorActions[0], "OrgVersion")
	assertContainsText(t, freshness.Boundary, "API/Insight")
}

func TestGetPlatformApiUserMappingReadinessClassifiesTombstoneBlockedBranches(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/tombstone-untrusted",
		LifecycleStatus: PlatformLifecycleStatusDeleted,
		MappingStatus:   PlatformMappingStatusDisabled,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/tombstone-no-lineage",
		LifecycleStatus: PlatformLifecycleStatusDeleted,
		MappingStatus:   PlatformMappingStatusDisabled,
	})
	for _, mapping := range []*PlatformApiUserMapping{
		{OrganizationId: "org-alpha", AdminSubject: "org-alpha/tombstone-untrusted", ApiUserId: "api-tombstone-untrusted", MappingStatus: PlatformMappingStatusPendingReview, MappingSource: PlatformApiMappingSourceManual},
		{OrganizationId: "org-alpha", AdminSubject: "org-alpha/tombstone-no-lineage", ApiUserId: "api-tombstone-no-lineage", MappingStatus: PlatformMappingStatusDisabled, MappingSource: PlatformApiMappingSourceManual},
	} {
		if err := SavePlatformApiUserMapping(mapping); err != nil {
			t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
		}
	}

	readiness, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{OrganizationId: "org-alpha"})
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	assertReadinessCategory(t, readiness, "org-alpha/tombstone-untrusted", PlatformApiMappingReadinessMappingUntrusted)
	assertReadinessCategory(t, readiness, "org-alpha/tombstone-no-lineage", PlatformApiMappingReadinessLineageFreshnessUnavailable)
}

func TestGetPlatformApiUserMappingReadinessFiltersAndDoesNotInferLegacyDisplayValues(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/display-only",
		DisplayName:     "api-legacy-candidate",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusConfirmed,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})

	readiness, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{
		OrganizationId:     "org-alpha",
		Keyword:            "legacy",
		ReadinessCategory:  PlatformApiMappingReadinessMappingMissing,
		UserMappingStatus:  PlatformMappingStatusConfirmed,
		MaxCandidateResult: 10,
	})
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	if len(readiness.Candidates) != 1 {
		t.Fatalf("candidates = %d, want 1", len(readiness.Candidates))
	}
	candidate := readiness.Candidates[0]
	if candidate.ReadinessCategory != PlatformApiMappingReadinessMappingMissing {
		t.Fatalf("ReadinessCategory = %q, want mapping_missing", candidate.ReadinessCategory)
	}
	if candidate.ApiUserId != "" {
		t.Fatalf("ApiUserId = %q, want empty; display values must stay diagnostic-only", candidate.ApiUserId)
	}
}

func TestGetPlatformApiUserMappingReadinessFiltersCandidatesWithoutHidingCounts(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/active",
		DisplayName:     "Active User",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusConfirmed,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/pending",
		DisplayName:     "Pending User",
		LifecycleStatus: PlatformLifecycleStatusActive,
		MappingStatus:   PlatformMappingStatusPendingReview,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	if err := SavePlatformApiUserMapping(&PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/active",
		ApiUserId:      "api-active",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceManual,
	}); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	readiness, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{
		OrganizationId:     "org-alpha",
		Keyword:            "no-match",
		ReadinessCategory:  PlatformApiMappingReadinessMappingMissing,
		UserMappingStatus:  PlatformMappingStatusDisabled,
		MaxCandidateResult: 10,
	})
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	if readiness.TotalSubjectCount != 2 {
		t.Fatalf("TotalSubjectCount = %d, want 2", readiness.TotalSubjectCount)
	}
	if readiness.ReturnedCount != 0 || len(readiness.Candidates) != 0 {
		t.Fatalf("filtered candidates returned=%d len=%d, want 0", readiness.ReturnedCount, len(readiness.Candidates))
	}
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessActivePublishable, 1)
	assertReadinessCount(t, readiness, PlatformApiMappingReadinessMappingUntrusted, 1)
}

func TestGetPlatformApiUserMappingReadinessHandlesEmptyAndUnsupportedLifecycle(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	empty, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{})
	if err != nil {
		t.Fatalf("empty GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	if empty.TotalSubjectCount != 0 || len(empty.Candidates) != 0 {
		t.Fatalf("empty readiness = %#v, want no subjects", empty)
	}

	insertPlatformApiMappingTestUser(t, &PlatformUser{
		OrganizationId:  "org-alpha",
		AdminSubject:    "org-alpha/service-account",
		LifecycleStatus: "SERVICE_ONLY",
		MappingStatus:   PlatformMappingStatusConfirmed,
		OrgVersion:      "orgv-1",
		LastSeenBatchId: "batch-1",
	})
	if err := SavePlatformApiUserMapping(&PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/service-account",
		ApiUserId:      "api-service",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceManual,
	}); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	readiness, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{OrganizationId: "org-alpha"})
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	assertReadinessCategory(t, readiness, "org-alpha/service-account", PlatformApiMappingReadinessLifecycleNotPublishable)
	if classifyPlatformApiUserMappingReadiness(nil, nil) != PlatformApiMappingReadinessSourceMetadataUnavailable {
		t.Fatalf("nil user should be source_metadata_unavailable")
	}
}

func TestGetPlatformApiUserMappingReadinessHandlesNoStoreAndCandidateLimit(t *testing.T) {
	oldOrmer := ormer
	ormer = nil
	noStore, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{OrganizationId: "org-alpha"})
	ormer = oldOrmer
	if err != nil {
		t.Fatalf("no store GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	if noStore.TotalSubjectCount != 0 || len(noStore.Candidates) != 0 {
		t.Fatalf("no store readiness = %#v, want empty", noStore)
	}

	setupPlatformApiMappingTestOrmer(t)
	for _, subject := range []string{"org-alpha/one", "org-alpha/two"} {
		insertPlatformApiMappingTestUser(t, &PlatformUser{
			OrganizationId:  "org-alpha",
			AdminSubject:    subject,
			LifecycleStatus: PlatformLifecycleStatusActive,
			MappingStatus:   PlatformMappingStatusConfirmed,
			OrgVersion:      "orgv-1",
			LastSeenBatchId: "batch-1",
		})
	}
	limited, err := GetPlatformApiUserMappingReadiness(PlatformApiUserMappingReadinessQuery{
		OrganizationId:     "org-alpha",
		MaxCandidateResult: 1,
	})
	if err != nil {
		t.Fatalf("limited GetPlatformApiUserMappingReadiness() error = %v", err)
	}
	if limited.TotalSubjectCount != 2 || len(limited.Candidates) != 1 {
		t.Fatalf("limited readiness total=%d candidates=%d, want total=2 candidates=1", limited.TotalSubjectCount, len(limited.Candidates))
	}
}

func TestValidateApplicationUserTokenContextBindsSharedApplicationOrganization(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "org-alpha")

	if err := SavePlatformApiOrganizationMapping(&PlatformApiOrganizationMapping{
		OrganizationId:    "org-alpha",
		ApiOrganizationId: "00000000-0000-7000-8000-000000000123",
		MappingStatus:     PlatformMappingStatusConfirmed,
		MappingSource:     PlatformApiMappingSourceManual,
	}); err != nil {
		t.Fatalf("SavePlatformApiOrganizationMapping() error = %v", err)
	}
	if err := SavePlatformApiUserMapping(&PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/alice",
		ApiUserId:      "api-user-alice",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceManual,
	}); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	application := &Application{
		Owner:                      "admin",
		Name:                       "shared-api",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-alpha"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
		ApiMappingRequired:         true,
	}
	user := &User{Owner: "org-alpha", Name: "alice"}

	if err := ValidateApplicationUserTokenContext(application, user); err != nil {
		t.Fatalf("ValidateApplicationUserTokenContext() error = %v", err)
	}
	if application.Organization != "org-alpha" {
		t.Fatalf("application organization = %q, want org-alpha", application.Organization)
	}
}

func TestValidateApplicationUserTokenContextFailsClosedWithoutConfirmedMappings(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "org-alpha")

	application := &Application{
		Owner:                      "admin",
		Name:                       "shared-api",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-alpha"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
		ApiMappingRequired:         true,
	}
	user := &User{Owner: "org-alpha", Name: "alice"}

	err := ValidateApplicationUserTokenContext(application, user)
	if !errors.Is(err, ErrPlatformApiOrganizationMappingMissing) {
		t.Fatalf("ValidateApplicationUserTokenContext() error = %v, want organization mapping missing", err)
	}
}

func TestBindApplicationToStoredTokenOrganizationRestoresSharedOrganization(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "org-alpha")

	application := &Application{
		Owner:                      "admin",
		Name:                       "shared-api",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-alpha"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
	}
	token := &Token{
		Application:  "shared-api",
		Organization: "org-alpha",
	}

	if tokenError := bindApplicationToStoredTokenOrganization(application, token); tokenError != nil {
		t.Fatalf("bindApplicationToStoredTokenOrganization() error = %#v", tokenError)
	}
	if application.Organization != "org-alpha" {
		t.Fatalf("application organization = %q, want org-alpha", application.Organization)
	}

	token.Application = "other-api"
	if tokenError := bindApplicationToStoredTokenOrganization(application, token); tokenError == nil || tokenError.Error != InvalidGrant {
		t.Fatalf("bindApplicationToStoredTokenOrganization() mismatch error = %#v, want invalid_grant", tokenError)
	}
}

func setupPlatformApiMappingTestOrmer(t *testing.T) {
	t.Helper()

	engine := newSQLiteTestEngine(t, new(Organization), new(PlatformUser), new(PlatformApiOrganizationMapping), new(PlatformApiUserMapping))

	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		ormer = oldOrmer
	})
}

func insertPlatformApiMappingTestUser(t *testing.T, user *PlatformUser) {
	t.Helper()

	user.Owner = firstNonEmpty(user.Owner, user.OrganizationId)
	user.Name = firstNonEmpty(user.Name, prefixedStableHash("platform-user-", user.OrganizationId, user.AdminSubject))
	_, err := ormer.Engine.Insert(user)
	if err != nil {
		t.Fatalf("insert platform user %s error = %v", user.AdminSubject, err)
	}
}

func assertReadinessCount(t *testing.T, readiness *PlatformApiUserMappingReadiness, category string, want int) {
	t.Helper()
	if readiness.Counts[category] != want {
		t.Fatalf("Counts[%s] = %d, want %d", category, readiness.Counts[category], want)
	}
}

func assertReadinessCategory(t *testing.T, readiness *PlatformApiUserMappingReadiness, adminSubject string, want string) {
	t.Helper()
	for _, candidate := range readiness.Candidates {
		if candidate.AdminSubject == adminSubject {
			if candidate.ReadinessCategory != want {
				t.Fatalf("%s category = %q, want %q", adminSubject, candidate.ReadinessCategory, want)
			}
			return
		}
	}
	t.Fatalf("adminSubject %s not found in readiness candidates", adminSubject)
}

func assertContainsText(t *testing.T, value string, wantSubstring string) {
	t.Helper()
	if !strings.Contains(value, wantSubstring) {
		t.Fatalf("%q should contain %q", value, wantSubstring)
	}
}

func insertPlatformApiMappingTestOrganization(t *testing.T, name string) {
	t.Helper()

	_, err := ormer.Engine.Insert(&Organization{
		Owner: "admin",
		Name:  name,
	})
	if err != nil {
		t.Fatalf("insert organization %s error = %v", name, err)
	}
}

func assertDefaultPlatformApiMappingLineage(t *testing.T, lineage string) {
	t.Helper()

	if lineage == "" || lineage == "{}" {
		t.Fatalf("lineage = %q, want system generated lineage", lineage)
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(lineage), &payload); err != nil {
		t.Fatalf("lineage should be valid JSON, got %q: %v", lineage, err)
	}
	if payload["source"] != "admin-console" || payload["action"] != "manual-update" || payload["reason"] != "operator-maintained" {
		t.Fatalf("lineage payload = %#v, want admin-console manual-update lineage", payload)
	}
	if payload["version"] != float64(1) {
		t.Fatalf("lineage version = %#v, want 1", payload["version"])
	}
}
