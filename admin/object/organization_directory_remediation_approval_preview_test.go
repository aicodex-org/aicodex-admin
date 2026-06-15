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

func TestOrganizationDirectoryRemediationApprovalPreviewBuildsManualReviewApprovalPackage(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationApprovalPreviewService{
		PreflightService: OrganizationDirectoryRemediationPreflightService{
			DraftService: OrganizationDirectoryRemediationActionDraftService{
				QualityService: OrganizationDirectoryQualityService{
					Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
					Now:   organizationDirectoryQualityFixedNow,
				},
				Now: organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetApprovalPreviews() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalApprovalPreviewCount != 1 || len(result.ApprovalPreviews) != 1 {
		t.Fatalf("result = %+v, want one approval preview", result)
	}
	preview := result.ApprovalPreviews[0]
	if preview.ApprovalPreviewId == "" || !strings.HasPrefix(preview.ApprovalPreviewHash, "sha256:") {
		t.Fatalf("preview identity = %+v, want stable id and hash", preview)
	}
	if preview.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly || preview.AutoExecutionAllowed {
		t.Fatalf("execution flags = %+v, want manual review only and auto execution disabled", preview)
	}
	if !preview.ReadyForApproval || len(preview.BlockedReasons) != 0 {
		t.Fatalf("preview readiness = %+v, want ready-for-approval without blockers", preview)
	}
	if preview.RiskLevel != OrganizationDirectoryRemediationApprovalRiskMedium ||
		preview.AffectedCount == 0 ||
		len(preview.Preconditions) == 0 ||
		len(preview.RequiredApprovals) == 0 ||
		len(preview.OperatorChecklist) == 0 ||
		preview.SafeSummary == "" ||
		len(preview.SampleStableHashes) == 0 {
		t.Fatalf("preview = %+v, want populated approval package", preview)
	}
	if preview.ExportSummary.ApprovalPreviewHash != preview.ApprovalPreviewHash ||
		preview.ExportSummary.AutoExecutionAllowed ||
		preview.ExportSummary.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly {
		t.Fatalf("export summary = %+v, want sanitized manual-review summary", preview.ExportSummary)
	}
	for _, sampleHash := range preview.SampleStableHashes {
		if !strings.HasPrefix(sampleHash, "sha256:") {
			t.Fatalf("sampleStableHashes = %+v, want stable hashes", preview.SampleStableHashes)
		}
	}
}

func TestOrganizationDirectoryRemediationApprovalPreviewFailsClosedForMissingDraftReadyAndBlankOrganization(t *testing.T) {
	service := OrganizationDirectoryRemediationApprovalPreviewService{
		PreflightService: OrganizationDirectoryRemediationPreflightService{
			DraftService: OrganizationDirectoryRemediationActionDraftService{
				QualityService: OrganizationDirectoryQualityService{
					Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
					Now:   organizationDirectoryQualityFixedNow,
				},
				Now: organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}

	missing, err := service.GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetApprovalPreviews(missing draft) error = %v", err)
	}
	if len(missing.ApprovalPreviews) != 1 ||
		missing.ApprovalPreviews[0].ReadyForApproval ||
		missing.ApprovalPreviews[0].RiskLevel != OrganizationDirectoryRemediationApprovalRiskBlocked ||
		!organizationDirectoryQualityContains(missing.ApprovalPreviews[0].BlockedReasons, OrganizationDirectoryRemediationPreflightBlockerDraftNotFound) {
		t.Fatalf("missing = %+v, want blocked missing-draft preview", missing)
	}

	ready, err := service.GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("GetApprovalPreviews(ready) error = %v", err)
	}
	if ready.TotalApprovalPreviewCount != 0 || len(ready.ApprovalPreviews) != 0 {
		t.Fatalf("ready = %+v, want empty fail-closed result", ready)
	}

	blank, err := (OrganizationDirectoryRemediationApprovalPreviewService{}).GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{})
	if err != nil {
		t.Fatalf("GetApprovalPreviews(blank organization) error = %v", err)
	}
	if blank.TotalApprovalPreviewCount != 0 || blank.OrganizationId != "" {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}
}

func TestOrganizationDirectoryRemediationApprovalPreviewBlocksMissingPreflightSamplesAndClassifiesRisk(t *testing.T) {
	preflight := OrganizationDirectoryRemediationPreflight{
		PreflightId:          "sha256:preflight",
		DraftId:              "sha256:draft",
		ActionAlias:          OrganizationDirectoryRemediationActionIdentityConflictReview,
		EntityType:           OrganizationDirectoryQualityEntityUser,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		ReadyForManualReview: true,
		AutoExecutionAllowed: false,
		BlockedReasons:       []string{},
		Preconditions:        []string{"确认重复主体"},
		AffectedCounts:       OrganizationDirectoryRemediationCounts{Total: 2, User: 2},
		SampleDigests:        []OrganizationDirectoryRemediationPreflightSampleDigest{},
	}
	preview := newOrganizationDirectoryRemediationApprovalPreview(preflight)
	if preview.ReadyForApproval ||
		preview.RiskLevel != OrganizationDirectoryRemediationApprovalRiskBlocked ||
		!organizationDirectoryQualityContains(preview.BlockedReasons, OrganizationDirectoryRemediationApprovalBlockerMissingPreflightSamples) {
		t.Fatalf("preview = %+v, want blocked missing-sample preview", preview)
	}

	highRisk := newOrganizationDirectoryRemediationApprovalPreview(OrganizationDirectoryRemediationPreflight{
		PreflightId:          "sha256:high",
		DraftId:              "sha256:high-draft",
		ActionAlias:          OrganizationDirectoryRemediationActionIdentityConflictReview,
		EntityType:           OrganizationDirectoryQualityEntityUser,
		ExecutionMode:        OrganizationDirectoryRemediationExecutionManualReviewOnly,
		ReadyForManualReview: true,
		Preconditions:        []string{"确认重复主体"},
		AffectedCounts:       OrganizationDirectoryRemediationCounts{Total: 30, User: 30},
		SampleDigests: []OrganizationDirectoryRemediationPreflightSampleDigest{{
			EntityHash:       "sha256:sample",
			DisplaySafeLabel: "user:sample",
			EntityType:       OrganizationDirectoryQualityEntityUser,
			QualityStatus:    OrganizationMasterDataQualityStatusBlocked,
			ReasonCodes:      []string{OrganizationMasterDataQualityReasonDuplicateAdminSubject},
		}},
	})
	if !highRisk.ReadyForApproval || highRisk.RiskLevel != OrganizationDirectoryRemediationApprovalRiskHigh {
		t.Fatalf("highRisk = %+v, want ready high risk approval preview", highRisk)
	}
}

func TestOrganizationDirectoryRemediationApprovalPreviewRejectsInvalidQueryAndPropagatesStoreError(t *testing.T) {
	invalidQueries := []struct {
		name      string
		query     OrganizationDirectoryRemediationApprovalPreviewQuery
		wantError string
	}{
		{name: "action", query: OrganizationDirectoryRemediationApprovalPreviewQuery{OrganizationId: "org-a", ActionAlias: "execute_repair"}, wantError: "unsupported actionAlias"},
		{name: "entity", query: OrganizationDirectoryRemediationApprovalPreviewQuery{OrganizationId: "org-a", EntityType: "device"}, wantError: "unsupported entityType"},
		{name: "status", query: OrganizationDirectoryRemediationApprovalPreviewQuery{OrganizationId: "org-a", QualityStatus: "running"}, wantError: "unsupported qualityStatus"},
		{name: "limit-negative", query: OrganizationDirectoryRemediationApprovalPreviewQuery{OrganizationId: "org-a", Limit: -1}, wantError: "limit"},
		{name: "topN-too-large", query: OrganizationDirectoryRemediationApprovalPreviewQuery{OrganizationId: "org-a", TopN: 101}, wantError: "topN"},
	}

	for _, tt := range invalidQueries {
		t.Run(tt.name, func(t *testing.T) {
			_, err := (OrganizationDirectoryRemediationApprovalPreviewService{}).GetApprovalPreviews(tt.query)
			if err == nil || !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("GetApprovalPreviews(%s) error = %v, want %q", tt.name, err, tt.wantError)
			}
		})
	}

	_, err := (OrganizationDirectoryRemediationApprovalPreviewService{
		PreflightService: OrganizationDirectoryRemediationPreflightService{
			DraftService: OrganizationDirectoryRemediationActionDraftService{
				QualityService: OrganizationDirectoryQualityService{Store: organizationDirectoryQualityTestStore{err: errors.New("store unavailable")}},
			},
		},
	}).GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{OrganizationId: "org-a"})
	if err == nil || !strings.Contains(err.Error(), "store unavailable") {
		t.Fatalf("GetApprovalPreviews(store error) error = %v, want store unavailable", err)
	}
}

func TestOrganizationDirectoryRemediationApprovalPreviewExportIsRedacted(t *testing.T) {
	result, err := (OrganizationDirectoryRemediationApprovalPreviewService{
		PreflightService: OrganizationDirectoryRemediationPreflightService{
			DraftService: OrganizationDirectoryRemediationActionDraftService{
				QualityService: OrganizationDirectoryQualityService{
					Store: organizationDirectoryQualityTestStore{snapshot: organizationDirectoryRemediationPlanTestSnapshot()},
					Now:   organizationDirectoryQualityFixedNow,
				},
				Now: organizationDirectoryQualityFixedNow,
			},
			Now: organizationDirectoryQualityFixedNow,
		},
		Now: organizationDirectoryQualityFixedNow,
	}).GetApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetApprovalPreviews() error = %v", err)
	}
	payload, err := json.Marshal(result.ExportSummary)
	if err != nil {
		t.Fatalf("Marshal(exportSummary) error = %v", err)
	}
	serialized := strings.ToLower(string(payload))
	for _, forbidden := range []string{"alice", "org-a/alice", "external-subject", "@", "phone", "cookie", "token", "source payload", "private url"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("export summary leaked %q in %s", forbidden, serialized)
		}
	}
}

func TestOrganizationDirectoryRemediationApprovalPreviewCoversApprovalBranchesAndDefaults(t *testing.T) {
	blank, err := GetOrganizationDirectoryRemediationApprovalPreviews(OrganizationDirectoryRemediationApprovalPreviewQuery{})
	if err != nil {
		t.Fatalf("GetOrganizationDirectoryRemediationApprovalPreviews(blank) error = %v", err)
	}
	if blank.TotalApprovalPreviewCount != 0 || blank.Boundary == "" {
		t.Fatalf("blank = %+v, want empty bounded preview", blank)
	}

	cases := []struct {
		name        string
		actionAlias string
		want        string
	}{
		{name: "membership", actionAlias: OrganizationDirectoryRemediationActionMembershipRepair, want: "membership_owner"},
		{name: "source", actionAlias: OrganizationDirectoryRemediationActionSourceRefresh, want: "source_connection_owner"},
		{name: "credentials", actionAlias: OrganizationDirectoryRemediationActionBlockedByCredentials, want: "source_connection_owner"},
		{name: "default", actionAlias: OrganizationDirectoryRemediationActionManualInvestigation, want: "data_steward"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			approvals := organizationDirectoryRemediationApprovalRequiredApprovals(OrganizationDirectoryRemediationPreflight{ActionAlias: tt.actionAlias})
			if !organizationDirectoryQualityContains(approvals, tt.want) || !organizationDirectoryQualityContains(approvals, "organization_directory_owner") {
				t.Fatalf("approvals = %+v, want %s and organization_directory_owner", approvals, tt.want)
			}
		})
	}

	summary := organizationDirectoryRemediationApprovalSafeSummary(OrganizationDirectoryRemediationPreflight{AffectedCounts: OrganizationDirectoryRemediationCounts{Total: 1}})
	if !strings.Contains(summary, "unknown_action/unknown_entity") {
		t.Fatalf("summary = %q, want unknown fallback", summary)
	}
	lowRisk := organizationDirectoryRemediationApprovalRiskLevel(OrganizationDirectoryRemediationPreflight{
		ActionAlias:          OrganizationDirectoryRemediationActionLifecycleCleanup,
		ReadyForManualReview: true,
		AffectedCounts:       OrganizationDirectoryRemediationCounts{Total: 1},
	}, nil)
	if lowRisk != OrganizationDirectoryRemediationApprovalRiskLow {
		t.Fatalf("lowRisk = %s, want low", lowRisk)
	}
}
