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

func TestOrganizationDirectoryRemediationPreflightBuildsManualReviewPreflight(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationPreflightService{
		DraftService: OrganizationDirectoryRemediationActionDraftService{
			QualityService: OrganizationDirectoryQualityService{
				Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
				Now:   organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetPreflights(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetPreflights() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalPreflightCount != 1 || len(result.Preflights) != 1 {
		t.Fatalf("result = %+v, want one preflight", result)
	}
	preflight := result.Preflights[0]
	if preflight.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly || preflight.AutoExecutionAllowed {
		t.Fatalf("execution flags = %+v, want manual review only and auto execution disabled", preflight)
	}
	if !preflight.ReadyForManualReview || len(preflight.BlockedReasons) != 0 {
		t.Fatalf("preflight readiness = %+v, want ready without blockers", preflight)
	}
	if preflight.ActionAlias != OrganizationDirectoryRemediationActionMappingReview ||
		preflight.EntityType != OrganizationDirectoryQualityEntityUser ||
		preflight.AffectedCounts.Total == 0 ||
		len(preflight.Preconditions) == 0 ||
		len(preflight.SafetyChecklist) == 0 ||
		len(preflight.OperatorNextSteps) == 0 ||
		len(preflight.SampleDigests) == 0 {
		t.Fatalf("preflight = %+v, want populated manual-review preflight", preflight)
	}
	sample := preflight.SampleDigests[0]
	if !strings.HasPrefix(sample.EntityHash, "sha256:") ||
		sample.DisplaySafeLabel == "" ||
		sample.SourceType == "" ||
		sample.QualityStatus != OrganizationMasterDataQualityStatusBlocked ||
		!organizationDirectoryQualityContains(sample.ReasonCodes, OrganizationMasterDataQualityReasonMappingMissing) {
		t.Fatalf("sample digest = %+v, want sanitized mapping sample", sample)
	}
	serialized := strings.ToLower(sample.DisplaySafeLabel + " " + sample.EntityHash)
	if strings.Contains(serialized, "alice") || strings.Contains(serialized, "org-a/alice") || strings.Contains(serialized, "external-subject") {
		t.Fatalf("sample digest leaked raw identity data: %+v", sample)
	}
	if len(result.ExportSummary.Preflights) != 1 || result.ExportSummary.Preflights[0].SampleDigests[0].EntityHash != sample.EntityHash {
		t.Fatalf("exportSummary = %+v, want sanitized preflight export", result.ExportSummary)
	}
}

func TestOrganizationDirectoryRemediationPreflightFiltersByDraftId(t *testing.T) {
	service := OrganizationDirectoryRemediationPreflightService{
		DraftService: OrganizationDirectoryRemediationActionDraftService{
			QualityService: OrganizationDirectoryQualityService{
				Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
				Now:   organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}
	base, err := service.GetPreflights(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetPreflights(base) error = %v", err)
	}
	if len(base.Preflights) != 1 {
		t.Fatalf("base preflights = %+v, want one", base.Preflights)
	}

	filtered, err := service.GetPreflights(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId: "org-a",
		DraftId:        base.Preflights[0].DraftId,
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetPreflights(filtered) error = %v", err)
	}
	if len(filtered.Preflights) != 1 || filtered.Preflights[0].DraftId != base.Preflights[0].DraftId {
		t.Fatalf("filtered preflights = %+v, want draftId %q", filtered.Preflights, base.Preflights[0].DraftId)
	}
}

func TestOrganizationDirectoryRemediationPreflightFailsClosedForMissingDraftReadyAndBlankOrganization(t *testing.T) {
	service := OrganizationDirectoryRemediationPreflightService{
		DraftService: OrganizationDirectoryRemediationActionDraftService{
			QualityService: OrganizationDirectoryQualityService{
				Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
				Now:   organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}

	missing, err := service.GetPreflights(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetPreflights(missing draft) error = %v", err)
	}
	if len(missing.Preflights) != 1 || missing.Preflights[0].ReadyForManualReview || !organizationDirectoryQualityContains(missing.Preflights[0].BlockedReasons, OrganizationDirectoryRemediationPreflightBlockerDraftNotFound) {
		t.Fatalf("missing = %+v, want blocked missing-draft preflight", missing)
	}

	ready, err := service.GetPreflights(OrganizationDirectoryRemediationPreflightQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("GetPreflights(ready) error = %v", err)
	}
	if ready.TotalPreflightCount != 0 || len(ready.Preflights) != 0 {
		t.Fatalf("ready = %+v, want empty fail-closed result", ready)
	}

	blank, err := (OrganizationDirectoryRemediationPreflightService{}).GetPreflights(OrganizationDirectoryRemediationPreflightQuery{})
	if err != nil {
		t.Fatalf("GetPreflights(blank organization) error = %v", err)
	}
	if blank.TotalPreflightCount != 0 || blank.OrganizationId != "" {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}
}

func TestOrganizationDirectoryRemediationPreflightRejectsInvalidQueryAndPropagatesStoreError(t *testing.T) {
	invalidQueries := []struct {
		name      string
		query     OrganizationDirectoryRemediationPreflightQuery
		wantError string
	}{
		{name: "action", query: OrganizationDirectoryRemediationPreflightQuery{OrganizationId: "org-a", ActionAlias: "execute_repair"}, wantError: "unsupported actionAlias"},
		{name: "entity", query: OrganizationDirectoryRemediationPreflightQuery{OrganizationId: "org-a", EntityType: "device"}, wantError: "unsupported entityType"},
		{name: "status", query: OrganizationDirectoryRemediationPreflightQuery{OrganizationId: "org-a", QualityStatus: "running"}, wantError: "unsupported qualityStatus"},
		{name: "limit-negative", query: OrganizationDirectoryRemediationPreflightQuery{OrganizationId: "org-a", Limit: -1}, wantError: "limit"},
		{name: "topN-too-large", query: OrganizationDirectoryRemediationPreflightQuery{OrganizationId: "org-a", TopN: 101}, wantError: "topN"},
	}

	for _, tt := range invalidQueries {
		t.Run(tt.name, func(t *testing.T) {
			_, err := (OrganizationDirectoryRemediationPreflightService{}).GetPreflights(tt.query)
			if err == nil || !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("GetPreflights(%s) error = %v, want %q", tt.name, err, tt.wantError)
			}
		})
	}

	_, err := (OrganizationDirectoryRemediationPreflightService{
		DraftService: OrganizationDirectoryRemediationActionDraftService{
			QualityService: OrganizationDirectoryQualityService{Store: organizationDirectoryQualityTestStore{err: errors.New("store unavailable")}},
		},
	}).GetPreflights(OrganizationDirectoryRemediationPreflightQuery{OrganizationId: "org-a"})
	if err == nil || !strings.Contains(err.Error(), "store unavailable") {
		t.Fatalf("GetPreflights(store error) error = %v, want store unavailable", err)
	}
}

func TestOrganizationDirectoryRemediationPreflightDefaultWrapperFailsClosedForBlankOrganization(t *testing.T) {
	result, err := GetOrganizationDirectoryRemediationPreflights(OrganizationDirectoryRemediationPreflightQuery{})
	if err != nil {
		t.Fatalf("GetOrganizationDirectoryRemediationPreflights() error = %v", err)
	}
	if result.OrganizationId != "" || result.TotalPreflightCount != 0 || len(result.Preflights) != 0 {
		t.Fatalf("result = %+v, want empty scoped result", result)
	}
}

func TestOrganizationDirectoryRemediationPreflightBlocksUnsafeDraftsAndCountsEntityTypes(t *testing.T) {
	unsafeDraft := OrganizationDirectoryRemediationActionDraft{
		DraftId:       "sha256:unsafe",
		ActionAlias:   OrganizationDirectoryRemediationActionSourceRefresh,
		EntityType:    OrganizationDirectoryQualityEntityDepartment,
		AffectedCount: 0,
		BlockedReason: "source stale",
	}
	preflight := newOrganizationDirectoryRemediationPreflight(unsafeDraft)
	for _, blocker := range []string{
		OrganizationDirectoryRemediationPreflightBlockerNoAffectedSubjects,
		OrganizationDirectoryRemediationPreflightBlockerMissingPrecondition,
		OrganizationDirectoryRemediationPreflightBlockerMissingSamples,
		OrganizationDirectoryRemediationPreflightBlockerDraftBlocked,
	} {
		if !organizationDirectoryQualityContains(preflight.BlockedReasons, blocker) {
			t.Fatalf("blockedReasons = %+v, want %s", preflight.BlockedReasons, blocker)
		}
	}
	if preflight.ReadyForManualReview || preflight.AffectedCounts.Department != 0 || preflight.AutoExecutionAllowed {
		t.Fatalf("preflight = %+v, want fail-closed manual-review preflight", preflight)
	}

	membershipDraft := OrganizationDirectoryRemediationActionDraft{
		DraftId:       "sha256:membership",
		ActionAlias:   OrganizationDirectoryRemediationActionMembershipRepair,
		EntityType:    OrganizationDirectoryQualityEntityMembership,
		AffectedCount: 3,
		Preconditions: []string{"确认 membership owner"},
		Samples: []OrganizationDirectoryRemediationActionDraftSample{{
			EntityHash:       "sha256:membership-sample",
			DisplaySafeLabel: "membership:sample",
			EntityType:       OrganizationDirectoryQualityEntityMembership,
			QualityStatus:    OrganizationMasterDataQualityStatusBlocked,
		}},
	}
	membershipPreflight := newOrganizationDirectoryRemediationPreflight(membershipDraft)
	if !membershipPreflight.ReadyForManualReview || membershipPreflight.AffectedCounts.Membership != 3 || membershipPreflight.AffectedCounts.Total != 3 {
		t.Fatalf("membershipPreflight = %+v, want ready membership counts", membershipPreflight)
	}
}
