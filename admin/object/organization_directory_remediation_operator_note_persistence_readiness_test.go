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

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessBuildsReadinessOnlyContract(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService().GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness() error = %v", err)
	}
	if result.OrganizationId != "org-a" || result.GeneratedAt != organizationDirectoryQualityFixedNow().UTC() {
		t.Fatalf("result identity = %+v, want org-a and fixed time", result)
	}
	if result.TotalReadinessCount != 1 || len(result.Readiness) != 1 {
		t.Fatalf("result = %+v, want one readiness record", result)
	}
	readiness := result.Readiness[0]
	if readiness.ReadinessId == "" || !strings.HasPrefix(readiness.ReadinessHash, "sha256:") ||
		readiness.NoteHash == "" || readiness.PacketHash == "" || readiness.ApprovalPreviewHash == "" {
		t.Fatalf("readiness identity = %+v, want stable readiness/note/packet hashes", readiness)
	}
	if readiness.StorageScope != OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly ||
		readiness.PersistenceAllowed ||
		!readiness.StoreDecisionRequired ||
		readiness.ReadinessStatus != OrganizationDirectoryRemediationOperatorNotePersistenceStatusReadyForDesignReview ||
		!readiness.ReadyForPersistenceDesignReview {
		t.Fatalf("readiness flags = %+v, want readiness-only design review state", readiness)
	}
	if readiness.ExecutionMode != OrganizationDirectoryRemediationExecutionManualReviewOnly || readiness.AutoExecutionAllowed {
		t.Fatalf("execution flags = %+v, want manual review only and auto execution disabled", readiness)
	}
	if readiness.IdempotencyKey == "" ||
		len(readiness.IdempotencyComponents) == 0 ||
		len(readiness.PermissionChecklist) == 0 ||
		len(readiness.RetentionChecklist) == 0 ||
		len(readiness.AuditSemanticsChecklist) == 0 ||
		len(readiness.RedactionChecklist) == 0 ||
		len(readiness.ManualReviewGate) == 0 ||
		len(readiness.CannotInfer) == 0 ||
		readiness.SafeSummary == "" {
		t.Fatalf("readiness = %+v, want populated persistence readiness contract", readiness)
	}
	if !organizationDirectoryQualityContains(readiness.IdempotencyComponents, "noteHash") ||
		!organizationDirectoryQualityContains(readiness.ManualReviewGate, "auto_execution_must_remain_false") ||
		!organizationDirectoryQualityContains(readiness.CannotInfer, OrganizationDirectoryRemediationOperatorNoteCannotInferPersistentAuditEvidence) {
		t.Fatalf("readiness checklists = %+v, want idempotency/manual/cannotInfer boundaries", readiness)
	}
	if readiness.ExportSummary.ReadinessHash != readiness.ReadinessHash ||
		readiness.ExportSummary.PersistenceAllowed ||
		readiness.ExportSummary.StorageScope != OrganizationDirectoryRemediationOperatorNotePersistenceStorageReadinessOnly {
		t.Fatalf("export summary = %+v, want sanitized readiness export", readiness.ExportSummary)
	}
}

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessIncludesOrganizationInIdempotency(t *testing.T) {
	notes, err := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService().GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetOperatorNotes() error = %v", err)
	}
	if len(notes.Notes) != 1 {
		t.Fatalf("notes = %+v, want one note", notes.Notes)
	}

	first := newOrganizationDirectoryRemediationOperatorNotePersistenceReadiness("org-a", notes.Notes[0])
	second := newOrganizationDirectoryRemediationOperatorNotePersistenceReadiness("org-b", notes.Notes[0])
	if first.IdempotencyKey == second.IdempotencyKey || first.ReadinessHash == second.ReadinessHash {
		t.Fatalf("readiness hashes should include organization scope: first=%+v second=%+v", first, second)
	}
}

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessCoversWrapperFallbackAndHashFilter(t *testing.T) {
	blank, err := GetOrganizationDirectoryRemediationOperatorNotePersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{})
	if err != nil {
		t.Fatalf("GetOrganizationDirectoryRemediationOperatorNotePersistenceReadiness(blank) error = %v", err)
	}
	if blank.GeneratedAt.IsZero() || blank.TotalReadinessCount != 0 {
		t.Fatalf("blank = %+v, want generated empty fail-closed result", blank)
	}

	service := newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService()
	service.NotesService.Now = nil
	missingHash, err := service.GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId: "org-a",
		ReadinessHash:  "sha256:missing-readiness",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness(missing readiness hash) error = %v", err)
	}
	if missingHash.TotalReadinessCount != 0 || len(missingHash.Readiness) != 0 {
		t.Fatalf("missingHash = %+v, want empty readiness result", missingHash)
	}
	missingId, err := service.GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId: "org-a",
		ReadinessId:    "operator-note-persistence-readiness:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness(missing readiness id) error = %v", err)
	}
	if missingId.TotalReadinessCount != 0 || len(missingId.Readiness) != 0 {
		t.Fatalf("missingId = %+v, want empty readiness result", missingId)
	}
}

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessBlocksMissingSafetySignals(t *testing.T) {
	notes, err := newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService().GetOperatorNotes(OrganizationDirectoryRemediationApprovalPacketOperatorNotesQuery{
		OrganizationId: "org-a",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		Limit:          20,
		TopN:           10,
	})
	if err != nil {
		t.Fatalf("GetOperatorNotes() error = %v", err)
	}
	if len(notes.Notes) != 1 {
		t.Fatalf("notes = %+v, want one note", notes.Notes)
	}

	note := notes.Notes[0]
	note.SampleStableHashes = nil
	note.ExecutionMode = "automatic"
	note.AutoExecutionAllowed = true
	note.NoteScope = "persisted_note"
	note.RetentionPolicy = "retained"
	note.CannotInfer = nil
	readiness := newOrganizationDirectoryRemediationOperatorNotePersistenceReadiness("org-a", note)
	for _, blocker := range []string{
		OrganizationDirectoryRemediationOperatorNotePersistenceBlockerSamplesMissing,
		OrganizationDirectoryRemediationOperatorNotePersistenceBlockerManualGateMissing,
		OrganizationDirectoryRemediationOperatorNotePersistenceBlockerScopeMismatch,
		OrganizationDirectoryRemediationOperatorNotePersistenceBlockerCannotInferMissing,
	} {
		if !organizationDirectoryQualityContains(readiness.BlockedReasons, blocker) {
			t.Fatalf("blocked reasons = %+v, want %s", readiness.BlockedReasons, blocker)
		}
	}
	if readiness.ReadinessStatus != OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked || readiness.ReadyForPersistenceDesignReview {
		t.Fatalf("readiness = %+v, want blocked readiness", readiness)
	}
}

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessFailsClosedForBlankReadyAndMissingNote(t *testing.T) {
	service := newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService()

	blank, err := service.GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness(blank) error = %v", err)
	}
	if blank.TotalReadinessCount != 0 || blank.OrganizationId != "" || len(blank.Readiness) != 0 {
		t.Fatalf("blank = %+v, want scoped empty result", blank)
	}

	ready, err := service.GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId: "org-a",
		QualityStatus:  OrganizationMasterDataQualityStatusReady,
	})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness(ready) error = %v", err)
	}
	if ready.TotalReadinessCount != 0 || len(ready.Readiness) != 0 {
		t.Fatalf("ready = %+v, want empty fail-closed result", ready)
	}

	missing, err := service.GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId: "org-a",
		NoteHash:       "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
	})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness(missing note) error = %v", err)
	}
	if missing.TotalReadinessCount != 0 || len(missing.Readiness) != 0 {
		t.Fatalf("missing = %+v, want empty readiness result", missing)
	}
}

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessBlocksUnsafeNotesAndRedactsExport(t *testing.T) {
	result, err := newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService().GetPersistenceReadiness(OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{
		OrganizationId: "org-a",
		DraftId:        "sha256:missing",
		ActionAlias:    OrganizationDirectoryRemediationActionMappingReview,
		EntityType:     OrganizationDirectoryQualityEntityUser,
		PacketStatus:   OrganizationDirectoryRemediationApprovalPacketStatusBlocked,
		RiskLevel:      OrganizationDirectoryRemediationApprovalRiskBlocked,
	})
	if err != nil {
		t.Fatalf("GetPersistenceReadiness(blocked) error = %v", err)
	}
	if result.TotalReadinessCount != 1 || len(result.Readiness) != 1 {
		t.Fatalf("result = %+v, want one blocked readiness", result)
	}
	readiness := result.Readiness[0]
	if readiness.ReadinessStatus != OrganizationDirectoryRemediationOperatorNotePersistenceStatusBlocked ||
		readiness.ReadyForPersistenceDesignReview ||
		readiness.PersistenceAllowed ||
		!organizationDirectoryQualityContains(readiness.BlockedReasons, OrganizationDirectoryRemediationOperatorNotePersistenceBlockerApprovalPacketBlocked) {
		t.Fatalf("readiness = %+v, want blocked persistence readiness", readiness)
	}
	payload, err := json.Marshal(result.ExportSummary)
	if err != nil {
		t.Fatalf("Marshal(exportSummary) error = %v", err)
	}
	serialized := strings.ToLower(string(payload))
	for _, forbidden := range []string{"token", "cookie", "secret", "phone", "email", "payload", "private url", "@example", "org-a/alice"} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("persistence readiness export leaks forbidden term %q: %s", forbidden, serialized)
		}
	}
}

func TestOrganizationDirectoryRemediationOperatorNotePersistenceReadinessRejectsInvalidFilters(t *testing.T) {
	service := newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService()
	cases := []struct {
		name  string
		query OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery
	}{
		{name: "bad risk", query: OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{OrganizationId: "org-a", RiskLevel: "critical"}},
		{name: "bad status", query: OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{OrganizationId: "org-a", PacketStatus: "executed"}},
		{name: "bad entity", query: OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{OrganizationId: "org-a", EntityType: "organization_tree"}},
		{name: "bad limit", query: OrganizationDirectoryRemediationOperatorNotePersistenceReadinessQuery{OrganizationId: "org-a", Limit: 101}},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := service.GetPersistenceReadiness(tt.query); err == nil {
				t.Fatalf("GetPersistenceReadiness(%+v) error = nil, want validation error", tt.query)
			}
		})
	}
}

func newOrganizationDirectoryRemediationOperatorNotePersistenceReadinessTestService() OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService {
	return OrganizationDirectoryRemediationOperatorNotePersistenceReadinessService{
		NotesService: newOrganizationDirectoryRemediationApprovalPacketOperatorNotesTestService(),
		Now:          organizationDirectoryQualityFixedNow,
	}
}
