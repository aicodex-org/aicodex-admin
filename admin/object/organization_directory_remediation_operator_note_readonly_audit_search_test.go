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
	"strings"
	"testing"
)

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchBuildsCurrentDerivedSummary(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService().Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId:  "org-a",
		ActionAlias:     OrganizationDirectoryRemediationActionMappingReview,
		EntityType:      OrganizationDirectoryQualityEntityUser,
		RiskLevel:       OrganizationDirectoryRemediationApprovalRiskMedium,
		PacketStatus:    OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval,
		ReadinessStatus: OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview,
		Limit:           20,
		TopN:            10,
	})
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.SearchId == "" || result.SearchScope != OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived {
		t.Fatalf("result search identity = %+v, want current derived scope", result)
	}
	if result.PersistenceRequiredForHistoricalSearch {
		t.Fatalf("result = %+v, want current derived search without persistence requirement", result)
	}
	if result.TotalItemCount != 1 || len(result.Items) != 1 {
		t.Fatalf("result = %+v, want one readonly audit search item", result)
	}
	item := result.Items[0]
	if item.AuditSearchItemId == "" ||
		item.NoteHash == "" ||
		item.ReadinessHash == "" ||
		item.PacketHash == "" ||
		item.ApprovalPreviewHash == "" {
		t.Fatalf("item identity = %+v, want stable note/readiness/packet hashes", item)
	}
	if item.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly ||
		item.AutoExecutionAllowed ||
		!item.ManualReviewOnly ||
		item.NoteScope != OrganizationDirectoryRemediationOperatorNoteScopeDerivedDraft ||
		item.RetentionPolicy != OrganizationDirectoryRemediationApprovalPacketRetentionNotPersisted ||
		item.StorageScope != OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly {
		t.Fatalf("item safety flags = %+v, want readonly manual-review-only handoff search", item)
	}
	if item.ReadinessStatus != OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview ||
		item.RiskLevel != OrganizationDirectoryRemediationApprovalRiskMedium ||
		item.PacketStatus != OrganizationDirectoryRemediationApprovalPacketStatusReadyForApproval {
		t.Fatalf("item status fields = %+v, want readiness/risk/packet status", item)
	}
	if item.DisplaySafeLabel == "" ||
		len(item.ChecklistAliases) == 0 ||
		len(item.ReasonAliases) == 0 ||
		len(item.RedactedFields) == 0 ||
		len(item.CannotInfer) == 0 ||
		item.SafeSummary == "" ||
		!strings.Contains(item.MarkdownSummary, "manual_review_only") {
		t.Fatalf("item = %+v, want populated sanitized search summary", item)
	}
	if !organizationDirectoryQualityContains(item.RedactedFields, OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactedRawSourcePayload) ||
		!organizationDirectoryQualityContains(item.CannotInfer, OrganizationDirectoryRemediationOperatorNoteCannotInferPersistentAuditEvidence) {
		t.Fatalf("item redaction/cannotInfer = %+v/%+v, want explicit boundaries", item.RedactedFields, item.CannotInfer)
	}
	if result.ExportSummary.SearchScope != OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived ||
		len(result.ExportSummary.Items) != 1 ||
		result.ExportSummary.Items[0].NoteHash != item.NoteHash ||
		result.ExportSummary.Items[0].AutoExecutionAllowed {
		t.Fatalf("export summary = %+v, want sanitized readonly search export", result.ExportSummary)
	}
}

func TestGetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchReturnsScopedHistoricalBoundary(t *testing.T) {
	result, err := GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId:    "org-a",
		ActionAlias:       OrganizationDirectoryRemediationActionMappingReview,
		EntityType:        OrganizationDirectoryQualityEntityUser,
		ChecklistAlias:    "manual_review_only_required",
		IncludeHistorical: true,
		HistoryMode:       OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent,
		Limit:             20,
		TopN:              10,
	})
	if err != nil {
		t.Fatalf("GetOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.TotalItemCount != 0 || len(result.Items) != 0 {
		t.Fatalf("result = %+v, want scoped empty default-derived readonly audit search result", result)
	}
	if !result.PersistenceRequiredForHistoricalSearch ||
		result.SearchScope != OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived ||
		result.ExportSummary.SearchScope != OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchScopeCurrentDerived {
		t.Fatalf("result = %+v, want readonly historical-boundary search", result)
	}
	if !organizationDirectoryQualityContains(result.CannotInfer, OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHistoricalCompleteness) ||
		!organizationDirectoryQualityContains(result.CannotInfer, OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferSavedOperatorComments) {
		t.Fatalf("cannotInfer = %+v, want persistence boundary", result.CannotInfer)
	}
}

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFailsClosedForBlankReadyAndMissingReadiness(t *testing.T) {
	service := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService()

	blank, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{})
	if err != nil {
		t.Fatalf("Search(blank) error = %v", err)
	}
	if blank.TotalItemCount != 0 || blank.OrganizationId != "" || len(blank.Items) != 0 {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}

	ready, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("Search(ready) error = %v", err)
	}
	if ready.TotalItemCount != 0 || len(ready.Items) != 0 {
		t.Fatalf("ready = %+v, want empty fail-closed result", ready)
	}

	missing, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId: "org-a",
		ReadinessHash:  "sha256:missing-readiness",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("Search(missing readiness) error = %v", err)
	}
	if missing.TotalItemCount != 0 || len(missing.Items) != 0 {
		t.Fatalf("missing = %+v, want empty search result", missing)
	}
}

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchMarksHistoricalPersistenceBoundary(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService().Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId:    "org-a",
		DraftId:           "sha256:missing",
		RemediationRunId:  "run-20260616",
		IncludeHistorical: true,
		HistoryMode:       OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent,
		ActionAlias:       OrganizationDirectoryRemediationActionMappingReview,
		EntityType:        OrganizationDirectoryQualityEntityUser,
		PacketStatus:      OrganizationDirectoryRemediationApprovalPacketStatusBlocked,
		RiskLevel:         OrganizationDirectoryRemediationApprovalRiskBlocked,
		ReadinessStatus:   OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked,
		Limit:             20,
		TopN:              10,
	})
	if err != nil {
		t.Fatalf("Search(historical) error = %v", err)
	}
	if !result.PersistenceRequiredForHistoricalSearch {
		t.Fatalf("result = %+v, want persistenceRequiredForHistoricalSearch", result)
	}
	if !organizationDirectoryQualityContains(result.CannotInfer, OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferHistoricalCompleteness) ||
		!organizationDirectoryQualityContains(result.CannotInfer, OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchCannotInferSavedOperatorComments) {
		t.Fatalf("cannotInfer = %+v, want historical persistence boundaries", result.CannotInfer)
	}
	if result.TotalItemCount != 1 || len(result.Items) != 1 {
		t.Fatalf("result = %+v, want one blocked historical-boundary item", result)
	}
	item := result.Items[0]
	if item.ReadinessStatus != OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked ||
		item.PacketStatus != OrganizationDirectoryRemediationApprovalPacketStatusBlocked ||
		!organizationDirectoryQualityContains(item.BlockedReasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked) ||
		!strings.Contains(item.MarkdownSummary, "persistenceRequiredForHistoricalSearch") {
		t.Fatalf("item = %+v, want blocked readiness-only item with historical boundary", item)
	}
}

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchDerivesBlockedFallbacks(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService().Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("Search(blocked fallback) error = %v", err)
	}
	if result.TotalItemCount != 1 || len(result.Items) != 1 {
		t.Fatalf("result = %+v, want one blocked fallback item", result)
	}
	item := result.Items[0]
	if item.RiskLevel != OrganizationDirectoryRemediationApprovalRiskBlocked ||
		item.PacketStatus != OrganizationDirectoryRemediationApprovalPacketStatusBlocked ||
		!organizationDirectoryQualityContains(item.BlockedReasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked) {
		t.Fatalf("item = %+v, want blocked risk/packet fallbacks from readiness blockers", item)
	}
}

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchFiltersMismatchFailClosed(t *testing.T) {
	service := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService()

	readinessMismatch, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId:    "org-a",
		ActionAlias:       OrganizationDirectoryRemediationActionMappingReview,
		EntityType:        OrganizationDirectoryQualityEntityUser,
		ReadinessStatus:   OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked,
		Limit:             20,
		TopN:              10,
		IncludeHistorical: true,
		HistoryMode:       OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchHistoryModePersistent,
	})
	if err != nil {
		t.Fatalf("Search(readiness mismatch) error = %v", err)
	}
	if readinessMismatch.TotalItemCount != 0 || len(readinessMismatch.Items) != 0 {
		t.Fatalf("readiness mismatch = %+v, want empty fail-closed result", readinessMismatch)
	}

	checklistMismatch, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId:  "org-a",
		ActionAlias:     OrganizationDirectoryRemediationActionMappingReview,
		EntityType:      OrganizationDirectoryQualityEntityUser,
		ChecklistAlias:  "unknown_checklist_alias",
		ReadinessStatus: OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview,
		Limit:           20,
		TopN:            10,
	})
	if err != nil {
		t.Fatalf("Search(checklist mismatch) error = %v", err)
	}
	if checklistMismatch.TotalItemCount != 0 || len(checklistMismatch.Items) != 0 {
		t.Fatalf("checklist mismatch = %+v, want empty fail-closed result", checklistMismatch)
	}

	matching, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("Search(matching) error = %v", err)
	}
	searchIdMismatch, err := service.Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId: "org-a",
		SearchId:       matching.SearchId + ":mismatch",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("Search(searchId mismatch) error = %v", err)
	}
	if searchIdMismatch.TotalItemCount != 0 || len(searchIdMismatch.Items) != 0 {
		t.Fatalf("searchId mismatch = %+v, want empty fail-closed result", searchIdMismatch)
	}
}

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRedactsExport(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService().Search(OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		PacketStatus:   OrganizationDirectoryRemediationApprovalPacketStatusBlocked,
		RiskLevel:      OrganizationDirectoryRemediationApprovalRiskBlocked,
	})
	if err != nil {
		t.Fatalf("Search(blocked) error = %v", err)
	}
	payload, err := json.Marshal(result.ExportSummary)
	if err != nil {
		t.Fatalf("Marshal(exportSummary) error = %v", err)
	}
	serialized := strings.ToLower(string(payload))
	for _, forbidden := range []string{"token", "cookie", "secret", "phone", "email", "payload", "private url", "@example", "org-a/alice"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("readonly audit search export leaks forbidden term %q: %s", forbidden, serialized)
		}
	}
}

func TestOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchRejectsInvalidFilters(t *testing.T) {
	service := newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService()
	cases := []struct {
		name  string
		query OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery
	}{
		{name: "bad risk", query: OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{OrganizationId: "org-a", RiskLevel: "critical"}},
		{name: "bad status", query: OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{OrganizationId: "org-a", PacketStatus: "executed"}},
		{name: "bad readiness", query: OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{OrganizationId: "org-a", ReadinessStatus: "persisted"}},
		{name: "bad entity", query: OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{OrganizationId: "org-a", EntityType: "organization_tree"}},
		{name: "bad history", query: OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{OrganizationId: "org-a", HistoryMode: "durable_store"}},
		{name: "bad limit", query: OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchQuery{OrganizationId: "org-a", Limit: 101}},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := service.Search(tt.query); err == nil {
				t.Fatalf("Search(%+v) error = nil, want validation error", tt.query)
			}
		})
	}
}

func newOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchTestService() OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService {
	return OrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearchService{
		ReadinessService: newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService(),
		Now:              organizationDirectoryQualityFixedNow,
	}
}
