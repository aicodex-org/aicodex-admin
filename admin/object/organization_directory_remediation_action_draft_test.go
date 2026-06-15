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

func TestOrganizationDirectoryRemediationActionDraftBuildsManualReviewDrafts(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationActionDraftService{
		QualityService: OrganizationDirectoryQualityService{
			Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
			Now:   organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetActionDrafts() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalDraftCount != 1 || len(result.Drafts) != 1 {
		t.Fatalf("result = %+v, want one mapping draft", result)
	}
	draft := result.Drafts[0]
	if draft.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly {
		t.Fatalf("executionMode = %q, want manual review only", draft.ExecutionMode)
	}
	if draft.ActionAlias != OrganizationDirectoryRemediationActionMappingReview ||
		draft.Priority != OrganizationDirectoryRemediationPriorityP1 ||
		draft.EntityType != OrganizationDirectoryQualityEntityUser ||
		draft.AffectedCount == 0 ||
		draft.SafeSummary == "" ||
		len(draft.Preconditions) == 0 ||
		len(draft.OperatorSteps) == 0 {
		t.Fatalf("draft = %+v, want populated mapping review draft", draft)
	}
	if len(draft.Samples) == 0 {
		t.Fatalf("draft samples empty: %+v", draft)
	}
	sample := draft.Samples[0]
	if !strings.HasPrefix(sample.EntityHash, "sha256:") ||
		sample.DisplaySafeLabel == "" ||
		sample.SourceType == "" ||
		sample.QualityStatus != OrganizationMasterDataQualityStatusBlocked ||
		!organizationDirectoryQualityContains(sample.ReasonCodes, OrganizationMasterDataQualityReasonMappingMissing) {
		t.Fatalf("sample = %+v, want sanitized mapping sample", sample)
	}
	serialized := strings.ToLower(sample.DisplaySafeLabel + " " + sample.EntityHash)
	if strings.Contains(serialized, "alice") || strings.Contains(serialized, "org-a/alice") || strings.Contains(serialized, "external-subject") {
		t.Fatalf("sample leaked raw identity data: %+v", sample)
	}
	if len(result.ExportSummary.Drafts) != 1 || result.ExportSummary.Drafts[0].Samples[0].EntityHash != sample.EntityHash {
		t.Fatalf("exportSummary = %+v, want sanitized draft export", result.ExportSummary)
	}
}

func TestOrganizationDirectoryRemediationActionDraftFiltersByReasonAndAction(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationActionDraftService{
		QualityService: OrganizationDirectoryQualityService{
			Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
			Now:   organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMembershipRepair,
		EntityType:     OrganizationDirectoryQualityEntityMembership,
		ReasonCode:     OrganizationMasterDataQualityReasonMembershipMissingUser,
		Limit:          10,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetActionDrafts(filtered) error = %v", err)
	}
	if result.TotalDraftCount != 1 || len(result.Drafts) != 1 {
		t.Fatalf("result = %+v, want one membership draft", result)
	}
	draft := result.Drafts[0]
	if draft.ActionAlias != OrganizationDirectoryRemediationActionMembershipRepair ||
		draft.EntityType != OrganizationDirectoryQualityEntityMembership ||
		draft.AffectedCount != 1 ||
		!strings.Contains(strings.Join(draft.OperatorSteps, " "), "membership") {
		t.Fatalf("draft = %+v, want membership repair draft", draft)
	}
}

func TestOrganizationDirectoryRemediationActionDraftReturnsEmptyForReadyOrBlankOrganization(t *testing.T) {
	service := OrganizationDirectoryRemediationActionDraftService{
		QualityService: OrganizationDirectoryQualityService{
			Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
			Now:   organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}

	ready, err := service.GetActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("GetActionDrafts(ready) error = %v", err)
	}
	if ready.TotalDraftCount != 0 || len(ready.Drafts) != 0 {
		t.Fatalf("ready = %+v, want empty draft result", ready)
	}

	blank, err := (OrganizationDirectoryRemediationActionDraftService{
		QualityService: OrganizationDirectoryQualityService{Store: organizationDirectoryQualityTestStore{err: errors.New("store should not be called")}},
	}).GetActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{})
	if err != nil {
		t.Fatalf("GetActionDrafts(blank organization) error = %v", err)
	}
	if blank.TotalDraftCount != 0 || blank.OrganizationId != "" {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}

	defaultResult, err := GetOrganizationDirectoryRemediationActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{})
	if err != nil {
		t.Fatalf("GetOrganizationDirectoryRemediationActionDrafts(blank organization) error = %v", err)
	}
	if defaultResult.TotalDraftCount != 0 || len(defaultResult.Drafts) != 0 {
		t.Fatalf("defaultResult = %+v, want fail-closed empty result", defaultResult)
	}
}

func TestOrganizationDirectoryRemediationActionDraftRejectsInvalidQueryAndPropagatesStoreError(t *testing.T) {
	invalidQueries := []struct {
		name      string
		query     OrganizationDirectoryRemediationActionDraftQuery
		wantError string
	}{
		{name: "action", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", ActionAlias: "execute_repair"}, wantError: "unsupported actionAlias"},
		{name: "entity", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", EntityType: "device"}, wantError: "unsupported entityType"},
		{name: "status", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", QualityStatus: "running"}, wantError: "unsupported qualityStatus"},
		{name: "limit-negative", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", Limit: -1}, wantError: "limit"},
		{name: "limit-too-large", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", Limit: 101}, wantError: "limit"},
		{name: "topN-negative", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", TopN: -1}, wantError: "topN"},
		{name: "topN-too-large", query: OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a", TopN: 101}, wantError: "topN"},
	}

	for _, tt := range invalidQueries {
		t.Run(tt.name, func(t *testing.T) {
			_, err := (OrganizationDirectoryRemediationActionDraftService{}).GetActionDrafts(tt.query)
			if err == nil || !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("GetActionDrafts(%s) error = %v, want %q", tt.name, err, tt.wantError)
			}
		})
	}

	_, err := (OrganizationDirectoryRemediationActionDraftService{
		QualityService: OrganizationDirectoryQualityService{Store: organizationDirectoryQualityTestStore{err: errors.New("store unavailable")}},
	}).GetActionDrafts(OrganizationDirectoryRemediationActionDraftQuery{OrganizationId: "org-a"})
	if err == nil || !strings.Contains(err.Error(), "store unavailable") {
		t.Fatalf("GetActionDrafts(store error) error = %v, want store unavailable", err)
	}
}

func TestOrganizationDirectoryRemediationActionDraftPreconditionsCoverSupportedActions(t *testing.T) {
	cases := []struct {
		actionAlias string
		wantText    string
	}{
		{OrganizationDirectoryRemediationActionBlockedByCredentials, "source connection"},
		{OrganizationDirectoryRemediationActionIdentityConflictReview, "保留键"},
		{OrganizationDirectoryRemediationActionMappingReview, "apiUserId"},
		{OrganizationDirectoryRemediationActionMembershipRepair, "成员关系"},
		{OrganizationDirectoryRemediationActionSourceRefresh, "source refresh"},
		{OrganizationDirectoryRemediationActionLifecycleCleanup, "lifecycle"},
		{OrganizationDirectoryRemediationActionManualInvestigation, "Admin owner"},
	}

	for _, tt := range cases {
		t.Run(tt.actionAlias, func(t *testing.T) {
			preconditions := organizationDirectoryRemediationActionDraftPreconditions(tt.actionAlias)
			if len(preconditions) == 0 || !strings.Contains(strings.Join(preconditions, " "), tt.wantText) {
				t.Fatalf("preconditions(%q) = %+v, want text %q", tt.actionAlias, preconditions, tt.wantText)
			}
		})
	}
}

func TestSortOrganizationDirectoryRemediationActionDraftsUsesPriorityImpactAndStableKeys(t *testing.T) {
	drafts := []OrganizationDirectoryRemediationActionDraft{
		{ActionAlias: "z_action", Priority: OrganizationDirectoryRemediationPriorityP2, EntityType: OrganizationDirectoryQualityEntityUser, AffectedCount: 1},
		{ActionAlias: "a_action", Priority: OrganizationDirectoryRemediationPriorityP1, EntityType: OrganizationDirectoryQualityEntityMembership, AffectedCount: 1},
		{ActionAlias: "b_action", Priority: OrganizationDirectoryRemediationPriorityP1, EntityType: OrganizationDirectoryQualityEntityDepartment, AffectedCount: 2},
		{ActionAlias: "a_action", Priority: OrganizationDirectoryRemediationPriorityP1, EntityType: OrganizationDirectoryQualityEntityDepartment, AffectedCount: 1},
	}

	sortOrganizationDirectoryRemediationActionDrafts(drafts)

	got := []string{
		drafts[0].ActionAlias + ":" + drafts[0].EntityType,
		drafts[1].ActionAlias + ":" + drafts[1].EntityType,
		drafts[2].ActionAlias + ":" + drafts[2].EntityType,
		drafts[3].ActionAlias + ":" + drafts[3].EntityType,
	}
	want := []string{
		"b_action:" + OrganizationDirectoryQualityEntityDepartment,
		"a_action:" + OrganizationDirectoryQualityEntityDepartment,
		"a_action:" + OrganizationDirectoryQualityEntityMembership,
		"z_action:" + OrganizationDirectoryQualityEntityUser,
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("sorted drafts = %+v, want %+v", got, want)
		}
	}
}
